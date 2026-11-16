// EffectPlayer: plays any fx.json effect by id at a point, for its life, with no code of its own
// per effect. FxDirector owns one, updates it every frame and draws it in the world FX layer.
// fx.json entries with "on": "<EVENTS key>" play on that game event at the event's x, y
// (wired by FxDirector once the manifest has loaded), so a new effect can appear in the game
// with only a data entry and its art.
LST.EffectPlayer = class EffectPlayer {
  constructor(manifest, cap = 32) {
    this.manifest = manifest;
    this.cap = cap;
    this.list = [];
  }

  play(id, x, y, opts = {}) {
    if (!this.manifest.has(id)) return null;
    if (this.list.length >= this.cap) this.list.shift();
    const fx = { id, x, y, t: 0, life: opts.life || this.manifest.lifeOf(id), base: opts.base == null ? 1 : opts.base, variant: opts.variant | 0 };
    this.list.push(fx);
    return fx;
  }

  update(dt) {
    if (!this.list.length) return;
    for (const f of this.list) f.t += dt;
    this.list = this.list.filter((f) => f.t < f.life);
  }

  draw(ctx, low) {
    for (const f of this.list) this.manifest.draw(f.id, ctx, { x: f.x, y: f.y, base: f.base, t: f.t, p: f.t / f.life, variant: f.variant, low });
  }

  clear() { this.list = []; }
};
