// Game objects. Each has update(dt, game) and is drawn by render.js.
// Objects set `dead = true` and the game removes them at the end of the frame.

LST.Tower = class Tower {
  constructor() {
    const c = LST.CONFIG.tower;
    this.x = 0; // the tower sits at the world origin (screen center)
    this.y = 0;
    this.radius = c.radius;
    this.maxHp = c.maxHp;
    this.hp = c.maxHp;
    this.damage = c.damage;
    this.fireRate = c.fireRate;
    this.range = c.range;
    this.projectileSpeed = c.projectileSpeed;
    this.targets = c.targets;
    this.critChance = c.critChance;
    this.critMult = c.critMult;
    this.damageMult = 1; // Workshop "Power" upgrade
    this.armor = 0;      // Workshop "Armor": fraction of incoming damage blocked
    this.pierce = c.pierce;
    this.slow = c.slow;
    this.slowTime = c.slowTime;
    this.splash = c.splash;
    this.splashRadius = c.splashRadius;
    this.regen = c.regen;
    this.lifesteal = c.lifesteal;
    this.cooldown = 0;
    this.angle = -Math.PI / 2; // barrel direction, for drawing
    this.hitFlash = 0;
    this.recoil = 0; // 1 right after firing, eases back to 0 (for animation)
  }

  update(dt, game) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.recoil = Math.max(0, this.recoil - dt * 6);
    if (this.regen > 0 && this.hp > 0) this.heal(this.maxHp * this.regen * dt);
    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    const targets = game.nearestEnemies(this.x, this.y, this.range, this.targets);
    if (targets.length === 0) {
      this.cooldown = 0; // ready to fire the moment something enters range
      return;
    }
    this.angle = Math.atan2(targets[0].y - this.y, targets[0].x - this.x);
    for (const t of targets) {
      const crit = Math.random() < this.critChance;
      const dmg = this.damage * this.damageMult * (crit ? this.critMult : 1);
      const p = new LST.Projectile(this.x, this.y, t, dmg, this.projectileSpeed, crit);
      p.pierce = this.pierce;
      p.slow = this.slow;
      p.slowTime = this.slowTime;
      p.splash = this.splash;
      p.splashRadius = this.splashRadius;
      game.projectiles.push(p);
    }
    this.cooldown = 1 / this.fireRate;
    this.recoil = 1;
    game.onFire(this);
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount * (1 - this.armor));
    this.hitFlash = 0.2;
  }
};

LST.Enemy = class Enemy {
  constructor(type, x, y, mult) {
    const def = LST.CONFIG.enemies[type];
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = def.radius;
    this.color = def.color;
    this.shape = def.shape;
    this.maxHp = def.hp * mult.hp;
    this.hp = this.maxHp;
    this.speed = def.speed * mult.speed;
    this.damage = def.damage * mult.damage;
    this.coins = Math.max(1, Math.round(def.coins * mult.coins));
    this.score = def.score;
    this.spin = Math.random() * Math.PI * 2;
    this.hitFlash = 0;
    this.age = 0;
    this.slowAmount = 0; // 0..1 fraction of speed removed by Frost Shots
    this.slowTimer = 0;
    this.dead = false;
  }

  // Bosses only take half the slow.
  applySlow(amount, time) {
    const a = this.type === "boss" ? amount * 0.5 : amount;
    this.slowAmount = Math.max(this.slowTimer > 0 ? this.slowAmount : 0, a);
    this.slowTimer = time;
  }

  update(dt, game) {
    this.age += dt;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowAmount = 0;
    }
    const tower = game.tower;
    const dx = tower.x - this.x;
    const dy = tower.y - this.y;
    const d = Math.hypot(dx, dy);
    this.spin += dt * (this.shape === "triangle" ? 4 : 1);
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    // Contact: the enemy crashes into the tower, dealing damage (no coins).
    if (d <= tower.radius + this.radius) {
      tower.takeDamage(this.damage);
      game.onTowerHit(this);
      this.dead = true;
      return;
    }
    const speed = this.speed * (1 - this.slowAmount);
    this.x += (dx / d) * speed * dt;
    this.y += (dy / d) * speed * dt;
  }

  takeDamage(amount, game) {
    if (this.dead) return;
    this.hp -= amount;
    this.hitFlash = 0.08;
    if (this.hp <= 0) {
      this.dead = true;
      game.onEnemyKilled(this);
    }
  }
};

