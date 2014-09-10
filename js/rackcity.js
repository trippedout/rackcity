define(function (require) 
{
	var proj4 = require('proj4'),
		audioController = require('audiocontroller');

	// var beatdetect = new FFT.BeatDetect(512, 512);

	var scene;

	var all_features, small_roads, large_roads, buildings;
	var center_xy;

	var large_roads_lines, small_road_lines;
	var building_dots = [], building_top_dots = [];

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

		initHomeLine();

	    //build roads and buildings
		small_road_lines = drawRoads(small_roads);
	    large_roads_lines = drawRoads(large_roads);

	    building_dots = drawBuildings(buildings, new THREE.LineBasicMaterial({
	        color: 0xffffff
	    }));
	}

	function initHomeLine()
	{		
		var vertexShader = 
			//'uniform float[512] spectrum;\n' +
			'varying float vHeight;' +
		    'void main() {\n' +
		    '    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n' +
		    '    vHeight = position.y;\n' +
		    '    gl_Position = projectionMatrix * mvPosition;\n' +
		    '}';

		var fragmentShader = 
		    'varying float vHeight;' +
		    'void main() {\n' +
		    '	float a = 1.0;\n' +
		    '	if(vHeight > 750.0) a = 0.0;\n' +
		    '	else if(vHeight > 400.0) a = (750.0 - vHeight) / 400.0;\n' +
		    '    gl_FragColor = vec4( 0.8, 0.8, 0.8, a - .2 );\n' +
		    '}';

		var uniforms = {
			spectrum: { type: 'f', values:[] }
		} ;

	    var material = new THREE.ShaderMaterial({
	        //uniforms:       uniforms,
	        vertexShader:   vertexShader,
	        fragmentShader: fragmentShader,
	        transparent:    true
	    });

	    material.linewidth = 2;

		//place line up from center
		var line_geom = new THREE.Geometry();
		var bottom = new THREE.Vector3(0, 0, 0);
		var top = new THREE.Vector3(0, 750, 0);
		line_geom.vertices.push(bottom);
		line_geom.vertices.push(top);
		var line = new THREE.Line(line_geom, material);
	    scene.add(line);
	}

	function drawRoads(container)
	{
		var vertexShader = 
			'uniform float burst;\n' +
			'varying float vPercent;\n' +		
			'varying float vDist;\n' +
		    'void main() {\n' +
		    '   vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n' +
		    '   vDist = distance(vec2(0,0), position.xz);\n' +
		    '   vPercent = 1.0;\n' +
		    '   gl_Position = projectionMatrix * mvPosition;\n' +
		    '}';

		var fragmentShader = 
			'uniform float burst;\n' +
		    'varying float vPercent;\n' +
			'varying float vDist;\n' +
		    'void main() {\n' +
		    '    float a = 1.0;\n' +
		    '    if(vDist > 850.0 )\n' +
		    '		a = 0.0;\n' +
		    '	 else if(vDist > 500.0)\n' +
		    '    	a = (850.0 - vDist) / 500.0;\n' + 
		    '    gl_FragColor = vec4( 1.0, 1.0, 1.0, a );//1.0 );\n' +
		    '}';

		var uniforms = {
			burst: { type:'f', value: 0.0 }
		};

	    var material = new THREE.ShaderMaterial({
	        uniforms:       uniforms,
	        vertexShader:   vertexShader,
	        fragmentShader: fragmentShader,
	        transparent:    true
	    });

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

	var lowsMidsHighsBuildingsGroups = [];

	function drawBuildings(container, material)
	{
		var particleShaderVertex = 
			'uniform float pointSize;\n' +
			'uniform float volume;\n' +
			'uniform float alpha;\n' +
		    'void main() {\n' +
		    '    vec4 mvPosition = modelViewMatrix * vec4( position.x, position.y * volume, position.z, 1.0 );\n' +
		    '    gl_PointSize = pointSize;\n' +
		    '    vec4 pos = projectionMatrix * mvPosition;\n' +
		    '    gl_Position = vec4(pos.x, pos.y, pos.z, pos.w);\n' +
		    '}';

		var particleShaderFragment = 
			'uniform vec3 color;\n' +
		    'uniform float alpha;\n' +
		    'void main() {\n' +
		    '    gl_FragColor = vec4( color, alpha );\n' +
		    '}';

	    // uniforms
	    var uniforms = {
	        color: { type: "c", value: new THREE.Color( 0xffffff ) },
	        volume: { type: "f", value: 0 },
	        pointSize: { type: "f", value: 2 }, 
	        alpha: { type: "f", value: 0.5 }, 
	    };

		var material = new THREE.ShaderMaterial({
	        uniforms:       uniforms,
	        vertexShader:   particleShaderVertex,
	        fragmentShader: particleShaderFragment,
	        transparent:    true
	    });


		var clouds = [];

		var topDotsGeom = new THREE.Geometry();
		var topDotsMaterial = material.clone();
		topDotsMaterial.uniforms.pointSize.value = 3.0;
		topDotsMaterial.uniforms.alpha.value = .88;


		var buildingsByHeight = [];

		//sort buildings by height
		for(var i = 0; i < container.length; i++)
		{
			var height = Math.round(container[i]['height']);
			if(height == null)
				height = Math.round(container[i]['ele']);
			if(height === null || isNaN(height) || height == undefined )
				height = 5;

			buildingsByHeight.push({ ht:height, id:i });
		}

		function compare(a,b) {
		  if (a.ht < b.ht)
		     return -1;
		  if (a.ht > b.ht)
		    return 1;
		  return 0;
		}

		buildingsByHeight.sort(compare); // low to high

		//chunk through height arrays in thirds
		var i,j,temparray,chunk = buildingsByHeight.length / 3;

		for (i=0,j=buildingsByHeight.length; i<j; i+=chunk) 
		{
		    temparray = buildingsByHeight.slice(i,i+chunk);
		    console.log(temparray[0]);
		    
		    lowsMidsHighsBuildingsGroups.push(createBuildingGroup(temparray));
		}

		function createBuildingGroup(tempArray)
		{
			var group = {};
			var geometry = new THREE.Geometry();

			console.log(tempArray.length);

		    for(var k = 0; k < tempArray.length; k++)
		    {
		    	var height = tempArray[k].ht;
		    	var pts = container[tempArray[k].id]['pts'];

		    	for(var h = 0; h < height; h++)
				{
					if(h % 4 == 0 && h != height - 1)
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

					//do something when its top
					if(h == height - 1)
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

						    topDotsGeom.vertices.push(vec3);
						}
					}
				}


				//draw top and bottom
				drawBuildingOutline(pts, height);

				
		    }
		    
		    var mesh = new THREE.PointCloud( geometry, material );
			// clouds.push(mesh);

			var topDotsMesh = new THREE.PointCloud( topDotsGeom, topDotsMaterial );
			// building_top_dots.push(topDotsMesh);

			// add it to the scene
			scene.add(mesh);
			scene.add(topDotsMesh);

			group.mainMesh = mesh;
			group.topDotsMesh = topDotsMesh;

			return group;
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
	    		0, //height === undefined ? 0 : height * 5,
	    		pt_xy[1] - center_xy[1]	
	    	);					

		    geometry.vertices.push(vec3);
		}

		var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
	        color: 0x4d576e
	    }));

		scene.add(line);
	}

	var duration; 

	/**
	 * initAudio() 
	 * pass URL to start audioContext for managing visualization
	 **/
	function initAudio(track, sc_client_id)
	{	
		var url = track.stream_url + "?client_id=" + sc_client_id;
		
		console.log("RackCity::initAudio() " + url);

		duration = track.duration;
		
		$("#artist").text(track.title);
		$("#songinfo").show();

		
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		var audioContext = new AudioContext();

		var source = audioContext.createBufferSource();
		var analyser = audioContext.createAnalyser();
		analyser.smoothingTimeConstant = .85;
		analyser.fftSize = 1024;

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

	 	// 	var floats = new Float32Array(analyser.frequencyBinCount);
			// analyser.getFloatFrequencyData(floats);

			// beatdetect.detect(floats);

			// if(beatdetect.isKick() ) console.log("isKick()");
			// if(beatdetect.isSnare() ) console.log("isSnare()");

			//BASS
			var avg = getAverageVolume(array.subarray(0,3))

			if(!bassBeat && avg < 210) bassBeat = !bassBeat;			
			if(bassBeat && avg >= 245)
			{
				bassBeat = !bassBeat;
				bassSize = 2.75;
				// console.log("new beat!");
			}
			if(bassSize > 0) bassSize -= .025;

			drawLines(bassSize, large_roads_lines);

			//HIGH TREBLE
			avg = getAverageVolume(array.subarray(-50))

			if(!trebBeat && avg == 0) trebBeat = !trebBeat;			
			if(trebBeat && avg >= 25)
			{
				trebBeat = !trebBeat;
				trebSize = 2.75;
				// console.log("new beat!");
			}
			if(trebSize > 0) trebSize -= .05;

			drawLines(trebSize, small_road_lines);


			var lowsMidsHighs = [
				getAverageVolume(array.subarray(160, 255)),
				getAverageVolume(array.subarray(80, 160)),
				getAverageVolume(array.subarray(0, 80))
			];

			// console.log(lowsMidsHighs);

			for(var i = 0; i < lowsMidsHighsBuildingsGroups.length; i++)
			{
				var bldg = lowsMidsHighsBuildingsGroups[i];
				bldg.mainMesh.material.uniforms.volume.value = map(lowsMidsHighs[i], 40, 230, .5, 1.5);
				bldg.topDotsMesh.material.uniforms.volume.value = map(lowsMidsHighs[i], 40, 230, .5, 1.5);
			}

			

			// ctx.clearRect(0, 0, canvas.width, canvas.height);
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
		if(size > 0.0);
		{
			for(var i = 0; i < lines.length; i++)
			{
				var line = lines[i];
				line.material.linewidth = size;
				line.material.uniforms.burst.value = size;
			}
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
		//update song time

	}

	return {
		setup:setup,
		init3D:init3D,
		initAudio:initAudio,
		update:update
	};
});


