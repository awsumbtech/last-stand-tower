// Core game state and rules.
// States: "menu" | "playing" | "paused" | "celebrate" (wave-clear party) | "upgrade" | "gameover".
// Sound and vibration hooks live here (not in World) so the art-style demo stays silent.

LST.Game = class Game extends LST.World {
  constructor(renderer) {
    super(renderer);
    this.state = "menu";
    this.speed = 1; // 1x or 2x game speed
    this.bestWave = LST.utils.storage.get("lst.bestWave", 0);
    this.reset();
    this.ui = new LST.UI(this);
    this.ui.show("start");
  }

  reset() {
    this.resetWorld();
    this.coins = 0;
    this.score = 0;
    this.kills = 0;
    this.upgradeLevels = {};
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1;
    this.newBest = false;
    this.hitStop = 0;       // real seconds of frozen time (boss kill)
    this.slowmo = 0;        // real seconds left of the low-HP slow-down
    this.heartbeat = 0;
    this.celebrateTimer = 0;
  }

  // ---------- Flow ----------

  newGame() {
    this.reset();
    LST.audio.startMusic();
    this.startNextWave();
  }

  startNextWave() {
    this.wave += 1;
    const { queue, interval } = LST.waves.build(this.wave);
    this.spawnQueue = queue;
    this.spawnInterval = interval;
    this.spawnTimer = 0.3; // short breather before the first spawn
    this.waveMult = LST.waves.multipliers(this.wave);
    this.waveIntro = 1.6;
    this.projectiles = [];
    this.state = "playing";
    this.ui.show(null);
    LST.audio.play("waveStart");
  }

  // Wave cleared: a short celebration, then the upgrade shop.
  endWave() {
    const bonus = LST.waves.clearBonus(this.wave);
    this.coins += bonus;
    this.score += this.wave * 50;
    this.saveBest(this.wave);
    this.state = "celebrate";
    this.celebrateTimer = 1.6;
    this.spawnConfetti(this.tower.x, this.tower.y - 10);
    this.texts.push(new LST.FloatText(this.tower.x, this.tower.y - 60, `+${bonus} bonus`, "#3ddc84", "bonus"));
    LST.audio.play("waveClear");
    this.ui.updateHud();
  }

  finishCelebration() {
    if (this.state !== "celebrate") return;
    this.state = "upgrade";
    this.ui.show("upgrade");
  }

  gameOver() {
    this.state = "gameover";
    this.spawnExplosion(this.tower.x, this.tower.y);
    this.saveBest(this.wave);
    this.ui.show("gameover");
    LST.audio.stopMusic();
    LST.audio.play("gameOver");
    LST.haptics.buzz([120, 60, 250]);
  }

  toMenu() {
    this.reset();
    this.state = "menu";
    this.ui.show("start");
    LST.audio.duckMusic(false);
    LST.audio.startMusic();
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      this.ui.show("pause");
      LST.audio.duckMusic(true);
    } else if (this.state === "paused") {
      this.state = "playing";
      this.ui.show(null);
      LST.audio.duckMusic(false);
    }
  }

  toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    this.ui.updateHud();
  }

  saveBest(wave) {
    if (wave > this.bestWave) {
      this.bestWave = wave;
      this.newBest = true;
      LST.utils.storage.set("lst.bestWave", wave);
    }
  }

  buyUpgrade(id) {
    const up = LST.UPGRADES.find((u) => u.id === id);
    if (!up || this.state !== "upgrade") return;
    const lvl = this.upgradeLevels[id] || 0;
    if (up.maxLevel !== undefined && lvl >= up.maxLevel) return;
    if (up.canBuy && !up.canBuy(this.tower)) return;
    const cost = up.cost(lvl);
    if (this.coins < cost) return;
    this.coins -= cost;
    this.upgradeLevels[id] = lvl + 1;
    up.apply(this.tower);
    LST.audio.play("buy");
    LST.haptics.buzz(15);
    this.ui.renderUpgrades(id);
    this.ui.updateHud();
  }

  // ---------- Per-frame update ----------

  update(dt) {
    // Boss-kill hit-stop: freeze everything for a beat (screen still draws).
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.ui.updateHud();
      return;
    }
    this.updateEffects(dt);

    if (this.state === "celebrate") {
      this.celebrateTimer -= dt;
      if (this.celebrateTimer <= 0) this.finishCelebration();
      return;
    }
    if (this.state !== "playing") return;

    // Low-HP slow-down eases from 35% speed back to normal.
    let scale = 1;
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      scale = 0.35 + 0.65 * (1 - Math.max(0, this.slowmo) / 0.9);
    }
    // At 2x speed we run two normal-sized steps instead of one big one,
    // so fast projectiles never skip over enemies.
    for (let i = 0; i < this.speed && this.state === "playing"; i++) this.step(dt * scale);

    if (this.lowHpActive && this.state === "playing") {
      this.heartbeat -= dt;
      if (this.heartbeat <= 0) {
        LST.audio.play("heartbeat");
        this.heartbeat = 1.3;
      }
    }
    this.ui.updateHud();
  }

  step(dt) {
    this.waveIntro = Math.max(0, this.waveIntro - dt);
    this.updateSpawning(dt);
    this.tower.update(dt, this);
    this.updateList(this.enemies, dt);
    this.updateList(this.projectiles, dt);
    this.checkLowHp();

    if (this.tower.hp <= 0) {
      this.gameOver();
    } else if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.endWave();
    }
  }

  // First drop below 25% HP: slow-mo, red pulse, alarm. Re-arms once healed above it.
  checkLowHp() {
    const t = this.tower;
    const low = t.hp > 0 && t.hp / t.maxHp < 0.25;
    if (low && !this.lowHpActive) {
      this.lowHpActive = true;
      this.slowmo = 0.9;
      this.vignette = 1;
      this.heartbeat = 1.0;
      LST.audio.play("lowHp");
      LST.haptics.buzz([90, 50, 90]);
    } else if (!low && this.lowHpActive && t.hp / t.maxHp >= 0.25) {
      this.lowHpActive = false;
    }
  }

  updateSpawning(dt) {
    if (this.spawnQueue.length === 0) return;
    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
      this.spawnEnemy(this.spawnQueue.shift(), this.waveMult);
      this.spawnTimer += this.spawnInterval;
    }
  }

  // ---------- Events (game rules + sound + haptics) ----------

  onFire(tower) {
    // Higher fire rates get a slightly higher, lighter "pew".
    LST.audio.play("fire", { pitch: Math.min(1.4, 0.9 + tower.fireRate * 0.05) });
  }

  onHit(e, damage, crit) {
    super.onHit(e, damage, crit);
    LST.audio.play("hit", { crit });
  }

  onEnemyKilled(e) {
    super.onEnemyKilled(e);
    this.coins += e.coins;
    this.score += e.score * this.wave;
    this.kills += 1;
    LST.audio.play("pop", { pitch: { basic: 1, fast: 1.3, tank: 0.75, boss: 0.5 }[e.type] });
    LST.audio.play("coin");
    if (e.type === "boss") {
      this.hitStop = 0.16;
      this.flash = 1;
      this.shake = 1;
      this.spawnHitSparks(e.x, e.y, "#ffd23f", 30, 280);
      LST.audio.play("bossDown");
      LST.haptics.buzz(90);
    }
  }

  onTowerHit(e) {
    super.onTowerHit(e);
    LST.audio.play("towerHit");
    LST.haptics.buzz(e.type === "boss" ? 120 : 30);
  }

  onBossSpawn(e) {
    super.onBossSpawn(e);
    LST.audio.play("boss");
    LST.haptics.buzz([60, 40, 140]);
  }
};
