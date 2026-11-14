// FinaleController: the world's boss-only finale wave (game.finale = { intro, mole, won }).
// It starts the quiet intro, brings in the world's finale boss (King Mole / Captain
// Crabclaw) when the intro ends, runs the win (VictoryState), and the World cleared! choices
// (ClearedState): keep going in endless mode, or retire to the Workshop.
LST.FinaleController = class FinaleController {
  constructor(game) { this.game = game; }

  // Wave start. Returns false (and clears game.finale) when this wave is not the finale.
  begin() {
    const g = this.game;
    if (!g.director.isFinale(g.wave)) { g.finale = null; return false; }
    // Boss-only finale: the lawn goes quiet, then King Mole digs in.
    g.finale = { intro: LST.CONFIG.finale.introTime, mole: null, won: false };
    g.waveIntro = 0;
    g.flash = 0.6;
    LST.audio.play("finaleIntro");
    LST.audio.setTension(1);
    LST.haptics.buzz([80, 60, 80, 60, 200]);
    return true;
  }

  // Per sim step: count down the intro, then the finale boss arrives.
  tick(dt) {
    const g = this.game, f = g.finale;
    if (!f || f.mole || f.won) return;
    f.intro -= dt;
    if (f.intro <= 0) {
      // The world's finale boss (King Mole / Captain Crabclaw); f.mole is "the finale boss".
      f.mole = g.world.createFinaleBoss(g.waveMult, g);
      g.enemies.push(f.mole);
      g.world.finaleArrived(g, f.mole);
    }
  }

  // True while the finale is on and not yet won (the wave can't end).
  get holdsWave() { const f = this.game.finale; return !!(f && !f.won); }

  // The finale boss is down: party, then the World cleared! screen.
  won(m) {
    const g = this.game;
    g.finale.won = true;
    g.hitStop = 0.35;
    g.flash = 1;
    g.shake = 1;
    // His minions pop too (World's shared death effects only: no coins, no sounds).
    for (const e of g.enemies) if (!e.dead && e !== m) { e.dead = true; LST.World.prototype.onEnemyKilled.call(g, e); }
    g.spawnHitSparks(m.x, m.y, "#ffd23f", 50, 320);
    g.spawnConfetti(0, -40, 160);
    const bonus = g.director.clearBonus(g.wave);
    g.coins += bonus;
    g.coinsEarned += bonus;
    g.bossWavesCleared += 1;
    g.score += g.wave * 200;
    g.runRecorder.saveBest(g.wave);
    g.worldBonus = LST.meta.clearWorld(g.world.id, g.runTime, g.world.gearMult);
    g.flow.set("victory");
    g.victoryTimer = 3.4;
    g.ui.show(null);
    LST.audio.setTension(0);
    LST.audio.play("victory");
    LST.haptics.buzz([100, 50, 100, 50, 300]);
    g.ui.updateHud();
    g.events.emit(LST.EVENTS.FINALE_WON, { x: m.x, y: m.y, radius: m.radius });
  }

  // From the World cleared! screen.
  continueEndless() {
    const g = this.game;
    if (!g.flow.is("cleared")) return;
    g.endless = true;
    g.finale = null;
    g.shopController.enter();
    LST.audio.startMusic();
  }

  retireToWorkshop() {
    const g = this.game;
    if (!g.flow.is("cleared")) return;
    g.runRecorder.finishRun({ won: true });
    g.resultsDelay = 0;
    g.workshopController.open("results");
  }
};
