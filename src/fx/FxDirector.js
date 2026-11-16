// FxDirector: the one place that turns game events into effects. It owns the parts:
//
//   FxQuality      reduced motion / low-quality fallback        (FxQuality.js)
//   ParticlePool   world (lawn) pool + screen (above menus) pool (ParticlePool.js)
//   TowerAura      soft motes from the tower, scaled by power    (TowerAura.js)
//   FxCamera       shake + impact pulses                         (FxCamera.js)
//   ImpactSync     bass thump + burst + pulse on the same frame  (ImpactSync.js)
//   FxRenderer     theme-aware drawing                           (FxRenderer.js)
//   FxManifest     assets/fx/fx.json: image effects by id + art  (FxManifest.js, SpriteEffect.js)
//   EffectPlayer   plays any fx.json effect by id at a point     (EffectPlayer.js)
//   FxOverlay      click-through canvas over the menus           (FxOverlay.js)
//   ScreenAnchors  where a card / Workshop button is on screen   (ScreenAnchors.js)
//   FrameStats     frame + draw time log                         (FrameStats.js)
//
// The game only emits events on its EventBus; the director subscribes. The Renderer calls
// the draw hooks below at fixed points in its layer order; main.js calls update() and
// endFrame() once per animation frame.

LST.FxDirector = class FxDirector {
  static get ARC_CAP() { return 8; }
  constructor({ bus, audio, settings, win }) {
    const doc = win.document;
    this.win = win;
    this.frame = 0;      // animation frame counter (the clock ImpactSync stamps)
    this.time = 0;       // seconds
    this.rng = new LST.FxRandom(0x5eed1234);
    this.quality = new LST.FxQuality(LST.FX_QUALITY, settings, win);
    this.stats = new LST.FrameStats(600);
    this.pools = { world: new LST.ParticlePool(LST.FX_QUALITY.capWorld), screen: new LST.ParticlePool(LST.FX_QUALITY.capScreen) };
    this.camera = new LST.FxCamera(4);
    this.renderer = new LST.FxRenderer(doc, LST.fxManifest);
    this.aura = new LST.TowerAura(() => this.effects.preset("aura"));
    this.player = new LST.EffectPlayer(this.renderer.effects);
    this.looks = LST.LookLayer ? new LST.LookLayer(bus) : null; // status looks on enemies (src/elements/looks)
    this.overlay = new LST.FxOverlay(doc);
    this.anchors = new LST.ScreenAnchors(doc);
    this.impacts = new LST.ImpactSync({
      audio, camera: this.camera, pools: this.pools, rng: this.rng, clock: this, quality: this.quality, effects: this.effects,
    });
    this.drawScreenLayer = (ctx) => { // made once, reused by FxOverlay every frame
      this.renderer.drawPulses(ctx, this.camera, "screen", this.frame, 1, this.quality.low);
      this.renderer.drawPool(ctx, this.pools.screen, 1, this.quality.low);
    };
    this.arcs = [];      // Chain Spark bolts: short-lived, max ARC_CAP, only exist after a hit
    this.offs = [];
    if (bus) this.subscribe(bus);
    // The effect manifest and its art load in the background; effects draw nothing until then.
    // Then entries with "on" start playing on their game event (data only, no code per effect).
    if (this.effects) this.effects.preload().then(() => { if (bus && !this.disposed) this.subscribeTriggers(bus); });
  }

  get effects() { return this.renderer.effects; }

  get reducedMotion() { return this.quality.reduced; }
  get shake() { return this.quality.reduced ? 0 : this.camera.shake; }

  subscribe(bus) {
    const E = LST.EVENTS;
    const on = (type, fn) => this.offs.push(bus.on(type, fn));
    on(E.RUN_START, (e) => this.onRunStart(e.game));
    on(E.BOSS_KILLED, (e) => this.fireRoute("bossKilled", e.x, e.y, { ringMul: Math.max(1, e.radius / 40) }));
    on(E.FINALE_WON, (e) => this.fireRoute("finaleWon", e.x, e.y));
    on(E.CRIT, (e) => this.critGlow(e.x, e.y));
    on(E.CARD_TAKEN, (e) => this.onCardTaken(e));
    on(E.WAVE_START, () => this.onWaveStart());
    on(E.WORKSHOP_UPGRADE, (e) => this.screenImpact("workshopUpgrade", e.id));
    on(E.UNLOCK, (e) => this.screenImpact("unlock", e.id));
    if (E.ELEMENT_HIT) on(E.ELEMENT_HIT, (e) => this.onElementHit(e));
  }

  // fx.json entries with "on": "<EVENTS key>" play at the event's x, y.
  subscribeTriggers(bus) {
    for (const [id, key] of this.effects.triggers()) {
      const type = LST.EVENTS[key];
      if (type) this.offs.push(bus.on(type, (e) => { if (e && typeof e.x === "number") this.play(id, e.x, e.y); }));
    }
  }

  // Play any fx.json effect by id at a world point (QA / console: LST.fxDirector.play(id, x, y)).
  play(id, x, y, opts) { return this.player.play(id, x, y, opts); }

  // Event -> impact routing is data (LST.FX_ROUTES); a null route plays nothing.
  route(key) { return LST.FX_ROUTES ? LST.FX_ROUTES[key] || null : null; }
  fireRoute(key, x, y, opts) { const name = this.route(key); return name ? this.impacts.fire(name, x, y, opts) : null; }

  dispose() { for (const off of this.offs) off(); this.offs = []; this.disposed = true; }

  // ---------- Event handlers ----------
  onRunStart(game) {
    this.scene = game;
    this.aura.setMetaLevels(LST.meta && LST.meta.state ? LST.meta.state.upgrades : null);
    this.aura.setRunLevels(game.upgradeLevels || {});
    this.aura.resetBaseline();
    this.pools.world.clear();
    this.camera.clear();
    this.player.clear();
  }

  onCardTaken(e) {
    this.aura.setRunLevels(e.levels);
    if (e.index < 0) return; // auto-draft: the aura catches up, the next wave plays the tier-up
    const name = this.route(e.epic ? "cardTakenEpic" : "cardTaken");
    if (!name) return;
    // The impact's own particle variants (fx.json); card colours are hex, and particles name variants.
    const at = this.anchors.card(e.index) || this.anchors.screenCenter();
    this.impacts.fire(name, at.x, at.y);
  }

  onWaveStart() {
    // The shop hid the tower; the new power shows as the wave starts.
    if (this.aura.takeTierUp() && this.scene) {
      const t = this.scene.tower;
      this.fireRoute("towerTierUp", t.x, t.y);
    }
  }

  screenImpact(key, id) {
    const name = this.route(key);
    const at = name ? this.anchors.workshop(id) : null;
    if (at) this.impacts.fire(name, at.x, at.y);
  }

  // Elemental hit: colored burst + its sound on the same frame (ImpactSync), plus the bolt for
  // Chain Spark. Freeze/Shatter only fire on the hit that froze/shattered, so nothing loops.
  onElementHit(e) {
    if (e.element === "frostbite" && !e.freeze) return;
    this.fireRoute("element:" + e.element, e.x, e.y, { ringMul: Math.max(0.8, Math.min(2.2, (e.radius || 20) / 22)) });
    if (e.points && e.points.length > 1) {
      if (this.arcs.length >= LST.FxDirector.ARC_CAP) this.arcs.shift();
      const pts = e.points.map((p) => p.slice()), jag = [];
      for (let i = 1; i < pts.length; i++) for (let k = 1; k < 4; k++) jag.push((this.rng.next ? this.rng.next() : Math.random()) - 0.5);
      this.arcs.push({ pts, jag, t: 0, life: 0.28, color: e.color });
    }
  }

  critGlow(x, y) {
    const pool = this.pools.world, G = this.effects.preset("glow");
    if (!G) return;
    const i = pool.spawn(false);
    if (i >= 0) pool.set(i, x, y, 0, 0, G.critLife, G.critRadius, LST.FX_SHAPE.GLOW, pool.colorId(G.critVariant), 0, 0, 0, 0);
  }

  // ---------- Per frame ----------
  update(dt, scene, frameMs) {
    this.scene = scene;
    if (this.frozen) return; // QA: hold effects still for a screenshot
    this.time += dt;
    const q = this.quality;
    q.sample(frameMs, dt);
    const s = q.scale;
    this.pools.world.setLimit(LST.FX_QUALITY.capWorld * Math.max(s, 0.25));
    this.pools.screen.setLimit(LST.FX_QUALITY.capScreen * Math.max(s, 0.35));
    if (scene.sceneFlags.towerAura) this.aura.update(dt, scene.tower, this.pools.world, this.rng, s);
    this.pools.world.update(dt);
    this.pools.screen.update(dt);
    this.camera.update(dt);
    this.player.update(dt);
    if (this.arcs.length) { for (const a of this.arcs) a.t += dt; this.arcs = this.arcs.filter((a) => a.t < a.life); }
  }

  // Renderer hooks (world transform active unless noted).
  drawUnder(ctx, scene, r) {
    this.renderer.setTheme(r.theme.id);
    this.renderer.drawn = 0;
    this.renderer.drawUnder(ctx, scene.tower, this.aura, r.time);
  }
  drawProjectiles(ctx, scene) { this.renderer.drawProjectiles(ctx, scene.projectiles, this.quality.low); }
  drawWorld(ctx, scene) {
    // Status visuals (burn / frozen / venom / spark) are the image looks only (src/elements/looks).
    if (this.looks) this.looks.render(ctx, scene, this.time, this.quality.reduced);
    if (this.arcs.length) this.renderer.drawArcs(ctx, this.arcs, this.quality.low);
    this.renderer.drawPulses(ctx, this.camera, "world", this.frame, 1, this.quality.low);
    this.renderer.drawPool(ctx, this.pools.world, 1, this.quality.low);
    this.player.draw(ctx, this.quality.low);
  }
  drawTextGlows(ctx, scene) { this.renderer.drawTextGlows(ctx, scene.texts); }
  drawScreen(ctx, r) { if (!this.quality.low) this.renderer.drawFlashes(ctx, this.camera, r); } // screen px, inside the game canvas

  // After the game canvas is drawn: the over-the-menus layer, stats, frame counter.
  endFrame(frameMs, drawMs) {
    const active = this.pools.screen.count > 0 || this.camera.anyActive("screen");
    this.overlay.render(active, this.drawScreenLayer);
    this.stats.record(frameMs, drawMs);
    this.frame++;
  }

  // QA / console: LST.fxDirector.report()
  report() {
    return {
      quality: { low: this.quality.low, reduced: this.quality.reduced, scale: +this.quality.scale.toFixed(2), emaFrameMs: +this.quality.ema.toFixed(2), switches: this.quality.switches },
      particles: { world: this.pools.world.count, screen: this.pools.screen.count, peakWorld: this.pools.world.peak, peakScreen: this.pools.screen.peak,
        caps: [this.pools.world.capacity, this.pools.screen.capacity], dropped: this.pools.world.dropped + this.pools.screen.dropped },
      aura: { power: +this.aura.power.toFixed(2), tier: this.aura.tier, intensity: +this.aura.intensity.toFixed(2) },
      stats: this.stats.summary(),
      sync: this.impacts.syncReport(),
    };
  }
};
