// SheetRenderer: base for the World 2 renderers. Single job: draw one strip frame of one sheet
// from LST.world2Sheets with its anchor on a point, at a body size, optionally mirrored.
// Image-only: it calls ctx.drawImage (through SheetAnimation) and plain transforms, never a
// path, fill or stroke. Returns false (and draws nothing) when the sheet or strip isn't loaded.
LST.SheetRenderer = class SheetRenderer {
  constructor(sheet, library) { this.sheet = sheet; this.library = library || null; }
  lib() { return this.library || LST.world2Sheets || null; }
  strips() { const l = this.lib(), s = l && l.get(this.sheet); return s ? s.strips : null; }
  has(strip) { const s = this.strips(); return !!(s && s[strip]); }

  // Frame index for a strip at time t (loops wrap, one-shots hold the last frame).
  frameAt(strip, t) { const s = this.strips(); return s && s[strip] ? s[strip].index(t) : 0; }
  // Frame index for a one-shot spread over progress k (0..1), e.g. a throw over its windup.
  frameFor(strip, k) { const s = this.strips(), a = s && s[strip]; return a ? Math.min(a.count - 1, Math.floor(Math.max(0, k) * a.count)) : 0; }

  drawStrip(ctx, strip, frame, x, y, bodyR, flipX = false) {
    const s = this.strips(), a = s && s[strip];
    if (!a) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (flipX) { ctx.translate(x, y); ctx.scale(-1, 1); ctx.translate(-x, -y); }
    const ok = a.draw(ctx, frame, x, y, bodyR);
    ctx.restore();
    return ok;
  }

  static bodyR(e) { return e.radius * 1.35; } // same body size the cartoon theme uses
};
