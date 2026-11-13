// CrabclawRenderer: draws Captain Crabclaw from the CaptainCrabclaw sheet.
//   throwing (windup > 0) -> "throw" spread over the windup; standing to fight -> "idle"; else "walk".
//   Phase 2 / frenzy use the "_angry" strips when the sheet has them.
// Image frames only; nothing until the sheet has loaded.
LST.CrabclawRenderer = class CrabclawRenderer extends LST.SheetRenderer {
  constructor(library) { super("CaptainCrabclaw", library); }

  pick(e) {
    const mood = (s) => (e.angry && this.has(s + "_angry") ? s + "_angry" : s);
    if (e.windup > 0) { const s = mood("throw"); return [s, this.frameFor(s, 1 - e.windup / (e.windupMax || 1))]; }
    const s = mood(e.mode === "fight" ? "idle" : "walk");
    return [s, e.stun > 0 ? 0 : this.frameAt(s, e.age)];
  }

  draw(ctx, e) {
    const [strip, f] = this.pick(e);
    return this.drawStrip(ctx, strip, f, e.x, e.y, LST.SheetRenderer.bodyR(e), e.x > 0);
  }
};
