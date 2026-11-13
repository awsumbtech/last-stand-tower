// SeagullRenderer: draws a Seagull from the Seagull sheet ("fly" loop) plus its ground shadow
// (SeagullShadow, a separate image drawn under every enemy by WorldRenderers.shadows).
// The v0.1.1 gull faces the camera, so it is never mirrored. Image frames only.
LST.SeagullRenderer = class SeagullRenderer extends LST.SheetRenderer {
  constructor(library) { super("Seagull", library); this.shadow = new LST.SheetRenderer("SeagullShadow", library); }
  draw(ctx, e) {
    return this.drawStrip(ctx, "fly", this.frameAt("fly", e.age), e.x, e.y, LST.SheetRenderer.bodyR(e));
  }
  // Shadow centre sits 30 gull-frame px below the body, scaled like the gull (Game Art spec).
  drawShadow(ctx, e) {
    const s = this.strips(), bodyR = LST.SheetRenderer.bodyR(e);
    const k = s && s.fly ? bodyR / s.fly.refBodyR : 0;
    return this.shadow.drawStrip(ctx, "shadow", 0, e.x, e.y + 30 * k, bodyR);
  }
};
