// CrabclawRenderer: draws Captain Crabclaw from the CaptainCrabclaw sheet (crabclaw_b + angry atlas).
//   throwing: the "throw" clip is timed so its release frame (meta.throwTiming.releaseFrame, 2)
//             shows on the frame the coconut leaves: frames before it spread over the windup,
//             the release + follow-through over the slamAnim decay right after the throw.
//   fighting -> "idle", approaching -> "walk"; phase 2 / frenzy use the "_angry" strips.
// The art faces the camera, so it is never mirrored. Image frames only.
LST.CrabclawRenderer = class CrabclawRenderer extends LST.SheetRenderer {
  constructor(library) { super("CaptainCrabclaw", library); }

  throwFrame(strip, e) {
    const s = this.strips(), a = s && s[strip];
    if (!a) return 0;
    const rel = Math.min(a.count - 1, a.releaseFrame != null ? a.releaseFrame : a.count - 1);
    if (e.windup > 0) return Math.min(rel - 1, Math.floor((1 - e.windup / (e.windupMax || 1)) * rel));
    const after = 1 - e.slamAnim; // slamAnim: 1 at the throw, decays to 0 in ~0.33 s
    return Math.min(a.count - 1, rel + Math.floor(after * (a.count - rel)));
  }

  pick(e) {
    const mood = (s) => (e.angry && this.has(s + "_angry") ? s + "_angry" : s);
    if (e.windup > 0 || e.slamAnim > 0) { const s = mood("throw"); return [s, this.throwFrame(s, e)]; }
    const s = mood(e.mode === "fight" ? "idle" : "walk");
    return [s, e.stun > 0 ? 0 : this.frameAt(s, e.age)];
  }

  draw(ctx, e) {
    const [strip, f] = this.pick(e);
    return this.drawStrip(ctx, strip, f, e.x, e.y, LST.SheetRenderer.bodyR(e));
  }
};
