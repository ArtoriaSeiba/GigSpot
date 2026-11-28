const noteNames = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export function noteName(midi: number) {
  return noteNames[midi % 12] + (Math.floor(midi / 12) - 1);
}

export function noteFrequency(midi: number, reference: number) {
  return reference * 2 ** ((midi - 69) / 12);
}

export function nearestNote(hz: number, reference: number) {
  return Math.round(69 + 12 * Math.log2(hz / reference));
}

export function centsFromNote(hz: number, midi: number, reference: number) {
  return Math.round(1200 * Math.log2(hz / noteFrequency(midi, reference)));
}

export function makePitchDetector(sampleRate: number, frameSize: number) {
  // Work at a lower sample rate so the longer bass periods stay inexpensive.
  const stride = Math.max(1, Math.round(sampleRate / 22050));
  const analysisRate = sampleRate / stride;
  const minLag = Math.max(2, Math.floor(analysisRate / 1400));
  const maxLag = Math.ceil(analysisRate / 25);
  const window = Math.min(2048, Math.floor(frameSize / stride) - maxLag);
  const signal = new Float32Array(Math.max(0, window + maxLag));
  const difference = new Float64Array(maxLag + 1);

  return (samples: Float32Array) => {
    if (window < 1 || samples.length < frameSize) return null;
    let sum = 0;
    let energy = 0;
    const offset = samples.length - signal.length * stride;
    for (let i = 0; i < signal.length; i++) {
      let block = 0;
      const start = offset + i * stride;
      for (let j = 0; j < stride; j++) block += samples[start + j];
      const sample = block / stride;
      signal[i] = sample;
      sum += sample;
      energy += sample * sample;
    }
    const mean = sum / signal.length;
    if (Math.sqrt(Math.max(0, energy / signal.length - mean * mean)) < 0.003) return null;

    // YIN cumulative mean normalized difference.
    let running = 0;
    difference[0] = 1;
    for (let lag = 1; lag <= maxLag; lag++) {
      let squared = 0;
      for (let i = 0; i < window; i++) {
        const delta = signal[i] - signal[i + lag];
        squared += delta * delta;
      }
      running += squared;
      difference[lag] = running ? squared * lag / running : 1;
    }
    for (let lag = minLag; lag < maxLag; lag++) {
      if (difference[lag] >= 0.15) continue;
      while (lag < maxLag && difference[lag + 1] < difference[lag]) lag++;
      if (lag === maxLag) return null;
      const left = difference[lag - 1];
      const center = difference[lag];
      const right = difference[lag + 1];
      const curvature = left - 2 * center + right;
      const period = lag + (curvature > 0 ? (left - right) / (2 * curvature) : 0);
      return analysisRate / period;
    }
    return null;
  };
}
