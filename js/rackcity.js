define(function (require) 
{
	var proj4 = require('proj4'),
		audioController = require('audiocontroller');

	

	var scene;

	var all_features, small_roads, large_roads, buildings;
	var center_xy;

	var large_roads_lines, small_road_lines;
	var building_dots = [], building_top_dots = [];

	var lowsMidsHighsBuildingsGroups = [];

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

		lowsMidsHighsBuildingsGroups = [];

		//get center pt xy projection for normalizing other points
		center_xy = proj4('EPSG:4326', 'EPSG:3785', center_pt);

		initHomeLine();

	    //build roads and buildings
		small_road_lines = drawRoads(small_roads);
	    large_roads_lines = drawRoads(large_roads);

	    drawBuildings(buildings);
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
		    '    gl_FragColor = vec4( 0.8, 0.8, 0.8, a );\n' +
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

	    material.linewidth = 3;

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

	    material.linewidth = 2;

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
		    		pt_xy[1] - center_xy[1],
		    		0,
		    		pt_xy[0] - center_xy[0]
		    	);
			    geometry.vertices.push(vec3);
			}

			var line = new THREE.Line(geometry, material);
			allLines.push(line);
			scene.add(line);
		}

		return allLines;
	}

	function drawBuildings(container)
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
	        color: { type: "c", value: new THREE.Color( 0xd1effd ) },
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
		topDotsMaterial.uniforms.color.value = new THREE.Color(0xffffff);


		var buildingsByHeight = [];

		//sort buildings by height
		for(var i = 0; i < container.length; i++)
		{
			var height = Math.round(container[i]['height']);			
			if(isNaN(height))
				height = Math.round(container[i]['ele']);
			if(isNaN(height))
				height = Math.round(container[i]['levels']) * 4;
			if(isNaN(height))
				height = 20;

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
		    lowsMidsHighsBuildingsGroups.push(createBuildingGroup(temparray));
		}

		function createBuildingGroup(tempArray)
		{
			var group = {};
			var geometry = new THREE.Geometry();

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
					    		pt_xy[1] - center_xy[1],
					    		h * 5,
					    		pt_xy[0] - center_xy[0] 
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
					    		pt_xy[1] - center_xy[1], 
					    		h * 5,
					    		pt_xy[0] - center_xy[0]
					    	);					

						    topDotsGeom.vertices.push(vec3);
						}
					}
				}


				//draw top and bottom
				drawBuildingOutline(pts, height);

				
		    }
		    
		    var mesh = new THREE.PointCloud( geometry, material );
			var topDotsMesh = new THREE.PointCloud( topDotsGeom, topDotsMaterial );
			
			// add it to the scene
			scene.add(mesh);
			scene.add(topDotsMesh);

			group.mainMesh = mesh;
			group.topDotsMesh = topDotsMesh;

			return group;
		}		
	}

	function drawBuildingOutline(pts, height)
	{
		var geometry = new THREE.Geometry();

		for(var j = 0; j < pts.length; j++)
		{
			var latlng = [pts[j].lon, pts[j].lat];
			var pt_xy = proj4('EPSG:4326', 'EPSG:3785', latlng);  

			var vec3 = new THREE.Vector3(
	    		pt_xy[1] - center_xy[1], 
	    		0, //height === undefined ? 0 : height * 5,
	    		pt_xy[0] - center_xy[0]
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
	var audioContext;
	var playList=[];
	var curtrack=0;
	var client_id;
	function initAudio(tracks, sc_client_id){
		playList=tracks;
		curtrack=0;
		client_id=sc_client_id;
		_initAudio(playList[curtrack],client_id);
	}

	function updateTimestamp(){
		if(audioContext.currentTime>duration){
			nextTrack();
			return;
		}
		var date = new Date(null);
		date.setSeconds(audioContext.currentTime); // specify value for SECONDS here
		var t=date.toISOString().substr(11, 8);
		$("#trackCount").text("" + (curtrack+1) + "/" +playList.length);
		$("#timestamp").text(t);
		setTimeout(updateTimestamp,1000);
	}

	function nextTrack(){
		duration=100000;
		$("#timestamp").text("00:00:00");
		curtrack++;
		if(curtrack>playList.length-1)
			curtrack=0;
		_initAudio(playList[curtrack],client_id);
	}

	function prevTrack(){
		duration=100000;
		$("#timestamp").text("00:00:00");
		curtrack--;
		if(curtrack<0)
			curtrack=playList.length-1;
		_initAudio(playList[curtrack],client_id);
	}

	function pauseTrack(){
		audioContext.suspend();
		$("#trk_pause").hide();
		$("#trk_play").show();
	}

	function playTrack(){
		audioContext.resume();
		$("#trk_pause").show();
		$("#trk_play").hide();
	}

	function _initAudio(track, sc_client_id)
	{	
		console.log("RackCity::initAudio() ");
		console.log(track);

		var url = track.stream_url + "?client_id=" + sc_client_id;
		
		duration = track.duration/1000;
		
		$("#trk_prev").unbind().click(prevTrack);
		$("#trk_next").unbind().click(nextTrack);
		$("#title").text(track.title);
		$("#songinfo").show();
		setTimeout(updateTimestamp,1000);
		
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		if(audioContext && audioContext.close)
			audioContext.close();
		audioContext = new AudioContext();

		audioContext.ended = function() {
			console.log("song over"); //well this shit doesnt work
		}
		$("#trk_pause").show();
		$("#trk_play").hide();
		$("#trk_pause").unbind().click(pauseTrack);
		$("#trk_play").unbind().click(playTrack);
		var sampleRate = audioContext.sampleRate;

		var beatdetect = new FFT.BeatDetect(1024, sampleRate);
		
		var source = audioContext.createBufferSource();
		source.onended = function() {
			console.log("song over"); //well this shit doesnt work
		}
		
		var analyser = audioContext.createAnalyser();
		analyser.smoothingTimeConstant = 0.85;
		analyser.fftSize = 2048;

        var bassSize = 0;
        var trebSize = 0;
		
		audioController.initAudio(url, audioContext, source, analyser, function() 
		{
			var array =  new Uint8Array(analyser.frequencyBinCount);
	        analyser.getByteFrequencyData(array);
	 		
	 		var floats = new Float32Array(analyser.frequencyBinCount);
	 		analyser.getFloatTimeDomainData(floats);
	 		
			beatdetect.detect(floats);

			//todo - push all this to the shader along with 
			//texture filled with actual float array of sound buffer
			if(beatdetect.isKick() ) bassSize = 4;//.75; //console.log("isKick()");
			if(bassSize > 0) bassSize -= .25;
			drawLines(bassSize, large_roads_lines);
			
			if(beatdetect.isSnare() ) trebSize = 2.75;// console.log("isSnare()");
			if(trebSize > 0) trebSize -= .05;
			drawLines(trebSize, small_road_lines);

			var lowsMidsHighs = [
				getAverageVolume(array.subarray(750, 1024)),
				getAverageVolume(array.subarray(180, 750)),
				getAverageVolume(array.subarray(0, 180))
			];

			for(var i = 0; i < lowsMidsHighsBuildingsGroups.length; i++)
			{
				var bldg = lowsMidsHighsBuildingsGroups[i];
				bldg.mainMesh.material.uniforms.volume.value = map(lowsMidsHighs[i], 40, 230, .35, 1.1);
				bldg.topDotsMesh.material.uniforms.volume.value = map(lowsMidsHighs[i], 40, 230, .35, 1.1);
			}

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

	}

	function formatTime(seconds) 
	{
		minutes = Math.floor(seconds / 60);
		minutes = (minutes >= 10) ? minutes : "0" + minutes;
		seconds = Math.floor(seconds % 60);
		seconds = (seconds >= 10) ? seconds : "0" + seconds;
		return minutes + ":" + seconds;
	}

	return {
		setup:setup,
		init3D:init3D,
		initAudio:initAudio,
		update:update
	};
});


