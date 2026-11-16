// TowerGroundGlow: plays the fx.json effect "towerAura" under an upgraded tower (world space):
// the aura tier picks the sheet, tower power (intensity 0..1) sets size and strength.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the effect manifest.
LST.TowerGroundGlow = class TowerGroundGlow {
  draw(fx, ctx, tower, aura, time) {
    if (!tower || aura.power <= 0) return;
    fx.effects.draw("towerAura", ctx, { x: tower.x, y: tower.y, base: tower.radius, t: time, level: aura.intensity, variant: aura.tier });
  }
};
