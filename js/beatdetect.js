FFT.BeatDetect = function(timeSize, sampleRate) 
{
	var	FREQ_ENERGY		= 0;
	var	SOUND_ENERGY	= 1;

	var					algorithm;
	var					sampleRate;
	var					timeSize;
	var					valCnt;
	var 				valGraph; //float[]
	var					sensitivity;
	// for circular buffer support
	var					insertAt;
	// vars for sEnergy
	var				isOnset; //bool
	var				eBuffer;//float[]
	var				dBuffer;//float[]
	var				timer;
	// vars for fEnergy
	var				fIsOnset; //bool[]
	var				spect; //FFT ref
	var				feBuffer; //float[][]
	var				fdBuffer; //float[][]
	var				fTimer; //long[]
	var				varGraph; //float[]
	var				varCnt;

	/**
	 * Create a BeatDetect object that is in SOUND_ENERGY mode.
	 * <code>timeSize</code> and <code>sampleRate</code> will be set to 1024
	 * and 44100, respectively, so that it is possible to switch into FREQ_ENERGY
	 * mode with meaningful values.
	 * 
	 */
	// BeatDetect()
	// {
	// 	sampleRate = 44100;
	// 	timeSize = 1024;
	// 	initSEResources();
	// 	initGraphs();
	// 	algorithm = SOUND_ENERGY;
	// 	sensitivity = 10;
	// }

	/**
	 * Create a BeatDetect object that is in FREQ_ENERGY mode and expects a
	 * sample buffer with the requested attributes.
	 * 
	 * @param timeSize
	 *           int: the size of the buffer
	 * @param sampleRate
	 *           float: the sample rate of the samples in the buffer
	 *           
	 * @related BeatDetect
	 */
	// BeatDetect(int timeSize, float sampleRate)
	// {
		this.sampleRate = sampleRate;
		this.timeSize = timeSize;
		initFEResources();
		initGraphs();
		algorithm = FREQ_ENERGY;
		sensitivity = 225;
	// }

	/**
	 * Set the object to use the requested algorithm. If an invalid value is
	 * passed, the function will report and error and default to
	 * BeatDetect.SOUND_ENERGY
	 * 
	 * @param algo
	 *           int: either BeatDetect.SOUND_ENERGY or BeatDetect.FREQ_ENERGY
	 *           
	 * @related BeatDetect
	 */
	function detectMode(algo)
	{
		if (algo < 0 || algo > 1)
		{
			Minim.error("Unrecognized detect mode, defaulting to SOUND_ENERGY.");
			algo = SOUND_ENERGY;
		}
		if (algo == SOUND_ENERGY)
		{
			if (algorithm == FREQ_ENERGY)
			{
				releaseFEResources();
				initSEResources();
				initGraphs();
				algorithm = algo;
			}
		}
		else
		{
			if (algorithm == SOUND_ENERGY)
			{
				releaseSEResources();
				initFEResources();
				initGraphs();
				algorithm = FREQ_ENERGY;
			}
		}
	}

	function initGraphs()
	{
		valCnt = varCnt = 0;
		valGraph = new Float32Array(512);
		varGraph = new Float32Array(512);
	}

	function initSEResources()
	{
		isOnset = false;
		eBuffer = new float[sampleRate / timeSize];
		dBuffer = new float[sampleRate / timeSize];
		timer = Date.now();
		insertAt = 0;
	}

	function initFEResources()
	{
		spect = new FFT.fft(timeSize, sampleRate);
		spect.logAverages(60, 3);
		var numAvg = spect.avgSize();
		fIsOnset = new Array(numAvg);

		feBuffer = new Array(numAvg);
		for(var i = 0; i < feBuffer.length; i++) feBuffer[i] = new Float32Array(sampleRate / timeSize);
		
		fdBuffer = new Array(numAvg);
		for(i = 0; i < fdBuffer.length; i++) fdBuffer[i] = new Float32Array(sampleRate / timeSize);
		
		fTimer = new Array(numAvg);
		var start = Date.now();;
		for (var i = 0; i < fTimer.length; i++)
		{
			fTimer[i] = start;
		}
		insertAt = 0;
	}

	function releaseSEResources()
	{
		isOnset = false;
		eBuffer = null;
		dBuffer = null;
		timer = 0;
	}

	function releaseFEResources()
	{
		spect = null;
		fIsOnset = null;
		feBuffer = null;
		fdBuffer = null;
		fTimer = null;
	}

	/**
	 * Analyze the samples in <code>buffer</code>. 
	 * This is a cumulative process, so you must call this function every frame.
	 * 
	 * @param buffer
	 *           AudioBuffer: the buffer to analyze.
	 *           
	 * @example Analysis/SoundEnergyBeatDetection
	 * 
	 * @related BeatDetect
	 */
	// function detect(AudioBuffer buffer)
	// {
	// 	detect( buffer.toArray() );
	// }
	

	/**
	 * Analyze the samples in <code>buffer</code>. This is a cumulative
	 * process, so you must call this function every frame.
	 * 
	 * @param buffer
	 *           float[]: the buffer to analyze
	 *           
	 * @related BeatDetect
	 */
	this.detect = function(buffer) //float[]
	{
		switch (algorithm)
		{
		case SOUND_ENERGY:
			sEnergy(buffer);
			break;
		case FREQ_ENERGY:
			fEnergy(buffer);
			break;
		}
	}
	
	/**
	 * In frequency energy mode this returns the number of frequency bands 
	 * currently being used. In sound energy mode this always returns 0.
	 * 
	 * @return int: the length of the FFT's averages array
	 * 
	 * @related BeatDetect
	 */
	function dectectSize()
	{
	  if ( algorithm == FREQ_ENERGY )
	  {
	    return spect.avgSize();
	  }

	  return 0;
	}
	
	/**
	 * Returns the center frequency of the i<sup>th</sup> frequency band.
	 * In sound energy mode this always returns 0.
	 * 
	 * @param i
	 *     int: which detect band you want the center frequency of.
	 *     
	 *  @return float: the center frequency of the i<sup>th</sup> frequency band
	 *  
	 *  @related BeatDetect
	 */
	function getDetectCenterFrequency(i)
	{
	  if ( algorithm == FREQ_ENERGY )
	  {
	    return spect.getAverageCenterFrequency(i);
	  }

	  return 0;
	}

	/**
	 * Sets the sensitivity of the algorithm. After a beat has been detected, the
	 * algorithm will wait for <code>millis</code> milliseconds before allowing
	 * another beat to be reported. You can use this to dampen the algorithm if
	 * it is giving too many false-positives. The default value is 10, which is
	 * essentially no damping. If you try to set the sensitivity to a negative
	 * value, an error will be reported and it will be set to 10 instead.
	 * 
	 * @param millis
	 *           int: the sensitivity in milliseconds
	 *           
	 * @example Analysis/FrequencyEnergyBeatDetection
	 * 
	 * @related BeatDetect
	 */
	this.setSensitivity = function(millis)
	{
		if (millis < 0)
		{
			Minim.error("BeatDetect: sensitivity cannot be less than zero. Defaulting to 10.");
			sensitivity = 300;
		}
		else
		{
			sensitivity = millis;
		}
	}
	
	/**
	 * In sound energy mode this returns true when a beat has been detected. In
	 * frequency energy mode this always returns false.
	 * 
	 * @return boolean: true if a beat has been detected.
	 * 
	 * @example Analysis/SoundEnergyBeatDetection
	 * 
	 * @related BeatDetect
	 */
	function isOnset()
	{
		return isOnset;
	}

	/**
	 * In frequency energy mode this returns true when a beat has been detect in
	 * the <code>i<sup>th</sup></code> frequency band. In sound energy mode
	 * this always returns false.
	 * 
	 * @param i
	 *           int: the frequency band to query
	 * @return boolean: true if a beat has been detected in the requested band
	 * 
	 * @example Analysis/SoundEnergyBeatDetection
	 * 
	 * @related BeatDetect
	 */
	function isOnset(i)
	{
		if (algorithm == SOUND_ENERGY)
		{
			return false;
		}
		return fIsOnset[i];
	}

	/**
	 * In frequency energy mode this returns true if a beat corresponding to the
	 * frequency range of a kick drum has been detected. This has been tuned to
	 * work well with dance / techno music and may not perform well with other
	 * styles of music. In sound energy mode this always returns false.
	 * 
	 * @return boolean: true if a kick drum beat has been detected
	 * 
	 * @example Analysis/FrequencyEnergyBeatDetection
	 * 
	 * @related BeatDetect
	 */
	this.isKick = function()
	{
		if (algorithm == SOUND_ENERGY)
		{
			return false;
		}
		var upper = 6 >= spect.avgSize() ? spect.avgSize() : 6;
		return isRange(1, upper, 2);
	}

	/**
	 * In frequency energy mode this returns true if a beat corresponding to the
	 * frequency range of a snare drum has been detected. This has been tuned to
	 * work well with dance / techno music and may not perform well with other
	 * styles of music. In sound energy mode this always returns false.
	 * 
	 * @return boolean: true if a snare drum beat has been detected
	 * 
	 * @example Analysis/FrequencyEnergyBeatDetection
	 * 
	 * @related BeatDetect
	 */
	this.isSnare = function()
	{
		if (algorithm == SOUND_ENERGY)
		{
			return false;
		}
		var lower = 8 >= spect.avgSize() ? spect.avgSize() : 8;
		var upper = spect.avgSize() - 1;
		var thresh = (upper - lower) / 3 + 1;
		return isRange(lower, upper, thresh);
	}

	/**
	 * In frequency energy mode this returns true if a beat corresponding to the
	 * frequency range of a hi hat has been detected. This has been tuned to work
	 * well with dance / techno music and may not perform well with other styles
	 * of music. In sound energy mode this always returns false.
	 * 
	 * @return boolean: true if a hi hat beat has been detected
	 * 
	 * @example Analysis/FrequencyEnergyBeatDetection
	 * 
	 * @related BeatDetect
	 */
	function isHat()
	{
		if (algorithm == SOUND_ENERGY)
		{
			return false;
		}
		var lower = spect.avgSize() - 7 < 0 ? 0 : spect.avgSize() - 7;
		var upper = spect.avgSize() - 1;
		return isRange(lower, upper, 1);
	}

	/**
	 * In frequency energy mode this returns true if at least
	 * <code>threshold</code> bands of the bands included in the range
	 * <code>[low, high]</code> have registered a beat. In sound energy mode
	 * this always returns false.
	 * 
	 * @param low
	 *           int: the index of the lower band
	 * @param high
	 *           int: the index of the higher band
	 * @param threshold
	 *           int: the smallest number of bands in the range
	 *           <code>[low, high]</code> that need to have registered a beat
	 *           for this to return true
	 * @return boolean: true if at least <code>threshold</code> bands of the bands
	 *         included in the range <code>[low, high]</code> have registered a
	 *         beat
	 *         
	 * @related BeatDetect
	 */
	function isRange(low, high, threshold)
	{
		if (algorithm == SOUND_ENERGY)
		{
			return false;
		}
		var num = 0;
		for (var i = low; i < high + 1; i++)
		{
			if (isOnset(i))
			{
				num++;
			}
		}
		return num >= threshold;
	}

	/**
	 * Draws some debugging visuals in the passed PApplet. The visuals drawn when
	 * in frequency energy mode are a good way to determine what values to use
	 * with <code>inRange()</code> if the provided drum detecting functions
	 * aren't what you need or aren't working well.
	 * 
	 * @param p
	 *           the PApplet to draw in
	 */
//	function drawGraph(PApplet p)
//	{
//		if (algorithm == SOUND_ENERGY)
//		{
//			// draw valGraph
//			for (int i = 0; i < valCnt; i++)
//			{
//				p.stroke(255);
//				p.line(i, (p.height / 2) - valGraph[i], i, (p.height / 2)
//						+ valGraph[i]);
//			}
//			// draw varGraph
//			for (int i = 0; i < varCnt - 1; i++)
//			{
//				p.stroke(255);
//				p.line(i, p.height - varGraph[i], i + 1, p.height - varGraph[i + 1]);
//			}
//		}
//		else
//		{
//			p.strokeWeight(5);
//			for (int i = 0; i < fTimer.length; i++)
//			{
//				int c = (i % 3 == 0) ? p.color(255, 0, 0) : p.color(255);
//				p.stroke(c);
//				long clock = Date.now();
//				if (clock - fTimer[i] < sensitivity)
//				{
//					float h = PApplet.map(clock - fTimer[i], 0, sensitivity, 100, 0);
//					p.line((i * 10), p.height - h, (i * 10), p.height);
//				}
//			}
//		}
//	}

	// function sEnergy(samples) //float[]
	// {
	// 	// compute the energy level
	// 	float level = 0;
	// 	for (int i = 0; i < samples.length; i++)
	// 	{
	// 		level += (samples[i] * samples[i]);
	// 	}
	// 	level /= samples.length;
	// 	level = (float) Math.sqrt(level);
	// 	float instant = level * 100;
	// 	// compute the average local energy
	// 	float E = average(eBuffer);
	// 	// compute the variance of the energies in eBuffer
	// 	float V = variance(eBuffer, E);
	// 	// compute C using a linear digression of C with V
	// 	float C = (-0.0025714f * V) + 1.5142857f;
	// 	// filter negaive values
	// 	float diff = (float)Math.max(instant - C * E, 0);
	// 	pushVal(diff);
	// 	// find the average of only the positive values in dBuffer
	// 	float dAvg = specAverage(dBuffer);
	// 	// filter negative values
	// 	float diff2 = (float)Math.max(diff - dAvg, 0);
	// 	pushVar(diff2);
	// 	// report false if it's been less than 'sensitivity'
	// 	// milliseconds since the last true value
	// 	if (Date.now() - timer < sensitivity)
	// 	{
	// 		isOnset = false;
	// 	}
	// 	// if we've made it this far then we're allowed to set a new
	// 	// value, so set it true if it deserves to be, restart the timer
	// 	else if (diff2 > 0 && instant > 2)
	// 	{
	// 		isOnset = true;
	// 		timer = Date.now();
	// 	}
	// 	// OMG it wasn't true!
	// 	else
	// 	{
	// 		isOnset = false;
	// 	}
	// 	eBuffer[insertAt] = instant;
	// 	dBuffer[insertAt] = diff;
	// 	insertAt++;
	// 	if (insertAt == eBuffer.length)
	// 		insertAt = 0;
	// }

	function fEnergy(float_in)//float[]
	{
		spect.forward(float_in);

		var instant, E, V, C, diff, dAvg, diff2;
		for (var i = 0; i < feBuffer.length; i++)
		{
			instant = spect.getAvg(i);
			// console.log(instant);
			E = average(feBuffer[i]);
			V = variance(feBuffer[i], E);
			C = (-0.0025714 * V) + 1.5142857;
			diff = Math.max(instant - C * E, 0);
			dAvg = specAverage(fdBuffer[i]);
			diff2 = Math.max(diff - dAvg, 0);
			if (Date.now() - fTimer[i] < sensitivity)
			{
				fIsOnset[i] = false;
			}
			else if (diff2 > 0)
			{
				fIsOnset[i] = true;
				fTimer[i] = Date.now();
			}
			else
			{
				fIsOnset[i] = false;
			}
			feBuffer[i][insertAt] = instant;
			fdBuffer[i][insertAt] = diff;
		}
		insertAt++;
		if (insertAt == feBuffer[0].length)
		{
			insertAt = 0;
		}
	}

	function pushVal(v)
	{
		// println(valCnt);
		if (valCnt == valGraph.length)
		{
			valCnt = 0;
			valGraph = new Float32Array(valGraph.length);
		}
		valGraph[valCnt] = v;
		valCnt++;
	}

	function pushVar(v)
	{
		// println(valCnt);
		if (varCnt == varGraph.length)
		{
			varCnt = 0;
			varGraph = new Float32Array(varGraph.length);
		}
		varGraph[varCnt] = v;
		varCnt++;
	}

	function average(arr) //float[]
	{
		var avg = 0;
		for (var i = 0; i < arr.length; i++)
		{
			avg += arr[i];
		}
		avg /= arr.length;
		return avg;
	}

	function specAverage(arr) //float[]
	{
		var avg = 0;
		var num = 0;
		for (var i = 0; i < arr.length; i++)
		{
			if (arr[i] > 0)
			{
				avg += arr[i];
				num++;
			}
		}
		if (num > 0)
		{
			avg /= num;
		}
		return avg;
	}

	function variance(arr, val) //float[] float
	{
		var V = 0;
		for (var i = 0; i < arr.length; i++)
		{
			V += Math.pow(arr[i] - val, 2);
		}
		V /= arr.length;
		return V;
	}
};