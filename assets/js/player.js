// Lecteur simulé : une ambiance océan + nappe musicale générées en direct (Web Audio).
// Le jour où le flux réel est fourni, remplacer start() par un <audio src="URL_DU_FLUX">.

export function createPlayer() {
  let ctx = null, master, analyser, data, nodes = [], chordTimer = 0, playing = false, volume = 0.7;
  const listeners = new Set();
  const level = { value: 0 };

  function brownNoise(seconds) {
    const len = ctx.sampleRate * seconds, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    }
    return buf;
  }

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.82;
    data = new Uint8Array(analyser.frequencyBinCount);
    master.connect(analyser); analyser.connect(ctx.destination);

    // Vagues : bruit brun filtré, ouverture et volume qui respirent comme une houle de 9 s.
    const src = ctx.createBufferSource(); src.buffer = brownNoise(6); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
    const waveGain = ctx.createGain(); waveGain.gain.value = 0.42;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 1 / 9;
    const lfoF = ctx.createGain(); lfoF.gain.value = 380; lfo.connect(lfoF); lfoF.connect(lp.frequency);
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.22; lfo.connect(lfoG); lfoG.connect(waveGain.gain);
    src.connect(lp); lp.connect(waveGain); waveGain.connect(master);
    src.start(); lfo.start();
    nodes.push(src, lfo);

    // Nappe : quatre voix douces qui glissent d'accord en accord.
    const padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass'; padFilter.frequency.value = 1100;
    const padGain = ctx.createGain(); padGain.gain.value = 0.085;
    padFilter.connect(padGain); padGain.connect(master);
    const voices = [0, 1, 2, 3].map((i) => {
      const o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine';
      const g = ctx.createGain(); g.gain.value = 0.22;
      const vib = ctx.createOscillator(); vib.frequency.value = 0.15 + i * 0.07;
      const vibG = ctx.createGain(); vibG.gain.value = 1.4; vib.connect(vibG); vibG.connect(o.detune);
      o.connect(g); g.connect(padFilter); o.start(); vib.start(); nodes.push(o, vib);
      return o;
    });
    const chords = [[110, 164.81, 277.18, 415.3], [92.5, 138.59, 220, 329.63], [73.42, 146.83, 220, 369.99], [82.41, 123.47, 207.65, 329.63]];
    let k = 0;
    const setChord = () => {
      const ch = chords[k++ % chords.length], t = ctx.currentTime;
      voices.forEach((o, i) => o.frequency.setTargetAtTime(ch[i], t, 1.6));
    };
    setChord();
    chordTimer = setInterval(setChord, 8000);
  }

  function emit() { listeners.forEach((fn) => fn(playing)); }

  const api = {
    get playing() { return playing; },
    level,
    async toggle() { return playing ? api.pause() : api.play(); },
    async play() {
      try {
        if (!ctx) build();
        if (ctx.state !== 'running') await ctx.resume();
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(volume, ctx.currentTime, 0.4);
        playing = true; emit();
      } catch (e) { playing = false; emit(); }
    },
    pause() {
      if (!ctx) return;
      playing = false; emit();
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      setTimeout(() => { if (!playing && ctx.state === 'running') ctx.suspend(); }, 900);
    },
    setVolume(v) { volume = v; if (ctx && playing) master.gain.setTargetAtTime(v, ctx.currentTime, 0.1); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    // Spectre (0..255) pour les visualiseurs ; tableau vide si le son est coupé.
    spectrum() {
      if (!ctx || !playing) { level.value += (0 - level.value) * 0.08; return null; }
      analyser.getByteFrequencyData(data);
      let s = 0; for (let i = 2; i < 48; i++) s += data[i];
      const v = Math.min(1, s / (46 * 160));
      level.value += (v - level.value) * 0.15;
      return data;
    },
  };
  return api;
}
