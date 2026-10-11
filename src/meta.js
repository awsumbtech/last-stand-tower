// Meta progression that lasts between runs: Gears, card unlocks, Workshop upgrades,
// Head Start and the bench (cards kept out of the shop).
//
// Saved in localStorage under "lst.meta" as { v: <schema version>, ... }.
// Older saves are migrated step by step (see MIGRATIONS) and the old key is kept as a backup.
// The best wave keeps its own old key ("lst.bestWave") so pre-Gears saves never break.
//
//   LST.meta.gearsFor(wave, bossWaves) -> { waves, bosses, mult, total }
//   LST.meta.isUnlocked(id) / unlock(id)                     cards
//   LST.meta.level(id) / upgradeCost(id) / buyUpgrade(id)    Workshop upgrades
//   LST.meta.applyToRun(game)                                stat upgrades at the start of a run
//   LST.meta.headStartWave(best)                             wave a new run starts after
//   LST.meta.isBenched(id) / toggleBench(id)

LST.UPGRADES = [
  { id: "power", name: "Power", color: "#ff4757", icon: '<path d="M12 2l2.6 6.2 6.4-1.6-3.9 5.4 3.9 5.4-6.4-1.6L12 22l-2.6-6.2-6.4 1.6L6.9 12 3 6.6l6.4 1.6z"/>',
    desc: (n) => `+${Math.round(n * 5)}% damage` },
  { id: "rapid", name: "Rapid", color: "#ffb020", icon: '<path d="M13.5 2L4 13.5h6.5L9 22l10-12h-6.6z"/>',
    desc: (n) => `+${Math.round(n * 3)}% fire rate` },
  { id: "armor", name: "Armor", color: "#5ec8ff", icon: '<path d="M12 2l8 3v6c0 5-3.4 9.2-8 11-4.6-1.8-8-6-8-11V5z"/>',
    desc: (n) => `-${(LST.meta.armorReduction(n) * 100).toFixed(1).replace(/\.0$/, "")}% damage taken` },
  { id: "bank", name: "Bank", color: "#ffd23f", icon: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M14.8 8.6c-.6-.8-1.6-1.2-2.8-1.2-1.6 0-2.8.9-2.8 2.2 0 3 5.8 1.7 5.8 4.7 0 1.3-1.3 2.3-3 2.3-1.3 0-2.4-.5-3-1.4"/>',
    desc: (n) => `+${n * 15} starting coins` },
  { id: "greed", name: "Greed", color: "#3ddc84", icon: '<path d="M4 9h16l-1.5 11h-13z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/>',
    desc: (n) => `+${n * 4}% coins per kill` },
  { id: "sharpEye", name: "Sharp Eye", color: "#8e6cff", icon: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3.4"/>',
    desc: (n) => `+${n}% crit chance` },
  { id: "headStart", name: "Head Start", color: "#ff9f43", icon: '<path d="M5 21V3"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
    desc: (n) => n ? `Start up to wave ${n * 5 + 1}` : "Skip the early waves" },
  { id: "appraisal", name: "Appraisal", color: "#26a69a", icon: '<circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/><path d="M7.5 10h5M10 7.5v5"/>',
    desc: (n) => ["Learn to read trap cards", "Cursed cards wobble", "Fine print shown in full", "Return a trap within 1 wave"][n] },
];

