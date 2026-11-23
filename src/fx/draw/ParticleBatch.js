// ParticleBatch: draws a particle pool as fx.json image effects, in three passes. Pass 1 (theme
// blend): the glow under each mote and crit glow ("glow.<variant>"). Pass 2 (normal): mote cores
// ("mote.<variant>", a cell of the motes atlas). Pass 3: streaks ("streak.<variant>"), stretched
// along the velocity with the head on the particle; frames 0-2 are the old 3 fade (width) steps
// and the ink outline is in the art. A particle's colour is a variant name (fx.json presets and
// impacts); it never draws a shape or tints, and draws nothing until the art is in.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the theme and the effects.
// Per frame it allocates nothing: one reused draw-args object (every field set on each draw), ids
// from FxManifest.variantId, and one save / restore around the passes (draws are "batched").
LST.ParticleBatch = class ParticleBatch {
  constructor() { this.at = { x: 0, y: 0, x2: null, y2: null, base: 1, p: null, alpha: 1, blend: null, batched: true }; }

  // The reused draw args for one particle (no per-particle object).
  args(x, y, x2, y2, base, p, alpha, blend) {
    const at = this.at; at.x = x; at.y = y; at.x2 = x2; at.y2 = y2; at.base = base; at.p = p; at.alpha = alpha; at.blend = blend;
    return at;
  }

  draw(fx, ctx, pool, unitPx = 1, low = false) {
    const n = pool.count;
    if (!n) return;
    const th = fx.theme, S = LST.FX_SHAPE, pal = pool.palette, E = fx.effects;
    if (!E) return;
    ctx.save();
    let streaks = 0;
    for (let i = 0; i < n; i++) {
      const sh = pool.shape[i];
      if (sh === S.STREAK) { streaks++; continue; }
      const f = pool.life[i] / pool.maxLife[i];
      const R = sh === S.SOFT ? pool.size[i] * (0.55 + 0.45 * f) : pool.size[i] * (1.2 - 0.2 * f);
      const a = (sh === S.SOFT ? Math.min(1, (1 - f) * 6) * Math.pow(f, 0.6) * 0.85 : f) * th.glow;
      E.draw(E.variantId("glow", pal[pool.color[i]]), ctx, this.args(pool.x[i], pool.y[i], null, null, R, null, a, th.blend));
    }
    for (let i = 0; i < n; i++) {
      if (pool.shape[i] !== S.SOFT) continue;
      const f = pool.life[i] / pool.maxLife[i];
      const r = Math.max(1.2 * unitPx, pool.size[i] * 0.24);
      E.draw(E.variantId("mote", pal[pool.color[i]]), ctx, this.args(pool.x[i], pool.y[i], null, null, r, null, Math.min(1, (1 - f) * 6) * Math.pow(f, 0.5) * 0.95, null));
    }
    if (streaks) this.drawStreaks(fx, ctx, pool, unitPx);
    ctx.restore();
  }

  // Streak b (fade step 0 = fresh .. FADE-1 = nearly dead) plays frame b at the old step opacity;
  // height = the particle's width + the old ink edge (presets.streakBurst.inkWidth).
  drawStreaks(fx, ctx, pool, unitPx) {
    const S = LST.FX_SHAPE, pal = pool.palette, n = pool.count, E = fx.effects, FADE = LST.ParticleBatch.FADE_STEPS;
    const P = E.preset("streakBurst"), ink = (P && P.inkWidth) || 0;
    for (let i = 0; i < n; i++) {
      if (pool.shape[i] !== S.STREAK) continue;
      const b = this.fadeStep(pool, i, FADE), f = 1 - (b + 0.5) / FADE;
      const vx = pool.vx[i], vy = pool.vy[i], sp = Math.hypot(vx, vy) || 1;
      const len = Math.max(pool.minLen[i], sp * pool.stretch[i]);
      E.draw(E.variantId("streak", pal[pool.color[i]]), ctx, this.args(pool.x[i], pool.y[i], pool.x[i] + (vx / sp) * len, pool.y[i] + (vy / sp) * len,
        pool.size[i] + ink * unitPx, (b + 0.5) / FADE, Math.min(1, f * 1.8), null));
    }
  }

  fadeStep(pool, i, FADE) { return Math.min(FADE - 1, ((1 - pool.life[i] / pool.maxLife[i]) * FADE) | 0); }
};
LST.ParticleBatch.FADE_STEPS = 3;
