// Core game state and rules.
// The run flow is a GameStateMachine (src/core/GameStateMachine.js) of GameState objects, one per
// file in src/core/states/: menu, playing, paused, celebrate (wave-clear party), upgrade (ShopState),
// gotcha, gameover (results screen), workshop (card unlocks), victory (finale beaten), cleared.
// game.state is a compat getter/setter over this.flow (game.js:40-41), removed in PR 9.
// The run's systems are one object each (PR 8), and Game's public methods hand off to them:
//   abilitySystem       AbilitySystem (src/abilities/): the active ability
//   shopController      ShopController (src/shop/): the shop and the Head Start draft
//   rewards             RewardRules (src/core/): what a kill pays
//   killFeedback        KillFeedback (src/core/): a kill's coins, sounds, mini-boss hit-stop
//   bossEvents          BossEventRouter (src/bosses/): boss sounds, banners, shake
//   finaleController    FinaleController (src/bosses/): the finale wave, win and World cleared!
//   runRecorder         RunRecorder (src/core/): game over, best wave, Gears payout, results
//   workshopController  WorkshopController (src/core/): world pick, Workshop, menu
//   waveFlow            WaveFlow (src/core/): wave start / end, celebrate, Gotcha, then shop
// Sound and vibration hooks live here (not in World) so the art-style demo stays silent.

