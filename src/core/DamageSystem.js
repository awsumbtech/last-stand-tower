// DamageSystem: damage that a World deals outside a single shot. A boss slam (or a coconut)
// hurts the tower, and Thorns bounces part of it back; the Splash card hurts everything near
// an impact. The look of each hit is FxSpawner's (called at the same point as before, so the
// random-number order is unchanged).
LST.DamageSystem = class DamageSystem {
  constructor(world) { this.world = world; }

  // A telegraphed slam lands: the tower takes damage, Thorns bounces some back.
  bossSlam(boss, damage) {
    const w = this.world, t = w.tower;
    t.takeDamage(damage);
    w.fxSpawner.slamHit(t, damage);
    if (t.thorns > 0 && !boss.dead) {
      const back = damage * t.thorns;
      boss.takeDamage(back, w);
      w.fxSpawner.thorns(boss, back);
    }
  }

  // Splash card: damage everything near an impact (not the enemy that was hit).
  splash(center, amount, radius) {
    const w = this.world, r2 = radius * radius;
    for (const e of w.enemies) {
      if (e === center || e.dead) continue;
      if (LST.utils.dist2(center.x, center.y, e.x, e.y) <= r2) {
        e.takeDamage(amount, w);
        e.hitFlash = 0.08;
      }
    }
    w.fxSpawner.splash(center, radius);
  }
};