LST.meta = (function () {
  const KEY = "lst.meta";
  const VERSION = 4;
  const storage = LST.utils.storage;
  const M = () => LST.CONFIG.meta;

  function fresh() {
    return {
      v: VERSION, gears: 0, lifetimeGears: 0, runs: 0, seenWorkshop: false, veteranBonus: 0,
      unlocked: [], upgrades: {}, benched: [], headStartPick: null, // null = use the highest allowed
      codex: { seen: [], traps: [] }, // cards you've been dealt / traps you've discovered
      armorRefund: 0,                 // Gears refunded when Armor changed
      armorNotice: false,             // show the "Armor changed" note once
      worlds: { backyard: { cleared: false, clears: 0, bestTime: 0 } }, // world finales beaten (world 2 unlocks in Sprint 6)
      abilities: ["shockwave"], ability: "shockwave", // unlocked / equipped active ability
      finaleNotice: false,            // "King Mole waits at wave 20" note for older saves
    };
  }

  // Each step takes a save of version k and returns version k + 1.
  const MIGRATIONS = {
    1: (s) => Object.assign(s, { v: 2, upgrades: {}, benched: [], headStartPick: null }),
    // v3: Armor became damage reduction with max 35 levels (was +6% max HP, max 60).
    // Levels up to 35 are kept; Gears spent on levels above that are refunded.
    2: (s) => {
      const lvl = Math.floor(+((s.upgrades || {}).armor) || 0), max = M().upgrades.armor.max;
      let refund = 0;
      for (let n = max; n < lvl; n++) refund += Math.round(10 * Math.pow(1.15, n)); // old Armor price curve
      if (lvl > max) { s.upgrades.armor = max; s.gears = (s.gears || 0) + refund; }
      return Object.assign(s, { v: 3, codex: { seen: [], traps: [] }, armorRefund: refund, armorNotice: lvl > 0 });
    },
    // v4: world finales (King Mole at wave 20) and active abilities.
    3: (s) => Object.assign(s, {
      v: 4, worlds: { backyard: { cleared: false, clears: 0, bestTime: 0 } }, abilities: ["shockwave"], ability: "shockwave",
      finaleNotice: (+storage.get("lst.bestWave", 0) || 0) >= 15,
    }),
  };

  function sanitize(s) {
    const f = fresh();
    for (const k of Object.keys(f)) if (s[k] === undefined || typeof s[k] !== typeof f[k] && f[k] !== null) s[k] = f[k];
    s.gears = Math.max(0, Math.floor(+s.gears || 0));
    if (!Array.isArray(s.unlocked)) s.unlocked = [];
    if (!Array.isArray(s.benched)) s.benched = [];
    if (!s.upgrades || typeof s.upgrades !== "object") s.upgrades = {};
    for (const [id, cfg] of Object.entries(M().upgrades)) {
      const n = Math.floor(+s.upgrades[id] || 0);
      s.upgrades[id] = Math.max(0, Math.min(cfg.max, n));
    }
    s.unlocked = s.unlocked.filter((id) => LST.CARDS.some((c) => c.id === id && c.unlockCost));
    if (!s.codex || typeof s.codex !== "object") s.codex = { seen: [], traps: [] };
    if (!s.worlds || typeof s.worlds !== "object") s.worlds = {};
    s.worlds.backyard = Object.assign({ cleared: false, clears: 0, bestTime: 0 }, s.worlds.backyard || {});
    if (!Array.isArray(s.abilities)) s.abilities = ["shockwave"];
    s.abilities = s.abilities.filter((a) => LST.CONFIG.abilities[a]);
    if (!s.abilities.includes("shockwave")) s.abilities.unshift("shockwave");
    if (!s.abilities.includes(s.ability)) s.ability = "shockwave";
    for (const k of ["seen", "traps"]) if (!Array.isArray(s.codex[k])) s.codex[k] = [];
    s.benched = s.benched.filter((id) => LST.CARDS.some((c) => c.id === id)).slice(0, M().benchMax);
    return s;
  }

  function load() {
    let s = storage.get(KEY, null);
    let migratedFrom = null;
    if (!s) {
      const v1 = storage.get("lst.meta.v1", null); // Sprint 1 save
      if (v1) { s = v1; s.v = 1; migratedFrom = 1; }
    }
    if (s && typeof s === "object") {
      while ((s.v || 1) < VERSION && MIGRATIONS[s.v || 1]) s = MIGRATIONS[s.v || 1](s);
      return { s: sanitize(s), migratedFrom };
    }
    // No save at all: maybe a player from before Gears existed.
    s = fresh();
    const best = +storage.get("lst.bestWave", 0) || 0;
    if (best > 0) {
      s.veteranBonus = api.gearsFor(best + 1, Math.floor(best / LST.CONFIG.waves.bossEvery)).total;
      s.gears = s.lifetimeGears = s.veteranBonus;
    }
    return { s, migratedFrom };
  }

  const api = {
    KEY, VERSION,
    state: null,
    migratedFrom: null,

    save() { storage.set(KEY, this.state); },

    // Erase every bit of lasting progress (settings like sound stay).
    resetAll() {
      try { localStorage.removeItem(KEY); localStorage.removeItem("lst.meta.v1"); localStorage.removeItem("lst.bestWave"); } catch (e) { /* ignore */ }
      this.state = fresh();
      this.save();
    },

    // Gears = floor((perWave * wave^waveExp + perBoss * bossWavesCleared) * worldMult * (1 + cogBonus * cogs))
    gearsFor(wave, bossWaves, worldMult = 1, cogs = 0, bossKills = 0) {
      const g = M().gears;
      const waves = g.perWave * Math.pow(Math.max(0, wave), g.waveExp);
      const bosses = g.perBoss * bossWaves + LST.CONFIG.bosses.killGears * bossKills;
      const mult = worldMult * (1 + g.cogBonus * cogs);
      return { waves: Math.floor(waves), bosses, mult, total: Math.floor((waves + bosses) * mult) };
    },

    // ---------- Cards ----------
    card(id) { return LST.cardById ? LST.cardById(id) : LST.CARDS.find((c) => c.id === id); },
    isUnlocked(id) {
      const c = this.card(id);
      return !!c && (!c.unlockCost || this.state.unlocked.includes(id));
    },
    lockable() { return LST.CARDS.filter((c) => c.unlockCost).sort((a, b) => a.unlockCost - b.unlockCost); },
    locked() { return this.lockable().filter((c) => !this.isUnlocked(c.id)); },
    nextUnlock() { return this.locked()[0] || null; },
    canAfford(id) { const c = this.card(id); return !!c && !this.isUnlocked(id) && this.state.gears >= c.unlockCost; },
    unlock(id) {
      if (!this.canAfford(id)) return false;
      this.state.gears -= this.card(id).unlockCost;
      this.state.unlocked.push(id);
      this.save();
      return true;
    },
    // In the shop: unlocked and not benched.
    inDeck(id) { return this.isUnlocked(id) && !this.isBenched(id); },

    // ---------- Bench ----------
    isBenched(id) { return this.state.benched.includes(id); },
    // Returns "" on success, or why it can't be benched.
    benchBlock(id) {
      if (this.isBenched(id)) return "";
      if (this.state.benched.length >= M().benchMax) return `You can bench up to ${M().benchMax} cards.`;
      const attackLeft = LST.CARDS.filter((c) => c.offense && c.id !== id && this.inDeck(c.id));
      if (this.card(id).offense && !attackLeft.length) return "Keep at least one attack card.";
      const left = LST.CARDS.filter((c) => c.id !== id && this.inDeck(c.id));
      if (left.length < 3) return "Keep at least 3 cards in the deck.";
      return "";
    },
    toggleBench(id) {
      if (!this.isUnlocked(id)) return false;
      if (this.isBenched(id)) this.state.benched = this.state.benched.filter((b) => b !== id);
      else if (this.benchBlock(id)) return false;
      else this.state.benched.push(id);
      this.save();
      return true;
    },

    // ---------- Workshop upgrades ----------
    level(id) { return this.state.upgrades[id] || 0; },
    upgradeCost(id) {
      const u = M().upgrades[id];
      const n = this.level(id);
      if (n >= u.max) return Infinity;
      return u.costs ? u.costs[n] : Math.round(u.base * Math.pow(u.growth, n));
    },
    // Armor: damage taken x keep^level, capped (diminishing returns, never 100%).
    armorReduction(level = this.level("armor")) {
      const a = M().upgrades.armor;
      return Math.min(a.cap, 1 - Math.pow(a.keep, level));
    },

    // ---------- Codex ----------
    knowsTrap(id) { return this.state.codex.traps.includes(id); },
    discoverTrap(id) {
      if (this.knowsTrap(id)) return false;
      this.state.codex.traps.push(id);
      this.save();
      return true;
    },
    seeCards(ids) {
      let changed = false;
      for (const id of ids) if (!this.state.codex.seen.includes(id)) { this.state.codex.seen.push(id); changed = true; }
      if (changed) this.save();
    },
    buyUpgrade(id) {
      const cost = this.upgradeCost(id);
      if (this.state.gears < cost) return false;
      this.state.gears -= cost;
      this.state.upgrades[id] = this.level(id) + 1;
      if (id === "headStart") this.state.headStartPick = null; // jump to the new max
      this.save();
      return true;
    },

    // Stat upgrades for a fresh run. Returns { coinMult } for kill coins.
    applyToRun(game) {
      const u = M().upgrades, t = game.tower, L = (id) => this.level(id);
      t.damageMult *= 1 + u.power.per * L("power");
      t.fireRate *= 1 + u.rapid.per * L("rapid");
      t.armor = this.armorReduction();
      t.critChance += u.sharpEye.per * L("sharpEye");
      game.coins += u.bank.per * L("bank");
      game.coinMult = 1 + u.greed.per * L("greed");
    },

    // Highest Head Start wave allowed: 5 per level, capped at headStartCap (85%) of the best wave (multiple of 5).
    headStartMax(best) {
      const per = M().upgrades.headStart.per;
      let cap = Math.floor((best * M().headStartCap) / per) * per;
      // You can't skip King Mole until you've beaten him once.
      if (!this.worldCleared()) cap = Math.min(cap, LST.CONFIG.finale.wave - per);
      return Math.max(0, Math.min(per * this.level("headStart"), cap));
    },

    // ---------- Worlds ----------
    worldCleared(id = "backyard") { return !!(this.state.worlds[id] && this.state.worlds[id].cleared); },
    // Beat a world finale: pays the bonus right away (saved) and returns it.
    clearWorld(id, seconds) {
      const w = this.state.worlds[id] || (this.state.worlds[id] = { cleared: false, clears: 0, bestTime: 0 });
      const g = LST.CONFIG.finale.gears;
      const first = !w.cleared;
      const bonus = first ? g.first : g.again;
      w.cleared = true;
      w.clears += 1;
      if (seconds && (!w.bestTime || seconds < w.bestTime)) w.bestTime = Math.round(seconds);
      this.state.gears += bonus;
      this.state.lifetimeGears += bonus;
      this.save();
      return { bonus, first };
    },

    // ---------- Active abilities ----------
    abilityUnlocked(id) { return this.state.abilities.includes(id); },
    equipAbility(id) {
      if (!this.abilityUnlocked(id)) return false;
      this.state.ability = id;
      this.save();
      return true;
    },
    unlockAbility(id) {
      const a = LST.CONFIG.abilities[id];
      if (!a || this.abilityUnlocked(id) || this.state.gears < a.unlockCost) return false;
      this.state.gears -= a.unlockCost;
      this.state.abilities.push(id);
      this.state.ability = id;
      this.save();
      return true;
    },
    // What the next run will skip to (the player can pick lower on the start screen).
    headStartWave(best) {
      const max = this.headStartMax(best);
      const pick = this.state.headStartPick;
      return pick === null || pick === undefined ? max : Math.max(0, Math.min(max, pick));
    },
    cycleHeadStart(best) {
      const per = M().upgrades.headStart.per, max = this.headStartMax(best);
      const cur = this.headStartWave(best);
      this.state.headStartPick = cur >= max ? 0 : cur + per;
      this.save();
      return this.headStartWave(best);
    },

    anyAffordable() {
      if (this.locked().some((c) => this.state.gears >= c.unlockCost)) return true;
      return Object.keys(M().upgrades).some((id) => this.state.gears >= this.upgradeCost(id));
    },
    cardsAffordable() { return this.locked().some((c) => this.state.gears >= c.unlockCost); },
    upgradesAffordable() { return Object.keys(M().upgrades).some((id) => this.state.gears >= this.upgradeCost(id)); },

    // Runs before Multishot is unlocked get a gentler early HP curve (see CONFIG.meta.starterAssist).
    starterAssist() { return !this.isUnlocked("multishot"); },

    recordRun(gears) {
      this.state.gears += gears;
      this.state.lifetimeGears += gears;
      this.state.runs += 1;
      this.save();
    },
  };

  const loaded = load();
  api.state = loaded.s;
  api.migratedFrom = loaded.migratedFrom;
  api.save();
  return api;
})();
