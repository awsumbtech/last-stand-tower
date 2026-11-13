// BossScript: base for a scripted world boss (PROGRESSION section 4, BossController).
// Owns the parts every scripted boss shares and nothing about any one boss:
//   isBoss = true (boss bar, half slow, Shockwave's boss knock, focus fire)
//   phases by HP fraction: phaseAt = [0.5] means phase 1 starts below 50% HP. On a change
//     it calls this.onPhase(game) and game.onBossPhase(this, banner) when the game has one.
//   frenzy: after cfg.frenzyAt seconds of fighting, onFrenzy(game) once, so a fight always ends.
//   hudName / hudPhase: what the boss bar shows.
// Subclasses (CaptainCrabclaw) implement act(dt, game) and their own telegraphs.
LST.BossScript = class BossScript extends LST.Enemy {
  constructor(type, x, y, mult, cfg) {
    super(type, x, y, mult);
    this.cfg = cfg;
    this.phase = 0;
    this.fightTime = 0;   // seconds since it arrived at its fighting spot
    this.fighting = false;
    this.frenzy = false;
  }

  get isBoss() { return true; }
  get hudName() { return this.cfg.name || this.type.toUpperCase(); }
  get hudPhase() { return this.frenzy ? "FRENZY!" : `Phase ${this.phase + 1} / ${(this.cfg.phaseAt || []).length + 1}`; }

  update(dt, game) {
    this.age += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.slamAnim = Math.max(0, this.slamAnim - dt * 3);
    if (this.slowTimer > 0) { this.slowTimer -= dt; if (this.slowTimer <= 0) this.slowAmount = 0; }
    if (this.fighting) {
      this.fightTime += dt;
      if (!this.frenzy && this.cfg.frenzyAt && this.fightTime >= this.cfg.frenzyAt) {
        this.frenzy = true;
        this.onFrenzy(game);
        if (game.onBossPhase) game.onBossPhase(this, this.cfg.banners && this.cfg.banners.frenzy);
      }
    }
    if (this.stun > 0) { this.stun -= dt; return; }
    this.act(dt, game);
  }

  act() {}
  onPhase() {}
  onFrenzy() {}

  phaseFor(f) {
    const at = this.cfg.phaseAt || [];
    let p = 0;
    for (const t of at) if (f < t) p += 1;
    return p;
  }

  takeDamage(amount, game) {
    if (this.dead || this.untargetable) return;
    super.takeDamage(amount, game);
    if (this.dead) return;
    const next = this.phaseFor(this.hp / this.maxHp);
    if (next > this.phase) {
      this.phase = next;
      this.onPhase(game);
      if (game && game.onBossPhase) game.onBossPhase(this, this.cfg.banners && this.cfg.banners[next]);
    }
  }
};
