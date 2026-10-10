// Shared simulation pieces used by both the real game (game.js) and the
// art-style demo scene (demo.js): entity lists, targeting, spawning, effects.

LST.World = class World {
  constructor(renderer) {
    this.renderer = renderer;
    this.resetWorld();
  }

  resetWorld() {
    this.tower = new LST.Tower();
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.shake = 0;
    this.wave = 0;
    this.waveIntro = 0;
  }

  // Particles, popups and screen shake (these keep animating behind menus).
  updateEffects(dt) {
    this.updateList(this.particles, dt);
    this.updateList(this.texts, dt);
    this.shake = Math.max(0, this.shake - dt * 2);
  }

  updateList(list, dt) {
    for (const obj of list) obj.update(dt, this);
    // Remove dead objects in place (keeps the same array reference).
    let j = 0;
    for (let i = 0; i < list.length; i++) if (!list[i].dead) list[j++] = list[i];
    list.length = j;
  }

  // Spawn just outside a random point on the visible edge.
  spawnEnemy(type, mult) {
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
    const enemy = new LST.Enemy(type, x, y, mult);
    this.enemies.push(enemy);
    return enemy;
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

  // ---------- Events from entities (subclasses add rewards etc.) ----------

  onEnemyKilled(e) {
    this.spawnHitSparks(e.x, e.y, e.color, 14, 160);
    this.texts.push(new LST.FloatText(e.x, e.y - e.radius, "+" + e.coins, "#ffd93d", "coin"));
  }

  onTowerHit(e) {
    this.shake = Math.min(1, this.shake + 0.4);
    this.spawnHitSparks(e.x, e.y, "#ff4d6d", 12, 140);
    this.texts.push(new LST.FloatText(e.x, e.y, "-" + Math.round(e.damage), "#ff4d6d", "damage"));
  }

  spawnHitSparks(x, y, color, count, speed = 90) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new LST.Particle(x, y, color, speed, LST.utils.rand(0.25, 0.55), LST.utils.rand(2, 4)));
    }
  }

  spawnExplosion(x, y) {
    this.spawnHitSparks(x, y, "#00f0ff", 60, 320);
    this.spawnHitSparks(x, y, "#ff4d6d", 40, 240);
    this.shake = 1;
  }
};
