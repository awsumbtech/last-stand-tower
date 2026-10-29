// SpriteTinter: draws an atlas frame washed with a flat color (hit flash, frost, charge
// flicker) without baking tinted copies of whole sheets. Uses one reusable scratch canvas.
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

  // Same placement as SpriteAtlas.drawFrame; tint = { color, alpha }.
  drawFrame(ctx, atlas, frame, tint) {
    const g = this.scratch(frame.w, frame.h);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, frame.w, frame.h);
    g.drawImage(atlas.image, frame.sx, frame.sy, frame.w, frame.h, 0, 0, frame.w, frame.h);
    g.globalCompositeOperation = "source-atop"; // only where the sprite has paint
    g.globalAlpha = tint.alpha;
    g.fillStyle = tint.color;
    g.fillRect(0, 0, frame.w, frame.h);
    const k = 1 / atlas.pxPerUnit;
    ctx.drawImage(this.canvas, 0, 0, frame.w, frame.h, -frame.px * k, -frame.py * k, frame.w * k, frame.h * k);
  }
};
