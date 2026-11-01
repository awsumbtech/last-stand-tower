// ParticlePool: fixed-capacity particle storage (struct of typed arrays).
// No objects are created per particle or per frame: spawn() hands out a slot, update()
// moves them and swap-removes the dead ones. `limit` is a soft cap (quality / reduced
// motion lower it); `capacity` is the hard cap. When full, priority spawns recycle the
// oldest-ish slot round-robin; other spawns are dropped (counted in `dropped`).

LST.FX_SHAPE = Object.freeze({ STREAK: 0, SOFT: 1, GLOW: 2 });

// Small seeded RNG for effects only, so effects never touch the game's Math.random stream.
LST.FxRandom = class FxRandom {
  constructor(seed = 0x9e3779b9) { this.s = seed >>> 0 || 1; }
  next() { let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0; return this.s / 4294967296; }
  range(a, b) { return a + (b - a) * this.next(); }
  pick(arr) { return arr[(this.next() * arr.length) | 0]; }
};

LST.ParticlePool = class ParticlePool {
  constructor(capacity) {
    this.capacity = capacity;
    this.limit = capacity;
    this.count = 0;
    const F = () => new Float32Array(capacity);
    this.x = F(); this.y = F(); this.vx = F(); this.vy = F();
    this.life = F(); this.maxLife = F(); this.size = F();
    this.drag = F(); this.gravity = F(); this.stretch = F(); this.minLen = F();
    this.shape = new Uint8Array(capacity);
    this.color = new Uint8Array(capacity);
    this.palette = [];            // color id -> CSS color
    this.paletteIds = new Map();  // CSS color -> id (filled once per color, then reused)
    this.cursor = 0;
    this.dropped = 0;
    this.peak = 0;
  }

  colorId(css) {
    let id = this.paletteIds.get(css);
    if (id === undefined) {
      id = this.palette.length;
      if (id > 255) return 0;
      this.palette.push(css);
      this.paletteIds.set(css, id);
    }
    return id;
  }

  setLimit(n) { this.limit = Math.max(0, Math.min(this.capacity, n | 0)); }

  // Returns a slot index, or -1 when the pool is at its limit.
  spawn(priority = false) {
    if (this.count < this.limit) {
      const i = this.count++;
      if (this.count > this.peak) this.peak = this.count;
      return i;
    }
    if (priority && this.count > 0) {
      this.cursor = (this.cursor + 1) % this.count;
      return this.cursor;
    }
    this.dropped++;
    return -1;
  }

  set(i, x, y, vx, vy, life, size, shape, colorId, drag, gravity, stretch, minLen) {
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy;
    this.life[i] = this.maxLife[i] = life; this.size[i] = size;
    this.shape[i] = shape; this.color[i] = colorId;
    this.drag[i] = drag; this.gravity[i] = gravity; this.stretch[i] = stretch; this.minLen[i] = minLen;
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      const life = this.life[i] - dt;
      if (life <= 0) { this.remove(i); i--; continue; }
      this.life[i] = life;
      const k = this.drag[i] > 0 ? Math.exp(-this.drag[i] * dt) : 1;
      this.vx[i] *= k;
      this.vy[i] = this.vy[i] * k + this.gravity[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
    }
  }

  // Swap-remove: the last live particle moves into slot i.
  remove(i) {
    const j = --this.count;
    if (i === j) return;
    this.x[i] = this.x[j]; this.y[i] = this.y[j]; this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j];
    this.life[i] = this.life[j]; this.maxLife[i] = this.maxLife[j]; this.size[i] = this.size[j];
    this.drag[i] = this.drag[j]; this.gravity[i] = this.gravity[j]; this.stretch[i] = this.stretch[j]; this.minLen[i] = this.minLen[j];
    this.shape[i] = this.shape[j]; this.color[i] = this.color[j];
  }

  clear() { this.count = 0; }
};
