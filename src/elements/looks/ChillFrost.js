// ChillFrost (slowed / chilled): a frost rim with cold flecks on an enemy while it is slowed.
// Slow is not a StatusEffect: it is Enemy.slowTimer, set by Enemy.applySlow from Frost Shots (every
// hit), Frostbite chill (every hit) and the Freeze ability (every enemy). So this look reads
// slowTimer directly. It hides while the "frozen" StatusEffect is on: IceCrust owns that moment.
// Art: assets/sprites/looks/ChillFrost/ (Game Art & Motion): "attach" one-shot on attach, then
// "loop" while slowed; when the slow wears off, the "fade" one-shot plays, then the look is gone.
// No fade when the enemy freezes (IceCrust takes over at once), dies, or with reduced motion
// (which shows the "still" frame throughout, no attach). Until the sheet is loaded,
// StatusLook.draw finds no sheet and draws nothing (no fallback, no tint).
// Render only: reads slowTimer and statuses, never writes them (the sims do not load this file).
LST.ChillFrost = LST.LookRegistry.register("chill", class ChillFrost extends LST.StatusLook {
  static get status() { return "chill"; } // look id; the state itself is Enemy.slowTimer (see isActive)
  static get sheet() { return "ChillFrost"; }
  static isActive(e) { return e.slowTimer > 0 && !LST.StatusEffects.get(e, "frozen"); }
  constructor() { super(); this.fadeT = -1; }
  static strips() { const sheet = LST.lookSheets && LST.lookSheets.get("ChillFrost"); return sheet ? sheet.strips : null; }
  get releasing() { return this.fadeT >= 0; }
  release(reduced) {
    const S = LST.ChillFrost.strips(), e = this.enemy;
    if (reduced || !S || !S.fade || !e || e.dead || LST.StatusEffects.get(e, "frozen")) return false;
    this.fadeT = 0;
    return true;
  }
  revive() { this.fadeT = -1; }
  update(dt) { super.update(dt); if (this.fadeT >= 0) this.fadeT += dt; }
  get done() {
    if (this.fadeT < 0) return false;
    const S = LST.ChillFrost.strips();
    return !S || !S.fade || S.fade.done(this.fadeT);
  }
  pick(strips, reduced) {
    if (this.fadeT >= 0) return strips.fade ? ["fade", strips.fade.index(this.fadeT)] : null;
    if (reduced) return strips.still ? ["still", 0] : strips.loop ? ["loop", 0] : null;
    const attach = strips.attach;
    if (attach && !attach.done(this.t)) return ["attach", attach.index(this.t)];
    return strips.loop ? ["loop", strips.loop.index(attach ? this.t - attach.duration : this.t)] : null;
  }
});
