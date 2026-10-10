// Meta progression that lasts between runs: Gears and card unlocks.
//
// Saved in localStorage under "lst.meta.v1" (versioned so later sprints can migrate it).
// The best wave keeps its own old key ("lst.bestWave") so existing saves never break.
//
//   LST.meta.gearsFor(wave, bossWaves) -> { waves, bosses, mult, total }
//   LST.meta.isUnlocked(cardId) / LST.meta.unlock(cardId)
//   LST.meta.recordRun(result) -> adds the run's Gears and saves

LST.meta = (function () {
  const KEY = "lst.meta.v1";
  const storage = LST.utils.storage;

  function fresh() {
    return { v: 1, gears: 0, lifetimeGears: 0, unlocked: [], runs: 0, seenWorkshop: false, veteranBonus: 0 };
  }

  function load() {
    const s = Object.assign(fresh(), storage.get(KEY, null) || {});
    if (!Array.isArray(s.unlocked)) s.unlocked = [];
    s.gears = Math.max(0, Math.floor(+s.gears || 0));
    // First time we see a save from before Gears existed: pay out the best wave once,
    // so returning players can unlock Multishot right away.
    if (!storage.get(KEY, null)) {
      const best = +storage.get("lst.bestWave", 0) || 0;
      if (best > 0) {
        s.veteranBonus = api.gearsFor(best + 1, Math.floor(best / LST.CONFIG.waves.bossEvery)).total;
        s.gears += s.veteranBonus;
        s.lifetimeGears += s.veteranBonus;
      }
    }
    return s;
  }

  const api = {
    KEY,
    state: null,

    save() { storage.set(KEY, this.state); },

    // Gears = floor((perWave * wave^waveExp + perBoss * bossWavesCleared) * worldMult * (1 + cogBonus * cogs))
    // worldMult and Cogs arrive in later sprints (Backyard = 1, no Cogs yet).
    gearsFor(wave, bossWaves, worldMult = 1, cogs = 0) {
      const g = LST.CONFIG.meta.gears;
      const waves = g.perWave * Math.pow(Math.max(0, wave), g.waveExp);
      const bosses = g.perBoss * bossWaves;
      const mult = worldMult * (1 + g.cogBonus * cogs);
      const total = Math.floor((waves + bosses) * mult);
      return { waves: Math.floor(waves), bosses, mult, total };
    },

    card(id) { return LST.CARDS.find((c) => c.id === id); },
    // Starter cards (no unlockCost) are always unlocked.
    isUnlocked(id) {
      const c = this.card(id);
      return !!c && (!c.unlockCost || this.state.unlocked.includes(id));
    },
    lockable() { return LST.CARDS.filter((c) => c.unlockCost).sort((a, b) => a.unlockCost - b.unlockCost); },
    locked() { return this.lockable().filter((c) => !this.isUnlocked(c.id)); },
    nextUnlock() { return this.locked()[0] || null; },
    canAfford(id) { const c = this.card(id); return !!c && !this.isUnlocked(id) && this.state.gears >= c.unlockCost; },
    anyAffordable() { return this.locked().some((c) => this.state.gears >= c.unlockCost); },

    unlock(id) {
      if (!this.canAfford(id)) return false;
      this.state.gears -= this.card(id).unlockCost;
      this.state.unlocked.push(id);
      this.save();
      return true;
    },

    // Runs before Multishot is unlocked get a gentler early HP curve (see CONFIG.meta.starterAssist).
    starterAssist() { return !this.isUnlocked("multishot"); },

    recordRun(gears) {
      this.state.gears += gears;
      this.state.lifetimeGears += gears;
      this.state.runs += 1;
      this.save();
    },
  };

  api.state = load();
  api.save();
  return api;
})();
