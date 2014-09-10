'use strict';
var FFT = { REVISION:"1" };

FFT.fft = function ( ts, sr ) 
{
  console.log("FFT.fft() " + ts, sr);

  var LINAVG = 1;
  var LOGAVG = 2;
  var NOAVG = 3;

  var TWO_PI = (2 * Math.PI);
  var timeSize;
  var sampleRate;
  var bandWidth;
  // WindowFunction currentWindow;
  var real = [];
  var imag = [];
  var spectrum = [];
  var averages = [];
  var whichAverage;
  var octaves;
  var avgPerOctave;

  /**
   * Construct a FourierTransform that will analyze sample buffers that are
   * <code>ts</code> samples long and contain samples with a <code>sr</code>
   * sample rate.
   * 
   * @param ts
   *          the length of the buffers that will be analyzed
   * @param sr
   *          the sample rate of the samples that will be analyzed
   */

  // FourierTransform(ts,sr)
  // {
  timeSize = ts;
  sampleRate = sr;
  bandWidth = (2 / timeSize) * (sampleRate / 2);
  noAverages();
  allocateArrays();
  //currentWindow = new RectangularWindow(); // current window calls apply and shit at the bottom
  // }

  /*
  function setComplex(float[] r, float[] i)
  {
    if (real.length != r.length && imag.length != i.length)
    {
      Minim
          .error("FourierTransform.setComplex: the two arrays must be the same length as their member counterparts.");
    }
    else
    {
      System.arraycopy(r, 0, real, 0, r.length);
      System.arraycopy(i, 0, imag, 0, i.length);
    }
  }
  */
  function fillSpectrum()
  {
    for (var i = 0; i < spectrum.length; i++)
    {
      spectrum[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }

    if (whichAverage == LINAVG)
    {
      var avgWidth = spectrum.length / averages.length;
      for (var i = 0; i < averages.length; i++)
      {
        var avg = 0;
        var j;
        for (j = 0; j < avgWidth; j++)
        {
          var offset = j + i * avgWidth;
          if (offset < spectrum.length)
          {
            avg += spectrum[offset];
          }
          else
          {
            break;
          }
        }
        avg /= j + 1;
        averages[i] = avg;
      }
    }
    else if (whichAverage == LOGAVG)
    {
      for (var i = 0; i < octaves; i++)
      {
        var lowFreq, hiFreq, freqStep;
        if (i == 0)
        {
          lowFreq = 0;
        }
        else
        {
          lowFreq = (sampleRate / 2) / Math.pow(2, octaves - i);
        }
        hiFreq = (sampleRate / 2) / Math.pow(2, octaves - i - 1);
        freqStep = (hiFreq - lowFreq) / avgPerOctave;
        var f = lowFreq;
        for (var j = 0; j < avgPerOctave; j++)
        {
          var offset = j + i * avgPerOctave;
          averages[offset] = calcAvg(f, f + freqStep);
          f += freqStep;
        }
      }
    }
  }
  

  function noAverages()
  {
    averages = new Float32Array(0);
    whichAverage = NOAVG;
  }
  /*
  function linAverages(var numAvg)
  {
    if (numAvg > spectrum.length / 2)
    {
      Minim.error("The number of averages for this transform can be at most "
          + spectrum.length / 2 + ".");
      return;
    }
    else
    {
      averages = new float[numAvg];
    }
    whichAverage = LINAVG;
  }
  */
  this.logAverages = function(minBandwidth, bandsPerOctave)
  {
    var nyq = sampleRate / 2;
    octaves = 1;
    while ((nyq /= 2) > minBandwidth)
    {
      octaves++;
    }
    
    console.log("Number of octaves = " + octaves);

    avgPerOctave = bandsPerOctave;
    averages = new Float32Array(octaves * bandsPerOctave);
    whichAverage = LOGAVG;
  }

  /*
  function window(WindowFunction windowFunction)
  {
	this.currentWindow = windowFunction;
  }

  */

  function doWindow(samples) //float[]
  {
    apply(samples);
  }

  /*
  function timeSize()
  {
    return timeSize;
  }

  function specSize()
  {
    return spectrum.length;
  }

  function getBand(i)
  {
    if (i < 0) i = 0;
    if (i > spectrum.length - 1) i = spectrum.length - 1;
    return spectrum[i];
  }
  */
  function getBandWidth()
  {
    return bandWidth;
  }
  /*
  function getAverageBandWidth( averageIndex )
  {
    if ( whichAverage == LINAVG )
    {
      // an average represents a certain number of bands in the spectrum
      var avgWidth = (int) spectrum.length / averages.length;
      return avgWidth * getBandWidth();
            
    }
    else if ( whichAverage == LOGAVG )
    {
      // which "octave" is this index in?
      var octave = averageIndex / avgPerOctave;
      float lowFreq, hiFreq, freqStep;
      // figure out the low frequency for this octave
      if (octave == 0)
      {
        lowFreq = 0;
      }
      else
      {
        lowFreq = (sampleRate / 2) / (float) Math.pow(2, octaves - octave);
      }
      // and the high frequency for this octave
      hiFreq = (sampleRate / 2) / (float) Math.pow(2, octaves - octave - 1);
      // each average band within the octave will be this big
      freqStep = (hiFreq - lowFreq) / avgPerOctave;
      
      return freqStep;
    }
	    
	  return 0;
  }
  */
  function freqToIndex(freq)
  {
    // special case: freq is lower than the bandwidth of spectrum[0]
    if (freq < getBandWidth() / 2) return 0;
    // special case: freq is within the bandwidth of spectrum[spectrum.length - 1]
    if (freq > sampleRate / 2 - getBandWidth() / 2) return spectrum.length - 1;
    // all other cases
    var fraction = freq / sampleRate;
    var i = Math.round(timeSize * fraction);
    return i;
  }
  /*
  function indexToFreq(i)
  {
    float bw = getBandWidth();
    // special case: the width of the first bin is half that of the others.
    //               so the center frequency is a quarter of the way.
    if ( i == 0 ) return bw * 0.25f;
    // special case: the width of the last bin is half that of the others.
    if ( i == spectrum.length - 1 ) 
    {
      float lastBinBeginFreq = (sampleRate / 2) - (bw / 2);
      float binHalfWidth = bw * 0.25f;
      return lastBinBeginFreq + binHalfWidth;
    }
    // the center frequency of the ith band is simply i*bw
    // because the first band is half the width of all others.
    // treating it as if it wasn't offsets us to the middle 
    // of the band.
    return i*bw;
  }
  
  function getAverageCenterFrequency(i)
  {
    if ( whichAverage == LINAVG )
    {
      // an average represents a certain number of bands in the spectrum
      var avgWidth = (int) spectrum.length / averages.length;
      // the "center" bin of the average, this is fudgy.
      var centerBinIndex = i*avgWidth + avgWidth/2;
      return indexToFreq(centerBinIndex);
            
    }
    else if ( whichAverage == LOGAVG )
    {
      // which "octave" is this index in?
      var octave = i / avgPerOctave;
      // which band within that octave is this?
      var offset = i % avgPerOctave;
      float lowFreq, hiFreq, freqStep;
      // figure out the low frequency for this octave
      if (octave == 0)
      {
        lowFreq = 0;
      }
      else
      {
        lowFreq = (sampleRate / 2) / (float) Math.pow(2, octaves - octave);
      }
      // and the high frequency for this octave
      hiFreq = (sampleRate / 2) / (float) Math.pow(2, octaves - octave - 1);
      // each average band within the octave will be this big
      freqStep = (hiFreq - lowFreq) / avgPerOctave;
      // figure out the low frequency of the band we care about
      float f = lowFreq + offset*freqStep;
      // the center of the band will be the low plus half the width
      return f + freqStep/2;
    }
    
    return 0;
  }
   

  float getFreq(float freq)
  {
    return getBand(freqToIndex(freq));
  }

  function setFreq(float freq, float a)
  {
    setBand(freqToIndex(freq), a);
  }

  function scaleFreq(float freq, float s)
  {
    scaleBand(freqToIndex(freq), s);
  }
  */
  this.avgSize = function()
  {
    return averages.length;
  }
  
  this.getAvg = function(i)
  {
    var ret;
    if (averages.length > 0)
      ret = averages[i];
    else
      ret = 0;
    return ret;
  }
  
  function calcAvg(lowFreq, hiFreq)
  {
    var lowBound = freqToIndex(lowFreq);
    var hiBound = freqToIndex(hiFreq);
    var avg = 0;
    for (var i = lowBound; i <= hiBound; i++)
    {
      avg += spectrum[i];
    }
    avg /= (hiBound - lowBound + 1);
    return avg;
  }
  
  /*
  float[] getSpectrumReal()
  {
	  return real;
  }
  
  float[] getSpectrumImaginary()
  {
	  return imag;
  }
  /*
  
  function forward(float[] buffer, var startAt)
  {
    if ( buffer.length - startAt < timeSize )
    {
      Minim.error( "FourierTransform.forward: not enough samples in the buffer between " + 
                   startAt + " and " + buffer.length + " to perform a transform."
                 );
      return;
    }
    
    // copy the section of samples we want to analyze
    float[] section = new float[timeSize];
    System.arraycopy(buffer, startAt, section, 0, section.length);
    forward(section);
  }

  function forward(AudioBuffer buffer)
  {
    forward(buffer.toArray());
  }

  function forward(AudioBuffer buffer, var startAt)
  {
    forward(buffer.toArray(), startAt);
  }
  
  abstract function inverse(float[] buffer);

  function inverse(AudioBuffer buffer)
  {
    inverse(buffer.toArray());
  }

  function inverse(float[] freqReal, float[] freqImag, float[] buffer)
  {
    setComplex(freqReal, freqImag);
    inverse(buffer);
  }
  */

  // ----------------------------------------------------------------------------------------

  // FFT CLASS with overides

  // ----------------------------------------------------------------------------------------

  //constructor - this is called when u create new shit, super handles the rest
  // FFT(int timeSize, float sampleRate)
  // {
  //   super(timeSize, sampleRate);
  //   if ((timeSize & (timeSize - 1)) != 0)
  //   {
  //     throw new IllegalArgumentException("FFT: timeSize must be a power of two.");
  //   }
  buildReverseTable();
  buildTrigTables();
  // }

  function allocateArrays()
  {
    spectrum = new Float32Array(timeSize / 2 + 1);
    real = new Float32Array(timeSize);
    imag = new Float32Array(timeSize);
  }

/*
  function scaleBand(int i, float s)
  {
    if (s < 0)
    {
      Minim.error("Can't scale a frequency band by a negative value.");
      return;
    }
    
    real[i] *= s;
    imag[i] *= s;
    spectrum[i] *= s;
    
    if (i != 0 && i != timeSize / 2)
    {
      real[timeSize - i] = real[i];
      imag[timeSize - i] = -imag[i];
    }
  }

  function setBand(int i, float a)
  {
    if (a < 0)
    {
      Minim.error("Can't set a frequency band to a negative value.");
      return;
    }
    if (real[i] == 0 && imag[i] == 0)
    {
      real[i] = a;
      spectrum[i] = a;
    }
    else
    {
      real[i] /= spectrum[i];
      imag[i] /= spectrum[i];
      spectrum[i] = a;
      real[i] *= spectrum[i];
      imag[i] *= spectrum[i];
    }
    if (i != 0 && i != timeSize / 2)
    {
      real[timeSize - i] = real[i];
      imag[timeSize - i] = -imag[i];
    }
  }
  */

  // performs an in-place fft on the data in the real and imag arrays
  // bit reversing is not necessary as the data will already be bit reversed
  function fft()
  {
    for (var halfSize = 1; halfSize < real.length; halfSize *= 2)
    {
      // float k = -(float)Math.PI/halfSize;
      // phase shift step
      // float phaseShiftStepR = (float)Math.cos(k);
      // float phaseShiftStepI = (float)Math.sin(k);
      // using lookup table
      var phaseShiftStepR = cos(halfSize);
      var phaseShiftStepI = sin(halfSize);
      // current phase shift
      var currentPhaseShiftR = 1.0;
      var currentPhaseShiftI = 0.0;
      for (var fftStep = 0; fftStep < halfSize; fftStep++)
      {
        for (var i = fftStep; i < real.length; i += 2 * halfSize)
        {
          var off = i + halfSize;
          var tr = (currentPhaseShiftR * real[off]) - (currentPhaseShiftI * imag[off]);
          var ti = (currentPhaseShiftR * imag[off]) + (currentPhaseShiftI * real[off]);
          real[off] = real[i] - tr;
          imag[off] = imag[i] - ti;
          real[i] += tr;
          imag[i] += ti;
        }
        var tmpR = currentPhaseShiftR;
        currentPhaseShiftR = (tmpR * phaseShiftStepR) - (currentPhaseShiftI * phaseShiftStepI);
        currentPhaseShiftI = (tmpR * phaseShiftStepI) + (currentPhaseShiftI * phaseShiftStepR);
      }
    }
  }
  

  this.forward = function(buffer) //float[]
  {
    if (buffer.length != timeSize)
    {
      console.log("FFT.forward: The length of the passed sample buffer must be equal to timeSize().");
      return;
    }

    doWindow(buffer);

    // copy samples to real/imag in bit-reversed order
    bitReverseSamples(buffer, 0);
    // perform the fft
    fft();
    // fill the spectrum buffer with amplitudes
    fillSpectrum();
  }
  
  function forward(buffer, startAt) //float[]
  {
    if ( buffer.length - startAt < timeSize )
    {
      Minim.error( "FourierTransform.forward: not enough samples in the buffer between " + 
                   startAt + " and " + buffer.length + " to perform a transform."
                 );
      return;  
    }
    
    currentWindow.apply( buffer, startAt, timeSize );
    bitReverseSamples(buffer, startAt);
    fft();
    fillSpectrum();
  }

  function forward(buffReal, buffImag) //float[] float[]
  {
    if (buffReal.length != timeSize || buffImag.length != timeSize)
    {
      console.log("FFT.forward: The length of the passed buffers must be equal to timeSize().");
      return;
    }
    setComplex(buffReal, buffImag);
    bitReverseComplex();
    fft();
    fillSpectrum();
  }
/*
  function inverse(buffer) //float[]
  {
    if (buffer.length > real.length)
    {
      Minim
          .error("FFT.inverse: the passed array's length must equal FFT.timeSize().");
      return;
    }
    // conjugate
    for (var i = 0; i < timeSize; i++)
    {
      imag[i] *= -1;
    }
    bitReverseComplex();
    fft();
    // copy the result in real into buffer, scaling as we do
    for (var i = 0; i < buffer.length; i++)
    {
      buffer[i] = real[i] / real.length;
    }
  }

  */
  var reverse = [];

  function buildReverseTable()
  {
    var N = timeSize;
    reverse = new Array(N);

    // set up the bit reversing table
    reverse[0] = 0;
    for (var limit = 1, bit = N / 2; limit < N; limit <<= 1, bit >>= 1)
      for (var i = 0; i < limit; i++)
        reverse[i + limit] = reverse[i] + bit;
  }

  // copies the values in the samples array into the real array
  // in bit reversed order. the imag array is filled with zeros.
  function bitReverseSamples(samples, startAt) //float[] int
  {
    for (var i = 0; i < timeSize; ++i)
    {
      real[i] = samples[ startAt + reverse[i] ];
      imag[i] = 0.0;
    }
  }

  // bit reverse real[] and imag[]
  function bitReverseComplex()
  {
    var revReal = new Float32Array(real.length);
    var revImag = new Float32Array(imag.length);
    for (var i = 0; i < real.length; i++)
    {
      revReal[i] = real[reverse[i]];
      revImag[i] = imag[reverse[i]];
    }
    real = revReal;
    imag = revImag;
  }

  // lookup tables

  var sinlookup;// = [];
  var coslookup;// = [];

  function sin(i)
  {
    return sinlookup[i];
  }

  function cos(i)
  {
    return coslookup[i];
  }

  function buildTrigTables()
  {
    var N = timeSize;
    sinlookup = new Float32Array(N);
    coslookup = new Float32Array(N);
    for (var i = 0; i < N; i++)
    {
      sinlookup[i] = Math.sin(-Math.PI / i);
      coslookup[i] = Math.cos(-Math.PI / i);
    }
  }

  /////////


  /** The float value of 2*PI. Provided as a convenience for subclasses. */
  // protected static final float TWO_PI = (float) (2 * Math.PI);
  var length;
  
  // public WindowFunction()
  // {
  // }

  /** 
   * Apply the window function to a sample buffer.
   * 
   * @param samples a sample buffer
   */
  function apply(samples) 
  {
    this.length = samples.length;

    for (var n = 0; n < samples.length; n ++) 
    {
      samples[n] *= 1; //value(samples.length, n);
    }
  }

  /**
  protected float value(int length, int index) 
  {
    return 1f;
  }
  */
  
  /**
   * Apply the window to a portion of this sample buffer,
   * given an offset from the beginning of the buffer 
   * and the number of samples to be windowed.
   */
  function apply(samples, offset, l)
  {
    length = l;
    
    for(var n = offset; n < offset + length; ++n)
    {
      samples[n] *= value(length, n - offset);
    }
  }

  /** 
   * Generates the curve of the window function.
   * 
   * @param length the length of the window
   * @return the shape of the window function
   */
  // public float[] generateCurve(int length)
  // {
  //   float[] samples = new float[length];
  //   for (int n = 0; n < length; n++) 
  //   {
  //     samples[n] = 1f * value(length, n);  
  //   }
  //   return samples;
  // }

  // protected abstract float value(int length, int index);



};