/**
 * Web Audio API Procedural Sound Synthesizer
 * Zero external audio files required - authentic 80s arcade sound synthesis.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;

    // Master volume
    this.masterGain = null;

    // Engine sound nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.engineDistortion = null;

    // Screech sound nodes
    this.screechGain = null;
    this.screechFilter = null;
    this.screechNoise = null;

    // Background synth music loop
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicGain = null;
    this.musicPlaying = false;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupScreechSynth();
      this.setupMusicNode();

      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio not supported or failed to initialize", e);
    }
  }

  ensureRunning() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.enabled = !this.enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? 0.7 : 0.0, this.ctx.currentTime);
    }
    return this.enabled;
  }

  setupEngineSynth() {
    if (!this.ctx) return;

    // Oscillator 1: fundamental engine frequency (sawtooth for rich harmonics)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    // Oscillator 2: sub-octave rumble for deep engine body
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(27.5, this.ctx.currentTime);

    // Distortion shaper for growl
    this.engineDistortion = this.ctx.createWaveShaper();
    this.engineDistortion.curve = this.makeDistortionCurve(18);
    this.engineDistortion.oversample = '2x';

    // Lowpass filter to simulate engine throttle opening
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(300, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Volume gain for engine
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    // Wire up: [Osc1 + Osc2] -> Distortion -> Filter -> EngineGain -> MasterGain
    this.engineOsc1.connect(this.engineDistortion);
    this.engineOsc2.connect(this.engineDistortion);
    this.engineDistortion.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  setupScreechSynth() {
    if (!this.ctx) return;

    // Buffer of white noise for tire friction
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    whiteNoise.start();
  }

  setupMusicNode() {
    if (!this.ctx) return;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);
  }

  makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  /**
   * Update engine sound according to player vehicle telemetry
   */
  updateEngine(speedRatio, isAccelerating, isBoosting) {
    if (!this.initialized || !this.ctx || !this.enabled) return;

    const t = this.ctx.currentTime;
    const safeRatio = Math.max(0, Math.min(1.2, speedRatio));

    // Base pitch modulation: 45Hz idle to ~320Hz redline
    const targetFreq1 = 45 + safeRatio * 250 + (isBoosting ? 65 : 0);
    const targetFreq2 = targetFreq1 * 0.5;

    // Filter opening: muffled at idle, bright/cutting at high RPM
    const targetFilter = 220 + safeRatio * 1800 + (isAccelerating ? 600 : 0) + (isBoosting ? 1200 : 0);

    // Volume: gentle at idle, roaring when full throttle
    const baseVol = 0.08 + safeRatio * 0.22 + (isAccelerating ? 0.08 : 0);

    this.engineOsc1.frequency.setTargetAtTime(targetFreq1, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq2, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, t, 0.1);
    this.engineGain.gain.setTargetAtTime(baseVol, t, 0.08);
  }

  /**
   * Modulate tire screech when drifting or turning sharp at speed
   */
  setScreech(intensity) {
    if (!this.initialized || !this.ctx || !this.enabled) return;
    const clamped = Math.max(0, Math.min(1, intensity));
    const t = this.ctx.currentTime;
    const targetVol = clamped * 0.22;
    this.screechGain.gain.setTargetAtTime(targetVol, t, 0.05);

    // Randomize pitch slightly for organic tire squeal
    const freq = 1200 + clamped * 800 + (Math.random() * 150);
    this.screechFilter.frequency.setTargetAtTime(freq, t, 0.05);
  }

  /**
   * Play Nitro activation burst sound
   */
  playNitroBoost() {
    if (!this.initialized || !this.ctx || !this.enabled) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(2400, t + 0.4);
    filter.Q.setValueAtTime(3.5, t);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.46);
  }

  /**
   * Crash / impact crunch sound
   */
  playCrash() {
    if (!this.initialized || !this.ctx || !this.enabled) return;

    const t = this.ctx.currentTime;

    // Noise blast
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);

    // Deep sub-thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);

    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  /**
   * Checkpoint / Stage clear arcade jingle
   */
  playCheckpoint() {
    if (!this.initialized || !this.ctx || !this.enabled) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const startTime = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const noteTime = startTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.18);
    });
  }

  /**
   * Start 80s arcade synthwave bassline
   */
  startMusic() {
    if (this.musicPlaying || !this.ctx) return;
    this.musicPlaying = true;
    this.musicStep = 0;

    const bassNotes = [
      110, 110, 110, 110, // A2
      130.8, 130.8, 130.8, 130.8, // C3
      98, 98, 98, 98, // G2
      123.47, 123.47, 146.83, 164.81 // B2, D3, E3
    ];

    const playBassStep = () => {
      if (!this.musicPlaying || !this.ctx || !this.enabled) return;

      const t = this.ctx.currentTime;
      const freq = bassNotes[this.musicStep % bassNotes.length];
      this.musicStep++;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(140, t + 0.11);
      filter.Q.setValueAtTime(3.0, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.13);

      this.musicTimer = setTimeout(playBassStep, 130); // ~115 BPM 16th notes
    };

    playBassStep();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  stopAll() {
    this.stopMusic();
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    }
    if (this.screechGain && this.ctx) {
      this.screechGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    }
  }
}

// Global audio engine singleton
window.audioEngine = new SoundEngine();
