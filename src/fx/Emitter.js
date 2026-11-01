// Emitter: turns preset data (LST.FX_PRESETS) into particles in a ParticlePool.
//   Emitter.burst(pool, rng, preset, x, y, opts)  one-shot radial burst (streakBurst)
//   new Emitter.Stream(preset)                    continuous emitter with a rate accumulator (aura)

LST.Emitter = {
  // opts: { count, speedMul, colors, scale (count multiplier), priority }
  burst(pool, rng, preset, x, y, opts = {}) {
    const n = Math.max(1, Math.round((opts.count || preset.count) * (opts.scale == null ? 1 : opts.scale)));
    const colors = opts.colors || preset.colors;
    const sm = opts.speedMul || 1;
    const shape = preset.shape === "streak" ? LST.FX_SHAPE.STREAK : preset.shape === "glow" ? LST.FX_SHAPE.GLOW : LST.FX_SHAPE.SOFT;
    const turn = rng.next() * Math.PI * 2;
    let made = 0;
    for (let k = 0; k < n; k++) {
      const i = pool.spawn(!!opts.priority);
      if (i < 0) break;
      // evenly spaced spokes + a little wobble: reads as a clean radial burst
      const a = turn + (k / n) * Math.PI * 2 + (rng.next() - 0.5) * 2 * preset.jitter;
      // speed skewed toward the fast end so most streaks stretch
      const s = (preset.speed[0] + (preset.speed[1] - preset.speed[0]) * Math.sqrt(rng.next())) * sm;
      const col = pool.colorId(colors[Math.floor((k / n) * colors.length * 3) % colors.length]);
      pool.set(i, x, y, Math.cos(a) * s, Math.sin(a) * s,
        rng.range(preset.life[0], preset.life[1]), rng.range(preset.width[0], preset.width[1]),
        shape, col, preset.drag, preset.gravity, preset.stretch, preset.minLength);
      made++;
    }
    return made;
  },

  Stream: class Stream {
    constructor(preset) { this.preset = preset; this.acc = 0; }
    // How many particles to emit this frame at `rate` per second.
    take(dt, rate) {
      this.acc += dt * rate;
      const n = Math.floor(this.acc);
      this.acc -= n;
      return Math.min(n, 8); // never a flood after a long frame
    }
  },
};
