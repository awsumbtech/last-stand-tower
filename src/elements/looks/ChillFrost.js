// ChillFrost (slowed / chilled): a frost rim with cold flecks on an enemy while it is slowed.
// Slow is not a StatusEffect: it is Enemy.slowTimer, set by Enemy.applySlow from Frost Shots (every
// hit), Frostbite chill (every hit) and the Freeze ability (every enemy). So this look reads
// slowTimer directly. It hides while the "frozen" StatusEffect is on: IceCrust owns that moment.
// Art: assets/sprites/looks/ChillFrost/ (Game Art & Motion). "main" loops; reduced motion shows
// frame 0; an optional "attach" one-shot plays first. Until the sheet is in LST.LOOK_SHEETS and
// loaded, StatusLook.draw finds no sheet and draws nothing (no fallback, no tint).
// Render only: reads slowTimer and statuses, never writes them (the sims do not load this file).
LST.ChillFrost = LST.LookRegistry.register("chill", class ChillFrost extends LST.StatusLook {
  static get status() { return "chill"; } // look id; the state itself is Enemy.slowTimer (see isActive)
  static get sheet() { return "ChillFrost"; }
  static isActive(e) { return e.slowTimer > 0 && !LST.StatusEffects.get(e, "frozen"); }
  pick(strips, reduced) {
    const attach = strips.attach;
    if (!reduced && attach && !attach.done(this.t)) return ["attach", attach.index(this.t)];
    const main = strips.main;
    return main ? ["main", reduced ? 0 : main.index(this.t)] : null;
  }
});
