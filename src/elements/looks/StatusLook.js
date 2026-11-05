// Status looks: an object drawn ON an enemy while an elemental status is active
// (flames while burning, an ice shell while frozen, drips while poisoned, a crackle after a spark).
//
//   LST.StatusLook       base class (owners: BurnFlames, IceCrust, VenomDrips, SparkCrackle): attach(enemy) -> update(dt) -> draw(ctx, enemy, reduced) -> detach()
//   LST.LookRegistry     id -> look class; status looks name the status they follow (status id),
//                        event looks (Chain Spark) are attached for a fixed time by the FX layer.
//   LST.LookLayer        keeps each enemy's looks in step with its statuses: attaches when a status
//                        starts, detaches the frame it ends (or the enemy dies). Nothing is left over.
//   LST.LOOK_VARIANTS    per-kind style presets (flame a/b/c, ice a/b/c); LST.LOOK_STYLE picks one.
// Render only: no look changes damage, timing or the sim (tools/sim.js never loads these files).
LST.LOOK_INK = "#2b1d3a"; // the cartoon theme's outline color

LST.StatusLook = class StatusLook {
  // status: the StatusEffect id this look follows (null for event looks); kind: LOOK_VARIANTS key
  static get status() { return null; }
  static get kind() { return null; }
  static isActive(e) { return !!(this.status && LST.StatusEffects.get(e, this.status)); }
  constructor() { this.enemy = null; this.t = 0; this.life = Infinity; this.seed = 0; }
  get cfg() {
    const k = this.constructor.kind, V = k && LST.LOOK_VARIANTS[k];
    return V ? V[LST.LOOK_STYLE[k]] || V[Object.keys(V)[0]] : {};
  }
  attach(enemy) { this.enemy = enemy; this.t = 0; this.seed = ((enemy.x * 7.3 + enemy.y * 3.1) % 6.28 + 6.28) % 6.28; return this; }
  update(dt) { this.t += dt; }
  get done() { return this.t >= this.life; }
  draw() {}
  detach() { this.enemy = null; }
  // Body size used by the cartoon theme (enemies.js: R = radius * 1.35)
  static bodyR(e) { return e.radius * 1.35; }
};

LST.LookRegistry = {
  looks: {},
  register(id, cls) { this.looks[id] = cls; return cls; },
  get(id) { return this.looks[id] || null; },
  statusLooks() { return Object.entries(this.looks).filter(([, c]) => c.status); },
  eventLooks(element) { return Object.entries(this.looks).filter(([, c]) => c.event && c.event === element); },
};

