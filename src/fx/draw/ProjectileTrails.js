// ProjectileTrails: a comet tail behind every shot and a glow on it, as fx.json image effects.
// The tail is "trail.<variant>" (the shot's element trail, else presets.trail.variant), stretched
// behind the shot along its velocity with the head on the shot; the glow is "glow.<variant>"
// (crit, element or plain glow from presets.trail), skipped in low quality. It never draws a
// shape or tints, and draws nothing until the art is in.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the theme and the effects.
// Per frame it allocates nothing: one reused draw-args object (every field set on each draw), ids
// from FxManifest.variantId, and one save / restore around the passes (draws are "batched").
LST.ProjectileTrails = class ProjectileTrails {
  constructor() { this.at = { x: 0, y: 0, x2: null, y2: null, base: 1, alpha: 1, blend: null, batched: true }; }

  args(x, y, x2, y2, base, alpha, blend) {
    const at = this.at; at.x = x; at.y = y; at.x2 = x2; at.y2 = y2; at.base = base; at.alpha = alpha; at.blend = blend;
    return at;
  }

  draw(fx, ctx, list, low) {
    const E = fx.effects, T = E && E.preset("trail"), th = fx.theme;
    if (!list.length || !T) return;
    ctx.save();
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const sp = Math.hypot(p.vx, p.vy);
      if (!sp) continue;
      const len = Math.min(T.maxLength, sp * T.stretch) * (p.trail ? T.elementLength : 1);
      E.draw(E.variantId("trail", p.trail || T.variant), ctx, this.args(p.x, p.y, p.x + (p.vx / sp) * len, p.y + (p.vy / sp) * len, T.height, th.trailAlpha, null));
    }
    if (low) { ctx.restore(); return; }
    const a = Math.min(1, T.glowAlpha * th.glow);
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const R = (p.crit ? T.critGlowRadius : T.glowRadius) * (p.trail ? T.elementGlowMul : 1);
      const g = p.crit ? T.critGlow : p.trail ? T.elementGlows[p.trail] : T.glow;
      E.draw(E.variantId("glow", g), ctx, this.args(p.x, p.y, null, null, R, a, th.blend));
    }
    ctx.restore();
  }
};
