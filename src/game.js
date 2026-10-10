// Core game state and rules. States: "menu" | "playing" | "paused" | "upgrade" | "gameover".

LST.Game = class Game {
  constructor(renderer) {
    this.renderer = renderer;
    this.state = "menu";
    this.speed = 1; // 1x or 2x game speed
    this.bestWave = LST.utils.storage.get("lst.bestWave", 0);
    this.reset();
    this.ui = new LST.UI(this);
    this.ui.show("start");
  }

  reset() {
    this.tower = new LST.Tower();
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.wave = 0;
    this.coins = 0;
    this.score = 0;
    this.kills = 0;
    this.upgradeLevels = {};
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1;
    this.waveIntro = 0;
    this.shake = 0;
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
    this.spawnGameOverExplosion();
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
    // Effects keep animating behind menus so the scene feels alive.
    this.updateList(this.particles, dt);
    this.updateList(this.texts, dt);
    this.shake = Math.max(0, this.shake - dt * 2);
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

  updateList(list, dt) {
    for (const obj of list) obj.update(dt, this);
    // Remove dead objects in place (keeps the same array reference).
    let j = 0;
    for (let i = 0; i < list.length; i++) if (!list[i].dead) list[j++] = list[i];
    list.length = j;
  }

  updateSpawning(dt) {
    if (this.spawnQueue.length === 0) return;
    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
      this.spawnEnemy(this.spawnQueue.shift());
      this.spawnTimer += this.spawnInterval;
    }
  }

  // Spawn just outside a random point on the screen edge.
  spawnEnemy(type) {
    const r = LST.CONFIG.enemies[type].radius;
    const hw = this.renderer.halfW + r + 10;
    const hh = this.renderer.halfH + r + 10;
    let x, y;
    // Pick an edge weighted by its length so spawns are uniform around the border.
    if (Math.random() < hw / (hw + hh)) {
      x = LST.utils.rand(-hw, hw);
      y = Math.random() < 0.5 ? -hh : hh;
    } else {
      x = Math.random() < 0.5 ? -hw : hw;
      y = LST.utils.rand(-hh, hh);
    }
    // Very tall screens would make enemies walk forever; pull them in.
    const d = Math.hypot(x, y);
    const max = LST.CONFIG.MAX_SPAWN_DIST;
    if (d > max) { x *= max / d; y *= max / d; }
    this.enemies.push(new LST.Enemy(type, x, y, this.waveMult));
  }

  // Up to `count` living enemies within `range`, nearest first.
  nearestEnemies(x, y, range, count) {
    const r2 = range * range;
    const inRange = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d2 = LST.utils.dist2(x, y, e.x, e.y);
      if (d2 <= r2) inRange.push({ e, d2 });
    }
    inRange.sort((a, b) => a.d2 - b.d2);
    return inRange.slice(0, count).map((o) => o.e);
  }

  // ---------- Events from entities ----------

  onEnemyKilled(e) {
    this.coins += e.coins;
    this.score += e.score * this.wave;
    this.kills += 1;
    this.spawnHitSparks(e.x, e.y, e.color, 14, 160);
    this.texts.push(new LST.FloatText(e.x, e.y - e.radius, "+" + e.coins, "#ffd93d"));
  }

  onTowerHit(e) {
    this.shake = Math.min(1, this.shake + 0.4);
    this.spawnHitSparks(e.x, e.y, "#ff4d6d", 12, 140);
    this.texts.push(new LST.FloatText(e.x, e.y, "-" + Math.round(e.damage), "#ff4d6d"));
  }

  spawnHitSparks(x, y, color, count, speed = 90) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new LST.Particle(x, y, color, speed, LST.utils.rand(0.25, 0.55), LST.utils.rand(2, 4)));
    }
  }

  spawnGameOverExplosion() {
    this.spawnHitSparks(this.tower.x, this.tower.y, "#00f0ff", 60, 320);
    this.spawnHitSparks(this.tower.x, this.tower.y, "#ff4d6d", 40, 240);
    this.shake = 1;
  }
};
