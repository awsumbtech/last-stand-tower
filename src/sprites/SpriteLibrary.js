// SpriteLibrary: the one place that knows which atlases exist and where they live.
// Preloads them in the background; get() only hands out atlases that finished loading,
// so callers fall back to vector drawing until then (or forever if a file is missing).
// `?sprites=0` in the URL turns sprites off (vector art), handy for side-by-side checks.
LST.SpriteLibrary = class SpriteLibrary {
  constructor(manifest) {
    this.atlases = {};
    for (const [name, url] of Object.entries(manifest)) this.atlases[name] = new LST.SpriteAtlas(name, url);
    let off = false;
    try { off = typeof location !== "undefined" && new URLSearchParams(location.search).get("sprites") === "0"; } catch (e) { /* no location */ }
    this.enabled = !off && typeof Image !== "undefined" && typeof fetch !== "undefined";
    this._preloaded = null;
  }

  // Start loading everything (safe to call more than once). Resolves when all settle.
  preload() {
    if (!this.enabled) return Promise.resolve([]);
    if (!this._preloaded) {
      this._preloaded = Promise.all(Object.values(this.atlases).map((a) =>
        a.load().catch((err) => { console.warn("[sprites]", err.message); return null; })));
    }
    return this._preloaded;
  }

  get(name) {
    const a = this.enabled && this.atlases[name];
    return a && a.ready ? a : null;
  }

  // Every URL the PWA should precache (kept next to the manifest so they can't drift).
  static urls(manifest) {
    const out = [];
    for (const url of Object.values(manifest)) out.push(url, url.replace(/\.json$/, ".png"));
    return out;
  }
};

LST.SPRITE_MANIFEST = {
  basic: "assets/sprites/enemies/basic/basic.json",
  fast: "assets/sprites/enemies/fast/fast.json",
  tank: "assets/sprites/enemies/tank/tank.json",
  big_red: "assets/sprites/enemies/big_red/big_red.json",
  king_mole: "assets/sprites/enemies/king_mole/king_mole.json",
  king_mole_angry: "assets/sprites/enemies/king_mole/king_mole_angry.json",
};
LST.sprites = new LST.SpriteLibrary(LST.SPRITE_MANIFEST);
