// Shared simulation pieces used by both the real game (game.js) and the
// art-style demo scene (demo.js): entity lists, per-frame updates and targeting. Spawning is
// EnemySpawner (src/core/EnemySpawner.js), slam / splash damage is DamageSystem
// (src/core/DamageSystem.js), and the shared hit / kill / spark feedback is FxSpawner
// (src/fx/FxSpawner.js). The methods below that hand off keep their names: entities, bosses,
// Game (super.onX) and the sim call them.

LST.World = class World {
  constructor(renderer) {
    this.renderer = renderer;
    this.spawner = new LST.EnemySpawner(this);
    this.damageSystem = new LST.DamageSystem(this);
    this.fxSpawner = new LST.FxSpawner(this);
    this.resetWorld();
  }

  resetWorld() {
    this.tower = new LST.Tower();
    this.enemies = [];
    this.projectiles = [];
    this.hazards = [];  // boss projectiles that land on the ground (Captain Crabclaw's coconuts)
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

  // Spawning (EnemySpawner)
  spawnEnemy(type, mult) { return this.spawner.spawn(type, mult); }
  spawnMinions(boss, types) { this.spawner.minions(boss, types); }

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

  // Damage outside a single shot (DamageSystem)
  onBossSlam(boss, damage) { this.damageSystem.bossSlam(boss, damage); }
  splashDamage(center, amount, radius) { this.damageSystem.splash(center, amount, radius); }

  // ---------- Events from entities: the shared feedback (FxSpawner); Game adds rewards and sound ----------

  onFire() {}
  onHit(e, damage, crit) { this.fxSpawner.hit(e, damage, crit); }
  onEnemyKilled(e) { this.fxSpawner.kill(e); }
  onTowerHit(e) { this.fxSpawner.towerHit(e); }
  onBossSpawn(e) { this.fxSpawner.bossSpawn(e); }
  spawnCorpse(e) { this.fxSpawner.corpse(e); }
  spawnConfetti(x, y, count) { this.fxSpawner.confetti(x, y, count); }
  spawnHitSparks(x, y, color, count, speed) { this.fxSpawner.sparks(x, y, color, count, speed); }
  spawnExplosion(x, y) { this.fxSpawner.explosion(x, y); }
};
