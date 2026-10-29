// SpriteAtlas: one sprite sheet (PNG) plus its hash-style JSON atlas.
// Knows frames, animations and the atlas's art scale; knows nothing about enemies.
//
// JSON shape (Game Art & Motion generator / TexturePacker "hash"):
//   frames{name:{frame{x,y,w,h}, pivot{x,y} (0..1), duration,
//               trimmed?, spriteSourceSize{x,y,w,h}?, sourceSize{w,h}?}}
//   Grid sheets: the pivot is a fraction of the frame rect. Trimmed sheets (TexturePacker
//   style): the pivot is a fraction of sourceSize and the trimmed rect sits at
//   spriteSourceSize.{x,y} inside it. Both reduce to the same stored pivot (px, py) =
//   where the pivot falls inside the stored rect, so drawing never cares which it was.
//   Empty frames (1x1 shared rect) are flagged and skipped.
//   animations{name:{frames[], fps, loop}}
//   meta{image, hitbox{pxPerWorldUnit}, pupils{image, r}?, layer{order, rotates, tinted}?, ...}
//   frames[].eyes [{x,y,pupilR,maxOffset}] and frames[].offset {x,y} are optional extras
//   (pupil anchors and the walk bob for layered sheets), all in frame px from the pivot.
LST.SpriteAtlas = class SpriteAtlas {
  constructor(name, jsonUrl) {
    this.name = name;
    this.jsonUrl = jsonUrl;
    this.image = null;
    this.pupil = null;     // { image, r, px, py } when the sheet leaves its pupils to the code
    this.frames = {};      // name -> { sx, sy, w, h, px, py, empty } (pivot inside the rect, px)
    this.layer = null;     // meta.layer: { order, rotates, tinted } for layered rigs
    this.animations = {};  // name -> { name, frames[], fps, loop, duration }
    this.pxPerUnit = 2;    // sheet pixels per world unit
    this.ready = false;
    this.failed = false;
    this.bytes = 0;
  }

  // Resolves to this atlas once both files are in; rejects (and marks failed) otherwise.
  load() {
    if (this._loading) return this._loading;
    const base = this.jsonUrl.slice(0, this.jsonUrl.lastIndexOf("/") + 1);
    this._loading = fetch(this.jsonUrl)
      .then((res) => { if (!res.ok) throw new Error(`${this.jsonUrl}: ${res.status}`); return res.json(); })
      .then((data) => {
        this.parse(data);
        const pupils = data.meta.pupils;
        return Promise.all([
          LST.SpriteAtlas.loadImage(base + data.meta.image),
          pupils ? LST.SpriteAtlas.loadImage(base + pupils.image) : null,
        ]);
      })
      .then(([img, pupilImg]) => {
        this.image = img;
        if (pupilImg) {
          const p = this.meta.pupils, pv = p.pivot || { x: 0.5, y: 0.5 };
          this.pupil = { image: pupilImg, r: p.r, px: pv.x * pupilImg.width, py: pv.y * pupilImg.height };
        }
        this.ready = true;
        return this;
      })
      .catch((err) => { this.failed = true; throw err; });
    return this._loading;
  }

  parse(data) {
    const meta = data.meta || {};
    if (meta.hitbox && meta.hitbox.pxPerWorldUnit) this.pxPerUnit = meta.hitbox.pxPerWorldUnit;
    this.meta = meta;
    this.layer = meta.layer || null;
    for (const [name, f] of Object.entries(data.frames)) this.frames[name] = LST.SpriteAtlas.parseFrame(name, f);
    for (const [name, a] of Object.entries(data.animations || {})) {
      const frames = a.frames.map((n) => this.frames[n]).filter(Boolean);
      const fps = a.fps || 10;
      this.animations[name] = { name, frames, fps, loop: !!a.loop, duration: frames.length / fps };
    }
  }

  // Pivot of a frame relative to its stored rect, for grid and trimmed frames alike.
  static parseFrame(name, f) {
    const r = f.frame, p = f.pivot || { x: 0.5, y: 0.5 };
    const src = f.sourceSize || { w: r.w, h: r.h };            // untrimmed frame size
    const at = f.spriteSourceSize || { x: 0, y: 0 };           // rect position inside it
    return {
      name, sx: r.x, sy: r.y, w: r.w, h: r.h,
      px: p.x * src.w - at.x, py: p.y * src.h - at.y,
      empty: !!f.trimmed && r.w <= 1 && r.h <= 1,
      eyes: f.eyes || null, offset: f.offset || null,
    };
  }

  // Same row on another sheet with this layout (layered sheets share frame indexes).
  frameAt(anim, i) {
    const a = this.animations[anim];
    return a ? a.frames[Math.min(a.frames.length - 1, i)] : null;
  }

  has(anim) { return !!this.animations[anim]; }
  animation(anim) { return this.animations[anim] || null; }

  // Draw one frame with its pivot on (0,0) of the current transform, in world units.
  drawFrame(ctx, frame) {
    if (frame.empty) return;
    const k = 1 / this.pxPerUnit;
    ctx.drawImage(this.image, frame.sx, frame.sy, frame.w, frame.h, -frame.px * k, -frame.py * k, frame.w * k, frame.h * k);
  }

  static loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => resolve(img));
      img.onerror = () => reject(new Error(`image failed: ${url}`));
      img.src = url;
    });
  }
};
