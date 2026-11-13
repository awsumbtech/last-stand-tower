// WorldDefinition: everything that makes one world itself, as data plus a few small rules.
//   id, name, order
//   scaling   { hp, damage, gears, coins }  (ROADMAP Sprint 6 H / D / G; coins default 1)
//   plan      a LevelPlan (plan-driven LevelDirector), or null for the classic Backyard waves
//   enemies   signature enemy ids (for the world card), miniBoss id, finale { boss, create, arrive }
//   art       { background: World2 sheet id or null (null = the theme's own ground), card: image url }
//   unlock    null (always open) or { cleared: <world id> } (beat that world's wave-20 finale)
//   copy      { finaleSub, clearedTitle, clearedSub, next }
//   best      "legacy" = the old lst.bestWave key (Backyard); otherwise meta.state.worlds[id].best
//   headStartBeforeClear  Head Start may skip early waves before the first clear (Backyard only)
// One instance per world, registered with LST.WorldRegistry (Backyard.js, Beach.js).
LST.WorldDefinition = class WorldDefinition {
  constructor(def) {
    Object.assign(this, {
      order: 0, scaling: { hp: 1, damage: 1, gears: 1, coins: 1 }, plan: null, enemies: [], miniBoss: "boss",
      finale: null, art: { background: null, card: null }, unlock: null, copy: {}, best: null, headStartBeforeClear: false,
    }, def);
  }

  get gearMult() { return this.scaling.gears || 1; }

  createDirector() { return this.plan ? new LST.LevelDirector(this) : new LST.ClassicWaveDirector(this); }

  // The normal unlock rule only (no dev flags; see WorldRegistry.isUnlocked).
  isUnlockedBy(meta) {
    if (!this.unlock) return true;
    return !!(meta && meta.worldCleared && meta.worldCleared(this.unlock.cleared));
  }

  record(meta) { return meta && meta.state && meta.state.worlds ? meta.state.worlds[this.id] || null : null; }

  loadBest(meta = LST.meta, storage = LST.utils.storage) {
    if (this.best === "legacy") return storage.get("lst.bestWave", 0);
    const r = this.record(meta);
    return r ? r.best || 0 : 0;
  }

  saveBest(wave, meta = LST.meta, storage = LST.utils.storage) {
    if (this.best === "legacy") { storage.set("lst.bestWave", wave); return; }
    const r = this.record(meta);
    if (r) { r.best = Math.max(r.best || 0, wave); meta.save(); }
  }

  // Wave-20 boss: made after the finale intro, pushed into game.enemies by the game.
  createFinaleBoss(mult, game) {
    const b = this.finale.create(mult, game);
    b.finaleBoss = true;
    return b;
  }
  finaleArrived(game, boss) { if (this.finale.arrive) this.finale.arrive(game, boss); }

  // Start fetching this world's image sheets (no-op where there are none, e.g. the sim).
  preloadArt() { if (this.art.background && LST.world2Sheets) LST.world2Sheets.preload(); }
};
