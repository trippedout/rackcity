define(function (require) 
{
	var javascriptNode;

	function initAudio(url, audioContext, source, analyser, audioProcessCallback)
	{
		var buffer;
		var audioBuffer;

		// Load 
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = "arraybuffer";


		// filter for testing low freq's alone
		var filter = audioContext.createBiquadFilter();
		filter.type = "lowpass"; 
		filter.frequency.value = 50;
		// filter.gain.value = -20;


		javascriptNode = audioContext.createScriptProcessor(512, 1, 1);        
        javascriptNode.onaudioprocess = audioProcessCallback;
	 	

	 	// fake gain for script processor bug workaround
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

				source.start(0.0);

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