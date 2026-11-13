// Captain Crabclaw: the Beach finale boss (wave 20). A BossScript.
//   approach  walks in from the edge until he's keepRange from the tower (inside its range)
//   fight     sidesteps around the tower and lobs Coconuts on a telegraph (windup, the throw
//             clip), calls crab/gull deckhands every minionEvery seconds
//   phase 2   below 50% HP: angrier and faster (shorter windup, 2-coconut volleys, closer, quicker steps)
//   frenzy    after frenzyAt seconds of fighting: 3-coconut volleys every second-ish, so the
//             fight always ends by about 3 minutes, win or lose
// Shockwave stuns him and cancels a throw in its windup. He never touches the tower.
// Numbers live in LST.CONFIG.crabclaw (below); the look is CrabclawRenderer's job.
LST.CONFIG.crabclaw = {
  name: "CAPTAIN CRABCLAW",
  keepRange: [195, 165],        // per phase: stands this far from the tower
  strafe: [14, 26],             // sidestep speed around the tower (world units / s)
  phaseAt: [0.5],
  phases: [
    { lobEvery: 2.6, windup: 0.75, volley: 1, flight: 1.15, dmg: 1.0, minionEvery: 7.5, minions: ["crab", "crab"] },
    { lobEvery: 2.0, windup: 0.6, volley: 2, flight: 1.0, dmg: 1.1, minionEvery: 6.5, minions: ["crab", "gull", "gull"] },
  ],
  frenzyAt: 110,
  frenzy: { lobEvery: 1.1, windup: 0.5, volley: 3, flight: 0.9, dmg: 1.25 },
  coconutDamage: 9,             // x the wave's damage multiplier x the phase's dmg
  hitRadius: 18,                // a coconut landing this close to the tower's edge hits it
  scatter: 70,                  // extra coconuts in a volley land up to this far from the tower
  banners: { 1: { text: "PHASE 2", sub: "The Captain is MAD!" }, frenzy: { text: "FRENZY!", sub: "Coconuts everywhere!" } },
};
LST.CONFIG.enemies.crabclaw = { hp: 1150, speed: 34, damage: 30, coins: 150, score: 3000, radius: 44, color: "#e8553e", shape: "crabclaw" };

LST.CaptainCrabclaw = class CaptainCrabclaw extends LST.BossScript {
  constructor(mult, x = 0, y = -LST.CONFIG.MAX_SPAWN_DIST) {
    super("crabclaw", x, y, mult, LST.CONFIG.crabclaw);
    this.mode = "approach";       // approach -> fight
    this.lobTimer = 1.4;
    this.minionTimer = 3;
    this.side = 1;                // sidestep direction
    this.sideTimer = 4;
    this.thrown = 0;              // coconuts thrown (tests / sim)
  }

  get P() { return this.frenzy ? Object.assign({}, this.cfg.phases[this.phase], this.cfg.frenzy) : this.cfg.phases[this.phase]; }
  get keepRange() { return this.cfg.keepRange[Math.min(this.phase, this.cfg.keepRange.length - 1)]; }
  get angry() { return this.phase > 0 || this.frenzy; }

  act(dt, game) {
    const t = game.tower, dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy) || 1;
    const slow = 1 - this.slowAmount;
    if (this.mode === "approach") {
      if (d > this.keepRange) {
        this.x += (dx / d) * this.speed * slow * dt;
        this.y += (dy / d) * this.speed * slow * dt;
        return;
      }
      this.mode = "fight";
      this.fighting = true;
    }
    // Hold the range (phase 2 steps in closer) and sidestep around the tower.
    const want = this.keepRange;
    if (Math.abs(d - want) > 2) {
      const k = Math.sign(d - want) * Math.min(Math.abs(d - want), this.speed * slow * dt);
      this.x += (dx / d) * k; this.y += (dy / d) * k;
    }
    const s = this.cfg.strafe[Math.min(this.phase, this.cfg.strafe.length - 1)] * slow * this.side * dt;
    this.x += (-dy / d) * s; this.y += (dx / d) * s;
    this.sideTimer -= dt;
    if (this.sideTimer <= 0) { this.side = -this.side; this.sideTimer = 3 + 2 * Math.random(); }
    if (game.renderer && game.renderer.halfH) {
      const maxY = Math.max(60, game.renderer.halfH - 110); // keep clear of the HUD on short screens
      if (Math.abs(this.y) > maxY) this.y = Math.sign(this.y) * maxY;
    }

    const P = this.P;
    if (this.windup > 0) {
      this.windup -= dt;
      if (this.windup <= 0) this.throwVolley(game, P);
    } else {
      this.lobTimer -= dt;
      if (this.lobTimer <= 0) {
        this.windup = this.windupMax = P.windup;
        this.lobTimer = P.lobEvery;
        if (game.onSlamWindup) game.onSlamWindup(this);
      }
    }
    this.minionTimer -= dt;
    if (this.minionTimer <= 0) {
      this.minionTimer = P.minionEvery || 7;
      if (game.spawnMinions && P.minions) game.spawnMinions(this, P.minions);
    }
  }

  throwVolley(game, P) {
    const t = game.tower, C = this.cfg;
    this.slamAnim = 1;
    for (let i = 0; i < P.volley; i++) {
      let tx = t.x, ty = t.y;
      if (i > 0) { const a = Math.random() * Math.PI * 2, r = C.scatter * Math.sqrt(Math.random()); tx += Math.cos(a) * r; ty += Math.sin(a) * r; }
      const c = new LST.Coconut({
        x: this.x, y: this.y - this.radius * 0.6, tx, ty, flight: P.flight + i * 0.12,
        damage: C.coconutDamage * this.dmgMult * P.dmg, hitRadius: C.hitRadius, boss: this,
      });
      (game.hazards || (game.hazards = [])).push(c);
      this.thrown += 1;
    }
    if (game.onCoconutThrow) game.onCoconutThrow(this, P.volley);
  }

  // Shockwave: a short shove and a stun; cancels a throw that's winding up.
  knock(dist, stun) {
    super.knock(dist * 0.5, stun);
    if (this.windup <= 0) this.lobTimer = Math.max(this.lobTimer, 1);
  }

  onPhase() { this.lobTimer = Math.min(this.lobTimer, 1.2); }
  onFrenzy() { this.lobTimer = Math.min(this.lobTimer, 0.6); }
};
