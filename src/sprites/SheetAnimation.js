// SheetAnimation: one horizontal strip of equal-size frames from a look sheet (Game Art & Motion
// "strips" JSON: frame{w,h}, count, fps, loop, durationSec?) plus the anchor pixel that sits on
// its owner. Knows frames, timing and placement; knows nothing about enemies or statuses.
//   index(t)  frame shown t seconds in (loops wrap, one-shots hold their last frame)
//   done(t)   a one-shot has played through
//   draw(ctx, i, x, y, bodyR)  frame i with its anchor on (x, y), scaled bodyR / refBodyR
// Draws nothing (returns false) until its image is in: there is no drawn fallback.
LST.SheetAnimation = class SheetAnimation {
  constructor(strip, anchor, refBodyR) {
    this.src = strip.image;
    this.fw = strip.frame.w; this.fh = strip.frame.h;
    this.count = Math.max(1, strip.count | 0);
    this.fps = strip.fps || 0;
    this.loop = !!strip.loop;
    this.duration = strip.durationSec || (this.fps ? this.count / this.fps : Infinity);
    this.ax = anchor.x; this.ay = anchor.y;
    this.refBodyR = refBodyR;
    this.image = null;
  }

  get ready() { return !!this.image; }

  index(t) {
    if (!this.fps || this.count === 1) return 0;
    const i = Math.floor(Math.max(0, t) * this.fps + 1e-9);
    return this.loop ? i % this.count : Math.min(this.count - 1, i);
  }

  done(t) { return !this.loop && t >= this.duration; }

  // World-space rect of frame i drawn on (x, y) for a body of radius bodyR: [dx, dy, dw, dh].
  rect(x, y, bodyR) {
    const k = bodyR / this.refBodyR;
    return [x - this.ax * k, y - this.ay * k, this.fw * k, this.fh * k];
  }

  draw(ctx, i, x, y, bodyR) {
    if (!this.image) return false;
    const f = Math.max(0, Math.min(this.count - 1, i | 0)), [dx, dy, dw, dh] = this.rect(x, y, bodyR);
    ctx.drawImage(this.image, f * this.fw, 0, this.fw, this.fh, dx, dy, dw, dh);
    return true;
  }
};
