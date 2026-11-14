// KillFeedback: everything the real game does when an enemy dies, after World's shared
// death effects: pay coins and score (RewardRules), Vampire lifesteal, the pop and coin
// sounds, the mini-boss bonus and hit-stop, and handing the finale boss to FinaleController.
LST.KillFeedback = class KillFeedback {
  constructor(game) { this.game = game; }

  onKill(e) {
    const g = this.game, R = g.rewards;
    const coins = R.killCoins(e);
    g.coins += coins;
    g.coinsEarned += coins;
    g.score += R.killScore(e);
    g.kills += 1;
    if (g.tower.lifesteal > 0) g.tower.heal(g.tower.maxHp * g.tower.lifesteal);
    LST.audio.play("pop", { pitch: R.popPitch(e) });
    LST.audio.play("coin");
    const bonusKill = R.hasKillBonus(e);
    if (bonusKill) {
      g.bossKills += 1;
      const bonus = R.bossBonus();
      g.coins += bonus;
      g.coinsEarned += bonus;
      g.texts.push(new LST.FloatText(e.x, e.y - e.radius * 2.2, `+${bonus} BOSS BONUS`, "#ffd93d", "bonus"));
    }
    g.events.emit(LST.EVENTS.KILL, { enemy: e });
    if (e.finaleBoss) { g.onFinaleWon(e); return; }
    if (bonusKill) this.bossDown(e);
  }

  // A mini-boss went down: a short hit-stop, flash, shake and sparks.
  bossDown(e) {
    const g = this.game;
    g.hitStop = 0.16;
    g.flash = 1;
    g.shake = 1;
    g.spawnHitSparks(e.x, e.y, "#ffd23f", 30, 280);
    LST.audio.play("bossDown");
    LST.haptics.buzz(90);
    g.events.emit(LST.EVENTS.BOSS_KILLED, { x: e.x, y: e.y, type: e.type, radius: e.radius });
  }
};
