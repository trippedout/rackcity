var RackCity = (function() 
{
	var all_features;

	function init(data) 
	{
		console.log("RackCity::init()");
		console.log(data['buildings']);

		all_features = data;
	}


	function initAudio(url)
	{	
		console.log("RackCity::initAudio() " + url);

		audioContext = new window.webkitAudioContext();

		source = audioContext.createBufferSource();
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 1024;

		// Connect audio processing graph
		source.connect(analyser);
		analyser.connect(audioContext.destination);

		// Load asynchronously
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = "arraybuffer";

		console.log(url);

		request.onload = function() {
			audioContext.decodeAudioData(request.response, function(buffer) {
				audioBuffer = buffer;
				finishLoad();
			}, function(e) {
				console.log("error" + e);
			});


		};
		request.send();
	}

	function finishLoad() {
		source.buffer = audioBuffer;
		source.loop = true;
		source.start(0.0);
		// startViz();
	}

	function update() 
	{	

	}

	return {
		init:init,
		initAudio:initAudio,
		update:update
	};
}());