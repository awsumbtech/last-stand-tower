// OverdriveRing: the hot orange pulse around the tower while Overdrive runs (world space).
// Moved as-is out of render.js; its image art is planned with the FX art (section B).
LST.OverdriveRing = class OverdriveRing {
  draw(ctx, tower, time) {
    if (tower.overdrive <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, tower.radius * (1.9 + 0.25 * Math.sin(time * 18)), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 159, 67, 0.35)";
    ctx.fill();
    ctx.restore();
  }
};
