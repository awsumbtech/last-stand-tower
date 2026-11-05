// Frostbite (Ice, Rare): every Nth hit on a slowed enemy freezes it solid for a moment.
//
// Design decision: Frostbite does NOT require Frost Shots. If the tower has no Frost Shots,
// Frostbite's hits apply their own light chill (stats.chill for stats.chillTime) so the card is
// never dead on its own; with Frost Shots the stronger Frost slow is used and the chill is skipped.
// Bosses freeze for only stats.bossFreeze seconds and then can't be frozen again for
// stats.bossCooldown seconds (no perma-freeze on a boss).
LST.Frozen = class Frozen extends LST.StatusEffect {
  constructor(time) { super("frozen", time); }
};
// Per-enemy Frostbite bookkeeping: hit counter + boss freeze cooldown (kept while counting down).
LST.FrostMark = class FrostMark extends LST.StatusEffect {
  constructor() { super("frostmark", 1e9); this.hits = 0; this.cooldown = 0; this.keep = true; }
  merge() {}
  tick(dt) { this.cooldown = Math.max(0, this.cooldown - dt); }
};

LST.ElementRegistry.register(new (class Frostbite extends LST.Element {
  onHit({ enemy: e, level, game, tower }) {
    if (e.dead) return false;
    const S = this.stats;
    if (!(tower.slow > 0)) e.applySlow(S.chill, S.chillTime);
    if (!(e.slowTimer > 0)) return false;
    const mark = LST.StatusEffects.add(e, new LST.FrostMark(), game);
    mark.hits += 1;
    if (mark.hits < S.every) return false;
    if (e.isBoss && mark.cooldown > 0) return false; // boss still thawing: keep counting at max
    mark.hits = 0;
    const time = e.isBoss ? S.bossFreeze : this.at("freeze", level);
    if (e.isBoss) mark.cooldown = S.bossCooldown;
    e.stun = Math.max(e.stun, time);
    LST.StatusEffects.add(e, new LST.Frozen(time), game);
    if (game) { const f = game.elementFreezes || (game.elementFreezes = {}); f[e.type] = (f[e.type] || 0) + 1; }
    return { freeze: time };
  }
  statText(l) { return `${this.at("freeze", l).toFixed(2).replace(/0$/, "")}s freeze`; }
  details(l) {
    const S = this.stats;
    return `Every ${S.every}th hit on a slowed enemy freezes it for ${this.at("freeze", l).toFixed(2).replace(/0$/, "")}s. ` +
      `No Frost Shots? Your hits chill enemies themselves. Bosses freeze ${S.bossFreeze}s, then not again for ${S.bossCooldown}s.`;
  }
})({
  id: "frostbite", element: "ice", name: "Frostbite", rarity: "rare", color: "#7fe3ff", unlockCost: 110, maxLevel: 3,
  desc: "Every 4th hit on a slowed foe freezes it",
  icon: '<path d="M12 2v20M4 6.5l16 11M4 17.5l16-11"/><path d="M9 4l3 2.5L15 4M9 20l3-2.5 3 2.5"/><circle cx="12" cy="12" r="2.6"/>',
  stats: { every: 3, freeze: [0.65, 0.2], bossFreeze: 0.2, bossCooldown: 4, chill: 0.15, chillTime: 1.5 },
}));
