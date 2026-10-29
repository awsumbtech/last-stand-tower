// SpriteTinter: draws an atlas frame with a colour effect (hit flash, frost, charge
// flicker) without baking tinted copies of whole sheets. One reusable scratch canvas.
// The colour is blended *into* the art (keeping the ink outlines and shading) and then
// clipped back to the sprite's own alpha, so a flashed enemy reads as "lit up" rather
// than as a ghostly white silhouette. Plain canvas composite modes only (no ctx.filter,
// which older iOS Safari lacks).
//   tint = { color, alpha, mode } or a list of them applied in order
//   mode: a globalCompositeOperation blend, default "overlay"
LST.SpriteTinter = class SpriteTinter {
  constructor() { this.canvas = null; this.ctx = null; }

  scratch(w, h) {
    if (!this.canvas) { this.canvas = document.createElement("canvas"); this.ctx = this.canvas.getContext("2d"); }
    if (this.canvas.width < w || this.canvas.height < h) {
      this.canvas.width = Math.max(this.canvas.width, w);
      this.canvas.height = Math.max(this.canvas.height, h);
    }
    return this.ctx;
  }

  // Same placement as SpriteAtlas.drawFrame.
  drawFrame(ctx, atlas, frame, tint) {
    if (frame.empty) return;
    const g = this.scratch(frame.w, frame.h);
    const { w, h } = frame;
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, w, h);
    g.drawImage(atlas.image, frame.sx, frame.sy, w, h, 0, 0, w, h);
    for (const pass of Array.isArray(tint) ? tint : [tint]) {
      g.globalCompositeOperation = pass.mode || "overlay";
      g.globalAlpha = pass.alpha;
      g.fillStyle = pass.color;
      g.fillRect(0, 0, w, h);
    }
    g.globalCompositeOperation = "destination-in"; // back to the sprite's silhouette
    g.globalAlpha = 1;
    g.drawImage(atlas.image, frame.sx, frame.sy, w, h, 0, 0, w, h);
    g.globalCompositeOperation = "source-over";
    const k = 1 / atlas.pxPerUnit;
    ctx.drawImage(this.canvas, 0, 0, w, h, -frame.px * k, -frame.py * k, w * k, h * k);
  }
};
