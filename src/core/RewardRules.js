// RewardRules: what a kill is worth. Coins scale with the Workshop "Greed" multiplier; an
// enemy archetype with killBonus (CONFIG.enemies.boss, the mini-boss) also pays
// CONFIG.bosses.killCoins; popPitch on the archetype sets the kill "pop" sound.
LST.RewardRules = class RewardRules {
  constructor(game) { this.game = game; }
  archetype(e) { return LST.CONFIG.enemies[e.type] || {}; }
  killCoins(e) { const m = this.game.coinMult; return m === 1 ? e.coins : Math.round(e.coins * m); }
  killScore(e) { return e.score * this.game.wave; }
  hasKillBonus(e) { return !!this.archetype(e).killBonus; }
  bossBonus() { return Math.round(LST.CONFIG.bosses.killCoins * this.game.coinMult); }
  popPitch(e) { return this.archetype(e).popPitch; }
};
