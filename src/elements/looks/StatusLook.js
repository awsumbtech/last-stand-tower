// StatusLook: base class for an object drawn ON an enemy while an elemental status is active
// (BurnFlames while burning, IceCrust while frozen, VenomDrips while poisoned, SparkCrackle for a
// moment after a Chain Spark hit). Lifecycle: attach(enemy) -> update(dt) -> draw(ctx, enemy, reduced)
// -> detach(). Every look is image art: it names its sheet (LST.LOOK_SHEETS) and picks which strip and
// frame to show; SheetAnimation draws it with the anchor on the enemy, scaled bodyR / refBodyR.
// No look draws paths or shapes, and nothing draws before its sheet has loaded.
// Render only: no look changes damage, timing or the sim (tools/sim.js never loads these files).
LST.StatusLook = class StatusLook {
  static get status() { return null; } // the StatusEffect id this look follows (null for event looks)
  static get sheet() { return null; }  // LST.LOOK_SHEETS key
  static isActive(e) { return !!(this.status && LST.StatusEffects.get(e, this.status)); }
  constructor() { this.enemy = null; this.t = 0; this.life = Infinity; }
  attach(enemy) { this.enemy = enemy; this.t = 0; return this; }
  update(dt) { this.t += dt; }
  get done() { return this.t >= this.life; }
  // [stripId, frameIndex] to show now, or null for nothing. Default: loop "main", frame 0 when reduced.
  pick(strips, reduced) { return ["main", reduced ? 0 : strips.main.index(this.t)]; }
  // Returns true when a frame was drawn.
  draw(ctx, e, reduced) {
    const sheet = LST.lookSheets && LST.lookSheets.get(this.constructor.sheet);
    if (!sheet) return false; // image not loaded yet: nothing
    const p = this.pick(sheet.strips, reduced), strip = p && sheet.strips[p[0]];
    return !!strip && strip.draw(ctx, p[1], e.x, e.y, LST.StatusLook.bodyR(e));
  }
  detach() { this.enemy = null; }
  // Body size used by the cartoon theme (enemies.js: R = radius * 1.35)
  static bodyR(e) { return e.radius * 1.35; }
};
