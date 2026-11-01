// EventBus: typed game events. Game code emits; other parts (effects today; RewardService,
// ProgressionLedger, MilestoneTracker later, see docs/PROGRESSION.md) listen. Nobody calls
// a listener directly, so parts can be added or swapped without touching game.js.
//
//   const bus = new LST.EventBus();
//   const off = bus.on(LST.EVENTS.BOSS_KILLED, (e) => { ... });   // returns an unsubscribe fn
//   bus.emit(LST.EVENTS.BOSS_KILLED, { x, y, type });
//
// Dispatch is synchronous (listeners run inside emit, on the same frame). A listener that
// throws is logged and skipped, so a broken effect can never break the game rules.

LST.EVENTS = Object.freeze({
  RUN_START: "runStart",               // { game }               new run / back to menu (state reset)
  WAVE_START: "waveStart",             // { wave, finale }
  WAVE_END: "waveEnd",                 // { wave, bonus }
  KILL: "kill",                        // { enemy }              every enemy kill (bosses too)
  CRIT: "crit",                        // { x, y, damage }       critical hit landed
  BOSS_KILLED: "bossKilled",           // { x, y, type, radius } Big Red (mini-boss) down
  BOSS_SLAM: "bossSlam",               // { boss, damage }
  FINALE_WON: "finaleWon",             // { x, y, radius }       King Mole down
  CARD_TAKEN: "cardTaken",             // { index, card, levels, paid, epic }
  WORKSHOP_UPGRADE: "workshopUpgrade", // { id, level }
  UNLOCK: "unlock",                    // { kind: "card" | "ability", id }
});

LST.EventBus = class EventBus {
  constructor() {
    this.handlers = new Map(); // type -> listener array (replaced, never mutated, on on/off)
  }

  on(type, fn) {
    const list = this.handlers.get(type) || [];
    this.handlers.set(type, list.concat(fn));
    return () => this.off(type, fn);
  }

  once(type, fn) {
    const off = this.on(type, (payload, t) => { off(); fn(payload, t); });
    return off;
  }

  off(type, fn) {
    const list = this.handlers.get(type);
    if (!list) return;
    const next = list.filter((f) => f !== fn);
    if (next.length) this.handlers.set(type, next);
    else this.handlers.delete(type);
  }

  has(type) { return this.handlers.has(type); }

  // Returns how many listeners ran.
  emit(type, payload) {
    const list = this.handlers.get(type);
    if (!list) return 0;
    for (let i = 0; i < list.length; i++) {
      try { list[i](payload, type); } catch (err) { if (typeof console !== "undefined") console.error("[EventBus]", type, err); }
    }
    return list.length;
  }
};
