// FxManifest: loads assets/fx/fx.json, the list of image effects, and the art it names. fx.json
// maps effect ids to settings (see SpriteEffect) and sheet ids to art JSON files in the Game Art
// & Motion formats: "strips" (strips{frame, count, fps, loop}, anchor, refBodyR) or the flat FX
// sheet (frameW, frameH, count, fps, loop, anchor [x, y], image; a grid sheet adds rows x cols,
// one strip per row: "r0", "r1", ...). refBodyR defaults to half the frame width. Each strip's PNG is
// loaded with the shared sprite loader. A sheet is handed out only once all its images are in,
// so an effect draws nothing until then (no fallback art). Adding an effect is a new fx.json
// entry plus its art files: no code edit, and sw.js precaches what this file lists.
//
//   draw(id, ctx, at)  draws effect `id` (false if the id is unknown or its art is not in)
//   effect(id)         the SpriteEffect for an id (null if fx.json has no such entry)
//   impact(name)       the ring / bloom effect ids fx.json gives an ImpactSync impact
//   glow(color)        the glow image fx.json names for a preset colour (PR 10b replaces this)
//   triggers()         [id, eventKey] for entries that play on a game event ("on")
LST.FxManifest = class FxManifest {
  constructor(url) {
    this.url = url;
    this.base = url.slice(0, url.lastIndexOf("/") + 1);
    this.data = { sheets: {}, effects: {}, impacts: {}, glowColors: {} };
    this.sheets = {};   // sheet id -> { strips } once every strip image is in
    this.failed = {};
    this.cache = {};    // effect id -> SpriteEffect
    this.enabled = typeof Image !== "undefined" && typeof fetch !== "undefined";
    this._preloaded = null;
  }

  // Strips (images not yet loaded) for one art JSON.
  static build(json) {
    const strips = {};
    if (json.strips) {
      for (const [id, s] of Object.entries(json.strips)) strips[id] = new LST.SheetAnimation(s, json.anchor, json.refBodyR || s.frame.w / 2);
      return { strips };
    }
    const rows = json.rows || 1, cols = json.cols || json.count, a = json.anchor || [json.frameW / 2, json.frameH / 2];
    for (let r = 0; r < rows; r++) {
      const strip = { image: json.image, frame: { w: json.frameW, h: json.frameH }, count: cols, fps: json.fps, loop: !!json.loop, y: r * json.frameH };
      strips[rows > 1 ? "r" + r : "main"] = new LST.SheetAnimation(strip, { x: a[0], y: a[1] }, json.refBodyR || json.frameW / 2);
    }
    return { strips };
  }

  setData(data) {
    this.data = Object.assign({ sheets: {}, effects: {}, impacts: {}, glowColors: {} }, data);
    this.cache = {};
  }

  // Fetch fx.json, then every sheet it lists (safe to call more than once).
  preload() {
    if (!this.enabled) return Promise.resolve(this);
    if (!this._preloaded) {
      this._preloaded = fetch(this.url)
        .then((res) => { if (!res.ok) throw new Error(`${this.url}: ${res.status}`); return res.json(); })
        .then((data) => {
          this.setData(data);
          return Promise.all(Object.entries(this.data.sheets).map(([id, file]) => this.load(id, this.base + file)
            .catch((err) => { this.failed[id] = true; console.warn("[fx]", err.message); return null; })));
        })
        .catch((err) => { console.warn("[fx]", err.message); return null; })
        .then(() => this);
    }
    return this._preloaded;
  }

  load(id, url) {
    const dir = url.slice(0, url.lastIndexOf("/") + 1);
    return fetch(url)
      .then((res) => { if (!res.ok) throw new Error(`${url}: ${res.status}`); return res.json(); })
      .then((json) => {
        const sheet = LST.FxManifest.build(json), strips = Object.values(sheet.strips);
        return Promise.all(strips.map((s) => LST.SpriteAtlas.loadImage(dir + s.src)))
          .then((imgs) => { imgs.forEach((img, i) => { strips[i].image = img; }); this.sheets[id] = sheet; return sheet; });
      });
  }

  // A sheet whose images are already decoded (tests / QA): images = { stripId: image }.
  install(id, json, images) {
    const sheet = LST.FxManifest.build(json);
    for (const [k, s] of Object.entries(sheet.strips)) s.image = images[k] || null;
    if (Object.values(sheet.strips).every((s) => s.image)) this.sheets[id] = sheet; else delete this.sheets[id];
    return sheet;
  }

  sheet(id) { return this.sheets[id] || null; }
  has(id) { return !!this.data.effects[id]; }

  effect(id) {
    if (this.cache[id]) return this.cache[id];
    const entry = this.data.effects[id];
    return entry ? (this.cache[id] = new LST.SpriteEffect(id, entry, this)) : null;
  }

  draw(id, ctx, at) {
    const e = this.effect(id);
    return e ? e.draw(ctx, at) : false;
  }

  impact(name) { return (name && this.data.impacts[name]) || null; }

  glow(color) {
    const id = color && this.data.glowColors[String(color).toLowerCase()];
    const sheet = id ? this.sheet(id) : null, strip = sheet && sheet.strips.main;
    return strip && strip.ready ? strip.image : null;
  }

  triggers() {
    return Object.entries(this.data.effects).filter(([, e]) => e.on).map(([id, e]) => [id, e.on]);
  }

  // Seconds a played effect lives: the entry's life, else its sheet's one-shot length.
  lifeOf(id) {
    const e = this.data.effects[id];
    if (!e) return 0;
    if (e.life) return e.life;
    const sheet = this.sheet(Array.isArray(e.sheet) ? e.sheet[0] : e.sheet);
    const strip = sheet && sheet.strips[Array.isArray(e.strip) ? e.strip[0] : e.strip || "main"];
    return strip && isFinite(strip.duration) ? strip.duration : 1;
  }
};

LST.fxManifest = new LST.FxManifest("assets/fx/fx.json");