LST.Game = class Game extends LST.World {
  constructor(renderer) {
    super(renderer);
    this.events = new LST.EventBus(); // game events; effects and other parts subscribe (src/core/EventBus.js)
    this.flow = new LST.GameStateMachine(); // run-flow state objects (src/core/states/*.js)
    this.abilitySystem = new LST.AbilitySystem(this);
    this.shopController = new LST.ShopController(this);
    this.rewards = new LST.RewardRules(this);
    this.killFeedback = new LST.KillFeedback(this);
    this.bossEvents = new LST.BossEventRouter(this);
    this.finaleController = new LST.FinaleController(this);
    this.runRecorder = new LST.RunRecorder(this);
    this.workshopController = new LST.WorkshopController(this);
    this.waveFlow = new LST.WaveFlow(this);
    this.state = "menu";
    this.speed = 1; // 1x or 2x game speed
    this.useWorld(LST.WorldRegistry.selected()); // sets world, director (wave source) and bestWave
    this.reset();
    this.ui = new LST.UI(this);
    this.flow.current.showScreen(this); // MenuState: the start screen
  }

  get state() { return this.flow ? this.flow.id : undefined; }
  set state(id) { this.flow.set(id); }
  // What render.js and FxDirector may show right now (the current state's SceneFlags).
  get sceneFlags() { return this.flow.current ? this.flow.current.sceneFlags : LST.SceneFlags.NONE; }

  reset() {
    this.resetWorld();
    this.coins = 0;
    this.coinMult = 1;     // Workshop "Greed"
    this.headStart = 0;    // waves skipped this run
    this.draft = null;     // Head Start draft: { hand, of, income[] }
    // Trap cards (src/traps.js)
    this.gearMult = 1;     // Piggy Bank
    this.overclock = null; // { waves, hot }
    this.trapLog = [];     // [{ id, wave, paid }] traps taken this run (for Appraisal L3 returns)
    this.pendingGotchas = []; // undiscovered traps waiting for their "Gotcha!" reveal: [{ id, wave }]
    this.gotchaQueue = [];    // reveals to show now
    this.newCodex = [];       // traps discovered this run
    this.score = 0;
    this.kills = 0;
    this.upgradeLevels = {}; // card id -> times taken this run
    this.shop = null;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1;
    this.newBest = false;
    this.hitStop = 0;       // real seconds of frozen time (boss kill)
    this.slowmo = 0;        // real seconds left of the low-HP slow-down
    this.heartbeat = 0;
    this.celebrateTimer = 0;
    // Run stats for the results screen.
    this.runTime = 0;          // real seconds (waves + shops)
    this.coinsEarned = 0;
    this.bossWavesCleared = 0;
    this.result = null;
    this.resultsDelay = 0;
    // Bosses (Sprint 4)
    this.bossKills = 0;       // mini-bosses killed (skipped Head Start boss waves count)
    this.bossEscapes = 0;     // mini-bosses that got bored and charged
    this.finale = null;       // { intro, mole, won } during the wave-20 finale
    this.endless = false;     // past the finale
    this.worldBonus = null;   // { bonus, first } after beating the finale
    this.victoryTimer = 0;
    this.phaseBanner = null;  // { text, sub, t } canvas banner for finale phases
    const ab = LST.meta ? LST.meta.state.ability : "shockwave";
    this.ability = this.abilitySystem.equip(ab || "shockwave");
    if (this.events) this.events.emit(LST.EVENTS.RUN_START, { game: this });
  }

  // ---------- Worlds (src/worlds) ----------
  // The world a run happens in. Its director answers every "what is wave N?" question.
  useWorld(world) {
    this.world = world;
    this.director = world.createDirector();
    this.bestWave = world.loadBest();
    world.preloadArt();
  }

  // Start screen pick. Returns false for a locked world.
  selectWorld(id) { return this.workshopController.selectWorld(id); }

  // Gears multiplier for this run's payout: Piggy Bank x the world's Gear multiplier.
  runGearMult() { return this.gearMult * this.world.gearMult; }

  // ---------- Flow ----------

  newGame() {
    // A run in a world opened only by the local dev door writes nothing to the save (DevRunGuard).
    this.devRun = LST.DevRunGuard ? LST.DevRunGuard.begin(this) : false;
    if (LST.meta.state.finaleNotice) { LST.meta.state.finaleNotice = false; LST.meta.save(); }
    this.reset();
    LST.audio.startMusic();
    LST.meta.applyToRun(this);
    this.events.emit(LST.EVENTS.RUN_START, { game: this }); // again, now with Workshop upgrades applied
    const skip = LST.meta.headStartWave(this.bestWave, this.world.id);
    if (skip > 0) this.beginHeadStart(skip);
    else this.startNextWave();
  }

  // Waves (WaveFlow)
  startNextWave() { this.waveFlow.startNextWave(); }
  endWave() { this.waveFlow.endWave(); }
  finishCelebration() { this.waveFlow.finishCelebration(); }
  dismissGotcha() { this.waveFlow.dismissGotcha(); }

  // Active ability (AbilitySystem)
  abilityReady() { return this.abilitySystem.ready(); }
  useAbility() { return this.abilitySystem.use(); }

  // Shop and Head Start draft (ShopController)
  beginHeadStart(skip) { this.shopController.beginHeadStart(skip); }
  advanceDraft() { return this.shopController.advanceDraft(); }
  autoDraft() { this.shopController.autoDraft(); }
  openShop() { this.shopController.deal(); }
  shopPrice(kind) { return this.shopController.price(kind); }
  takeCard(index, opts) { return this.shopController.takeCard(index, opts); }
  openMysteryBox() { return this.shopController.openMysteryBox(); }
  returnableTrap() { return this.shopController.returnableTrap(); }
  returnTrap() { return this.shopController.returnTrap(); }
  rerollShop() { return this.shopController.reroll(); }
  repairTower() { return this.shopController.repair(); }
  canLeaveShop() { return this.shopController.canLeave(); }
  leaveShop() { this.shopController.leave(); }

  // End of a run (RunRecorder)
  gameOver() { this.runRecorder.gameOver(); }
  finishRun(opts) { this.runRecorder.finishRun(opts); }
  showResults() { this.runRecorder.showResults(); }
  saveBest(wave) { this.runRecorder.saveBest(wave); }

  // Workshop and menu (WorkshopController)
  openWorkshop(from) { this.workshopController.open(from); }
  closeWorkshop() { this.workshopController.close(); }
  buyUpgrade(id) { return this.workshopController.buyUpgrade(id); }
  pickAbility(id) { return this.workshopController.pickAbility(id); }
  toggleBench(id) { return this.workshopController.toggleBench(id); }
  resetProgress() { this.workshopController.resetProgress(); }
  unlockCard(id) { return this.workshopController.unlockCard(id); }
  toMenu() { this.workshopController.toMenu(); }

  // Finale (FinaleController)
  onFinaleWon(m) { this.finaleController.won(m); }
  continueEndless() { this.finaleController.continueEndless(); }
  retireToWorkshop() { this.finaleController.retireToWorkshop(); }

  // Pause: PlayingState.pause() / PausedState.resume(); other states ignore it.
  togglePause() { this.flow.current.togglePause(this); }

  toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    this.ui.updateHud();
  }

  // ---------- Per-frame update ----------

  update(dt) {
    // Boss-kill hit-stop: freeze everything for a beat (screen still draws).
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.ui.updateHud();
      return;
    }
    this.updateEffects(dt);
    this.flow.update(this, dt); // run clock + the current state's update (src/core/states/*.js)
  }

  step(dt) {
    this.waveIntro = Math.max(0, this.waveIntro - dt);
    this.abilitySystem.tick(dt);
    if (this.phaseBanner && (this.phaseBanner.t -= dt) <= 0) this.phaseBanner = null;
    this.finaleController.tick(dt);
    this.updateSpawning(dt);
    this.tower.update(dt, this);
    this.updateList(this.enemies, dt);
    this.updateList(this.projectiles, dt);
    if (this.hazards.length) this.updateList(this.hazards, dt); // Captain Crabclaw's coconuts
    if (this.hasStatus) LST.StatusEffects.tickAll(this, dt); // burn / venom / freeze (elemental cards)
    this.checkLowHp();
    this.waveFlow.afterStep();
  }

  // First drop below 25% HP: slow-mo, red pulse, alarm. Re-arms once healed above it.
  checkLowHp() {
    const t = this.tower;
    const low = t.hp > 0 && t.hp / t.maxHp < 0.25;
    if (low && !this.lowHpActive) {
      this.lowHpActive = true;
      this.slowmo = 0.9;
      this.vignette = 1;
      this.heartbeat = 1.0;
      LST.audio.play("lowHp");
      LST.haptics.buzz([90, 50, 90]);
    } else if (!low && this.lowHpActive && t.hp / t.maxHp >= 0.25) {
      this.lowHpActive = false;
    }
  }

  updateSpawning(dt) {
    if (this.spawnQueue.length === 0) return;
    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
      this.spawnEnemy(this.spawnQueue.shift(), this.waveMult);
      this.spawnTimer += this.spawnInterval;
    }
  }

  // ---------- Events: World's shared part, then sound + haptics + rules ----------

  onFire(tower) {
    // Higher fire rates get a slightly higher, lighter "pew".
    LST.audio.play("fire", { pitch: Math.min(1.4, 0.9 + tower.fireRate * 0.05) });
  }

  onHit(e, damage, crit) {
    super.onHit(e, damage, crit);
    LST.audio.play("hit", { crit });
    if (crit) this.events.emit(LST.EVENTS.CRIT, { x: e.x, y: e.y, damage });
  }

  onEnemyKilled(e) {
    super.onEnemyKilled(e);
    this.killFeedback.onKill(e);
  }

  onTowerHit(e) {
    super.onTowerHit(e);
    LST.audio.play("towerHit");
    LST.haptics.buzz(e.type === "boss" ? 120 : 30);
  }

  // Bosses (BossEventRouter)
  onSlamWindup(e) { this.bossEvents.windup(e); }
  onBossSlam(e, damage) { super.onBossSlam(e, damage); this.bossEvents.slam(e, damage); }
  onBossCharge(e) { this.bossEvents.charge(e); }
  onMoleRise(m) { this.bossEvents.moleRise(m); }
  onMoleBurrow(m) { this.bossEvents.moleBurrow(m); }
  onMolePhase(m) { this.bossEvents.molePhase(m); }
  onBossPhase(boss, banner) { this.bossEvents.bossPhase(boss, banner); }
  onCrabclawArrive() { this.bossEvents.crabclawArrive(); }
  onCoconutThrow() { this.bossEvents.coconutThrow(); }
  onCoconutHit(c) { this.bossEvents.coconutHit(c); }
  onBossSpawn(e) { super.onBossSpawn(e); this.bossEvents.bossSpawn(e); }
};
