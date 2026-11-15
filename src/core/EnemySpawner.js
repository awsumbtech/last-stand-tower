// EnemySpawner: puts enemies on the field for a World (Game or DemoScene). spawn() places one
// just outside a random point on the visible edge (uniform around the border, pulled in on very
// tall screens); a mini-boss archetype (CONFIG.enemies.*.miniBoss) gets its boss HP curve and
// early-wave tuning and fires the world's onBossSpawn. minions() calls in a boss's helpers.
LST.EnemySpawner = class EnemySpawner {
  constructor(world) { this.world = world; }

  isMiniBoss(enemy) { return !!(LST.CONFIG.enemies[enemy.type] || {}).miniBoss; }

  // The registry makes archetype enemies (Beach: crab, gull, Elite Big Red); any other id is a plain Enemy.
  create(type, x, y, mult) { return LST.EnemyRegistry ? LST.EnemyRegistry.create(type, x, y, mult) : new LST.Enemy(type, x, y, mult); }

  spawn(type, mult) {
    const w = this.world;
    const r = LST.CONFIG.enemies[type].radius;
    const hw = w.renderer.halfW + r + 10;
    const hh = w.renderer.halfH + r + 10;
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
    const enemy = this.create(type, x, y, mult);
    const boss = this.isMiniBoss(enemy);
    if (boss) { enemy.maxHp = enemy.hp = LST.CONFIG.enemies.boss.hp * Math.pow(mult.hp, LST.CONFIG.bosses.hpExp); }
    const early = boss && LST.CONFIG.bosses.early[w.wave];
    if (early) { enemy.maxHp *= early.hp; enemy.hp = enemy.maxHp; enemy.dmgMult *= early.dmg; }
    w.enemies.push(enemy);
    if (boss) w.onBossSpawn(enemy);
    return enemy;
  }

  // Bosses call in helpers next to themselves.
  minions(boss, types) {
    const w = this.world;
    const m = w.waveMult || { hp: 1, speed: 1, damage: 1, coins: 1 };
    types.forEach((type, i) => {
      const a = Math.atan2(boss.y, boss.x) + (i - (types.length - 1) / 2) * 0.55;
      const r = boss.radius + 26;
      const x = boss.x + Math.cos(a) * r, y = boss.y + Math.sin(a) * r;
      const e = this.create(type, x, y, m);
      e.age = 0;
      w.enemies.push(e);
      w.fxSpawner.minionPop(e);
    });
  }
};
