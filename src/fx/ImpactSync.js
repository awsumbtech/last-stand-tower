// ImpactSync: one call fires a "big moment" - the bass thump and the visual hit (radial
// streak burst, ring + bloom pulse, flash, shake) - inside the same call stack, so they
// land on the same rendered frame. Each fire is logged with the frame number the audio
// was started on and the frame the visuals were spawned on (and later first drawn on,
// stamped by FxRenderer), which QA checks are identical.
//
// Audio is started with no scheduling delay (Web Audio start time = currentTime), and the
// visuals are first drawn at the end of this same requestAnimationFrame.

LST.ImpactSync = class ImpactSync {
  constructor({ audio, camera, pools, rng, clock, quality, presets, impacts }) {
    this.audio = audio;
    this.camera = camera;
    this.pools = pools;     // { world, screen }
    this.rng = rng;
    this.clock = clock;     // { frame, time }
    this.quality = quality;
    this.presets = presets;
    this.impacts = impacts;
    this.last = {};         // impact name -> clock.time (throttle)
    this.log = [];          // last 16 fires (QA)
  }

  fire(name, x, y, opts = {}) {
    const cfg = this.impacts[name];
    if (!cfg) return null;
    const now = this.clock.time;
    if (cfg.throttle && now - (this.last[name] == null ? -1e9 : this.last[name]) < cfg.throttle) return null;
    this.last[name] = now;
    const q = this.quality;
    const reduced = q.reduced;

    // 1) Audio: bass thump, started immediately.
    const audioFrame = this.clock.frame;
    let audioTime = null;
    if (this.audio && cfg.thump > 0) {
      this.audio.play("thump", { intensity: cfg.thump });
      audioTime = this.audio.now;
    }
    if (this.audio && cfg.sfx) { this.audio.play(cfg.sfx, opts.sfx || {}); audioTime = this.audio.now; }

    // 2) Visuals, same frame.
    const visualFrame = this.clock.frame;
    const pool = cfg.space === "screen" ? this.pools.screen : this.pools.world;
    const colors = opts.colors || cfg.colors;
    const made = LST.Emitter.burst(pool, this.rng, this.presets.streakBurst, x, y, {
      count: cfg.burst.count, speedMul: cfg.burst.speedMul * (opts.speedMul || 1) * (cfg.space === "screen" ? 0.55 : 1),
      colors, scale: q.scale, priority: true,
    });
    const pulse = this.camera.pulse(cfg.space, x, y, cfg.ring * (opts.ringMul || 1),
      reduced ? 0 : cfg.bloom, reduced ? 0 : cfg.flash, opts.tint || colors[1] || "#ffffff", this.presets.ring.life, visualFrame);
    if (!reduced && cfg.shake) this.camera.addShake(cfg.shake);

    const rec = { name, frame: visualFrame, audioFrame, visualFrame, audioTime, particles: made, pulse, firstDrawFrame: -1 };
    if (pulse) pulse.rec = rec;
    this.log.push(rec);
    if (this.log.length > 16) this.log.shift();
    return rec;
  }

  // Called by the renderer the first time a pulse is drawn.
  static stampDraw(pulse, frame) {
    if (pulse.drawnFrame >= 0) return;
    pulse.drawnFrame = frame;
    if (pulse.rec) pulse.rec.firstDrawFrame = frame;
  }

  // For QA: every logged fire had audio and visuals on the same frame, and drew on it too.
  syncReport() {
    return this.log.map((r) => ({ name: r.name, audioFrame: r.audioFrame, visualFrame: r.visualFrame,
      firstDrawFrame: r.firstDrawFrame,
      audioTime: r.audioTime, particles: r.particles }));
  }
};
