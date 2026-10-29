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
    this.bursts = [];
    this.confetti = [];
    this.corpses = []; // death animations (only if the theme draws them)
    this.vignette = 0; // red screen-edge pulse, 0..1
    this.flash = 0;    // white screen flash, 0..1
    this.lowHpActive = false;
    this.shake = 0;
    this.bossIntro = 0; // seconds left on the "BOSS!" banner
    this.wave = 0;
    this.waveIntro = 0;
  }

  // Particles, popups and screen shake (these keep animating behind menus).
  updateEffects(dt) {
    this.updateList(this.particles, dt);
    this.updateList(this.texts, dt);
    this.updateList(this.bursts, dt);
    this.updateList(this.confetti, dt);
    this.updateList(this.corpses, dt);
    this.vignette = Math.max(0, this.vignette - dt * 0.9);
    this.flash = Math.max(0, this.flash - dt * 3);
    this.bossIntro = Math.max(0, this.bossIntro - dt);
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
    if (type === "boss") { enemy.maxHp = enemy.hp = LST.CONFIG.enemies.boss.hp * Math.pow(mult.hp, LST.CONFIG.bosses.hpExp); }
    const early = type === "boss" && LST.CONFIG.bosses.early[this.wave];
    if (early) { enemy.maxHp *= early.hp; enemy.hp = enemy.maxHp; enemy.dmgMult *= early.dmg; }
    this.enemies.push(enemy);
    if (type === "boss") this.onBossSpawn(enemy);
    return enemy;
  }

  // Up to `count` living enemies within `range`, nearest first.
  nearestEnemies(x, y, range, count) {
    const r2 = range * range;
    const inRange = [];
    for (const e of this.enemies) {
      if (e.dead || e.untargetable) continue;
      const d2 = LST.utils.dist2(x, y, e.x, e.y);
      if (d2 <= r2) inRange.push({ e, d2 });
    }
    inRange.sort((a, b) => a.d2 - b.d2);
    return inRange.slice(0, count).map((o) => o.e);
  }

  // A boss in range gets focus fire when no other enemy is within focusRadius of the tower.
  bossFocus(tower) {
    let boss = null, near = false;
    const f2 = LST.CONFIG.bosses.focusRadius ** 2, r2 = tower.range * tower.range;
    for (const e of this.enemies) {
      if (e.dead || e.untargetable) continue;
      const d2 = LST.utils.dist2(tower.x, tower.y, e.x, e.y);
      if (e.isBoss) { if (d2 <= r2 && !boss) boss = e; }
      else if (d2 <= f2) near = true;
    }
    return near ? null : boss;
  }

  // Bosses call in helpers next to themselves.
  spawnMinions(boss, types) {
    const m = this.waveMult || { hp: 1, speed: 1, damage: 1, coins: 1 };
    types.forEach((type, i) => {
      const a = Math.atan2(boss.y, boss.x) + (i - (types.length - 1) / 2) * 0.55;
      const r = boss.radius + 26;
      const e = new LST.Enemy(type, boss.x + Math.cos(a) * r, boss.y + Math.sin(a) * r, m);
      e.age = 0;
      this.enemies.push(e);
      this.bursts.push(new LST.Burst(e.x, e.y, "#ffffff", 22, "hit"));
    });
  }

  // A telegraphed slam lands: the tower takes damage, Thorns bounces some back.
  onBossSlam(boss, damage) {
    const t = this.tower;
    t.takeDamage(damage);
    this.shake = Math.min(1, this.shake + 0.7);
    this.bursts.push(new LST.Burst(t.x, t.y, "#ff4757", t.radius * 3.2, "slam"));
    this.spawnHitSparks(t.x, t.y, "#ff4757", 16, 200);
    this.texts.push(new LST.FloatText(t.x + LST.utils.rand(-10, 10), t.y - 40, "-" + Math.round(damage * (1 - t.armor)), "#ff4d6d", "damage"));
    if (t.thorns > 0 && !boss.dead) {
      const back = damage * t.thorns;
      boss.takeDamage(back, this);
      this.texts.push(new LST.FloatText(boss.x, boss.y - boss.radius * 1.6, "Thorns " + Math.round(back), "#66bb6a", "bonus"));
    }
  }

  // ---------- Events from entities (subclasses add rewards etc.) ----------

  onFire() {}

  onHit(e, damage, crit) {
    this.spawnHitSparks(e.x, e.y, e.color, crit ? 9 : 5);
    this.bursts.push(new LST.Burst(e.x, e.y, crit ? "#ffd23f" : "#ffffff", e.radius * (crit ? 1.3 : 0.9), "hit"));
    if (damage) {
      const n = Math.max(1, Math.round(damage));
      const x = e.x + LST.utils.rand(-8, 8);
      const y = e.y - e.radius * 1.4 - 18; // above the enemy's HP bar
      this.texts.push(crit
        ? new LST.FloatText(x, y, n + "!", "#ffd23f", "crit")
        : new LST.FloatText(x, y, String(n), "#ffffff", "hit"));
    }
  }

  // Splash card: damage everything near an impact (not the enemy that was hit).
  splashDamage(center, amount, radius) {
    const r2 = radius * radius;
    for (const e of this.enemies) {
      if (e === center || e.dead) continue;
      if (LST.utils.dist2(center.x, center.y, e.x, e.y) <= r2) {
        e.takeDamage(amount, this);
        e.hitFlash = 0.08;
      }
    }
    this.bursts.push(new LST.Burst(center.x, center.y, "#ff9f43", radius * 0.8, "splash"));
  }

  spawnConfetti(x, y, count = 70) {
    const colors = ["#ff6fb5", "#ffd23f", "#5ec8ff", "#3ddc84", "#ff9f43", "#8e6cff"];
    for (let i = 0; i < count; i++) this.confetti.push(new LST.Confetti(x, y, colors[i % colors.length]));
  }

  onBossSpawn() {
    this.bossIntro = 2.4;
    this.shake = Math.min(1, this.shake + 0.5);
  }

  onEnemyKilled(e) {
    this.spawnCorpse(e);
    this.spawnHitSparks(e.x, e.y, e.color, 14, 160);
    this.bursts.push(new LST.Burst(e.x, e.y, e.color, e.radius * 1.8, "kill"));
    this.texts.push(new LST.FloatText(e.x, e.y - e.radius, "+" + e.coins, "#ffd93d", "coin"));
  }

  // The active theme decides whether a kill leaves a death animation, and for how long.
  spawnCorpse(e) {
    const theme = this.renderer && this.renderer.theme;
    const life = theme && theme.corpseLife ? theme.corpseLife(e) : 0;
    if (life > 0) this.corpses.push(e.corpse = new LST.Corpse(e, life));
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
