// RunRecorder: the end of a run and its record. It saves the world's best wave, pays out
// Gears (saved right away, so closing the tab can't lose them), builds game.result for the
// results screen, and runs the game-over beat (GameOverState shows the results after
// resultsDelay).
LST.RunRecorder = class RunRecorder {
  constructor(game) { this.game = game; }

  gameOver() {
    const g = this.game;
    g.flow.set("gameover");
    g.spawnExplosion(g.tower.x, g.tower.y);
    this.finishRun({ won: false });
    g.resultsDelay = 1.1; // let the tower explosion play first
    g.ui.show("dying"); // no screen, no HUD
    LST.audio.stopMusic();
    LST.audio.setTension(0);
    LST.audio.play("gameOver");
    LST.haptics.buzz([120, 60, 250]);
  }

  // Pay out and build the results. won = left after beating the finale.
  finishRun({ won }) {
    const g = this.game;
    g.flow.set("gameover");
    this.saveBest(g.wave);
    const meta = LST.meta;
    const nextBefore = meta.nextUnlock();
    // Traps still waiting for their reveal go straight into the Codex.
    for (const p of g.pendingGotchas) if (meta.discoverTrap(p.id)) g.newCodex.push(p.id);
    g.pendingGotchas = [];
    const gears = meta.gearsFor(won ? g.wave + 1 : g.wave, g.bossWavesCleared, g.runGearMult(), 0, g.bossKills);
    const gearsBefore = meta.state.gears;
    meta.recordRun(gears.total);
    g.result = {
      wave: g.wave, time: g.runTime, kills: g.kills, coins: g.coinsEarned, score: g.score,
      cards: Object.entries(g.upgradeLevels), bossWaves: g.bossWavesCleared, gears, gearsBefore,
      gearsAfter: meta.state.gears, nextUnlock: nextBefore, newBest: g.newBest, firstRun: meta.state.runs === 1, headStart: g.headStart,
      gearMult: g.gearMult, newCodex: g.newCodex.slice(),
      won, bossKills: g.bossKills, worldBonus: g.worldBonus, endless: g.endless,
      world: g.world.id, worldGearMult: g.world.gearMult, devRun: !!g.devRun,
    };
    if (g.devRun) { LST.DevRunGuard.end(); g.devRun = false; } // the save goes back exactly as it was
  }

  showResults() {
    this.game.resultsDelay = 0;
    this.game.skipHint = false;
    this.game.flow.current.showScreen(this.game); // GameOverState: the results
  }

  saveBest(wave) {
    const g = this.game;
    if (wave > g.bestWave) {
      g.bestWave = wave;
      g.newBest = true;
      g.world.saveBest(wave);
    }
  }
};
