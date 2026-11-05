// StatusEffect system: timed effects that live on an enemy (burn, venom, freeze, chill counters).
//
//   LST.StatusEffects.add(enemy, new LST.Burn(...))   // merges with an existing effect of that kind
//   LST.StatusEffects.get(enemy, "burn")              // the active effect or null
//   LST.StatusEffects.tickAll(game, dt)               // once per frame (game.js), only when any exist
//
// Damage over time lands in 0.5 s pulses (not every frame) so the enemy flashes as a readable
// "tick" instead of strobing. Enemies with no effects carry no `status` field at all, so a run
// without element cards never touches any of this.
LST.StatusEffect = class StatusEffect {
  constructor(kind, time) { this.kind = kind; this.time = time; }
  get active() { return this.time > 0; }
  merge(next) { this.time = Math.max(this.time, next.time); } // default: refresh
  tick(dt) { this.time -= dt; }
};

// Damage over time, applied in pulses of PULSE seconds.
LST.DotEffect = class DotEffect extends LST.StatusEffect {
  constructor(kind, time, dps, element) { super(kind, time); this.dps = dps; this.element = element; this.acc = 0; this.pulse = 0; }
  get totalDps() { return this.dps; }
  tick(dt, e, game) {
    const live = Math.min(dt, Math.max(0, this.time));
    this.acc += this.totalDps * live;
    this.time -= dt;
    this.pulse += dt;
    if (this.pulse >= LST.StatusEffects.PULSE || !this.active) {
      this.pulse = 0;
      const amount = this.acc; this.acc = 0;
      if (amount > 0 && !e.dead) LST.StatusEffects.damage(e, amount, this.element, game);
    }
  }
};

LST.StatusEffects = {
  PULSE: 0.5,
  get(e, kind) { const s = e.status && e.status[kind]; return s && s.active ? s : null; },
  add(e, effect, game) {
    if (!e.status) e.status = {};
    const cur = e.status[effect.kind];
    if (cur && cur.active) cur.merge(effect); else e.status[effect.kind] = effect;
    if (game) game.hasStatus = true;
    return e.status[effect.kind];
  },
  // Effect damage: counts toward per-element stats (sims / tests).
  damage(e, amount, element, game) {
    if (e.dead || e.untargetable) return 0;
    e.takeDamage(amount, game);
    if (game) { const d = game.elementDamage || (game.elementDamage = {}); d[element] = (d[element] || 0) + amount; }
    return amount;
  },
  tickAll(game, dt) {
    for (const e of game.enemies) {
      if (!e.status || e.dead) continue;
      for (const k in e.status) {
        const s = e.status[k];
        if (s.active || s.keep) s.tick(dt, e, game);
      }
    }
  },
};
