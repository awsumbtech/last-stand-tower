// ImpactFlashes: the short soft screen glow centred on world impacts (screen px), the fx.json
// effect "impactFlash" sized by the screen's long side and scaled by the impact's flash
// strength (ImpactSync sets flash 0 in reduced motion, so nothing plays there).
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the effect manifest.
LST.ImpactFlashes = class ImpactFlashes {
  draw(fx, ctx, camera, r) {
    for (const p of camera.pulses) {
      if (!p.active || p.space !== "world" || p.flash <= 0) continue;
      fx.effects.draw("impactFlash", ctx, { x: r.width / 2 + p.x * r.scale, y: r.height / 2 + p.y * r.scale, base: Math.max(r.width, r.height), p: p.t / p.life, alpha: p.flash });
    }
  }
};
