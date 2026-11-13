// SeagullRenderer: draws a Seagull from the Seagull sheet ("fly" loop). The art faces right, so a
// gull to the right of the tower (flying left) is mirrored. Image frames only; nothing until loaded.
LST.SeagullRenderer = class SeagullRenderer extends LST.SheetRenderer {
  constructor(library) { super("Seagull", library); }
  draw(ctx, e) {
    return this.drawStrip(ctx, "fly", this.frameAt("fly", e.age), e.x, e.y, LST.SheetRenderer.bodyR(e), e.x > 0);
  }
};
