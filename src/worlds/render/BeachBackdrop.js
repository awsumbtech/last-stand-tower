// BeachBackdrop: the Beach's ground. Owns the whole background layer while the Beach is played:
// clears the canvas, then draws the BeachGround image cover-fitted to the screen with its anchor on
// the tower (plus the BeachSurf foam loop along the top of the image, if that sheet exists).
// Image-only (drawImage + clearRect, no paths or fills). Before the image loads it draws nothing.
LST.BeachBackdrop = class BeachBackdrop {
  constructor(library) { this.ground = new LST.SheetRenderer("BeachGround", library); this.surf = new LST.SheetRenderer("BeachSurf", library); }

  // World-unit rect [x, y, w, h] the ground image covers for this screen (16 px overdraw for shake).
  coverRect(strip, r) {
    const m = 16 / (r.scale || 1);
    const hw = (r.halfW || 400) + m, hh = (r.halfH || 400) + m;
    const k = Math.max((hw * 2) / strip.fw, (hh * 2) / strip.fh); // world units per image px
    return [-strip.ax * k, -strip.ay * k, strip.fw * k, strip.fh * k, k];
  }

  draw(ctx, r) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas ? ctx.canvas.width : 0, ctx.canvas ? ctx.canvas.height : 0);
    ctx.restore();
    const s = this.ground.strips(), g = s && s.main;
    if (!g || !g.image) return false;
    const [x, y, w, h, k] = this.coverRect(g, r);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(g.image, 0, 0, g.fw, g.fh, x, y, w, h);
    const f = this.surf.strips(), sm = f && f.main;
    if (sm && sm.image) {
      const i = sm.index(r.time || 0), sw = w, sh = sm.fh * (w / sm.fw);
      ctx.drawImage(sm.image, i * sm.fw, 0, sm.fw, sm.fh, x, y, sw, sh);
    }
    ctx.restore();
    return k > 0;
  }
};
