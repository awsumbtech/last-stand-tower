// HermitCrabRenderer: draws a Hermit Crab from the HermitCrab sheet, picked by its ShellShield:
//   shell up -> "walk"; just broke -> "crack" (once); broken / bare -> "bare"; just regrew -> "regrow" (once).
// Only image frames (SheetRenderer); nothing at all until the sheet has loaded.
LST.HermitCrabRenderer = class HermitCrabRenderer extends LST.SheetRenderer {
  constructor(library) { super("HermitCrab", library); }

  pick(e) {
    const sh = e.part ? e.part(LST.ShellShield) : null;
    const age = e.age;
    if (sh && sh.brokeAt >= 0 && sh.brokeAt >= sh.regrewAt && this.has("crack") && !this.done("crack", age - sh.brokeAt)) return ["crack", this.frameAt("crack", age - sh.brokeAt)];
    if (sh && sh.regrewAt >= 0 && sh.regrewAt > sh.brokeAt && this.has("regrow") && !this.done("regrow", age - sh.regrewAt)) return ["regrow", this.frameAt("regrow", age - sh.regrewAt)];
    const strip = sh && !sh.up ? "bare" : "walk";
    return [strip, e.stun > 0 ? 0 : this.frameAt(strip, age)];
  }

  done(strip, t) { const s = this.strips(); return !s || !s[strip] || s[strip].done(t); }

  draw(ctx, e) {
    const [strip, f] = this.pick(e);
    return this.drawStrip(ctx, strip, f, e.x, e.y, LST.SheetRenderer.bodyR(e), e.x > 0); // art faces right; mirrored right of the tower
  }
};
