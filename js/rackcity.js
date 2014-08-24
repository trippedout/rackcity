var RackCity = (function() 
{
	var all_features, small_roads, large_roads, buildings;
	var center_xy;

	function init(data, center_pt) 
	{
		console.log("RackCity::init()");
		console.log(data);

		all_features = data;
		small_roads = data['small_roads'];
		large_roads = data['large_roads'];
		buildings = data['buildings'];

		// var source = new proj4.Proj('EPSG:4326');    //source coordinates will be in Longitude/Latitude, WGS84
		// var dest = new proj4.Proj('EPSG:3785');     //destination coordinates in meters, global spherical mercators projection, see http://spatialreference.org/ref/epsg/3785/
		center_xy = proj4('EPSG:4326', 'EPSG:3785', center_pt);  

		// transforming point coordinates
		var p = [-73.94059270000001,40.7164992];   //any object will do as long as it has 'x' and 'y' properties
		var xy = proj4('EPSG:4326', 'EPSG:3785', p);  

		console.log(center_xy + "::" + xy + " : " + (center_xy[0] - xy[0]) + ", " + (center_xy[1] - xy[1]) );


		drawShit(small_roads, new THREE.LineBasicMaterial({
	        color: 0x0000ff
	    }));

	    drawShit(large_roads, new THREE.LineBasicMaterial({
	        color: 0xff0000
	    }));

	    drawBuildings(buildings, new THREE.LineBasicMaterial({
	        color: 0x00ff00
	    }));
	}

	function drawShit(container, material)
	{
		for(var i = 0; i < container.length; i++)
		{
			var geometry = new THREE.Geometry();
			var pts = container[i];

			for(var j = 0; j < pts.length; j++)
			{
				var latlng = [pts[j].lon, pts[j].lat];
				var pt_xy = proj4('EPSG:4326', 'EPSG:3785', latlng);  
				var vec3 = new THREE.Vector3(
		    		pt_xy[0] - center_xy[0], 
		    		0,
		    		pt_xy[1] - center_xy[1]
		    		
		    	);

		    	console.log(vec3);

			    geometry.vertices.push(vec3);
			}

			var line = new THREE.Line(geometry, material);
			scene.add(line);
		}
	}

	function drawBuildings(container, material)
	{
		for(var i = 0; i < container.length; i++)
		{
			var geometry = new THREE.Geometry();
			var pts = container[i]['pts'];

			for(var j = 0; j < pts.length; j++)
			{
				var latlng = [pts[j].lon, pts[j].lat];
				var pt_xy = proj4('EPSG:4326', 'EPSG:3785', latlng);  
				var vec3 = new THREE.Vector3(
		    		pt_xy[0] - center_xy[0], 
		    		0,
		    		pt_xy[1] - center_xy[1]
		    		
		    	);

			    geometry.vertices.push(vec3);
			}

			var line = new THREE.Line(geometry, material);
			scene.add(line);
		}
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