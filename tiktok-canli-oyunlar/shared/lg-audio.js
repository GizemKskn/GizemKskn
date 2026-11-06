/*
 * Ses: tamamen kodla üretilen efektler ve müzik (WebAudio).
 * Dışarıdan ses dosyası yok => telif riski yok.
 *   LG.sfx('pop')            efekt çal
 *   LG.music.play('horon')   müzik başlat (horon, halay, chill, race, quiz, party, tension)
 *   LG.music.setTempo(1.3)   hız çarpanı
 *   LG.music.stop()
 * Tarayıcı ilk tıklamaya kadar sesi kilitler; OBS tarayıcı kaynağında sorun olmaz.
 */
(function () {
  'use strict';
  var LG = (window.LG = window.LG || {});
  var AC = window.AudioContext || window.webkitAudioContext;
  var ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  var muted = LG.config ? LG.config.mute : false;
  var vol = LG.config ? LG.config.vol : 0.7;

  function ensure() {
    if (ac || !AC) return ac;
    try {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : vol;
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 6;
      master.connect(comp); comp.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      musicBus = ac.createGain(); musicBus.gain.value = 0.35; musicBus.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
    return ac;
  }

  LG.audio = {
    unlock: function () { ensure(); if (ac && ac.state === 'suspended') ac.resume(); },
    toggleMute: function () { muted = !muted; if (master) master.gain.value = muted ? 0 : vol; return muted; },
    setVolume: function (v) { vol = v; if (master && !muted) master.gain.value = v; },
    setMusicVolume: function (v) { ensure(); if (musicBus) musicBus.gain.value = v; },
    get ctx() { return ensure(); },
  };
  // Otomatik başlatmayı dene (OBS'de çalışır)
  try { ensure(); if (ac && ac.state === 'suspended') ac.resume().catch(function () {}); } catch (e) {}

  // --- Temel sentez yapı taşları ---------------------------------------------
  function tone(t, freq, dur, type, gain, bus, slideTo, attack) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    var a = attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain || 0.3), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, gain, filterType, freq, bus, q) {
    var s = ac.createBufferSource(); s.buffer = noiseBuf;
    var f = ac.createBiquadFilter(); f.type = filterType || 'highpass'; f.frequency.value = freq || 1000; f.Q.value = q || 0.7;
    var g = ac.createGain();
    g.gain.setValueAtTime(gain || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function kick(t, bus, g) { tone(t, 150, 0.25, 'sine', g || 0.9, bus, 40); }
  function snare(t, bus, g) { noise(t, 0.15, g || 0.35, 'highpass', 1500, bus); tone(t, 220, 0.08, 'triangle', 0.15, bus); }
  function hat(t, bus, g) { noise(t, 0.04, g || 0.12, 'highpass', 7000, bus); }
  function davul(t, bus, g) { tone(t, 95, 0.32, 'sine', g || 1.0, bus, 45); noise(t, 0.08, 0.2, 'lowpass', 600, bus); }
  function tokmak(t, bus, g) { noise(t, 0.05, g || 0.25, 'bandpass', 2500, bus, 2); tone(t, 520, 0.04, 'square', 0.05, bus); }

  // --- Efektler ---------------------------------------------------------------
  var lastPlayed = {};
  var SFX = {
    pop: function (t) { tone(t, 600 + Math.random() * 300, 0.09, 'sine', 0.3, null, 1200); },
    join: function (t) { tone(t, 660, 0.08, 'triangle', 0.22); tone(t + 0.06, 990, 0.1, 'triangle', 0.18); },
    coin: function (t) { tone(t, 988, 0.07, 'square', 0.12); tone(t + 0.07, 1319, 0.22, 'square', 0.12); },
    heart: function (t) { tone(t, 523, 0.12, 'sine', 0.2); tone(t + 0.1, 784, 0.18, 'sine', 0.18); },
    tick: function (t) { tone(t, 1800, 0.03, 'square', 0.08); },
    whoosh: function (t) { noise(t, 0.35, 0.3, 'bandpass', 800, null, 0.8); },
    boing: function (t) { tone(t, 180, 0.35, 'triangle', 0.35, null, 520); },
    honk: function (t) { tone(t, 330, 0.25, 'sawtooth', 0.12); tone(t, 415, 0.25, 'sawtooth', 0.1); },
    splash: function (t) { noise(t, 0.5, 0.35, 'lowpass', 1800); },
    zap: function (t) { tone(t, 1400, 0.2, 'sawtooth', 0.12, null, 200); },
    boom: function (t) { tone(t, 90, 0.7, 'sine', 0.9, null, 30); noise(t, 0.6, 0.5, 'lowpass', 400); },
    bell: function (t) { tone(t, 1568, 0.9, 'sine', 0.2); tone(t, 2093, 0.6, 'sine', 0.08); },
    drum: function (t) { davul(t); },
    clap: function (t) { noise(t, 0.08, 0.4, 'bandpass', 1500, null, 1.2); noise(t + 0.02, 0.1, 0.3, 'bandpass', 1300, null, 1.2); },
    levelup: function (t) { [523, 659, 784, 1047].forEach(function (f, i) { tone(t + i * 0.07, f, 0.15, 'square', 0.1); }); },
    fanfare: function (t) {
      [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(t + i * 0.11, f, 0.22, 'sawtooth', 0.09); tone(t + i * 0.11, f / 2, 0.22, 'triangle', 0.08); });
      kick(t, sfxBus, 0.5); kick(t + 0.44, sfxBus, 0.5);
    },
    win: function (t) { [784, 988, 1175, 1568].forEach(function (f, i) { tone(t + i * 0.09, f, 0.3, 'triangle', 0.18); }); },
    lose: function (t) { [392, 370, 349, 262].forEach(function (f, i) { tone(t + i * 0.18, f, 0.3, 'sawtooth', 0.08); }); },
    wrong: function (t) { tone(t, 200, 0.3, 'square', 0.1); },
    correct: function (t) { tone(t, 880, 0.1, 'sine', 0.2); tone(t + 0.08, 1320, 0.18, 'sine', 0.2); },
    countdown: function (t) { tone(t, 880, 0.12, 'square', 0.1); },
    go: function (t) { tone(t, 1760, 0.35, 'square', 0.12); },
    laugh: function (t) { for (var i = 0; i < 5; i++) tone(t + i * 0.09, 500 - i * 30, 0.07, 'square', 0.07, null, 380 - i * 20); },
    mega: function (t) { SFX.boom(t); SFX.fanfare(t + 0.1); noise(t + 0.2, 1.2, 0.2, 'highpass', 4000); },
  };

  LG.sfx = function (name, opts) {
    if (muted || !ensure() || ac.state !== 'running') return;
    var fn = SFX[name];
    if (!fn) return;
    var nowMs = performance.now();
    var minGap = (opts && opts.gap) || (name === 'pop' || name === 'join' || name === 'tick' ? 45 : 90);
    if (lastPlayed[name] && nowMs - lastPlayed[name] < minGap) return; // kalabalıkta kakofoniyi önle
    lastPlayed[name] = nowMs;
    try { fn(ac.currentTime + 0.01); } catch (e) { /* yok say */ }
  };
  LG.sfx.list = Object.keys(SFX);

  // --- Müzik (adım sıralayıcı) -----------------------------------------------
  // Hicaz makamından esinli dizi (D Eb F# G A Bb C D) + majör/minör diziler
  var SCALES = {
    hicaz: [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33, 622.25, 739.99],
    major: [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25],
    minor: [220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25],
    penta: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0],
  };
  // Her stil: bpm, adım sayısı, davul deseni ve melodi üretimi
  var STYLES = {
    // Karadeniz horonu hissi: 7'li hızlı ölçü
    horon: { bpm: 150, steps: 7, scale: 'hicaz', lead: 'square', kick: [0, 3], snare: [5], hat: [0, 1, 2, 3, 4, 5, 6], bass: [0, 3], melody: true, leadGain: 0.06 },
    halay: { bpm: 112, steps: 8, scale: 'hicaz', lead: 'sawtooth', kick: [0, 3, 4], snare: [2, 6], hat: [1, 3, 5, 7], bass: [0, 4], melody: true, leadGain: 0.05, davul: true },
    chill: { bpm: 84, steps: 16, scale: 'penta', lead: 'triangle', kick: [0, 10], snare: [4, 12], hat: [2, 6, 10, 14], bass: [0, 8], melody: true, leadGain: 0.05, sparse: true },
    race: { bpm: 140, steps: 16, scale: 'minor', lead: 'square', kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], bass: [0, 2, 4, 6, 8, 10, 12, 14], melody: true, leadGain: 0.045 },
    party: { bpm: 124, steps: 16, scale: 'major', lead: 'square', kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], bass: [0, 3, 6, 8, 11, 14], melody: true, leadGain: 0.05 },
    quiz: { bpm: 100, steps: 16, scale: 'minor', lead: 'triangle', kick: [0, 8], snare: [], hat: [0, 4, 8, 12], bass: [0, 8], melody: false, tick: true, leadGain: 0.04 },
    tension: { bpm: 128, steps: 16, scale: 'minor', lead: 'sawtooth', kick: [0, 4, 8, 12], snare: [], hat: [0, 2, 4, 6, 8, 10, 12, 14], bass: [0, 1, 4, 5, 8, 9, 12, 13], melody: false, leadGain: 0.03 },
  };

  var seq = { style: null, step: 0, nextT: 0, timer: null, tempo: 1, bar: 0, motif: [] };
  function makeMotif(st) {
    var m = [];
    var n = st.steps;
    var deg = 4;
    for (var i = 0; i < n * 2; i++) {
      if (st.sparse && Math.random() < 0.5) { m.push(-1); continue; }
      deg = LG.clamp ? LG.clamp(deg + Math.floor(Math.random() * 5) - 2, 0, 9) : Math.max(0, Math.min(9, deg + Math.floor(Math.random() * 5) - 2));
      m.push(Math.random() < 0.15 ? -1 : deg);
    }
    return m;
  }
  function schedule() {
    var st = STYLES[seq.style];
    if (!st || !ac) return;
    var spb = 60 / (st.bpm * seq.tempo) / (st.steps === 7 || st.steps === 8 ? 2 : 4);
    while (seq.nextT < ac.currentTime + 0.12) {
      var s = seq.step % st.steps, t = seq.nextT;
      var scale = SCALES[st.scale];
      if (st.kick.indexOf(s) >= 0) (st.davul ? davul : kick)(t, musicBus, 0.8);
      if (st.snare.indexOf(s) >= 0) (st.davul ? tokmak : snare)(t, musicBus, 0.3);
      if (st.hat.indexOf(s) >= 0) hat(t, musicBus, 0.06);
      if (st.bass.indexOf(s) >= 0) tone(t, scale[seq.bar % 4 === 3 ? 3 : 0] / 2, spb * 1.6, 'triangle', 0.22, musicBus);
      if (st.tick && s % 4 === 0) tone(t, 1600, 0.03, 'square', 0.04, musicBus);
      if (st.melody) {
        var idx = (seq.step % (st.steps * 2));
        var deg = seq.motif[idx];
        if (deg >= 0) tone(t, scale[deg], spb * 0.9, st.lead, st.leadGain, musicBus, null, 0.01);
      }
      seq.step++;
      if (s === st.steps - 1) {
        seq.bar++;
        if (seq.bar % 8 === 0) seq.motif = makeMotif(st); // her 8 ölçüde yeni motif
      }
      seq.nextT += spb;
    }
  }
  LG.music = {
    play: function (style) {
      if (LG.config && !LG.config.music) return;
      if (!ensure() || !STYLES[style]) return;
      LG.music.stop();
      seq.style = style; seq.step = 0; seq.bar = 0;
      seq.motif = makeMotif(STYLES[style]);
      seq.nextT = ac.currentTime + 0.05;
      seq.timer = setInterval(function () { if (ac.state === 'running') schedule(); else seq.nextT = ac.currentTime + 0.05; }, 25);
    },
    stop: function () { if (seq.timer) clearInterval(seq.timer); seq.timer = null; seq.style = null; },
    setTempo: function (m) { seq.tempo = Math.max(0.4, Math.min(3, m)); },
    get tempo() { return seq.tempo; },
    get style() { return seq.style; },
    styles: Object.keys(STYLES),
  };
})();
