// Venom (Poison, Rare): each hit adds a poison stack (max 5); each stack ticks on its own timer.
LST.Poison = class Poison extends LST.StatusEffect {
  constructor(time, dps, max) { super("venom", time); this.stacks = [{ time, dps }]; this.max = max; this.acc = 0; this.pulse = 0; }
  get count() { return this.stacks.length; }
  merge(next) {
    const s = next.stacks[0];
    if (this.stacks.length >= this.max) this.stacks.shift(); // full: the oldest stack is replaced
    this.stacks.push({ time: s.time, dps: s.dps });
    this.time = Math.max(...this.stacks.map((x) => x.time));
  }
  tick(dt, e, game) {
    for (const s of this.stacks) { this.acc += s.dps * Math.min(dt, Math.max(0, s.time)); s.time -= dt; }
    this.stacks = this.stacks.filter((s) => s.time > 0);
    this.time = this.stacks.length ? Math.max(...this.stacks.map((x) => x.time)) : 0;
    this.pulse += dt;
    if (this.pulse >= LST.StatusEffects.PULSE || !this.active) {
      this.pulse = 0;
      const amount = this.acc; this.acc = 0;
      if (amount > 0 && !e.dead) LST.StatusEffects.damage(e, amount, "venom", game);
    }
  }
};

LST.ElementRegistry.register(new (class Venom extends LST.Element {
  onHit({ enemy, damage, level, game }) {
    if (enemy.dead) return false;
    const p = LST.StatusEffects.add(enemy, new LST.Poison(this.stats.time, damage * this.at("stackShare", level), this.stats.maxStacks), game);
    return { stacks: p.count };
  }
  statText(l) { return `${Math.round(this.at("stackShare", l) * 100)}%/s x${this.stats.maxStacks}`; }
  details(l) {
    const s = this.at("stackShare", l);
    return `Each hit adds a poison stack (up to ${this.stats.maxStacks}). Every stack deals ${Math.round(s * 100)}% of the hit's damage per second for ${this.stats.time}s, ` +
      `so a fully poisoned enemy takes ${Math.round(s * this.stats.maxStacks * 100)}%/s.`;
  }
})({
  id: "venom", element: "poison", name: "Venom", rarity: "rare", color: "#8be04a", unlockCost: 130, maxLevel: 3,
  desc: "Hits stack poison (up to 5)",
  icon: '<path d="M12 2.5c3 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.8 6-11z"/><path d="M9.5 13.5h5M12 11v5"/>',
  stats: { time: 4, stackShare: [0.04, 0.015], maxStacks: 5 },
}));
