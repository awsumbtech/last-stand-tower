// EliteShellRenderer: Elite Big Red's shield phase (Beach Gate III), drawn ON TOP of Big Red's own
// sprite from the EliteShell sheet: "on" while the ShellShield is up, "crack" once when it breaks,
// "regrow" once when it comes back. Draws nothing while the shield is down, or before the sheet loads.
LST.EliteShellRenderer = class EliteShellRenderer extends LST.SheetRenderer {
  constructor(library) { super("EliteShell", library); }

  pick(e) {
    const sh = e.part ? e.part(LST.ShellShield) : null;
    if (!sh) return null;
    const age = e.age, once = (s, t) => this.has(s) && !this.strips()[s].done(t);
    if (sh.brokeAt >= 0 && sh.brokeAt >= sh.regrewAt && once("crack", age - sh.brokeAt)) return ["crack", this.frameAt("crack", age - sh.brokeAt)];
    if (sh.regrewAt >= 0 && sh.regrewAt > sh.brokeAt && once("regrow", age - sh.regrewAt)) return ["regrow", this.frameAt("regrow", age - sh.regrewAt)];
    return sh.up ? ["on", this.frameAt("on", age)] : null;
  }

  draw(ctx, e) {
    const p = this.pick(e);
    return !!p && this.drawStrip(ctx, p[0], p[1], e.x, e.y, LST.SheetRenderer.bodyR(e));
  }
};
