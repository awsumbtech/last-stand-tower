// FxDirector: the one place that turns game events into effects. It owns the parts:
//
//   FxQuality      reduced motion / low-quality fallback        (FxQuality.js)
//   ParticlePool   world (lawn) pool + screen (above menus) pool (ParticlePool.js)
//   TowerAura      soft motes from the tower, scaled by power    (TowerAura.js)
//   FxCamera       shake + impact pulses                         (FxCamera.js)
//   ImpactSync     bass thump + burst + pulse on the same frame  (ImpactSync.js)
//   FxRenderer     theme-aware drawing                           (FxRenderer.js)
//   FxOverlay      click-through canvas over the menus           (FxOverlay.js)
//   ScreenAnchors  where a card / Workshop button is on screen   (ScreenAnchors.js)
//   FrameStats     frame + draw time log                         (FrameStats.js)
//
// The game only emits events on its EventBus; the director subscribes. The Renderer calls
// the draw hooks below at fixed points in its layer order; main.js calls update() and
// endFrame() once per animation frame.

LST.FxDirector = class FxDirector {
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
    this.aura = new LST.TowerAura(LST.FX_PRESETS.aura);
    this.renderer = new LST.FxRenderer(doc);
    this.overlay = new LST.FxOverlay(doc);
    this.anchors = new LST.ScreenAnchors(doc);
    this.impacts = new LST.ImpactSync({
      audio, camera: this.camera, pools: this.pools, rng: this.rng, clock: this, quality: this.quality,
      presets: LST.FX_PRESETS, impacts: LST.FX_IMPACTS,
    });
    this.drawScreenLayer = (ctx) => { // made once, reused by FxOverlay every frame
      this.renderer.drawPulses(ctx, this.camera, "screen", this.frame, 1);
      this.renderer.drawPool(ctx, this.pools.screen, 1);
    };
    this.offs = [];
    if (bus) this.subscribe(bus);
  }

  get reducedMotion() { return this.quality.reduced; }
  get shake() { return this.quality.reduced ? 0 : this.camera.shake; }

  subscribe(bus) {
    const E = LST.EVENTS;
    const on = (type, fn) => this.offs.push(bus.on(type, fn));
    on(E.RUN_START, (e) => this.onRunStart(e.game));
    on(E.BOSS_KILLED, (e) => this.impacts.fire("bossKill", e.x, e.y, { ringMul: Math.max(1, e.radius / 40) }));
    on(E.FINALE_WON, (e) => this.impacts.fire("finaleWon", e.x, e.y));
    on(E.CRIT, (e) => this.critGlow(e.x, e.y));
    on(E.CARD_TAKEN, (e) => this.onCardTaken(e));
    on(E.WAVE_START, () => this.onWaveStart());
    on(E.WORKSHOP_UPGRADE, (e) => this.screenImpact("workshop", this.anchors.workshop(e.id)));
    on(E.UNLOCK, (e) => this.screenImpact("unlock", this.anchors.workshop(e.id)));
  }

  dispose() { for (const off of this.offs) off(); this.offs = []; }

  // ---------- Event handlers ----------
  onRunStart(game) {
    this.scene = game;
    this.aura.setMetaLevels(LST.meta && LST.meta.state ? LST.meta.state.upgrades : null);
    this.aura.setRunLevels(game.upgradeLevels || {});
    this.aura.resetBaseline();
    this.pools.world.clear();
    this.camera.clear();
  }

  onCardTaken(e) {
    this.aura.setRunLevels(e.levels);
    if (e.index < 0) return; // auto-draft: the aura catches up, the next wave plays the tier-up
    const card = e.card;
    const at = this.anchors.card(e.index) || this.anchors.screenCenter();
    const colors = card && card.color ? ["#ffffff", card.color, "#fff3a0"] : null;
    this.impacts.fire(e.epic ? "cardPickEpic" : "cardPick", at.x, at.y, { colors, tint: "#fff3a0" });
  }

  onWaveStart() {
    // The shop hid the tower; the new power shows as the wave starts.
    if (this.aura.takeTierUp() && this.scene) {
      const t = this.scene.tower;
      this.impacts.fire("tierUp", t.x, t.y);
    }
  }

  screenImpact(name, at) { if (at) this.impacts.fire(name, at.x, at.y); }

  critGlow(x, y) {
    const pool = this.pools.world, G = LST.FX_PRESETS.glow;
    const i = pool.spawn(false);
    if (i >= 0) pool.set(i, x, y, 0, 0, G.critLife, G.critRadius, LST.FX_SHAPE.GLOW, pool.colorId(G.critColor), 0, 0, 0, 0);
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
    const st = scene.state;
    if (st === "playing" || st === "celebrate" || st === "victory") this.aura.update(dt, scene.tower, this.pools.world, this.rng, s);
    this.pools.world.update(dt);
    this.pools.screen.update(dt);
    this.camera.update(dt);
  }

  // Renderer hooks (world transform active unless noted).
  drawUnder(ctx, scene, r) {
    this.renderer.setTheme(r.theme.id);
    this.renderer.drawn = 0;
    this.renderer.drawUnder(ctx, scene.tower, this.aura, r.time);
  }
  drawProjectiles(ctx, scene) { this.renderer.drawProjectiles(ctx, scene.projectiles, this.quality.low); }
  drawWorld(ctx) {
    this.renderer.drawPulses(ctx, this.camera, "world", this.frame, 1);
    this.renderer.drawPool(ctx, this.pools.world, 1);
  }
  drawTextGlows(ctx, scene) { this.renderer.drawTextGlows(ctx, scene.texts); }
  drawScreen(ctx, r) { this.renderer.drawFlashes(ctx, this.camera, r); } // screen px, inside the game canvas

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
