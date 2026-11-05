// Ember Rounds (Fire, Rare): hits set enemies on fire. Burn refreshes, it doesn't stack.
LST.Burn = class Burn extends LST.DotEffect {
  constructor(time, dps) { super("burn", time, dps, "ember"); this.pulse = LST.StatusEffects.PULSE; } // a fresh burn ticks at once
  merge(next) { this.time = Math.max(this.time, next.time); this.dps = Math.max(this.dps, next.dps); }
};

LST.ElementRegistry.register(new (class Ember extends LST.Element {
  onHit({ enemy, damage, level, game }) {
    if (enemy.dead) return false;
    LST.StatusEffects.add(enemy, new LST.Burn(this.stats.time, damage * this.at("dpsShare", level) * (enemy.isBoss ? this.stats.bossShare : 1)), game);
    return true;
  }
  desc() { return `Hits burn enemies for ${this.stats.time}s`; }
  statText(l) { return `${Math.round(this.at("dpsShare", l) * 100)}%/s burn`; }
  details(l) {
    return `Hits burn for ${this.stats.time}s, ${Math.round(this.at("dpsShare", l) * 100)}% of the hit per second. Refreshes, doesn't stack. ` +
      `Bosses: ${Math.round(this.stats.bossShare * 100)}% burn.` + this.pairText();
  }
})({
  id: "ember", element: "fire", name: "Ember Rounds", rarity: "rare", color: "#ff7a1a", unlockCost: 120, maxLevel: 3,
  icon: '<path d="M12 2c1 4 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.4 1.2-3.8 2.4-5 .3 2 1.2 2.8 2.1 3.2C11 8 10.6 5 12 2z"/>',
  stats: { time: 3, dpsShare: [0.85, 0.3], bossShare: 0.3 },
}));
