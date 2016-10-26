/**
 * lets get visual
**/

var TESTING = false;
var APP_ENGINE = false;
var USE_STATS = false;
var USE_PROXY = false;

define(function (require) 
{
	var ram = require('ram'),
		stats = require('stats'),
		rackcity = require('rackcity'),
		trackball = require('TrackballControls');

	var mouseX = 0, mouseY = 0, windowHalfX = window.innerWidth / 2, windowHalfY = window.innerHeight / 2, camera, scene, renderer, material, container;
	var width = window.innerWidth;
	var height = window.innerHeight;
	var sc_client_id = '043b42ab41aba38a605be0931d554f4b';
	var camXDist = 500, camYDist = 850;
	var controls;
	var dropArea;
	var processor;
	var xhr;
	var started = false;
	var frameCount = 0;
	var soundCloudUrl="";

	var postprocessing = { enabled  : true };

	var shaderSettings = {
		rings: 3,
		samples: 4
	};
	var material_depth;

	var currentLocationData, currentLocationCenterPt;
	var location=[0,0];

	var coordsList = {
		"CHICAGO" : { data: 'data/chicago.json', coords:{latitude:"41.8893", longitude:"-87.62625"}},
		"TOKYO" : { data: 'data/tokyo.json', coords:{latitude:"35.69001", longitude: "139.69464"}},
		"DOWNTOWN NYC" : { data: 'data/nyc.json', coords:{latitude:"40.70869", longitude: "-74.01113"}},
		"LONDON" : { data: 'data/london.json', coords:{latitude:"51.49994", longitude: "-0.12749"}},
		"ROME" : {  data: 'data/rome.json',coords:{latitude:"41.89026", longitude: "12.49237"}},
		"ROME EUR" : { data: 'data/rome-eur.json', coords:{latitude:"41.828041", longitude: "12.468089"}},
		"BARCELONA" : {data: 'data/bcn.json',  coords:{latitude:"41.4036299", longitude: "2.1721671"}}

	};

	$(document).ready(function() 
	{
		$.each(coordsList,function(t,o){
			$('#locationSelect').append($('<option>', {text: t}));
		})
		

		if (!window.WebGLRenderingContext) 
		{
		    // Browser has no idea what WebGL is. Suggest they
		    // get a new browser by presenting the user with link to
		    // http://get.webgl.org
			showInfo("ERROR","Your compure don't support webgl... really??");
		    return;   
		}
		
	    // var gl = $("#debugCtx")[0].getContext("webgl");   
	    var canvas = document.createElement('canvas');
	    var gl = canvas.getContext("webgl")
		if (!gl) {

			showInfo("ERROR","Your browser don't support webgl... check with another one.");
		    // Browser could not initialize WebGL. User probably needs to
		    // update their drivers or get a new browser. Present a link to
		    // http://get.webgl.org/troubleshooting
			return;  
		}

		//shit works - init!
		init();
		initSoundcloud();
		var lat=getParameterByName("lat");
		var lon=getParameterByName("lon");
		var url=getParameterByName("url");
		if(url)
			soundCloudUrl=decodeURIComponent(url);
		
		if(lat && lon)
			getLocationSuccess( {coords:{latitude:parseFloat(lat), longitude:parseFloat(lon)}},false);
		else
			getLocation();
	});
	function getParameterByName(name) {
		var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
		return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	}
	function init() 
	{
		//init 3D scene
		container = document.createElement('div');
		container.style.background_color = "#141a26";
		document.body.appendChild(container);
		camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 1000000);
		camera.position.z = 1200;
		camera.position.x = 650;
		camera.position.y = 325;
		// camera.setLens(90, window.innerWidth / window.innerHeight);
		camera.lookAt(new THREE.Vector3(0,0,0));

		scene = new THREE.Scene();
		scene.add(camera);
		
		renderer = new THREE.WebGLRenderer({
			antialias : true,
			sortObjects : false
		});
		renderer.setSize(window.innerWidth, window.innerHeight);

		renderer.autoClear = true;
		renderer.setClearColor(0x141a26, 1);
		renderer.clear();		
		container.appendChild(renderer.domElement);

		controls = new THREE.TrackballControls( camera, renderer.domElement );

		//add stats
		if(USE_STATS)
		{
			stats = new Stats();
			stats.domElement.style.position = 'absolute';
			stats.domElement.style.top = '0px';
			container.appendChild(stats.domElement);
		}

		// initSkymap();
		rackcity.setup(scene);

		$( "#locationSelect" ).change(function() {
			updateLocation();
		});

		$(document).click(function() {
			// all dropdowns
			$('.wrapper-dropdown-1').removeClass('active');
		});
		
		$('#title').click(function() {
			$("#sc_form").show();
			$("#sc_url").select();
		});
		$('#share').click(function() {
			var u =window.location.href.split('?')[0];

			$("#sc_url_share").val(u + "?lat=" + location[0] + "&lon=" + location[1] + "&url=" + encodeURIComponent(soundCloudUrl));
			$("#sc_form_share").show();
			$("#sc_url_share").select();
		});
		$('#btnCancel').click(function() {
			$("#sc_form").hide();
		});
		$('#btnClose').click(function() {
			$("#sc_form_share").hide();
		});
		$('#btnCloseInfo').click(function() {
			$("#sc_form_info").hide();
		});
		$('#trk_playlist').click(function() {
			$("#sc_form_playlist").show();
		});
		$('#lat').click(function() {
			$("#sc_latitude").val(location[0]);
			$("#sc_longitude").val(location[1]);
			$("#sc_form_position").show();
		});
		$('#lng').click(function() {
			$("#sc_latitude").val(location[0]);
			$("#sc_longitude").val(location[1]);
			$("#sc_form_position").show();
		});
		$('#btnClosePlaylist').click(function() {
			$("#sc_form_playlist").hide();
		});
		$("#sc_form_position").submit(function(event)
		{
			event.preventDefault();
			$("#sc_form_position").hide();
			getLocationSuccess({coords:{latitude:$("#sc_latitude").val(), longitude: $("#sc_longitude").val()}},false );

		});
		$('#btnClosePosition').click(function() {
			$("#sc_form_position").hide();
		});

		//init listeners
		// $("#loadSample").click( loadSampleAudio);
		document.onselectStart = function() { return false; };

		$(document).mousemove(onDocumentMouseMove);
		
		$(window).resize(onWindowResize);
		onWindowResize(null);
	}

	function showInfo(title,msg){
		$("#info_title").html(title);
		$("#info_msg").html(msg);
		$("#sc_form_info").show();
		animate()
	}

	function initSkymap()
	{
		var urls = [
			'imgs/bg_texture.jpg',
			'imgs/bg_texture.jpg',
			'imgs/bg_texture.jpg',
			'imgs/bg_texture.jpg',
			'imgs/bg_texture.jpg',
			'imgs/bg_texture.jpg'
		];

		var cubemap = THREE.ImageUtils.loadTextureCube(urls); // load textures
		cubemap.format = THREE.RGBFormat;

		var shader = THREE.ShaderLib['cube']; // init cube shader from built-in lib
		shader.uniforms['tCube'].value = cubemap; // apply textures to shader

		// create shader material
		var skyBoxMaterial = new THREE.ShaderMaterial( {
		fragmentShader: shader.fragmentShader,
		vertexShader: shader.vertexShader,
		uniforms: shader.uniforms,
		depthWrite: false,
		side: THREE.BackSide
		});

		// create skybox mesh
		var skybox = new THREE.Mesh(
		new THREE.CubeGeometry(2000, 2000, 2000),
		skyBoxMaterial
		);

		scene.add(skybox);
	}

	function loadStream(url){
		rackcity.initAudio([{"stream_url":url,"duration":36000000,"artwork_url":""}], sc_client_id);
		$("#chooseLocation").show();
		animate();
	}

	function loadSoundCloud(url){
		//event.preventDefault();

		SC.get('/resolve', { url: url}, function(track) 
		{
			$("#sc_form").hide();
			var tracks;
			if(track.track_count){//playlist
				tracks=track.tracks;
			}else if(Array.isArray(track)){
				tracks=track;
			}else if(track!=undefined && !track.errors){
				tracks=[track];
			}

			if(track==undefined){
				showInfo("ERROR","error loading track");
				$("#sc_form").show();
				$("#sc_url").select();
			}else{
				if(!track.errors)			
				{
					rackcity.initAudio(tracks, sc_client_id);
					$("#chooseLocation").show();
					animate();
				}else
				{
					showInfo("ERROR",track.errors[0].error_message);

				}
			}
			
			
		});
	}

	function initSoundcloud()
	{
		SC.initialize({
		  client_id: sc_client_id
		});

		$("#sc_form").submit(function(event)
		{
			soundCloudUrl=$("#sc_url").val();
			event.preventDefault();
			if(soundCloudUrl.indexOf("soundcloud")>0)
				loadSoundCloud(soundCloudUrl);
			else
				loadStream(soundCloudUrl);
		});
	}

	/**
	 * location 
	 **/

	function getLocation() 
	{
		$("#loading").html("LOCATING");

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
			getLocationSuccess(coordsList["DOWNTOWN NYC"]);
		}
	}

	function updateLocation()
	{
		console.log($("#locationSelect").val());
		var choice = $("#locationSelect").val();
		
		if(choice == "CURRENT")
		{
			//refresh current data
			if(currentLocationData != null)
				getLocationSuccess(); //send no data
		}
		else
		{
			getLocationSuccess(coordsList[choice], true);
		}
	}

	function getLocationSuccess(position, fromList) 
	{
		//YUP - THIS IS DUMB
		if(position == undefined)
		{
			$("#loading").html("");
			$("#lat").html(parseFloat(currentLocationCenterPt.latitude).toFixed(3));
	    	$("#lng").html(parseFloat(currentLocationCenterPt.longitude).toFixed(3)); 
			location=[currentLocationCenterPt.latitude,currentLocationCenterPt.longitude];

	    	clearScene();
	    	rackcity.init3D(currentLocationData, currentLocationCenterPt);
			return;
		}


	    $("#lat").html(parseFloat(position.coords.latitude).toFixed(3));
	    $("#lng").html(parseFloat(position.coords.longitude).toFixed(3)); 
		location=[position.coords.latitude,position.coords.longitude];

		$("#loading").html("LOADING LOCATION DATA<br/><span class=\"whoops\">THIS MIGHT TAKE A WHILE</span>");

		var url;
		if(APP_ENGINE)
	    	url = "http://sodium-airport-702.appspot.com/?lat=" + position.coords.latitude + "&lon=" + position.coords.longitude;
	    else
	    	url = "proxy/getLocation.php?lat=" + position.coords.latitude + "&lon=" + position.coords.longitude;

		console.log(url);
		var center_pt = [position.coords.longitude, position.coords.latitude];

		//if pulling from local shit, use file
		if(position.data)
			url = position.data;

		$.getJSON(url)
		.done(function(data)
		{		
			clearScene();
			$("#loading").html("");

			rackcity.init3D(data, center_pt);

			//if(!fromList)
			{
				//hopefully this is firing because its come from the inital choice 
				//so lets store the data as current location
				currentLocationData = data;
				currentLocationCenterPt = center_pt;
				if(soundCloudUrl!="")
					{
						if(soundCloudUrl.indexOf("soundcloud")>0)
							loadSoundCloud(soundCloudUrl);
						else
							loadStream(soundCloudUrl);
					}
				else
					$("#sc_form").show();
			}
		})
		.fail(function(error){
			console.log(error);
		});
	}


	function clearScene()
	{
		for ( i = scene.children.length - 1; i >= 0 ; i -- ) {
		    obj = scene.children[ i ];
		    if ( obj !== camera) {
		        scene.remove(obj);
		    }
		}
	}

	function loadFakeData(){
		getLocationSuccess(coordsList["DOWNTOWN NYC"]);
	}
	

	function showError(error) {
	    switch(error.code) {
	        case error.PERMISSION_DENIED:
	            showInfo("ERROR","User denied the request for Geolocation."); //TODO - setup listbox choice
	            break;
	        case error.POSITION_UNAVAILABLE:
	             showInfo("ERROR","Location information is unavailable.");
	             loadFakeData();
	            break;
	        case error.TIMEOUT:
	             showInfo("ERROR","The request to get user location timed out.");
	            break;
	        case error.UNKNOWN_ERROR:
	             showInfo("ERROR","An unknown error occurred.");
	            break;
	    }
	}

	function animate() {
		requestAnimationFrame(animate);
		controls.update();
		render();
		
		if(USE_STATS) stats.update();
	}

	function render() 
	{
		rackcity.update();

		frameCount += .0025;
		camera.position.x = Math.sin(frameCount) * camXDist;
		camera.position.z = Math.cos(frameCount) * camYDist;
		camera.lookAt(new THREE.Vector3(0,0,0));

		scene.overrideMaterial = null;

		// renderer.clear();
		renderer.render( scene, camera );
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
	}


	function DropDown(el) {
		this.dd = el;
		this.placeholder = this.dd.children('span');
		this.opts = this.dd.find('ul.dropdown > li');
		this.val = '';
		this.index = -1;
		this.initEvents();
	}

	DropDown.prototype = {
		initEvents : function() {
			var obj = this;

			obj.dd.on('click', function(event){
				$(this).toggleClass('active');
				return false;
			});

			obj.opts.on('click',function(){
				var opt = $(this);
				obj.val = opt.text();
				obj.index = opt.index();
				obj.placeholder.text('Gender: ' + obj.val);
			});
		},
		getValue : function() {
			return this.val;
		},
		getIndex : function() {
			return this.index;
		}
	}
	

	
});




		





