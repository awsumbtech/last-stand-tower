// Core game state and rules.
// States: "menu" | "playing" | "paused" | "celebrate" (wave-clear party) | "upgrade" | "gameover" (results screen)
//         | "victory" (finale beaten: party) | "cleared" (World cleared! screen).
// "workshop" is the between-runs card unlock screen.
// Sound and vibration hooks live here (not in World) so the art-style demo stays silent.

LST.Game = class Game extends LST.World {
  constructor(renderer) {
    super(renderer);
    this.state = "menu";
    this.speed = 1; // 1x or 2x game speed
    this.bestWave = LST.utils.storage.get("lst.bestWave", 0);
    this.reset();
    this.ui = new LST.UI(this);
    this.ui.show("start");
  }

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
    this.ability = { id: ab || "shockwave", cd: 0, max: LST.CONFIG.abilities[ab || "shockwave"].cooldown, flash: 0 };
  }

  // ---------- Flow ----------

  newGame() {
    if (LST.meta.state.finaleNotice) { LST.meta.state.finaleNotice = false; LST.meta.save(); }
    this.reset();
    LST.audio.startMusic();
    LST.meta.applyToRun(this);
    const skip = LST.meta.headStartWave(this.bestWave);
    if (skip > 0) this.beginHeadStart(skip);
    else this.startNextWave();
  }

  // Head Start: skip the first `skip` waves. Their shops are replayed as a quick draft:
  // hand k pays wave k's coins (kills + clear bonus), deals a free pick, and sells
  // extras at wave-k prices, exactly like playing them. "Auto" finishes the draft for you.
  beginHeadStart(skip) {
    const income = [];
    for (let w = 1; w <= skip; w++) {
      const m = LST.waves.multipliers(w);
      let coins = LST.waves.clearBonus(w);
      for (const ty of LST.waves.build(w).queue) coins += Math.max(1, Math.round(LST.CONFIG.enemies[ty].coins * m.coins * this.coinMult));
      if (LST.waves.isBossWave(w)) coins += Math.round(LST.CONFIG.bosses.killCoins * this.coinMult);
      income.push(coins);
    }
    this.headStart = skip;
    this.bossWavesCleared = Math.floor(skip / LST.CONFIG.waves.bossEvery);
    for (let w = 1; w <= skip; w++) if (LST.waves.isBossWave(w)) this.bossKills += 1;
    if (skip >= LST.CONFIG.finale.wave) this.endless = true;
    this.draft = { hand: 0, of: skip, income };
    this.state = "upgrade";
    this.advanceDraft();
    this.ui.show("upgrade");
    LST.audio.play("waveClear");
  }

  // Next draft hand. Returns false when the draft is over.
  advanceDraft() {
    const d = this.draft;
    if (!d || d.hand >= d.of) return false;
    d.hand += 1;
    this.wave = d.hand;
    this.coins += d.income[d.hand - 1];
    this.coinsEarned += d.income[d.hand - 1];
    this.openShop();
    return true;
  }

  // Auto-draft: free pick (attack cards and fresh cards first) plus up to two extras per
  // hand while coins allow, for every hand left. Stops on the last hand so you shop it yourself.
  autoDraft() {
    if (this.state !== "upgrade" || !this.draft) return;
    const lvl = (id) => this.upgradeLevels[id] || 0;
    const takeBest = () => {
      // (skips traps you already know; unknown ones can still fool it, same as you)
      const open = this.shop.cards.map((c, i) => ({ c, i })).filter((o) => !o.c.taken && LST.shopRules.available(o.c.card, this.upgradeLevels) && !(o.c.card.trap && LST.meta.knowsTrap(o.c.card.id)));
      if (!open.length) return false;
      open.sort((a, b) => (b.c.card.offense ? 1 : 0) - (a.c.card.offense ? 1 : 0) || lvl(a.c.card.id) - lvl(b.c.card.id));
      const pick = Math.random() < 0.7 ? open[0] : open[Math.floor(Math.random() * open.length)];
      return this.takeCard(pick.i, { quiet: true });
    };
    while (this.draft.hand < this.draft.of) {
      if (!this.shop.picked) takeBest();
      for (let k = 0; k < 2 && this.coins >= this.shopPrice("extraCard"); k++) if (!takeBest()) break;
      this.advanceDraft();
    }
    LST.audio.play("epic");
    this.ui.renderShop({ deal: true });
    this.ui.updateHud();
  }

  startNextWave() {
    this.wave += 1;
    const { queue, interval } = LST.waves.build(this.wave);
    this.spawnQueue = queue;
    this.spawnInterval = interval;
    this.spawnTimer = 0.3; // short breather before the first spawn
    this.waveMult = LST.waves.multipliers(this.wave);
    this.waveIntro = 1.6;
    this.projectiles = [];
    this.state = "playing";
    this.ui.show(null);
    if (LST.waves.isFinale(this.wave)) {
      // Boss-only finale: the lawn goes quiet, then King Mole digs in.
      this.finale = { intro: LST.CONFIG.finale.introTime, mole: null, won: false };
      this.waveIntro = 0;
      this.flash = 0.6;
      LST.audio.play("finaleIntro");
      LST.audio.setTension(1);
      LST.haptics.buzz([80, 60, 80, 60, 200]);
    } else {
      this.finale = null;
      LST.audio.setTension(this.endless ? 1 : 0);
      LST.audio.play("waveStart");
    }
  }

  // ---------- Active ability ----------
  abilityReady() { return this.state === "playing" && this.ability.cd <= 0; }

  useAbility() {
    if (!this.abilityReady()) { if (this.state === "playing") LST.audio.play("deny"); return false; }
    const A = LST.CONFIG.abilities, id = this.ability.id, t = this.tower;
    this.ability.cd = this.ability.max = A[id].cooldown;
    this.ability.flash = 1;
    if (id === "shockwave") {
      const c = A.shockwave, r2 = c.radius * c.radius;
      for (const e of this.enemies) {
        if (e.dead || LST.utils.dist2(t.x, t.y, e.x, e.y) > r2) continue;
        if (e.isBoss) e.knock(c.bossKnockback, c.bossStun);
        else e.knock(c.knockback, c.stun);
      }
      this.bursts.push(new LST.Burst(t.x, t.y, "#ffffff", c.radius, "shockwave"));
      this.shake = Math.min(1, this.shake + 0.6);
    } else if (id === "freeze") {
      const c = A.freeze;
      for (const e of this.enemies) if (!e.dead) e.applySlow(c.slow, c.time);
      this.bursts.push(new LST.Burst(t.x, t.y, "#8fdcff", 420, "freeze"));
    } else if (id === "overdrive") {
      t.overdrive = A.overdrive.time;
      this.bursts.push(new LST.Burst(t.x, t.y, "#ff9f43", 90, "overdrive"));
    }
    LST.audio.play(id);
    LST.haptics.buzz([30, 30, 60]);
    this.ui.updateHud();
    return true;
  }

  // Wave cleared: a short celebration, then the upgrade shop.
  endWave() {
    const bonus = LST.waves.clearBonus(this.wave);
    this.coins += bonus;
    this.coinsEarned += bonus;
    if (LST.waves.isBossWave(this.wave)) this.bossWavesCleared += 1;
    // Overclock overheats after 3 cleared waves.
    if (this.overclock && this.overclock.hot && --this.overclock.waves <= 0) {
      this.overclock.hot = false;
      this.tower.fireRate = (this.tower.fireRate / 1.4) * 0.8;
      this.texts.push(new LST.FloatText(this.tower.x, this.tower.y - 90, "Overheated!", "#ff7043", "bonus"));
    }
    // Traps taken before this wave flip over now.
    for (const p of this.pendingGotchas.filter((p) => p.wave < this.wave)) {
      this.gotchaQueue.push(p.id);
      LST.meta.discoverTrap(p.id);
      this.newCodex.push(p.id);
    }
    this.pendingGotchas = this.pendingGotchas.filter((p) => p.wave >= this.wave);
    this.score += this.wave * 50;
    this.saveBest(this.wave);
    this.state = "celebrate";
    this.celebrateTimer = 1.6;
    this.spawnConfetti(this.tower.x, this.tower.y - 10);
    this.texts.push(new LST.FloatText(this.tower.x, this.tower.y - 60, `+${bonus} bonus`, "#3ddc84", "bonus"));
    LST.audio.play("waveClear");
    this.ui.updateHud();
  }

  finishCelebration() {
    if (this.state !== "celebrate") return;
    if (this.gotchaQueue.length) {
      this.state = "gotcha";
      this.ui.show("gotcha");
      LST.audio.play("gotcha");
      LST.haptics.buzz([40, 60, 120]);
      return;
    }
    this.openShop();
    this.state = "upgrade";
    this.ui.show("upgrade");
  }

  // ---------- Shop: pick 1 of 3 for free, then spend coins ----------
  // shop.cards: [{ card, taken }]. The first card taken is free; each extra one costs
  // coins (price rises per extra). Rerolling re-deals the cards not taken yet.

  openShop() {
    const n = LST.CONFIG.shop.cards;
    const bossWave = this.wave % LST.CONFIG.waves.bossEvery === 0;
    const cards = LST.shopRules.draw(this.upgradeLevels, n, [], bossWave, { wave: this.wave });
    LST.meta.seeCards(cards.filter((c) => !c.trap).map((c) => c.id));
    this.shop = {
      freeRerolls: 0, // Appraisal L3: returning a free-pick trap gives a free reroll
      cards: cards.map((card) => ({ card, taken: false })),
      picked: false,
      extras: 0,
      rerolls: 0,
      repairs: 0,
    };
  }

  // Coin price of the next extra card / reroll / repair in this shop.
  shopPrice(kind) {
    const s = this.shop;
    if (kind === "reroll" && s.freeRerolls > 0) return 0;
    const times = { extraCard: s.extras, reroll: s.rerolls, repair: s.repairs }[kind];
    return LST.shopRules.price(kind, this.wave, times);
  }

  // Take card `index`. Returns true if it was taken.
  takeCard(index, opts = {}) {
    const s = this.shop;
    const slot = s && s.cards[index];
    if (this.state !== "upgrade" || !slot || slot.taken) return false;
    if (!LST.shopRules.available(slot.card, this.upgradeLevels)) return false;
    let paid = 0;
    if (s.picked) {
      const price = this.shopPrice("extraCard");
      if (this.coins < price) { LST.audio.play("deny"); return false; }
      this.coins -= price;
      s.extras += 1;
      paid = price;
    }
    s.picked = true;
    slot.taken = true;
    this.upgradeLevels[slot.card.id] = (this.upgradeLevels[slot.card.id] || 0) + 1;
    // Mystery Box: swap in the card inside (50% Common, 25% Rare/Epic, 25% another trap).
    if (slot.card.id === "mysteryBox") {
      LST.meta.discoverTrap("mysteryBox");
      slot.from = slot.card;
      slot.card = this.openMysteryBox();
      this.upgradeLevels[slot.card.id] = (this.upgradeLevels[slot.card.id] || 0) + 1;
    }
    slot.card.apply(this.tower, this);
    if (slot.card.trap) {
      this.trapLog.push({ id: slot.card.id, wave: this.wave, paid });
      if (!LST.meta.knowsTrap(slot.card.id) && !this.pendingGotchas.some((p) => p.id === slot.card.id)) {
        this.pendingGotchas.push({ id: slot.card.id, wave: this.wave });
      }
    }
    if (opts.quiet) return true;
    if (slot.from) LST.audio.play("reroll");
    LST.audio.play(slot.card.rarity === "epic" ? "epic" : "buy");
    LST.haptics.buzz(slot.card.rarity === "epic" ? [20, 30, 40] : 15);
    this.ui.renderShop({ took: index });
    this.ui.updateHud();
    return true;
  }

  openMysteryBox() {
    const r = Math.random();
    const ok = (c) => LST.shopRules.available(c, this.upgradeLevels);
    const commons = LST.CARDS.filter((c) => c.rarity === "common" && ok(c));
    const shiny = LST.CARDS.filter((c) => c.rarity !== "common" && ok(c));
    const traps = LST.TRAPS.filter((c) => c.id !== "mysteryBox" && ok(c));
    const pool = r < 0.5 ? commons : r < 0.75 ? (shiny.length ? shiny : commons) : (traps.length ? traps : commons);
    return pool[Math.floor(Math.random() * pool.length)] || LST.CARDS[0];
  }

  // Appraisal L3: the trap you can return right now (taken this shop or in the last one).
  returnableTrap() {
    if (this.state !== "upgrade" || LST.meta.level("appraisal") < 3 || this.draft) return null;
    const w = LST.CONFIG.traps.returnWaves;
    for (let i = this.trapLog.length - 1; i >= 0; i--) {
      const t = this.trapLog[i];
      if (!t.returned && this.wave - t.wave <= w) return t;
    }
    return null;
  }

  returnTrap() {
    const t = this.returnableTrap();
    if (!t) return false;
    const card = LST.cardById(t.id);
    card.remove(this.tower, this);
    t.returned = true;
    this.upgradeLevels[t.id] = Math.max(0, (this.upgradeLevels[t.id] || 0) - 1);
    if (t.paid) this.coins += t.paid;
    else this.shop.freeRerolls += 1;
    // If it's still on the table in this shop, put it back.
    const slot = this.shop.cards.find((c) => c.taken && c.card.id === t.id);
    if (slot) slot.taken = false;
    LST.audio.play("unbench");
    this.ui.renderShop({ returned: t.id });
    this.ui.updateHud();
    return true;
  }

  // "Gotcha!" reveals, shown between the wave-clear party and the shop.
  dismissGotcha() {
    if (this.state !== "gotcha") return;
    this.gotchaQueue.shift();
    if (this.gotchaQueue.length) { this.ui.show("gotcha"); return; }
    this.openShop();
    this.state = "upgrade";
    this.ui.show("upgrade");
  }

  rerollShop() {
    const s = this.shop;
    if (this.state !== "upgrade" || !s) return false;
    const open = s.cards.filter((c) => !c.taken);
    const price = this.shopPrice("reroll");
    if (!open.length || this.coins < price) { LST.audio.play("deny"); return false; }
    this.coins -= price;
    if (s.freeRerolls > 0) s.freeRerolls -= 1; else s.rerolls += 1;
    const keep = s.cards.filter((c) => c.taken).map((c) => c.card.id);
    const fresh = LST.shopRules.draw(this.upgradeLevels, open.length, keep, false, { wave: this.wave });
    LST.meta.seeCards(fresh.filter((c) => !c.trap).map((c) => c.id));
    let k = 0;
    s.cards = s.cards.map((c) => (c.taken ? c : fresh[k] ? { card: fresh[k++], taken: false } : null)).filter(Boolean);
    LST.audio.play("reroll");
    this.ui.renderShop({ rerolled: true });
    this.ui.updateHud();
    return true;
  }

  repairTower() {
    const s = this.shop;
    const t = this.tower;
    if (this.state !== "upgrade" || !s || t.hp >= t.maxHp) return false;
    const price = this.shopPrice("repair");
    if (this.coins < price) { LST.audio.play("deny"); return false; }
    this.coins -= price;
    s.repairs += 1;
    t.heal(t.maxHp * LST.CONFIG.shop.repair.heal);
    LST.audio.play("buy");
    LST.haptics.buzz(15);
    this.ui.renderShop({ repaired: true });
    this.ui.updateHud();
    return true;
  }

  // Next wave needs the free pick to be used (unless nothing can be taken).
  canLeaveShop() {
    const s = this.shop;
    return !s || s.picked || !s.cards.some((c) => !c.taken);
  }

  leaveShop() {
    if (this.state !== "upgrade" || !this.canLeaveShop()) return;
    if (this.draft && this.advanceDraft()) {
      LST.audio.play("deal");
      this.ui.renderShop({ deal: true });
      this.ui.updateHud();
      return;
    }
    this.draft = null;
    this.startNextWave();
  }

  gameOver() {
    this.state = "gameover";
    this.spawnExplosion(this.tower.x, this.tower.y);
    this.finishRun({ won: false });
    this.resultsDelay = 1.1; // let the tower explosion play first
    this.ui.show("dying"); // no screen, no HUD
    LST.audio.stopMusic();
    LST.audio.setTension(0);
    LST.audio.play("gameOver");
    LST.haptics.buzz([120, 60, 250]);
  }

  // Pay out and build the results. won = left after beating the finale.
  finishRun({ won }) {
    this.state = "gameover";
    this.saveBest(this.wave);
    // Pay out Gears (saved right away, so closing the tab can't lose them).
    const meta = LST.meta;
    const nextBefore = meta.nextUnlock();
    // Traps still waiting for their reveal go straight into the Codex.
    for (const p of this.pendingGotchas) if (meta.discoverTrap(p.id)) this.newCodex.push(p.id);
    this.pendingGotchas = [];
    const gears = meta.gearsFor(won ? this.wave + 1 : this.wave, this.bossWavesCleared, this.gearMult, 0, this.bossKills);
    const gearsBefore = meta.state.gears;
    meta.recordRun(gears.total);
    this.result = {
      wave: this.wave, time: this.runTime, kills: this.kills, coins: this.coinsEarned, score: this.score,
      cards: Object.entries(this.upgradeLevels), bossWaves: this.bossWavesCleared, gears, gearsBefore,
      gearsAfter: meta.state.gears, nextUnlock: nextBefore, newBest: this.newBest, firstRun: meta.state.runs === 1, headStart: this.headStart,
      gearMult: this.gearMult, newCodex: this.newCodex.slice(),
      won, bossKills: this.bossKills, worldBonus: this.worldBonus, endless: this.endless,
    };
  }

  showResults() {
    this.resultsDelay = 0;
    this.ui.show("results");
  }

  openWorkshop(from = "start") {
    if (this.state === "gameover" && this.resultsDelay > 0) return;
    this.workshopFrom = from;
    if (this.state !== "gameover") this.state = "workshop";
    LST.meta.state.seenWorkshop = true;
    LST.meta.state.armorNotice = false;
    LST.meta.save();
    this.ui.show("workshop");
  }

  closeWorkshop() {
    if (this.workshopFrom === "results" && this.state === "gameover") this.ui.show("results");
    else { this.state = "menu"; this.ui.show("start"); }
  }

  buyUpgrade(id) {
    if (!LST.meta.buyUpgrade(id)) { LST.audio.play("deny"); return false; }
    LST.audio.play("upgrade", { pitch: 1 + Math.min(0.6, LST.meta.level(id) * 0.02) });
    LST.haptics.buzz(20);
    this.ui.renderWorkshop({ bought: id });
    return true;
  }

  // Workshop: equip an ability, or unlock it with Gears.
  pickAbility(id) {
    const m = LST.meta;
    if (m.abilityUnlocked(id)) {
      if (m.state.ability === id) return true;
      m.equipAbility(id);
      LST.audio.play("bench");
    } else {
      if (!m.unlockAbility(id)) { LST.audio.play("deny"); return false; }
      LST.audio.play("unlock");
      LST.haptics.buzz([20, 40, 60]);
    }
    this.ability = { id, cd: 0, max: LST.CONFIG.abilities[id].cooldown, flash: 0 };
    this.ui.renderWorkshop({ ability: id });
    return true;
  }

  toggleBench(id) {
    if (!LST.meta.toggleBench(id)) { LST.audio.play("deny"); return false; }
    LST.audio.play(LST.meta.isBenched(id) ? "bench" : "unbench");
    this.ui.renderWorkshop({ benched: id });
    return true;
  }

  resetProgress() {
    LST.meta.resetAll();
    this.bestWave = 0;
    this.toMenu();
  }

  unlockCard(id) {
    if (!LST.meta.unlock(id)) { LST.audio.play("deny"); return false; }
    LST.audio.play("unlock");
    LST.haptics.buzz([20, 40, 60]);
    this.ui.renderWorkshop({ unlocked: id });
    return true;
  }

  toMenu() {
    this.reset();
    this.state = "menu";
    this.ui.show("start");
    LST.audio.duckMusic(false);
    LST.audio.startMusic();
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      this.ui.show("pause");
      LST.audio.duckMusic(true);
    } else if (this.state === "paused") {
      this.state = "playing";
      this.ui.show(null);
      LST.audio.duckMusic(false);
    }
  }

  toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    this.ui.updateHud();
  }

  saveBest(wave) {
    if (wave > this.bestWave) {
      this.bestWave = wave;
      this.newBest = true;
      LST.utils.storage.set("lst.bestWave", wave);
    }
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
    if (this.state === "playing" || this.state === "celebrate" || this.state === "upgrade" || this.state === "victory") this.runTime += dt;
    if (this.state === "gameover" && this.resultsDelay > 0) {
      this.resultsDelay -= dt;
      if (this.resultsDelay <= 0) this.showResults();
    }

    if (this.state === "victory") {
      this.victoryTimer -= dt;
      if (Math.random() < dt * 6) this.spawnConfetti(LST.utils.rand(-200, 200), LST.utils.rand(-200, 100), 30);
      if (this.victoryTimer <= 0) { this.state = "cleared"; this.ui.show("cleared"); LST.audio.play("unlock"); }
      return;
    }
    if (this.state === "celebrate") {
      this.celebrateTimer -= dt;
      if (this.celebrateTimer <= 0) this.finishCelebration();
      return;
    }
    if (this.state !== "playing") return;

    // Low-HP slow-down eases from 35% speed back to normal.
    let scale = 1;
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      scale = 0.35 + 0.65 * (1 - Math.max(0, this.slowmo) / 0.9);
    }
    // At 2x speed we run two normal-sized steps instead of one big one,
    // so fast projectiles never skip over enemies.
    for (let i = 0; i < this.speed && this.state === "playing"; i++) this.step(dt * scale);

    if (this.lowHpActive && this.state === "playing") {
      this.heartbeat -= dt;
      if (this.heartbeat <= 0) {
        LST.audio.play("heartbeat");
        this.heartbeat = 1.3;
      }
    }
    this.ui.updateHud();
  }

  step(dt) {
    this.waveIntro = Math.max(0, this.waveIntro - dt);
    this.ability.cd = Math.max(0, this.ability.cd - dt);
    this.ability.flash = Math.max(0, this.ability.flash - dt * 2);
    if (this.phaseBanner && (this.phaseBanner.t -= dt) <= 0) this.phaseBanner = null;
    const f = this.finale;
    if (f && !f.mole && !f.won) {
      f.intro -= dt;
      if (f.intro <= 0) {
        f.mole = new LST.KingMole(this.waveMult);
        if (this.renderer.halfW > this.renderer.halfH * 1.15) { f.mole.x = -f.mole.y; f.mole.y = 0; } // landscape: from the side
        this.enemies.push(f.mole);
        this.onMoleRise(f.mole);
        LST.audio.play("boss");
      }
    }
    this.updateSpawning(dt);
    this.tower.update(dt, this);
    this.updateList(this.enemies, dt);
    this.updateList(this.projectiles, dt);
    this.checkLowHp();

    if (this.state !== "playing") return; // e.g. King Mole just went down
    if (this.tower.hp <= 0) {
      this.gameOver();
    } else if (this.spawnQueue.length === 0 && this.enemies.length === 0 && !(f && !f.won)) {
      this.endWave();
    }
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

  // ---------- Events (game rules + sound + haptics) ----------

  onFire(tower) {
    // Higher fire rates get a slightly higher, lighter "pew".
    LST.audio.play("fire", { pitch: Math.min(1.4, 0.9 + tower.fireRate * 0.05) });
  }

  onHit(e, damage, crit) {
    super.onHit(e, damage, crit);
    LST.audio.play("hit", { crit });
  }

  onEnemyKilled(e) {
    super.onEnemyKilled(e);
    const coins = this.coinMult === 1 ? e.coins : Math.round(e.coins * this.coinMult);
    this.coins += coins;
    this.coinsEarned += coins;
    this.score += e.score * this.wave;
    this.kills += 1;
    if (this.tower.lifesteal > 0) this.tower.heal(this.tower.maxHp * this.tower.lifesteal);
    LST.audio.play("pop", { pitch: { basic: 1, fast: 1.3, tank: 0.75, boss: 0.5 }[e.type] });
    LST.audio.play("coin");
    if (e.type === "boss") {
      this.bossKills += 1;
      const bonus = Math.round(LST.CONFIG.bosses.killCoins * this.coinMult);
      this.coins += bonus;
      this.coinsEarned += bonus;
      this.texts.push(new LST.FloatText(e.x, e.y - e.radius * 2.2, `+${bonus} BOSS BONUS`, "#ffd93d", "bonus"));
    }
    if (e.type === "mole") { this.onFinaleWon(e); return; }
    if (e.type === "boss") {
      this.hitStop = 0.16;
      this.flash = 1;
      this.shake = 1;
      this.spawnHitSparks(e.x, e.y, "#ffd23f", 30, 280);
      LST.audio.play("bossDown");
      LST.haptics.buzz(90);
    }
  }

  // ---------- Bosses ----------
  onSlamWindup(e) {
    LST.audio.play("windup", { pitch: e.type === "mole" ? 0.8 : 1 });
  }

  onBossSlam(e, damage) {
    super.onBossSlam(e, damage);
    LST.audio.play("slam");
    LST.audio.play("towerHit");
    LST.haptics.buzz(e.type === "mole" ? 140 : 90);
  }

  onBossCharge(e) {
    this.bossEscapes += 1;
    this.texts.push(new LST.FloatText(e.x, e.y - e.radius * 2, "CHARGE!", "#ff4757", "bonus"));
    LST.audio.play("charge");
  }

  onMoleRise(m) {
    this.bursts.push(new LST.Burst(m.x, m.y, "#8d6e63", 70, "dirt"));
    this.spawnHitSparks(m.x, m.y, "#8d6e63", 18, 180);
    this.shake = Math.min(1, this.shake + 0.4);
    LST.audio.play("popUp");
  }

  onMoleBurrow(m) {
    this.bursts.push(new LST.Burst(m.x, m.y, "#8d6e63", 60, "dirt"));
    this.spawnHitSparks(m.x, m.y, "#8d6e63", 12, 140);
    LST.audio.play("burrow");
  }

  onMolePhase(m) {
    const text = m.phase === 1 ? ["PHASE 2", "He's digging deeper!"] : ["PHASE 3", "King Mole is MAD!"];
    this.phaseBanner = { text: text[0], sub: text[1], t: 2.2, max: 2.2 };
    this.flash = 0.7;
    this.shake = 1;
    LST.audio.play("phase");
    LST.audio.setTension(m.phase + 1);
    LST.haptics.buzz([60, 40, 60, 40, 120]);
  }

  // King Mole is down: party, then the World cleared! screen.
  onFinaleWon(m) {
    this.finale.won = true;
    this.hitStop = 0.35;
    this.flash = 1;
    this.shake = 1;
    // His minions pop too.
    for (const e of this.enemies) if (!e.dead && e !== m) { e.dead = true; super.onEnemyKilled(e); }
    this.spawnHitSparks(m.x, m.y, "#ffd23f", 50, 320);
    this.spawnConfetti(0, -40, 160);
    const bonus = LST.waves.clearBonus(this.wave);
    this.coins += bonus;
    this.coinsEarned += bonus;
    this.bossWavesCleared += 1;
    this.score += this.wave * 200;
    this.saveBest(this.wave);
    this.worldBonus = LST.meta.clearWorld("backyard", this.runTime);
    this.state = "victory";
    this.victoryTimer = 3.4;
    this.ui.show(null);
    LST.audio.setTension(0);
    LST.audio.play("victory");
    LST.haptics.buzz([100, 50, 100, 50, 300]);
    this.ui.updateHud();
  }

  // From the World cleared! screen.
  continueEndless() {
    if (this.state !== "cleared") return;
    this.endless = true;
    this.finale = null;
    this.openShop();
    this.state = "upgrade";
    this.ui.show("upgrade");
    LST.audio.startMusic();
  }

  retireToWorkshop() {
    if (this.state !== "cleared") return;
    this.finishRun({ won: true });
    this.resultsDelay = 0;
    this.openWorkshop("results");
  }

  onTowerHit(e) {
    super.onTowerHit(e);
    LST.audio.play("towerHit");
    LST.haptics.buzz(e.type === "boss" ? 120 : 30);
  }

  onBossSpawn(e) {
    super.onBossSpawn(e);
    LST.audio.play("boss");
    LST.haptics.buzz([60, 40, 140]);
  }
};