LST.LookLayer = class LookLayer {
  constructor(bus) {
    this.byEnemy = new Map(); // enemy -> Map(lookId -> look)
    this.enemies = []; this.last = null;
    if (bus && LST.EVENTS) {
      bus.on(LST.EVENTS.RUN_START, () => { this.clear(); this.last = null; });
      bus.on(LST.EVENTS.ELEMENT_HIT, (ev) => this.onHit(ev));
    }
  }
  // Event looks (SparkCrackle): attach for their life to the enemies the class picks.
  onHit(ev) {
    for (const [id, Cls] of LST.LookRegistry.eventLooks(ev.element)) for (const e of Cls.targets(ev, this.enemies)) this.flash(e, id, Cls.life);
  }
  // The one per-frame entry (FxDirector.drawWorld): sync to statuses, age by the FX clock, draw.
  render(ctx, scene, time, reduced) {
    if (!scene || !scene.enemies) return;
    const dt = this.last === null ? 0 : Math.max(0, time - this.last); this.last = time;
    this.enemies = scene.enemies;
    if (!scene.hasStatus && !this.byEnemy.size) return;
    this.sync(scene.enemies, dt); this.draw(ctx, reduced);
  }
  get count() { let n = 0; for (const m of this.byEnemy.values()) n += m.size; return n; }
  looksOf(e) { return this.byEnemy.get(e) || null; }
  add(e, id) {
    const Cls = LST.LookRegistry.get(id); if (!Cls) return null;
    let m = this.byEnemy.get(e); if (!m) this.byEnemy.set(e, (m = new Map()));
    const old = m.get(id); if (old) { old.t = 0; return old; } // re-trigger: restart, never stack
    const look = new Cls().attach(e); m.set(id, look); return look;
  }
  remove(e, id) {
    const m = this.byEnemy.get(e), look = m && m.get(id); if (!look) return;
    look.detach(); m.delete(id); if (!m.size) this.byEnemy.delete(e);
  }
  clear() { for (const [e, m] of this.byEnemy) for (const id of [...m.keys()]) this.remove(e, id); }
  // Event look for a fixed time (Chain Spark crackle). Returns the look.
  flash(e, id, life) { const look = this.add(e, id); if (look) look.life = life; return look; }
  // Attach/detach status looks to match the enemies' statuses, age every look.
  sync(enemies, dt) {
    const alive = new Set();
    for (const e of enemies) {
      if (e.dead || e.corpse) continue;
      alive.add(e);
      if (!e.status && !this.byEnemy.has(e)) continue;
      for (const [id, Cls] of LST.LookRegistry.statusLooks()) {
        const on = !!e.status && Cls.isActive(e), m = this.byEnemy.get(e), has = !!(m && m.has(id));
        if (on && !has) this.add(e, id); else if (!on && has) this.remove(e, id);
      }
    }
    for (const [e, m] of [...this.byEnemy]) {
      if (!alive.has(e)) { for (const id of [...m.keys()]) this.remove(e, id); continue; }
      for (const [id, look] of [...m]) { look.update(dt); if (look.done) this.remove(e, id); }
    }
  }
  draw(ctx, reduced) {
    for (const [e, m] of this.byEnemy) for (const look of m.values()) {
      ctx.save(); look.draw(ctx, e, reduced); ctx.restore();
    }
  }
};

// Shared cartoon helpers for looks: fill + thick ink outline.
LST.LookKit = {
  ink(ctx, fill, w) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = w; ctx.strokeStyle = LST.LOOK_INK; ctx.lineJoin = "round"; ctx.stroke(); },
  // a flame tongue standing on (x, y), pointing up (angle a, 0 = up), width w, height h
  tongue(ctx, x, y, w, h, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a || 0);
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.quadraticCurveTo(-w * 1.05, -h * 0.55, 0, -h);
    ctx.quadraticCurveTo(w * 1.05, -h * 0.55, w, 0);
    ctx.quadraticCurveTo(0, w * 0.9, -w, 0);
    ctx.closePath(); ctx.restore();
  },
};

LST.LOOK_VARIANTS = {
  // tongues: [x along the top (-1..1 of R), height (x R), width (x R), tilt]; sides: extra tongues on the sides
  flame: {
    a: { name: "small tufts", tongues: [[-0.5, 0.55, 0.22, -0.15], [0.05, 0.75, 0.24, 0], [0.55, 0.5, 0.2, 0.18]], sides: [], outline: 2.5 },
    b: { name: "crown of flames", tongues: [[-0.7, 0.6, 0.24, -0.35], [-0.3, 0.9, 0.27, -0.12], [0.15, 1.1, 0.3, 0.05], [0.6, 0.75, 0.25, 0.3]],
         sides: [[-1, 0.15, 0.45, 0.2, -1.1], [1, 0.05, 0.4, 0.18, 1.1]], outline: 3 },
    c: { name: "big outlined flames", tongues: [[-0.55, 1.25, 0.42, -0.25], [0.2, 1.6, 0.48, 0.05], [0.8, 1.0, 0.38, 0.35]],
         sides: [[-1, 0.3, 0.75, 0.32, -0.9], [1, 0.25, 0.65, 0.3, 0.9]], outline: 3.5 },
  },
  ice: {
    a: { name: "light frost", shell: false, crust: true, icicles: 0, chunks: 2 },
    b: { name: "ice shell", shell: true, crust: true, icicles: 0, chunks: 2 },
    c: { name: "icicles", shell: false, crust: true, icicles: 4, chunks: 3 },
  },
};
LST.LOOK_STYLE = { flame: "b", ice: "b" };
LST.setLookVariant = (kind, id) => {
  if (!LST.LOOK_VARIANTS[kind] || !LST.LOOK_VARIANTS[kind][id]) return false;
  LST.LOOK_STYLE[kind] = id; return true;
};
