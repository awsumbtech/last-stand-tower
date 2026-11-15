// ImpactFlashes: the short soft screen flash centered on world impacts (screen px; ImpactSync sets flash 0 in reduced motion).
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the theme and glow sprites.
LST.ImpactFlashes = class ImpactFlashes {
  // Screen layer: short soft flash centered on world impacts (skipped in reduced motion:
  // ImpactSync sets flash 0 there).
  draw(fx, ctx, camera, r) {
    for (const p of camera.pulses) {
      if (!p.active || p.space !== "world" || p.flash <= 0) continue;
      const f = Math.min(1, p.t / p.life);
      const a = p.flash * Math.pow(1 - f, 2);
      if (a < 0.01) continue;
      const sx = r.width / 2 + p.x * r.scale, sy = r.height / 2 + p.y * r.scale;
      const R = Math.max(r.width, r.height) * 0.5;
      ctx.save();
      ctx.globalCompositeOperation = fx.theme.bloomBlend;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(fx.glow("#fff3a0"), sx - R, sy - R, R * 2, R * 2);
      ctx.restore();
    }
  }
};
