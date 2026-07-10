/*
 * PhaseVocoder.js — self-contained offline phase-vocoder for MusicBand Studio.
 * Independent time-stretch (change duration, keep pitch) + pitch-shift (change pitch,
 * keep duration), used to "justify" recorded/generated samples and the WAV/MP3 export.
 * Exposes: window.PhaseVocoder.processBuffer(ctx, audioBuffer, { semitones, stretch }).
 */
(function (global) {
  "use strict";

  var FRAME = 2048;        // analysis/synthesis window (power of two for the FFT)
  var HOP_A = FRAME / 4;   // analysis hop (75% overlap)

  // In-place iterative radix-2 Cooley–Tukey FFT over parallel real/imag arrays.
  function fft(re, im, inverse) {
    var n = re.length;
    for (var i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) { j ^= bit; }
      j ^= bit;
      if (i < j) {
        var tr = re[i]; re[i] = re[j]; re[j] = tr;
        var ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
    }
    for (var len = 2; len <= n; len <<= 1) {
      var ang = (inverse ? 2 : -2) * Math.PI / len;
      var wr = Math.cos(ang), wi = Math.sin(ang);
      for (var s = 0; s < n; s += len) {
        var cr = 1, ci = 0;
        for (var k = 0; k < len / 2; k++) {
          var aRe = re[s + k], aIm = im[s + k];
          var bRe = re[s + k + len / 2] * cr - im[s + k + len / 2] * ci;
          var bIm = re[s + k + len / 2] * ci + im[s + k + len / 2] * cr;
          re[s + k] = aRe + bRe; im[s + k] = aIm + bIm;
          re[s + k + len / 2] = aRe - bRe; im[s + k + len / 2] = aIm - bIm;
          var ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = ncr;
        }
      }
    }
    if (inverse) {
      for (var m = 0; m < n; m++) { re[m] /= n; im[m] /= n; }
    }
  }

  function hann(n) {
    var w = new Float32Array(n);
    for (var i = 0; i < n; i++) { w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n); }
    return w;
  }

  // Time-stretch a mono Float32Array by `factor` (output length ≈ length * factor), keeping pitch.
  function timeStretch(input, factor) {
    if (!factor || factor === 1) { return input.slice(); }
    var src = input;
    if (src.length < FRAME) {
      src = new Float32Array(FRAME);
      src.set(input);
    }
    var win = hann(FRAME);
    var hopS = Math.max(1, Math.round(HOP_A * factor));
    var outLen = Math.ceil(src.length * factor) + FRAME;
    var out = new Float32Array(outLen);
    var winSum = new Float32Array(outLen);
    var re = new Float32Array(FRAME);
    var im = new Float32Array(FRAME);
    var half = FRAME / 2;
    var lastPhase = new Float32Array(half + 1);
    var sumPhase = new Float32Array(half + 1);
    var expected = new Float32Array(half + 1);
    for (var k = 0; k <= half; k++) { expected[k] = 2 * Math.PI * HOP_A * k / FRAME; }
    var outPos = 0;
    for (var inPos = 0; inPos + FRAME <= src.length; inPos += HOP_A) {
      for (var i = 0; i < FRAME; i++) { re[i] = src[inPos + i] * win[i]; im[i] = 0; }
      fft(re, im, false);
      for (var b = 0; b <= half; b++) {
        var mag = Math.sqrt(re[b] * re[b] + im[b] * im[b]);
        var phase = Math.atan2(im[b], re[b]);
        var delta = phase - lastPhase[b] - expected[b];
        lastPhase[b] = phase;
        delta = delta - 2 * Math.PI * Math.round(delta / (2 * Math.PI)); // wrap to [-PI, PI]
        var trueFreq = expected[b] + delta;
        sumPhase[b] += (hopS / HOP_A) * trueFreq;
        var sp = sumPhase[b];
        re[b] = mag * Math.cos(sp);
        im[b] = mag * Math.sin(sp);
        if (b > 0 && b < half) {
          re[FRAME - b] = re[b];
          im[FRAME - b] = -im[b];
        }
      }
      fft(re, im, true);
      for (var o = 0; o < FRAME; o++) {
        var idx = outPos + o;
        if (idx < outLen) {
          out[idx] += re[o] * win[o];
          winSum[idx] += win[o] * win[o];
        }
      }
      outPos += hopS;
    }
    for (var p = 0; p < outLen; p++) {
      if (winSum[p] > 1e-6) { out[p] /= winSum[p]; }
    }
    return out.subarray(0, Math.max(1, Math.ceil(input.length * factor)));
  }

  // Read `input` with fractional `step` (linear interpolation); output length = length / step.
  function resample(input, step) {
    if (!step || step === 1) { return input.slice(); }
    var outLen = Math.max(1, Math.floor(input.length / step));
    var out = new Float32Array(outLen);
    for (var i = 0; i < outLen; i++) {
      var pos = i * step;
      var i0 = Math.floor(pos);
      var frac = pos - i0;
      var a = input[i0] || 0;
      var c = input[i0 + 1] || 0;
      out[i] = a + (c - a) * frac;
    }
    return out;
  }

  // Shift a mono channel by `semitones` and set final duration to length * `stretch`.
  function processChannel(input, semitones, stretch) {
    var pitchRatio = Math.pow(2, (semitones || 0) / 12);
    var st = (stretch || 1) * pitchRatio;
    var out = timeStretch(input, st);
    if (pitchRatio !== 1) { out = resample(out, pitchRatio); }
    return out;
  }

  // Process a whole AudioBuffer; returns a new AudioBuffer created via `ctx.createBuffer`.
  function processBuffer(ctx, audioBuffer, opts) {
    var semitones = (opts && opts.semitones) || 0;
    var stretch = (opts && opts.stretch) || 1;
    if (!ctx || !audioBuffer || (semitones === 0 && stretch === 1)) {
      return audioBuffer;
    }
    var chans = audioBuffer.numberOfChannels;
    var processed = [];
    var outLen = 1;
    for (var c = 0; c < chans; c++) {
      var p = processChannel(audioBuffer.getChannelData(c), semitones, stretch);
      processed.push(p);
      if (p.length > outLen) { outLen = p.length; }
    }
    var out = ctx.createBuffer(chans, outLen, audioBuffer.sampleRate);
    for (var d = 0; d < chans; d++) {
      out.getChannelData(d).set(processed[d]);
    }
    return out;
  }

  global.PhaseVocoder = {
    processBuffer: processBuffer,
    processChannel: processChannel,
    timeStretch: timeStretch,
    resample: resample
  };
})(typeof window !== "undefined" ? window : this);
