// EnemyArchetype: one enemy kind as data (stats) plus the behavior parts it is built from.
//   new LST.EnemyArchetype({ id, base?, stats?, parts: [[PartClass, cfg], ...] })
// base: the LST.CONFIG.enemies entry the body uses (default: id). An archetype with its own
// stats registers them under its id; one without (Elite Big Red) borrows its base's.
// create() makes a PartEnemy of type `base`, so every rule keyed on the type (Big Red's boss
// AI, boss bonus coins) keeps working, and attaches a fresh copy of each part.
LST.EnemyArchetype = class EnemyArchetype {
  constructor({ id, base, stats, parts, entity }) {
    this.id = id;
    this.base = base || id;
    this.stats = stats || null;
    this.parts = parts || [];
    this.entity = entity || null; // optional PartEnemy subclass
  }

  create(x, y, mult) {
    const Entity = this.entity || LST.PartEnemy;
    const e = new Entity(this.base, x, y, mult, this.id);
    for (const [Part, cfg] of this.parts) e.addPart(new Part(cfg));
    return e;
  }
};
