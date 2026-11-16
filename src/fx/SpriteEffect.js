// SpriteEffect: the one generic image effect. Everything it shows and every setting comes from
// data: its entry in assets/fx/fx.json (which sheet, size, blend, opacity fade) and the sheet's
// art JSON (frames, fps, loop / one-shot, anchor, refBodyR). It draws frames of a real image
// with drawImage and may move, scale, rotate and fade it (opacity). It never draws a shape,
// never tints, and draws nothing until its image is in.
//
//   draw(ctx, at)  at = { x, y, base, t, p, level, variant, pick, alpha, blend, low, x2, y2, index, w, h }
//     base     the caller's size unit (tower radius, ring radius, 1 for px); R = size x base
//     t        seconds (loop frames, pulses)      p  life progress 0..1 (one-shot frames, fades)
//     level    0..1 for "by": "level" values      variant / pick  which sheet / strip of a list
//     alpha    the caller's strength (x the entry alpha)   blend  the caller's composite op (else the entry's)
//     x2, y2   segment end ("fit": "segment" / "stretch")  w, h   the rectangle at x, y ("fit": "fill")
//   fit: radius (default), segment (art height x size), stretch (height = size x base), fill (the rectangle).
//   frame: a fixed frame of the strip (an atlas cell), instead of playing it.
LST.SpriteEffect = class SpriteEffect {
  constructor(id, entry, manifest) {
    this.id = id;
    this.entry = entry;
    this.manifest = manifest;
  }

  // A number, or { from, to, by: "level" | "progress", ease } lerped by the caller's level / progress.
  static value(v, at, p) {
    if (v == null) return 1;
    if (typeof v === "number") return v;
    const k = Math.max(0, Math.min(1, v.by === "level" ? at.level || 0 : p == null ? 0 : p));
    const ease = LST.SpriteEffect.EASES[v.ease || "linear"] || LST.SpriteEffect.EASES.linear;
    return v.from + (v.to - v.from) * ease(k);
  }

  static pickOf(list, at) {
    if (!Array.isArray(list)) return list;
    const n = list.length;
    const i = at.pick != null ? Math.floor(Math.max(0, Math.min(0.999999, at.pick)) * n) : Math.max(0, Math.min(n - 1, at.variant | 0));
    return list[i];
  }

  // The strip (a SheetAnimation with its image) for this draw, or null until loaded.
  anim(at) {
    const e = this.entry, sheet = this.manifest.sheet(LST.SpriteEffect.pickOf(e.sheet, at));
    if (!sheet) return null;
    const strip = sheet.strips[LST.SpriteEffect.pickOf(e.strip || "main", at)];
    return strip && strip.ready ? strip : null;
  }

  // Opacity curve over life: x = 1 - p / until, alpha x min(1, gain * x^power). Past `until`: 0.
  fade(p) {
    const f = this.entry.fade;
    if (!f || p == null) return 1;
    const x = 1 - p / (f.until || 1);
    if (x <= 0) return 0;
    return Math.min(1, (f.gain || 1) * Math.pow(x, f.power == null ? 1 : f.power));
  }

  static wave(w, t) { return w ? w.amp * Math.sin((t || 0) * w.speed) : 0; }

  frame(anim, at, p) {
    if (this.entry.frame != null) return this.entry.frame;
    const until = (this.entry.fade && this.entry.fade.until) || 1;
    if (anim.loop || p == null) return anim.index(at.t || 0);
    return Math.min(anim.count - 1, Math.floor((p / until) * anim.count));
  }

  draw(ctx, at) {
    const e = this.entry;
    if (at.low && e.skipLow) return false;
    const anim = this.anim(at);
    if (!anim) return false;
    const p = at.p == null ? null : Math.max(0, Math.min(1, at.p));
    const W = LST.SpriteEffect;
    const a = W.value(e.alpha, at, p) * (at.alpha == null ? 1 : at.alpha) * this.fade(p) * (1 + W.wave(e.alphaPulse, at.t) - (e.alphaPulse ? e.alphaPulse.amp : 0));
    if (a < 0.01) return false;
    const i = this.frame(anim, at, p), off = e.offset || [0, 0];
    ctx.save();
    ctx.globalCompositeOperation = at.blend || e.blend || "source-over";
    ctx.globalAlpha = Math.min(1, a);
    if (e.fit === "segment" || e.fit === "stretch") this.drawSegment(ctx, anim, i, at, p);
    else if (e.fit === "fill") ctx.drawImage(anim.image, Math.max(0, Math.min(anim.count - 1, i | 0)) * anim.fw, anim.sy, anim.fw, anim.fh, at.x, at.y, at.w, at.h);
    else anim.draw(ctx, i, at.x + off[0], at.y + off[1], (W.value(e.size, at, p) + W.wave(e.pulse, at.t)) * (at.base == null ? 1 : at.base));
    ctx.restore();
    return true;
  }

  // Stretch frame i from (x, y) to (x2, y2): the anchor sits on (x, y), length fills the hop
  // (at least entry.minLength), height is the art's own height x size ("segment") or exactly
  // size x base ("stretch").
  drawSegment(ctx, anim, i, at, p) {
    const e = this.entry;
    let ux = at.x2 - at.x, uy = at.y2 - at.y, L = Math.hypot(ux, uy);
    if (L > 1) { ux /= L; uy /= L; } else { const ang = (at.index || 0) * (e.spreadAngle || 0); ux = Math.cos(ang); uy = Math.sin(ang); }
    L = Math.max(L, e.minLength || 0);
    const kx = L / anim.fw, ky = LST.SpriteEffect.value(e.size, at, p) * (at.base == null ? 1 : at.base) / (e.fit === "stretch" ? anim.fh : 1);
    const f = Math.max(0, Math.min(anim.count - 1, i | 0));
    ctx.translate(at.x, at.y);
    ctx.rotate(Math.atan2(uy, ux));
    ctx.drawImage(anim.image, f * anim.fw, anim.sy, anim.fw, anim.fh, -anim.ax * kx, -anim.ay * ky, anim.fw * kx, anim.fh * ky);
  }
};

// Easing curves for "by": "progress" values (timing only, not a look).
LST.SpriteEffect.EASES = {
  linear: (k) => k,
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
};
