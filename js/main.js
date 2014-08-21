/**
 * lets get visual
**/

var mouseX = 0, mouseY = 0, windowHalfX = window.innerWidth / 2, windowHalfY = window.innerHeight / 2, camera, scene, renderer, material, container;
var source;
var analyser;
var buffer;
var audioBuffer;
var dropArea;
var audioContext;
var source;
var processor;
var xhr;
var started = false;

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
	getLocation();
});

function init() {

	//init 3D scene
	container = document.createElement('div');
	document.body.appendChild(container);
	camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000000);
	camera.position.z = 2000;
	scene = new THREE.Scene();
	scene.add(camera);
	renderer = new THREE.WebGLRenderer({
		antialias : false,
		sortObjects : false
	});
	renderer.setSize(window.innerWidth, window.innerHeight);

	container.appendChild(renderer.domElement);

	// stop the user getting a text cursor
	document.onselectStart = function() {
		return false;
	};

	//add stats
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	container.appendChild(stats.domElement);

	//init listeners
	// $("#loadSample").click( loadSampleAudio);
	$(document).mousemove(onDocumentMouseMove);
	$(window).resize(onWindowResize);
	document.addEventListener('drop', onDocumentDrop, false);
	document.addEventListener('dragover', onDocumentDragOver, false);

	onWindowResize(null);
	audioContext = new window.webkitAudioContext();
}

/**
 * location 
 **/

function getLocation() 
{
	$("#loading").html("Getting Location...");

	if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(getLocationSuccess, showError);
    } else {
        $("#info").html("Geolocation is not supported by this browser.");
    }
}

function getLocationSuccess(position) 
{
	$("#loading").html("Loading Location Data...");

    $("#info").html("Latitude: " + position.coords.latitude + 
    "<br>Longitude: " + position.coords.longitude); 

    //grab test location data
    getTestData();
}

function getTestData() 
{
	console.log("getTestData()");
	$.getJSON( "data/nyc.js")
	.done(function(data) {
		$("#loading").html("");
	    RackCity.init(data.features);
	    animate();
	})
	.fail(function(jqXHR, textStatus, errorThrown){
		//show error msg
		console.log(jqXHR);
	});
}

function showError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            $("#info").html("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
             $("#info").html("Location information is unavailable.");
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
	render();
	stats.update();
}

function render() {
	RackCity.update();

	var xrot = mouseX/window.innerWidth * Math.PI*2 + Math.PI;
	var yrot = mouseY/window.innerHeight* Math.PI*2 + Math.PI;

	// LoopVisualizer.loopHolder.rotation.x += (-yrot - LoopVisualizer.loopHolder.rotation.x) * 0.3;
	// LoopVisualizer.loopHolder.rotation.y += (xrot - LoopVisualizer.loopHolder.rotation.y) * 0.3;

	renderer.render(scene, camera);
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
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	return false;
}

function onDocumentDrop(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	//clean up previous mp3
	if (source) source.disconnect();
	LoopVisualizer.remove();

	$('#loading').show();
	$('#loading').text("loading...");

	var droppedFiles = evt.dataTransfer.files;

	var reader = new FileReader();

	reader.onload = function(fileEvent) {
		var data = fileEvent.target.result;
		initAudio(data);
	};

	reader.readAsArrayBuffer(droppedFiles[0]);

}






