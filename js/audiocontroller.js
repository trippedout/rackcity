define(function (require) 
{
	var javascriptNode;

	function getUrlRedirect(url,returnfunc){
		$.post(url, {}, function(response, status, request) {
			if (status == 280) {
				// you need to return the redirect url
				returnfunc(response.redirectUrl);
			} else {
				returnfunc(url);
			}
		});
	}

	function initAudio(url, audioContext, source, analyser, audioProcessCallback)
	{
		var buffer;
		var audioBuffer;


		var request = new XMLHttpRequest();
		if (USE_PROXY){
			request.open("GET", "proxy.php", true);
			request.setRequestHeader('X-Proxy-URL',url);
			console.log("proxy.php?csurl=" + encodeURIComponent(url));
		}else{
			request.open("GET", url, true);
		}
		
		request.responseType = "arraybuffer";

		
		// filter for testing low freq's alone
		var filter = audioContext.createBiquadFilter();
		filter.type = "lowpass"; 
		filter.frequency.value = 50;
		// filter.gain.value = -20;


		javascriptNode = audioContext.createScriptProcessor(1024, 1, 1);        
        javascriptNode.onaudioprocess = audioProcessCallback;
	 	
	 	// fake gain for script processor bug workaround
		var gainNode = audioContext.createGain();
		// gainNode.gain.value = 0;			

		request.onload = function() {
			//audioContext.close();

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
				console.log("error: " + e);
			});


		};
		request.onerror = function (e) {
			console.log("Error Status: " + e.target.status);
			if(!USE_PROXY){
				console.log("try via proxy");
				USE_PROXY=true;
				initAudio(url, audioContext, source, analyser, audioProcessCallback)
			}else{
				console.log("unrecoverable error");
			}
			
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