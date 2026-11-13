// Coconut: Captain Crabclaw's lobbed projectile. Lives in game.hazards (not game.projectiles,
// which are the tower's shots). Lifecycle:
//   flying  (flight seconds): moves from the throw point to its landing spot on an arc;
//           a ground warning decal sits on the landing spot the whole time (CoconutRenderer)
//   landed  the frame it lands: if the spot is within hitRadius of the tower, the tower takes
//           `damage` through game.onCoconutHit (falls back to game.onBossSlam)
//   splat   0.35 s of splat on the ground (visual only), then dead.
// Pure rules + timing; how it looks is CoconutRenderer's job.
LST.Coconut = class Coconut {
  constructor({ x, y, tx, ty, flight, damage, hitRadius, arc, boss }) {
    this.kind = "coconut";
    this.x0 = x; this.y0 = y;
    this.x = x; this.y = y;
    this.tx = tx; this.ty = ty;
    this.flight = flight;
    this.damage = damage;
    this.hitRadius = hitRadius;
    this.arc = arc || 110;        // peak height in world units (drawn as a screen-up offset)
    this.boss = boss || null;
    this.t = 0;
    this.state = "flying";
    this.hit = false;             // landed on the tower
    this.splatLife = 0.35;
    this.radius = 9;
    this.dead = false;
  }

  get progress() { return Math.min(1, this.t / this.flight); }
  // Height above the ground right now (0 at both ends of the arc).
  get height() { const k = this.progress; return 4 * this.arc * k * (1 - k); }

  update(dt, game) {
    this.t += dt;
    if (this.state === "flying") {
      const k = this.progress;
      this.x = this.x0 + (this.tx - this.x0) * k;
      this.y = this.y0 + (this.ty - this.y0) * k;
      if (k >= 1) this.land(game);
    } else if (this.state === "splat" && this.t >= this.flight + this.splatLife) {
      this.dead = true;
    }
  }

  land(game) {
    this.state = "splat";
    const t = game.tower;
    const r = t.radius + this.hitRadius;
    this.hit = (this.tx - t.x) ** 2 + (this.ty - t.y) ** 2 <= r * r;
    if (!this.hit) return;
    if (game.onCoconutHit) game.onCoconutHit(this);
    else if (game.onBossSlam) game.onBossSlam(this.boss || { dead: true }, this.damage);
  }
};
