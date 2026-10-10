// All sound is synthesized with the Web Audio API: no audio files.
//
//   LST.audio.unlock()        - call from a user gesture (done automatically in main.js)
//   LST.audio.play("coin")    - play a sound effect (see SFX below)
//   LST.audio.startMusic()    - looping background tune; stopMusic() / duckMusic(bool)
//
// Rapid sounds are throttled per type, the total number of live voices is capped,
// and most effects get a little random pitch variation so repeats don't grate.

LST.audio = (function () {
  const MAX_VOICES = 14;
  const VOLUME = { master: 0.85, sfx: 0.55, music: 0.16 };

  let ctx = null;
  let master, sfxBus, musicBus, noiseBuffer;
  let voices = 0;
  const lastPlayed = {};

  // ---------- Setup ----------
  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = VOLUME.master;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = LST.settings.get("sfx") ? VOLUME.sfx : 0;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = LST.settings.get("music") ? VOLUME.music : 0;
    musicBus.connect(master);
    // One second of white noise, reused for hats, thuds and pops.
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return true;
  }

  function unlock() {
    if (!ctx && !init()) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    // iOS needs a sound started inside the gesture to fully unlock.
    const b = ctx.createBufferSource();
    b.buffer = ctx.createBuffer(1, 1, 22050);
    b.connect(ctx.destination);
    b.start(0);
    if (wantMusic) startMusic();
  }

  LST.settings.onChange((key, on) => {
    if (!ctx) return;
    const t = ctx.currentTime;
    if (key === "sfx") sfxBus.gain.setTargetAtTime(on ? VOLUME.sfx : 0, t, 0.02);
    if (key === "music") {
      musicBus.gain.setTargetAtTime(on ? VOLUME.music * duck : 0, t, 0.05);
      if (on && wantMusic) startMusic();
      if (!on) stopScheduler();
    }
  });

  // ---------- Building blocks ----------
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const jitter = (amount) => 1 + (Math.random() * 2 - 1) * amount;

  // Counts live sound-effect voices (music isn't counted against the cap).
  function track(node, stopAt, bus = sfxBus) {
    if (bus === sfxBus) {
      voices++;
      node.onended = () => { voices--; };
    }
    node.stop(stopAt);
  }

  // A pitched blip with an attack/decay envelope and optional pitch slide.
  function tone({ type = "sine", freq, to, start = 0, dur = 0.12, vol = 0.3, attack = 0.005, bus = sfxBus, filter }) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = osc.connect(g);
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type || "lowpass";
      f.frequency.value = filter.freq;
      f.Q.value = filter.q || 1;
      out = out.connect(f);
    }
    out.connect(bus);
    osc.start(t);
    track(osc, t + dur + 0.02, bus);
  }

  // Filtered noise burst (thuds, snaps, hats).
  function noise({ start = 0, dur = 0.08, vol = 0.2, type = "bandpass", freq = 2000, q = 1, to, bus = sfxBus }) {
    const t = ctx.currentTime + start;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    track(src, t + dur + 0.02, bus);
  }

  // ---------- Sound effects ----------
  // throttle: minimum seconds between two plays of the same sound.
  // priority sounds ignore the voice cap.
  const SFX = {
    fire: { throttle: 0.06, play(o) {
      const p = jitter(0.08) * (o.pitch || 1);
      tone({ type: "square", freq: 620 * p, to: 240 * p, dur: 0.07, vol: 0.09, filter: { freq: 2400 } });
      noise({ dur: 0.03, vol: 0.05, freq: 3000, q: 0.7 });
    } },
    hit: { throttle: 0.035, play(o) {
      const p = jitter(0.12);
      tone({ type: "triangle", freq: (o.crit ? 900 : 520) * p, to: 180 * p, dur: 0.06, vol: o.crit ? 0.16 : 0.08 });
      noise({ dur: 0.025, vol: 0.06, freq: 4200, q: 1.5 });
    } },
    pop: { throttle: 0.03, play(o) {
      // Bubbly pop; bigger enemies pop lower.
      const p = jitter(0.1) * (o.pitch || 1);
      tone({ type: "sine", freq: 260 * p, to: 980 * p, dur: 0.09, vol: 0.22 });
      tone({ type: "triangle", freq: 1300 * p, to: 700 * p, start: 0.05, dur: 0.06, vol: 0.06 });
      noise({ dur: 0.05, vol: 0.08, freq: 1500, q: 0.8 });
    } },
    coin: { throttle: 0.05, play() {
      const p = jitter(0.03);
      tone({ type: "square", freq: midi(83) * p, dur: 0.06, vol: 0.085, filter: { freq: 5000 } });
      tone({ type: "square", freq: midi(88) * p, start: 0.055, dur: 0.16, vol: 0.085, filter: { freq: 5000 } });
    } },
    buy: { priority: true, play() {
      [72, 76, 79, 84].forEach((n, i) => tone({ type: "triangle", freq: midi(n), start: i * 0.055, dur: 0.14, vol: 0.2 }));
      tone({ type: "square", freq: midi(96), start: 0.22, dur: 0.18, vol: 0.04, filter: { freq: 6000 } });
    } },
    deal: { priority: true, play() {
      // three quick card "flicks" as the cards fly in
      for (let i = 0; i < 3; i++) {
        noise({ start: i * 0.09, dur: 0.07, vol: 0.12, type: "highpass", freq: 1800, to: 5000, q: 0.7 });
        tone({ type: "triangle", freq: midi(76 + i * 4), start: i * 0.09 + 0.02, dur: 0.08, vol: 0.07 });
      }
    } },
    reroll: { priority: true, play() {
      noise({ dur: 0.22, vol: 0.14, type: "bandpass", freq: 900, to: 4500, q: 1.2 });
      tone({ type: "triangle", freq: midi(67), to: midi(79), dur: 0.2, vol: 0.12 });
      tone({ type: "triangle", freq: midi(84), start: 0.2, dur: 0.12, vol: 0.1 });
    } },
    epic: { priority: true, play() {
      // sparkly arpeggio + shimmer for epic cards
      [72, 76, 79, 84, 88, 91].forEach((n, i) => tone({ type: "triangle", freq: midi(n), start: i * 0.045, dur: 0.2, vol: 0.17 }));
      [96, 100, 103].forEach((n, i) => tone({ type: "sine", freq: midi(n), start: 0.28 + i * 0.06, dur: 0.3, vol: 0.06 }));
    } },
    gear: { throttle: 0.045, priority: true, play(o) {
      // metallic clink for each Gear counted on the results screen
      const p = jitter(0.03) * (o.pitch || 1);
      tone({ type: "square", freq: midi(86) * p, dur: 0.05, vol: 0.06, filter: { freq: 6000 } });
      tone({ type: "triangle", freq: midi(93) * p, start: 0.02, dur: 0.09, vol: 0.08 });
      noise({ dur: 0.03, vol: 0.05, freq: 7000, q: 2 });
    } },
    gearsTotal: { priority: true, play() {
      // ka-ching: a ratchet clunk then a bright chord
      for (let i = 0; i < 3; i++) noise({ start: i * 0.045, dur: 0.035, vol: 0.12, freq: 2200 + i * 600, q: 3 });
      [79, 83, 86, 91].forEach((n) => tone({ type: "triangle", freq: midi(n), start: 0.14, dur: 0.45, vol: 0.1 }));
      tone({ type: "square", freq: midi(98), start: 0.14, dur: 0.25, vol: 0.035, filter: { freq: 7000 } });
    } },
    unlock: { priority: true, play() {
      // padlock clack, then a rising fanfare with sparkles
      noise({ dur: 0.06, vol: 0.2, type: "bandpass", freq: 1500, q: 2 });
      tone({ type: "square", freq: 220, to: 140, dur: 0.06, vol: 0.08, filter: { freq: 1500 } });
      [72, 76, 79, 84, 88].forEach((n, i) => tone({ type: "triangle", freq: midi(n), start: 0.1 + i * 0.07, dur: 0.22, vol: 0.17 }));
      [60, 67, 72].forEach((n) => tone({ type: "sawtooth", freq: midi(n), start: 0.45, dur: 0.6, vol: 0.035, attack: 0.03, filter: { freq: 2200 } }));
      [96, 100, 103, 108].forEach((n, i) => tone({ type: "sine", freq: midi(n), start: 0.5 + i * 0.06, dur: 0.3, vol: 0.05 }));
    } },
    deny: { throttle: 0.15, play() {
      tone({ type: "square", freq: 180, to: 140, dur: 0.14, vol: 0.08, filter: { freq: 900 } });
    } },
    tap: { throttle: 0.05, play() {
      tone({ type: "sine", freq: 900 * jitter(0.05), to: 420, dur: 0.05, vol: 0.18 });
      noise({ dur: 0.02, vol: 0.05, freq: 2500, q: 2 });
    } },
    towerHit: { throttle: 0.08, priority: true, play() {
      tone({ type: "sine", freq: 150 * jitter(0.06), to: 50, dur: 0.24, vol: 0.45 });
      noise({ dur: 0.16, vol: 0.25, type: "lowpass", freq: 900, to: 200 });
      tone({ type: "square", freq: 110, to: 70, dur: 0.12, vol: 0.05, filter: { freq: 600 } });
    } },
    lowHp: { priority: true, play() {
      for (let i = 0; i < 2; i++) {
        tone({ type: "square", freq: 880, start: i * 0.28, dur: 0.12, vol: 0.15, filter: { freq: 3000 } });
        tone({ type: "square", freq: 660, start: i * 0.28 + 0.13, dur: 0.12, vol: 0.15, filter: { freq: 3000 } });
      }
    } },
    heartbeat: { throttle: 0.5, priority: true, play() {
      tone({ type: "sine", freq: 70, to: 45, dur: 0.12, vol: 0.35 });
      tone({ type: "sine", freq: 65, to: 42, start: 0.17, dur: 0.14, vol: 0.25 });
    } },
    boss: { priority: true, play() {
      // "dun dun DUNNN" on a growly detuned saw, plus a big drum
      const hits = [[50, 0, 0.16], [50, 0.2, 0.16], [44, 0.42, 0.9]];
      for (const [n, s, d] of hits) {
        for (const det of [-8, 0, 7]) {
          tone({ type: "sawtooth", freq: midi(n) * Math.pow(2, det / 1200), start: s, dur: d, vol: 0.09, filter: { freq: 900, q: 3 } });
        }
        tone({ type: "sine", freq: 120, to: 40, start: s, dur: 0.3, vol: 0.4 });
        noise({ start: s, dur: 0.12, vol: 0.15, type: "lowpass", freq: 1200 });
      }
    } },
    bossDown: { priority: true, play() {
      tone({ type: "sine", freq: 90, to: 30, dur: 0.6, vol: 0.5 });
      noise({ dur: 0.5, vol: 0.3, type: "lowpass", freq: 2000, to: 150 });
      [67, 71, 74, 79].forEach((n, i) => tone({ type: "triangle", freq: midi(n), start: 0.25 + i * 0.07, dur: 0.2, vol: 0.16 }));
    } },
    waveStart: { priority: true, play() {
      [67, 72, 76].forEach((n, i) => tone({ type: "triangle", freq: midi(n), start: i * 0.08, dur: 0.12, vol: 0.16 }));
      noise({ start: 0.16, dur: 0.1, vol: 0.05, freq: 6000, type: "highpass" });
    } },
    waveClear: { priority: true, play() {
      const notes = [72, 76, 79, 84, 79, 84];
      const times = [0, 0.1, 0.2, 0.3, 0.45, 0.55];
      notes.forEach((n, i) => tone({ type: "square", freq: midi(n), start: times[i], dur: i === 5 ? 0.5 : 0.12, vol: 0.07, filter: { freq: 4000 } }));
      [60, 64, 67, 72].forEach((n) => tone({ type: "triangle", freq: midi(n), start: 0.55, dur: 0.7, vol: 0.06, attack: 0.02 }));
      for (let i = 0; i < 4; i++) noise({ start: 0.55 + i * 0.06, dur: 0.06, vol: 0.05, freq: 7000, type: "highpass" });
    } },
    gameOver: { priority: true, play() {
      // Sad trombone: four sliding notes, the last one wobbling.
      const notes = [[67, 0, 0.3], [66, 0.32, 0.3], [65, 0.64, 0.3], [64, 0.96, 1.0]];
      for (const [n, s, d] of notes) {
        const t = ctx.currentTime + s;
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(midi(n) * 1.02, t);
        osc.frequency.linearRampToValueAtTime(midi(n), t + 0.08);
        if (d > 0.5) {
          const lfo = ctx.createOscillator();
          const lg = ctx.createGain();
          lfo.frequency.value = 6;
          lg.gain.value = 8;
          lfo.connect(lg).connect(osc.frequency);
          lfo.start(t + 0.2);
          lfo.stop(t + d);
        }
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 1100;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.16, t + 0.04);
        g.gain.setValueAtTime(0.16, t + d - 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        osc.connect(f).connect(g).connect(sfxBus);
        osc.start(t);
        track(osc, t + d + 0.02);
      }
    } },
  };

  function play(name, opts = {}) {
    if (!ctx || ctx.state !== "running" || !LST.settings.get("sfx")) return;
    const s = SFX[name];
    if (!s) return;
    const now = ctx.currentTime;
    if (s.throttle && now - (lastPlayed[name] || -1) < s.throttle) return;
    if (!s.priority && voices >= MAX_VOICES) return;
    lastPlayed[name] = now;
    s.play(opts);
  }

  // ---------- Music: a small looping tune, scheduled ahead of time ----------
  const BPM = 112;
  const STEP = 60 / BPM / 2; // eighth notes
  // I - vi - IV - V in C, two passes with a different melody on the second.
  const CHORDS = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
  const MELODY = [
    [76, null, 79, null, 81, 79, 76, null],
    [72, null, 76, null, 74, 72, 69, null],
    [69, 72, 74, null, 72, null, 69, 67],
    [67, null, 71, 74, null, 72, 71, null],
    [79, 81, 79, 76, null, 76, 74, 72],
    [76, null, 72, null, 69, 72, null, 76],
    [77, null, 76, 74, null, 72, 74, null],
    [74, 76, 74, 71, 67, null, null, null],
  ];
  let wantMusic = false;
  let timer = null;
  let nextTime = 0;
  let step = 0;
  let duck = 1;

  function scheduleStep(s, t) {
    const bar = Math.floor(s / 8) % 8;
    const beat = s % 8;
    const chord = CHORDS[bar % 4];
    const at = t - ctx.currentTime;
    const m = { bus: musicBus };
    // kick on 1 and 3, hat on the off-beats
    if (beat % 4 === 0) tone({ ...m, type: "sine", freq: 130, to: 45, start: at, dur: 0.16, vol: 0.55 });
    if (beat % 2 === 1) noise({ ...m, start: at, dur: 0.035, vol: 0.12, type: "highpass", freq: 7000 });
    if (beat === 2 || beat === 6) noise({ ...m, start: at, dur: 0.09, vol: 0.12, freq: 1800, q: 0.6 });
    // bouncy bass: root, fifth
    const bass = beat % 4 === 0 ? chord[0] - 12 : beat % 4 === 2 ? chord[2] - 12 : null;
    if (bass) tone({ ...m, type: "triangle", freq: midi(bass), start: at, dur: STEP * 1.6, vol: 0.5 });
    // plucky chord stabs on the off-beats
    if (beat % 2 === 1) for (const n of chord) tone({ ...m, type: "square", freq: midi(n + 12), start: at, dur: 0.09, vol: 0.045, filter: { freq: 1800 } });
    const note = MELODY[bar][beat];
    if (note) tone({ ...m, type: "triangle", freq: midi(note), start: at, dur: STEP * 1.5, vol: 0.32, attack: 0.01 });
  }

  function scheduler() {
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      nextTime += STEP;
      step = (step + 1) % 64;
    }
  }

  function startMusic() {
    wantMusic = true;
    if (!ctx || ctx.state !== "running" || !LST.settings.get("music") || timer) return;
    nextTime = ctx.currentTime + 0.1;
    step = 0;
    timer = setInterval(scheduler, 30);
    scheduler();
  }

  function stopScheduler() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function stopMusic() {
    wantMusic = false;
    stopScheduler();
  }

  // Quieter music behind the pause menu.
  function duckMusic(on) {
    duck = on ? 0.35 : 1;
    if (ctx && LST.settings.get("music")) musicBus.gain.setTargetAtTime(VOLUME.music * duck, ctx.currentTime, 0.1);
  }

  // Pause all audio while the tab is hidden.
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else ctx.resume().then(() => { if (wantMusic && !timer) startMusic(); }).catch(() => {});
  });

  // Dev helper: render one sound offline and return its peak / RMS level,
  // e.g. LST.audio._measure("coin") in the console, for balancing volumes.
  async function measure(name, opts = {}) {
    if (!ctx) init();
    const saved = [ctx, sfxBus, noiseBuffer, voices];
    const off = new OfflineAudioContext(1, 44100 * 2.5, 44100);
    const nb = off.createBuffer(1, off.sampleRate, off.sampleRate);
    nb.getChannelData(0).set(noiseBuffer.getChannelData(0).subarray(0, off.sampleRate));
    ctx = off;
    sfxBus = off.createGain();
    sfxBus.gain.value = VOLUME.sfx * VOLUME.master;
    sfxBus.connect(off.destination);
    noiseBuffer = nb;
    try { SFX[name].play(opts); } finally { [ctx, sfxBus, noiseBuffer, voices] = saved; }
    const data = (await off.startRendering()).getChannelData(0);
    let peak = 0, sum = 0, n = 0;
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
      if (v > 0.001) { sum += v * v; n++; }
    }
    return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / Math.max(1, n)).toFixed(3), seconds: +(n / 44100).toFixed(2) };
  }

  return {
    _measure: measure,
    unlock,
    play,
    startMusic,
    stopMusic,
    duckMusic,
    get unlocked() { return !!ctx && ctx.state === "running"; },
    get voices() { return voices; },
    get musicPlaying() { return !!timer; },
  };
})();
