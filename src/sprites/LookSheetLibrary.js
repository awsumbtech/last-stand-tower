// LookSheetLibrary: the one place that knows which status-look sheets exist and where they live
// (assets/sprites/looks/<Look>/). Loads each sheet's JSON, makes a SheetAnimation per strip and
// loads its PNG with the shared sprite image loader (LST.SpriteAtlas.loadImage). get() only hands
// out a sheet once every strip image is in, so a look draws nothing until then (no fallback art).
LST.LookSheetLibrary = class LookSheetLibrary {
  constructor(manifest) {
    this.manifest = manifest;          // name -> json url
    this.sheets = {};                  // name -> { strips: { main, snap? } } once fully loaded
    this.failed = {};
    this.enabled = typeof Image !== "undefined" && typeof fetch !== "undefined";
    this._preloaded = null;
  }

  // Strips (not yet loaded) for one sheet's JSON.
  static build(data) {
    const strips = {};
    for (const [id, s] of Object.entries(data.strips || {})) strips[id] = new LST.SheetAnimation(s, data.anchor, data.refBodyR || 88);
    return { strips };
  }

  // Start loading everything (safe to call more than once). Resolves when all settle.
  preload() {
    if (!this.enabled) return Promise.resolve([]);
    if (!this._preloaded) {
      this._preloaded = Promise.all(Object.entries(this.manifest).map(([name, url]) => this.load(name, url)
        .catch((err) => { this.failed[name] = true; console.warn("[looks]", err.message); return null; })));
    }
    return this._preloaded;
  }

  load(name, url) {
    const base = url.slice(0, url.lastIndexOf("/") + 1);
    return fetch(url)
      .then((res) => { if (!res.ok) throw new Error(`${url}: ${res.status}`); return res.json(); })
      .then((data) => {
        const sheet = LST.LookSheetLibrary.build(data), strips = Object.values(sheet.strips);
        return Promise.all(strips.map((s) => LST.SpriteAtlas.loadImage(base + s.src)))
          .then((imgs) => { imgs.forEach((img, i) => { strips[i].image = img; }); this.sheets[name] = sheet; return sheet; });
      });
  }

  // A sheet whose images are already decoded (tests / QA): images = { stripId: image }.
  install(name, data, images) {
    const sheet = LST.LookSheetLibrary.build(data);
    for (const [id, s] of Object.entries(sheet.strips)) s.image = images[id] || null;
    if (Object.values(sheet.strips).every((s) => s.image)) this.sheets[name] = sheet; else delete this.sheets[name];
    return sheet;
  }

  get(name) { return this.sheets[name] || null; }
};

LST.LOOK_SHEETS = {
  BurnFlames: "assets/sprites/looks/BurnFlames/BurnFlames_a.json",
  IceCrust: "assets/sprites/looks/IceCrust/IceCrust_a.json",
  VenomDrips: "assets/sprites/looks/VenomDrips/VenomDrips_a.json",
  SparkCrackle: "assets/sprites/looks/SparkCrackle/SparkCrackle_c.json",
};
LST.lookSheets = new LST.LookSheetLibrary(LST.LOOK_SHEETS);
