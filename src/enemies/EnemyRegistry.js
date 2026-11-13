// EnemyRegistry: enemy id -> archetype, and the one factory every spawn goes through.
// Ids without an archetype (basic, fast, tank, boss, mole) come back as a plain LST.Enemy,
// exactly as before, so the Backyard never changes. Registering an archetype also puts its
// stats in LST.CONFIG.enemies (radius for the spawn ring, coins for Head Start income).
LST.EnemyRegistry = {
  archetypes: {},
  register(arch) {
    this.archetypes[arch.id] = arch;
    LST.CONFIG.enemies[arch.id] = arch.stats || LST.CONFIG.enemies[arch.base];
    return arch;
  },
  get(id) { return this.archetypes[id] || null; },
  create(type, x, y, mult) {
    const a = this.archetypes[type];
    return a ? a.create(x, y, mult) : new LST.Enemy(type, x, y, mult);
  },
};
