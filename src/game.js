// Core game state and rules. States: "menu" | "playing" | "paused" | "upgrade" | "gameover".

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
  }

  // ---------- Flow ----------

  newGame() {
    this.reset();
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
  }

  endWave() {
    const bonus = LST.waves.clearBonus(this.wave);
    this.coins += bonus;
    this.score += this.wave * 50;
    this.saveBest(this.wave);
    this.state = "upgrade";
    this.ui.show("upgrade");
  }

  gameOver() {
    this.state = "gameover";
    this.spawnExplosion(this.tower.x, this.tower.y);
    this.saveBest(this.wave);
    this.ui.show("gameover");
  }

  toMenu() {
    this.reset();
    this.state = "menu";
    this.ui.show("start");
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      this.ui.show("pause");
    } else if (this.state === "paused") {
      this.state = "playing";
      this.ui.show(null);
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
    this.ui.renderUpgrades();
    this.ui.updateHud();
  }

  // ---------- Per-frame update ----------

  update(dt) {
    this.updateEffects(dt);
    if (this.state !== "playing") return;

    // At 2x speed we run two normal-sized steps instead of one big one,
    // so fast projectiles never skip over enemies.
    for (let i = 0; i < this.speed && this.state === "playing"; i++) this.step(dt);
    this.ui.updateHud();
  }

  step(dt) {
    this.waveIntro = Math.max(0, this.waveIntro - dt);
    this.updateSpawning(dt);
    this.tower.update(dt, this);
    this.updateList(this.enemies, dt);
    this.updateList(this.projectiles, dt);

    if (this.tower.hp <= 0) {
      this.gameOver();
    } else if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.endWave();
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

  onEnemyKilled(e) {
    super.onEnemyKilled(e);
    this.coins += e.coins;
    this.score += e.score * this.wave;
    this.kills += 1;
  }
};
