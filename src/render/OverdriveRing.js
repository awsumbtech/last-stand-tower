// OverdriveRing: while Overdrive runs, plays the fx.json effect "overdriveAura" on the tower
// (world space). It only decides when and where; the look is the manifest entry and its art.
LST.OverdriveRing = class OverdriveRing {
  draw(ctx, tower, time, effects) {
    if (tower.overdrive <= 0 || !effects) return;
    effects.draw("overdriveAura", ctx, { x: tower.x, y: tower.y, base: tower.radius, t: time });
  }
};
