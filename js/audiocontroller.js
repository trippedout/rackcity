define(function (require) 
{
	var javascriptNode;

	function initAudio(url, audioContext, source, analyser, audioProcessCallback)
	{

		var buffer;
		var audioBuffer;

		// Connect audio processing graph
		// source.connect(analyser);
		// analyser.connect(audioContext.destination);

		// Load asynchronously
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = "arraybuffer";

		
		
		// Create the audio graph.
		var filter = audioContext.createBiquadFilter();
		// Create and specify parameters for the low-pass filter.
		filter.type = "lowpass"; // Low-pass filter. See BiquadFilterNode docs
		filter.frequency.value = 50; // Set cutoff to 440 HZ
		// filter.gain.value = -20;

			

		javascriptNode = audioContext.createScriptProcessor(512, 1, 1);        
        javascriptNode.onaudioprocess = audioProcessCallback;
	 	
	 	// filter.connect(javascriptNode);
		var gainNode = audioContext.createGain();
		// gainNode.gain.value = 0;
			

		request.onload = function() {
			audioContext.decodeAudioData(request.response, function(buffer) {
				source.buffer = buffer;
				source.loop = true;
				
				source.connect(analyser);
				// filter.connect(analyser);
				analyser.connect(gainNode);
				gainNode.connect(audioContext.destination);
				javascriptNode.connect(gainNode);
				// gainNode.connect(javascriptNode);
				
				// console.log(filter);
				// filter.connect(analyser);
				
				// // javascriptNode.connect(audioContext.destination);
				// analyser.connect(audioContext.destination);

				source.start(0.0);
				// finishLoad();
			}, function(e) {
				console.log("error" + e);
			});


		};
		request.send();
	}

	function getAverageVolume(array) {
        var values = 0;
        var average;
 
        var length = array.length;
 
        // get all the frequency amplitudes
        for (var i = 0; i < length; i++) {
            values += array[i];
        }
 
        average = values / length;
        return average;
    }

	return {
		initAudio: initAudio
	}
});