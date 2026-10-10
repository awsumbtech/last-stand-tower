// A small self-running scene for the art style page: the tower fights a
// rotating mix of enemies forever, never dies, and shows a wave banner now and then.

LST.DemoScene = class DemoScene extends LST.World {
  constructor(renderer) {
    super(renderer);
    this.state = "playing";
    this.tower.targets = 2;
    this.tower.fireRate = 2.4;
    this.cycle = ["basic", "fast", "tank", "basic", "fast", "boss", "basic", "fast", "tank", "fast"];
    this.cycleIndex = 0;
    this.spawnTimer = 0;
    this.bannerTimer = 1;
    this.wave = 0;
    // Pre-place a few enemies so the very first frame isn't empty.
    for (let i = 0; i < 4; i++) {
      const e = this.spawnNext();
      const k = 0.45 + i * 0.12;
      e.x *= k; e.y *= k;
      e.age = 1;
    }
  }

  spawnNext() {
    const type = this.cycle[this.cycleIndex++ % this.cycle.length];
    // Bosses are softened so they die on screen instead of eating the tower.
    const mult = { hp: type === "boss" ? 0.25 : 1, speed: 1, damage: 1, coins: 1 };
    return this.spawnEnemy(type, mult);
  }

  update(dt) {
    this.updateEffects(dt);
    this.waveIntro = Math.max(0, this.waveIntro - dt);
    this.bannerTimer -= dt;
    if (this.bannerTimer <= 0) {
      this.wave += 1;
      this.waveIntro = 1.6;
      this.bannerTimer = 10;
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemies.length < 7) {
      this.spawnNext();
      this.spawnTimer = 0.55;
    }
    this.tower.update(dt, this);
    this.updateList(this.enemies, dt);
    this.updateList(this.projectiles, dt);
    if (this.tower.hp < this.tower.maxHp * 0.3) this.tower.hp = this.tower.maxHp;
  }
};
