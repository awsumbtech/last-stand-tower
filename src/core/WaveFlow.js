// WaveFlow: a wave's start and end, and the steps between waves. startNextWave enters
// PlayingState; a cleared wave enters CelebrateState (the party); after it, GotchaState shows
// any trap reveals, then ShopController deals the shop. A fallen tower goes to RunRecorder.
LST.WaveFlow = class WaveFlow {
  constructor(game) { this.game = game; }

  startNextWave() {
    const g = this.game;
    g.wave += 1;
    const { queue, interval } = g.director.build(g.wave);
    g.spawnQueue = queue;
    g.spawnInterval = interval;
    g.spawnTimer = 0.3; // short breather before the first spawn
    g.waveMult = g.director.multipliers(g.wave);
    g.waveIntro = 1.6;
    g.projectiles = [];
    g.hazards = [];
    g.flow.set("playing");
    g.ui.show(null);
    if (!g.finaleController.begin()) {
      LST.audio.setTension(g.endless ? 1 : 0);
      LST.audio.play("waveStart");
    }
    g.events.emit(LST.EVENTS.WAVE_START, { wave: g.wave, finale: !!g.finale });
  }

  // After a sim step: the tower fell, or every enemy is down (the finale waits for its boss).
  afterStep() {
    const g = this.game;
    if (!g.flow.is("playing")) return; // e.g. King Mole just went down
    if (g.tower.hp <= 0) {
      g.gameOver();
    } else if (g.spawnQueue.length === 0 && g.enemies.length === 0 && !g.finaleController.holdsWave) {
      g.endWave();
    }
  }

  // Wave cleared: a short celebration, then the upgrade shop.
  endWave() {
    const g = this.game;
    const bonus = g.director.clearBonus(g.wave);
    g.coins += bonus;
    g.coinsEarned += bonus;
    if (g.director.isBossWave(g.wave)) g.bossWavesCleared += 1;
    // Overclock overheats after 3 cleared waves.
    if (g.overclock && g.overclock.hot && --g.overclock.waves <= 0) {
      g.overclock.hot = false;
      g.tower.fireRate = (g.tower.fireRate / 1.4) * 0.8;
      g.texts.push(new LST.FloatText(g.tower.x, g.tower.y - 90, "Overheated!", "#ff7043", "bonus"));
    }
    // Traps taken before this wave flip over now.
    for (const p of g.pendingGotchas.filter((p) => p.wave < g.wave)) {
      g.gotchaQueue.push(p.id);
      LST.meta.discoverTrap(p.id);
      g.newCodex.push(p.id);
    }
    g.pendingGotchas = g.pendingGotchas.filter((p) => p.wave >= g.wave);
    g.score += g.wave * 50;
    g.runRecorder.saveBest(g.wave);
    g.flow.set("celebrate");
    g.celebrateTimer = 1.6;
    g.spawnConfetti(g.tower.x, g.tower.y - 10);
    g.texts.push(new LST.FloatText(g.tower.x, g.tower.y - 60, `+${bonus} bonus`, "#3ddc84", "bonus"));
    LST.audio.play("waveClear");
    g.ui.updateHud();
    g.events.emit(LST.EVENTS.WAVE_END, { wave: g.wave, bonus });
  }

  finishCelebration() {
    const g = this.game;
    if (!g.flow.is("celebrate")) return;
    if (g.gotchaQueue.length) {
      g.flow.set("gotcha");
      g.ui.show("gotcha");
      LST.audio.play("gotcha");
      LST.haptics.buzz([40, 60, 120]);
      return;
    }
    g.shopController.enter();
  }

  // "Gotcha!" reveals, shown between the wave-clear party and the shop.
  dismissGotcha() {
    const g = this.game;
    if (!g.flow.is("gotcha")) return;
    g.gotchaQueue.shift();
    if (g.gotchaQueue.length) { g.ui.show("gotcha"); return; }
    g.shopController.enter();
  }
};
