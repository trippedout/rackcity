/**
 * lets get visual
**/

var TESTING = true;

define(function (require) 
{
	var ram = require('ram'),
		stats = require('stats'),
		rackcity = require('rackcity'),
		bokeh = require('shaders/BokehShader2'),
		trackball = require('TrackballControls');

	var mouseX = 0, mouseY = 0, windowHalfX = window.innerWidth / 2, windowHalfY = window.innerHeight / 2, camera, scene, renderer, material, container;
	var width = window.innerWidth;
	var height = window.innerHeight;
	var sc_client_id = '08b1532d93712c611b7a82da20ac52ca';
	var controls;
	var dropArea;
	var processor;
	var xhr;
	var started = false;
	var frameCount = 0;

	var postprocessing = { enabled  : true };

	var shaderSettings = {
		rings: 3,
		samples: 4
	};
	var material_depth;

	$(document).ready(function() 
	{
		if (!window.WebGLRenderingContext) 
		{
		    // Browser has no idea what WebGL is. Suggest they
		    // get a new browser by presenting the user with link to
		    // http://get.webgl.org
		    console.log("fuck, no webgl");
		    return;   
		}
		
	    var gl = $("#debugCtx")[0].getContext("webgl");   
		if (!gl) {
		    // Browser could not initialize WebGL. User probably needs to
		    // update their drivers or get a new browser. Present a link to
		    // http://get.webgl.org/troubleshooting
			return;  
		}

		//shit works - init!
		init();
		initParams();
		initSoundcloud();
		getLocation();
	});

	function init() {

		//init 3D scene
		container = document.createElement('div');
		document.body.appendChild(container);
		camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000000);
		camera.position.z = 1000;
		camera.position.x = 500;
		camera.position.y = 350;
		camera.lookAt(new THREE.Vector3(0,0,0));

		scene = new THREE.Scene();
		scene.add(camera);
		
		renderer = new THREE.WebGLRenderer({
			antialias : true,
			sortObjects : false
		});
		renderer.setSize(window.innerWidth, window.innerHeight);
		
		initPostprocessing();

		renderer.autoClear = false;
		renderer.setClearColor(0x141a26, 1);
		container.appendChild(renderer.domElement);

		// controls = new THREE.TrackballControls( camera, renderer.domElement );
		// stop the user getting a text cursor
		document.onselectStart = function() {
			return false;
		};

		//add stats
		stats = new Stats();
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.top = '0px';
		container.appendChild(stats.domElement);

		rackcity.setup(scene);

		//init listeners
		// $("#loadSample").click( loadSampleAudio);
		$(document).mousemove(onDocumentMouseMove);
		
		$(window).resize(onWindowResize);
		onWindowResize(null);
	}

	function initParams() {
		var effectController  = {

			enabled: true,
			jsDepthCalculation: true,
			shaderFocus: false,

			fstop: 2.2,
			maxblur: 1.0,

			showFocus: false,
			focalDepth: 2.8,
			manualdof: false,
			vignetting: false,
			depthblur: false,

			threshold: 0.5,
			gain: 2.0,
			bias: 0.5,
			fringe: 0.7,

			focalLength: 35,
			noise: true,
			pentagon: false,

			dithering: 0.0001

		};

		var matChanger = function( ) {

			for (var e in effectController) {
				if (e in postprocessing.bokeh_uniforms)
				postprocessing.bokeh_uniforms[ e ].value = effectController[ e ];
			}

			postprocessing.enabled = effectController.enabled;
			postprocessing.bokeh_uniforms[ 'znear' ].value = camera.near;
			postprocessing.bokeh_uniforms[ 'zfar' ].value = camera.far;
			camera.setLens(effectController.focalLength);

		};

		var gui = new dat.GUI();

		gui.add( effectController, "enabled" ).onChange( matChanger );
		gui.add( effectController, "jsDepthCalculation" ).onChange( matChanger );
		gui.add( effectController, "shaderFocus" ).onChange( matChanger );
		gui.add( effectController, "focalDepth", 0.0, 200.0 ).listen().onChange( matChanger );

		gui.add( effectController, "fstop", 0.1, 22, 0.001 ).onChange( matChanger );
		gui.add( effectController, "maxblur", 0.0, 5.0, 0.025 ).onChange( matChanger );

		gui.add( effectController, "showFocus" ).onChange( matChanger );
		gui.add( effectController, "manualdof" ).onChange( matChanger );
		gui.add( effectController, "vignetting" ).onChange( matChanger );

		gui.add( effectController, "depthblur" ).onChange( matChanger );

		gui.add( effectController, "threshold", 0, 1, 0.001 ).onChange( matChanger );
		gui.add( effectController, "gain", 0, 100, 0.001 ).onChange( matChanger );
		gui.add( effectController, "bias", 0,3, 0.001 ).onChange( matChanger );
		gui.add( effectController, "fringe", 0, 5, 0.001 ).onChange( matChanger );

		gui.add( effectController, "focalLength", 16, 80, 0.001 ).onChange( matChanger )

		gui.add( effectController, "noise" ).onChange( matChanger );

		gui.add( effectController, "dithering", 0, 0.001, 0.0001 ).onChange( matChanger );

		gui.add( effectController, "pentagon" ).onChange( matChanger );

		gui.add( shaderSettings, "rings", 1, 8).step(1).onChange( shaderUpdate );
		gui.add( shaderSettings, "samples", 1, 13).step(1).onChange( shaderUpdate );

		matChanger();
	}

	function initPostprocessing() {

		postprocessing.scene = new THREE.Scene();

		postprocessing.camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2,  window.innerHeight / 2, window.innerHeight / - 2, -10000, 10000 );
		postprocessing.camera.position.z = 100;

		postprocessing.scene.add( postprocessing.camera );

		var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
		postprocessing.rtTextureDepth = new THREE.WebGLRenderTarget( window.innerWidth, height, pars );
		postprocessing.rtTextureColor = new THREE.WebGLRenderTarget( window.innerWidth, height, pars );

		material_depth = new THREE.MeshDepthMaterial();

		var bokeh_shader = THREE.BokehShader;

		postprocessing.bokeh_uniforms = THREE.UniformsUtils.clone( bokeh_shader.uniforms );

		postprocessing.bokeh_uniforms[ "tColor" ].value = postprocessing.rtTextureColor;
		postprocessing.bokeh_uniforms[ "tDepth" ].value = postprocessing.rtTextureDepth;

		postprocessing.bokeh_uniforms[ "textureWidth" ].value = window.innerWidth;

		postprocessing.bokeh_uniforms[ "textureHeight" ].value = height;

		postprocessing.materialBokeh = new THREE.ShaderMaterial( {

			uniforms: postprocessing.bokeh_uniforms,
			vertexShader: bokeh_shader.vertexShader,
			fragmentShader: bokeh_shader.fragmentShader,
			defines: {
				RINGS: shaderSettings.rings,
				SAMPLES: shaderSettings.samples
			}

		} );

		postprocessing.quad = new THREE.Mesh( new THREE.PlaneGeometry( window.innerWidth, window.innerHeight ), postprocessing.materialBokeh );
		postprocessing.quad.position.z = - 500;
		postprocessing.scene.add( postprocessing.quad );

	}

	function shaderUpdate() {
		postprocessing.materialBokeh.defines.RINGS = shaderSettings.rings;
		postprocessing.materialBokeh.defines.SAMPLES = shaderSettings.samples;

		postprocessing.materialBokeh.needsUpdate = true;

	}


	function initSoundcloud()
	{
		SC.initialize({
		  client_id: sc_client_id
		});

		$("#sc_form").submit(function(event)
		{
			event.preventDefault();

			SC.get('/resolve', { url: $("#sc_url").val() }, function(track) 
			{
				console.log(track);

				if(!track.errors)			
					rackcity.initAudio(track.stream_url + "?client_id=" + sc_client_id);
				else
				{
					console.log("oops: ");
					console.log(track.errors[0].error_message)
				}
			});
		});
	}

	/**
	 * location 
	 **/

	function getLocation() 
	{
		$("#loading").html("Getting Location...");

		if(!TESTING)
		{
			if (navigator.geolocation) {
		        navigator.geolocation.getCurrentPosition(getLocationSuccess, showError);
		    } else {
		        $("#info").html("Geolocation is not supported by this browser.");
		    }
		}
		else
		{
			getLocationSuccess({coords:{latitude:"40.714352999999996", longitude:"-74.005973"}});
		}
	}

	function getLocationSuccess(position) 
	{
		$("#loading").html("Loading Location Data...");

	    $("#info").html("Latitude: " + position.coords.latitude + "<br>Longitude: " + position.coords.longitude); 

	    var url = "proxy/getLocation.php?lat=" + position.coords.latitude + "&lon=" + position.coords.longitude;
		var center_pt = [position.coords.longitude, position.coords.latitude];

		//testing
		if(TESTING)
			url = 'data/nyc.json';

		$.getJSON(url)
		.done(function(data){		
			$("#loading").html("");
			rackcity.init3D(data, center_pt);
			animate();
		})
		.fail(function(error){
			console.log(error);
		});
	}

	function showError(error) {
	    switch(error.code) {
	        case error.PERMISSION_DENIED:
	            $("#info").html("User denied the request for Geolocation."); //TODO - setup listbox choice
	            break;
	        case error.POSITION_UNAVAILABLE:
	             $("#info").html("Location information is unavailable.");
	             loadFakeData();
	            break;
	        case error.TIMEOUT:
	             $("#info").html("The request to get user location timed out.");
	            break;
	        case error.UNKNOWN_ERROR:
	             $("#info").html("An unknown error occurred.");
	            break;
	    }
	}

	function animate() {
		requestAnimationFrame(animate);
		//controls.update();
		render();
		stats.update();
	}

	function render() 
	{
		rackcity.update();

		frameCount += .002;
		camera.position.x = Math.sin(frameCount) * 675;
		camera.position.z = Math.cos(frameCount) * 1000;
		camera.lookAt(new THREE.Vector3(0,0,0));

		if ( postprocessing.enabled ) {
			renderer.clear();

			// Render scene into texture

			scene.overrideMaterial = null;
			renderer.render( scene, camera, postprocessing.rtTextureColor, true );

			// Render depth into texture

			scene.overrideMaterial = material_depth;
			renderer.render( scene, camera, postprocessing.rtTextureDepth, true );

			// Render bokeh composite

			renderer.render( postprocessing.scene, postprocessing.camera );


		} else {

			scene.overrideMaterial = null;

			renderer.clear();
			renderer.render( scene, camera );

		}
	}

	/**
	 * document handling
	**/

	function onDocumentMouseMove(event) {
		mouseX = (event.clientX - windowHalfX)*2;
		mouseY = (event.clientY - windowHalfY)*2;
	}

	function onWindowResize(event) {
		windowHalfX = window.innerWidth / 2;
		windowHalfY = window.innerHeight / 2;

		width = window.innerWidth;
		height = window.innerHeight;

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );
		// postprocessing.composer.setSize( width, height );
	}

	// function onDocumentDragOver(evt) {
	// 	evt.stopPropagation();
	// 	evt.preventDefault();
	// 	return false;
	// }

	// function onDocumentDrop(evt) {
	// 	evt.stopPropagation();
	// 	evt.preventDefault();

	// 	//clean up previous mp3
	// 	if (source) source.disconnect();
		
	// 	$('#loading').show();
	// 	$('#loading').text("loading...");

	// 	var droppedFiles = evt.dataTransfer.files;

	// 	var reader = new FileReader();

	// 	reader.onload = function(fileEvent) {
	// 		var data = fileEvent.target.result;
	// 		initAudio(data);
	// 	};

	// 	reader.readAsArrayBuffer(droppedFiles[0]);

	// }
});





