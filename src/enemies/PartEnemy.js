// PartEnemy: an Enemy whose extra behavior comes from parts (src/enemies/parts). It adds no
// rules of its own: it forwards update / damage / slow to its parts, then to LST.Enemy.
// Made only by LST.EnemyArchetype.create, so Backyard enemies stay plain LST.Enemy objects.
LST.PartEnemy = class PartEnemy extends LST.Enemy {
  constructor(type, x, y, mult, archetypeId) {
    super(type, x, y, mult);
    this.archetype = archetypeId;
    this.parts = [];
  }

  addPart(part) { this.parts.push(part.attach(this)); return part; }
  part(Cls) { return this.parts.find((p) => p instanceof Cls) || null; }

  update(dt, game) {
    for (const p of this.parts) p.update(dt, this, game);
    super.update(dt, game);
  }

  applySlow(amount, time) {
    if (this.parts.some((p) => p.blocksSlow(this))) return;
    super.applySlow(amount, time);
  }

  takeDamage(amount, game) {
    if (this.dead || this.untargetable) return;
    for (const p of this.parts) amount = p.absorb(amount, this, game);
    if (amount <= 0) { this.hitFlash = 0.08; return; }
    super.takeDamage(amount, game);
  }
};
