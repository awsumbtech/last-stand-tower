// TowerGroundGlow: the soft glow on the ground under an upgraded tower (world space).
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the theme and glow sprites.
LST.TowerGroundGlow = class TowerGroundGlow {
  // Soft glow on the ground under an upgraded tower.
  draw(fx, ctx, tower, aura, time) {
    if (!tower || aura.power <= 0) return;
    const P = aura.preset, k = aura.intensity, th = fx.theme;
    const a = (P.groundGlow[0] + (P.groundGlow[1] - P.groundGlow[0]) * k) * th.glow * (0.9 + 0.1 * Math.sin(time * 2.4));
    if (a <= 0.01) return;
    const colors = P.colorsByTier[Math.min(P.colorsByTier.length - 1, aura.tier)];
    const R = tower.radius * (2.1 + 1.3 * k);
    ctx.save();
    ctx.globalCompositeOperation = th.blend;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(fx.glow(colors[colors.length > 2 ? 1 : 0]), tower.x - R, tower.y - R, R * 2, R * 2);
    ctx.restore();
  }
};
