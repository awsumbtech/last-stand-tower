// LookLayer: keeps each enemy's looks in step with its statuses. Attaches a look when its status
// starts, detaches it the frame the status ends (or the enemy dies, or a run starts), and attaches
// event looks for their life on an element hit. The one attach point is FxDirector.drawWorld,
// which calls render() every frame. Render only: nothing here touches damage, timing or the sim.
LST.LookLayer = class LookLayer {
  constructor(bus) {
    this.byEnemy = new Map(); // enemy -> Map(lookId -> look)
    this.enemies = []; this.last = null;
    if (LST.lookSheets) LST.lookSheets.preload(); // the looks' image sheets (draw nothing until loaded)
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
    if (!scene.hasStatus && !this.byEnemy.size && !scene.enemies.some((e) => e.slowTimer > 0)) return; // slow (ChillFrost) is not a StatusEffect
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
      if (!e.status && !(e.slowTimer > 0) && !this.byEnemy.has(e)) continue;
      for (const [id, Cls] of LST.LookRegistry.statusLooks()) {
        const on = !!Cls.isActive(e), m = this.byEnemy.get(e), has = !!(m && m.has(id));
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
