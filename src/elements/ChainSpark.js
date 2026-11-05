// Chain Spark (Lightning, Epic): some shots arc to nearby enemies for part of the damage.
LST.ElementRegistry.register(new (class ChainSpark extends LST.Element {
  onHit({ proj, enemy: e, damage, level, game }) {
    if (proj.spark) return false; // arcs don't arc again
    if (Math.random() >= this.stats.chance) return false;
    const jumps = this.at("jumps", level), r2 = this.stats.radius * this.stats.radius;
    const near = [];
    for (const o of game.enemies) {
      if (o === e || o.dead || o.untargetable) continue;
      const d2 = LST.utils.dist2(e.x, e.y, o.x, o.y);
      if (d2 <= r2) near.push({ o, d2 });
    }
    near.sort((a, b) => a.d2 - b.d2);
    const points = [[e.x, e.y]];
    for (const { o } of near.slice(0, jumps)) {
      points.push([o.x, o.y]);
      LST.StatusEffects.damage(o, damage * this.stats.share, "chainSpark", game);
    }
    if (points.length < 2) return false;
    return { points };
  }
  statText(l) { return `${Math.round(this.stats.chance * 100)}% arc x${this.at("jumps", l)}`; }
  details(l) {
    const S = this.stats;
    return `${Math.round(S.chance * 100)}% of hits arc lightning to the ${this.at("jumps", l)} nearest enemies (within ${S.radius}), ` +
      `dealing ${Math.round(S.share * 100)}% of the hit's damage to each. More levels: +1 jump.`;
  }
})({
  id: "chainSpark", element: "lightning", name: "Chain Spark", rarity: "epic", color: "#ffe14d", unlockCost: 220, maxLevel: 2,
  desc: "20% of shots arc to 2 more",
  icon: '<path d="M13 2L5 13h6l-2 9 9-12h-6.5z"/>',
  stats: { chance: 0.2, jumps: [2, 1], share: 0.5, radius: 130 },
}));
