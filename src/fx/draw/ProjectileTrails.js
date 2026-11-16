// ProjectileTrails: a comet tail behind every shot and a glow on it, as fx.json image effects.
// The tail is "trail.<variant>" (the shot's element trail, else presets.trail.variant), stretched
// behind the shot along its velocity with the head on the shot; the glow is "glow.<variant>"
// (crit, element or plain glow from presets.trail), skipped in low quality. It never draws a
// shape or tints, and draws nothing until the art is in.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the theme and the effects.
LST.ProjectileTrails = class ProjectileTrails {
  draw(fx, ctx, list, low) {
    const E = fx.effects, T = E && E.preset("trail"), th = fx.theme;
    if (!list.length || !T) return;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const sp = Math.hypot(p.vx, p.vy);
      if (!sp) continue;
      const len = Math.min(T.maxLength, sp * T.stretch) * (p.trail ? T.elementLength : 1);
      E.draw("trail." + (p.trail || T.variant), ctx, { x: p.x, y: p.y, x2: p.x + (p.vx / sp) * len, y2: p.y + (p.vy / sp) * len, base: T.height, alpha: th.trailAlpha });
    }
    if (low) return;
    const a = Math.min(1, T.glowAlpha * th.glow);
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const R = (p.crit ? T.critGlowRadius : T.glowRadius) * (p.trail ? T.elementGlowMul : 1);
      const g = p.crit ? T.critGlow : p.trail ? T.elementGlows[p.trail] : T.glow;
      E.draw("glow." + g, ctx, { x: p.x, y: p.y, base: R, alpha: a, blend: th.blend });
    }
  }
};