LST.Projectile = class Projectile {
  constructor(x, y, target, damage, speed, crit) {
    this.crit = !!crit;
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.radius = 4;
    const a = Math.atan2(target.y - y, target.x - x);
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.life = 2; // seconds before it fizzles
    this.prevX = x; // last position, for drawing trails
    this.prevY = y;
    // Card effects (set by the tower when it fires).
    this.pierce = 0;
    this.slow = 0;
    this.slowTime = 0;
    this.splash = 0;
    this.splashRadius = 0;
    this.hits = null; // enemies already hit (only tracked for piercing shots)
    this.dead = false;
  }

  // Deal damage to one enemy, apply card effects, and decide whether to keep flying.
  strike(e, game) {
    e.takeDamage(this.damage, game);
    game.onHit(e, this.damage, this.crit);
    if (this.slow > 0 && !e.dead) e.applySlow(this.slow, this.slowTime);
    if (this.splash > 0) game.splashDamage(e, this.damage * this.splash, this.splashRadius);
    if (this.pierce > 0) {
      this.pierce -= 1;
      (this.hits = this.hits || new Set()).add(e);
      this.target = null; // fly on in a straight line
      this.life = Math.min(this.life, 0.6);
      return;
    }
    this.dead = true;
  }

  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.prevX = this.x;
    this.prevY = this.y;

    // Home in on the target while it's alive; otherwise fly straight.
    const t = this.target;
    if (t && !t.dead) {
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const d = Math.hypot(dx, dy);
      // Close enough to reach this frame: count it as a hit (prevents overshooting).
      if (d <= this.speed * dt + t.radius) {
        this.strike(t, game);
        return;
      }
      this.vx = (dx / d) * this.speed;
      this.vy = (dy / d) * this.speed;
    } else {
      this.target = null;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Hit any enemy we touch (usually the target).
    for (const e of game.enemies) {
      if (e.dead || (this.hits && this.hits.has(e))) continue;
      const r = e.radius + this.radius;
      if (LST.utils.dist2(this.x, this.y, e.x, e.y) <= r * r) {
        this.strike(e, game);
        return;
      }
    }
  }
};

LST.Particle = class Particle {
  constructor(x, y, color, speed, life, size) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    this.x = x;
    this.y = y;
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.color = color;
    this.life = this.maxLife = life;
    this.size = size;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.92;
    this.vy *= 0.92;
  }
};

// Floating popups. kind: "coin" (+2), "damage" (tower hurt), "hit" / "crit" (damage
// numbers on enemies), "bonus" (wave-clear reward).
LST.FloatText = class FloatText {
  constructor(x, y, text, color, kind) {
    this.kind = kind || "coin";
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    const life = { hit: 0.55, crit: 0.85, bonus: 1.4 }[this.kind] || 0.8;
    this.life = this.maxLife = life;
    // Damage numbers drift sideways a little so stacked hits stay readable.
    this.vx = this.kind === "hit" || this.kind === "crit" ? (Math.random() * 2 - 1) * 28 : 0;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y -= (this.kind === "crit" ? 45 : 30) * dt;
    if (this.life <= 0) this.dead = true;
  }
};

// Short "impact" effect: kind is "hit" (projectile lands) or "kill".
LST.Burst = class Burst {
  constructor(x, y, color, size, kind) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.kind = kind;
    this.rot = Math.random() * Math.PI;
    this.life = this.maxLife = kind === "kill" || kind === "splash" ? 0.32 : 0.16;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
};

// Wave-clear confetti: spinning paper bits with gravity.
LST.Confetti = class Confetti {
  constructor(x, y, color) {
    const a = -Math.PI / 2 + (Math.random() * 2 - 1) * 1.2;
    const sp = 260 + Math.random() * 360;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(a) * sp;
    this.vy = Math.sin(a) * sp;
    this.rot = Math.random() * Math.PI * 2;
    this.vr = (Math.random() * 2 - 1) * 12;
    this.w = 8 + Math.random() * 6;
    this.h = 5 + Math.random() * 4;
    this.color = color;
    this.life = this.maxLife = 1.6 + Math.random() * 0.8;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.vy += 520 * dt;
    this.vx *= 0.985;
    this.vy = Math.min(this.vy, 220); // flutter down instead of falling like a rock
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.vr * dt;
  }
};
