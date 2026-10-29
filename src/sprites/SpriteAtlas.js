// SpriteAtlas: one sprite sheet (PNG) plus its hash-style JSON atlas.
// Knows frames, animations and the atlas's art scale; knows nothing about enemies.
//
// JSON shape (Game Art & Motion generator / TexturePacker "hash"):
//   frames{name:{frame{x,y,w,h}, pivot{x,y} (0..1), duration}}
//   animations{name:{frames[], fps, loop}}
//   meta{image, hitbox{pxPerWorldUnit}, pupils{image, r}?, layer?, ...}
//   frames[].eyes [{x,y,pupilR,maxOffset}] and frames[].offset {x,y} are optional extras
//   (pupil anchors and the walk bob for layered sheets), all in frame px from the pivot.
LST.SpriteAtlas = class SpriteAtlas {
  constructor(name, jsonUrl) {
    this.name = name;
    this.jsonUrl = jsonUrl;
    this.image = null;
    this.pupil = null;     // { image, r, px, py } when the sheet leaves its pupils to the code
    this.frames = {};      // name -> { sx, sy, w, h, px, py } (pivot in sheet px)
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
    for (const [name, f] of Object.entries(data.frames)) {
      const r = f.frame, p = f.pivot || { x: 0.5, y: 0.5 };
      this.frames[name] = { name, sx: r.x, sy: r.y, w: r.w, h: r.h, px: p.x * r.w, py: p.y * r.h,
        eyes: f.eyes || null, offset: f.offset || null };
    }
    for (const [name, a] of Object.entries(data.animations || {})) {
      const frames = a.frames.map((n) => this.frames[n]).filter(Boolean);
      const fps = a.fps || 10;
      this.animations[name] = { name, frames, fps, loop: !!a.loop, duration: frames.length / fps };
    }
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
