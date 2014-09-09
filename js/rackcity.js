define(function (require) 
{
	var proj4 = require('proj4'),
		audioController = require('audiocontroller');

	var scene;

	var all_features, small_roads, large_roads, buildings;
	var center_xy;

	var large_roads_lines, small_road_lines;
	var building_dots;

	function setup(sc)
	{
		scene = sc;
	}

	function init3D(data, center_pt) 
	{
		console.log("RackCity::init()");
		console.log(data);

		all_features = data;
		small_roads = data['small_roads'];
		large_roads = data['large_roads'];
		buildings = data['buildings'];

		//get center pt xy projection for normalizing other points
		center_xy = proj4('EPSG:4326', 'EPSG:3785', center_pt);

		//place sphere at center 
		var geometry = new THREE.SphereGeometry( 5, 32, 32 );
		var material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
		var sphere = new THREE.Mesh( geometry, material );
		scene.add( sphere );

		small_road_lines = drawShit(small_roads, new THREE.LineBasicMaterial({
	        color: 0xffffff
	    }));

	    large_roads_lines = drawShit(large_roads, new THREE.LineBasicMaterial({
	        color: 0xffffffff,
	        linewidth: 2
	    }));

	    building_dots = drawBuildings(buildings, new THREE.LineBasicMaterial({
	        color: 0xffffff
	    }));
	}

	function drawShit(container, material)
	{
		var allLines = [];

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
			    geometry.vertices.push(vec3);
			}

			var line = new THREE.Line(geometry, material);
			allLines.push(line);
			scene.add(line);
		}

		return allLines;
	}

	function drawBuildings(container, material)
	{
		var material = new THREE.PointCloudMaterial({
		  color: 0xEE5E5FF,
		  size: 1.5
		  // map: THREE.ImageUtils.loadTexture(
		  //   "images/particle.png"
		  // ),
		  // blending: THREE.AdditiveBlending,
		  // transparent: true
		});

		var clouds = [];

		for(var i = 0; i < container.length; i++)
		{
			var geometry = new THREE.Geometry();
			
			// find height or elevation
			var height = Math.round(container[i]['height']);
			if(height == null)
				height = Math.round(container[i]['ele']);
			if(height == null || height == NaN || height == undefined)
				height = 5;

			//figure out how many points in a floor
			var pts = container[i]['pts'];

			//iterate one per floor
			for(var h = 0; h < height; h++)
			{
				if(h % 3 == 0 && h != height - 1)
				{
					for(var j = 0; j < pts.length; j++)
					{
						var latlng = [pts[j].lon, pts[j].lat];
						var pt_xy = proj4('EPSG:4326', 'EPSG:3785', latlng);  

						var vec3 = new THREE.Vector3(
				    		pt_xy[0] - center_xy[0], 
				    		h * 5,
				    		pt_xy[1] - center_xy[1]	
				    	);					

					    geometry.vertices.push(vec3);
					}
				}

				if(h == height - 1)
				{
					for(var j = 0; j < pts.length; j++)
					{
						var latlng = [pts[j].lon, pts[j].lat];
						// var pt_xy = proj4('EPSG:4326', 'EPSG:3785', latlng);  

						// var vec3 = new THREE.Vector3(
				  //   		pt_xy[0] - center_xy[0], 
				  //   		h * 5,
				  //   		pt_xy[1] - center_xy[1]	
				  //   	);					

					 //    geometry.vertices.push(vec3);

					    var geometry = new THREE.SphereGeometry( 5, 32, 32 );
						var material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
						var sphere = new THREE.Mesh( geometry, material );
						scene.add( sphere );
					}
				}
			}

			//draw top and bottom
			drawBuildingOutline(pts, height);

			var mesh = new THREE.PointCloud( geometry, material );
			clouds.push(mesh);
			// add it to the scene
			scene.add(mesh);
		}

		return clouds;
	}

	function drawBuildingOutline(pts, height)
	{
		var geometry = new THREE.Geometry();

		for(var j = 0; j < pts.length; j++)
		{
			var latlng = [pts[j].lon, pts[j].lat];
			var pt_xy = proj4('EPSG:4326', 'EPSG:3785', latlng);  

			var vec3 = new THREE.Vector3(
	    		pt_xy[0] - center_xy[0], 
	    		height === undefined ? 0 : height * 5,
	    		pt_xy[1] - center_xy[1]	
	    	);					

		    geometry.vertices.push(vec3);
		}

		var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
	        color: 0x474d59
	    }));

		scene.add(line);
	}


	/**
	 * initAudio() 
	 * pass URL to start audioContext for managing visualization
	 **/
	function initAudio(url)
	{	
		console.log("RackCity::initAudio() " + url);
		
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		var audioContext = new AudioContext();

		var source = audioContext.createBufferSource();
		var analyser = audioContext.createAnalyser();
		analyser.smoothingTimeConstant = 0.01;
		analyser.fftSize = 2048;

		//testing
		var container = document.createElement('div');
		document.body.appendChild(container);
		container.width  = 1024;
        container.height = 256;
        container.style.position = "absolute";
        container.style.top = "100px";
        container.style.left = "50px";

		var canvas = document.createElement('canvas');
		container.appendChild(canvas);
		canvas.width  = 1024;
        canvas.height = 256;
        
        var ctx = canvas.getContext("2d");
        ctx.strokeStyle="red";

        var bassBeat = false;
        var bassMaxSize = 10;
        var bassSize = 0;

        var trebBeat = false;
        var trebMaxSize = 10;
        var trebSize = 0;

        var midSize = 0;

		audioController.initAudio(url, audioContext, source, analyser, function() 
		{
			var array =  new Uint8Array(analyser.frequencyBinCount);
	        analyser.getByteFrequencyData(array);
	 		// console.log(array);
			

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			//BASS
			var avg = getAverageVolume(array.subarray(0,4))

			if(!bassBeat && avg < 210) bassBeat = !bassBeat;			
			if(bassBeat && avg >= 245)
			{
				bassBeat = !bassBeat;
				bassSize = 12;
				// console.log("new beat!");
			}
			if(bassSize > 0) bassSize -= .25;

			drawLines(bassSize, large_roads_lines);

			//HIGH TREBLE
			avg = getAverageVolume(array.subarray(-50))

			if(!trebBeat && avg == 0) trebBeat = !trebBeat;			
			if(trebBeat && avg >= 25)
			{
				trebBeat = !trebBeat;
				trebSize = 5;
				// console.log("new beat!");
			}
			if(trebSize > 0) trebSize -= .5;

			drawLines(trebSize, small_road_lines);


			avg = getAverageVolume(array.subarray(100, -100));
			//console.log(avg);

			for(var i = 0; i < building_dots.length; i++)
			{
				var cloud = building_dots[i];
				cloud.material.size = map(avg, 0, 255, .5, 6);
			}


	 		// for(var i = 0; i < array.length; i++)
	 		// {
	 		// 	ctx.beginPath();
		  //   	ctx.moveTo(i, 256);
		  //   	ctx.lineTo(i, 256 - array[i]);
		  //    	ctx.stroke();
	 		// }

	        // console.log(); //512
		});
	}

	function map(value, start1, stop1, start2, stop2) 
	{
    	return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  	}

	function drawLines(size, lines)
	{
		for(var i = 0; i < lines.length; i++)
		{
			var line = lines[i];
			line.material.linewidth = size;
		}
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

	// function finishLoad() {
	// 	source.buffer = audioBuffer;
	// 	source.loop = true;
	// 	source.start(0.0);
	// 	// startViz();
	// }

	function update() 
	{	

	}

	return {
		setup:setup,
		init3D:init3D,
		initAudio:initAudio,
		update:update
	};
});


