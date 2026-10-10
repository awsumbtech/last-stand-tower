// Core game state and rules.
// States: "menu" | "playing" | "paused" | "celebrate" (wave-clear party) | "upgrade" | "gameover".
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
  }

  // ---------- Flow ----------

  newGame() {
    this.reset();
    LST.audio.startMusic();
    this.startNextWave();
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
    LST.audio.play("waveStart");
  }

  // Wave cleared: a short celebration, then the upgrade shop.
  endWave() {
    const bonus = LST.waves.clearBonus(this.wave);
    this.coins += bonus;
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
    this.shop = {
      cards: LST.shopRules.draw(this.upgradeLevels, n, [], bossWave).map((card) => ({ card, taken: false })),
      picked: false,
      extras: 0,
      rerolls: 0,
      repairs: 0,
    };
  }

  // Coin price of the next extra card / reroll / repair in this shop.
  shopPrice(kind) {
    const s = this.shop;
    const times = { extraCard: s.extras, reroll: s.rerolls, repair: s.repairs }[kind];
    return LST.shopRules.price(kind, this.wave, times);
  }

  // Take card `index`. Returns true if it was taken.
  takeCard(index) {
    const s = this.shop;
    const slot = s && s.cards[index];
    if (this.state !== "upgrade" || !slot || slot.taken) return false;
    if (!LST.shopRules.available(slot.card, this.upgradeLevels)) return false;
    if (s.picked) {
      const price = this.shopPrice("extraCard");
      if (this.coins < price) { LST.audio.play("deny"); return false; }
      this.coins -= price;
      s.extras += 1;
    }
    s.picked = true;
    slot.taken = true;
    this.upgradeLevels[slot.card.id] = (this.upgradeLevels[slot.card.id] || 0) + 1;
    slot.card.apply(this.tower);
    LST.audio.play(slot.card.rarity === "epic" ? "epic" : "buy");
    LST.haptics.buzz(slot.card.rarity === "epic" ? [20, 30, 40] : 15);
    this.ui.renderShop({ took: index });
    this.ui.updateHud();
    return true;
  }

  rerollShop() {
    const s = this.shop;
    if (this.state !== "upgrade" || !s) return false;
    const open = s.cards.filter((c) => !c.taken);
    const price = this.shopPrice("reroll");
    if (!open.length || this.coins < price) { LST.audio.play("deny"); return false; }
    this.coins -= price;
    s.rerolls += 1;
    const keep = s.cards.filter((c) => c.taken).map((c) => c.card.id);
    const fresh = LST.shopRules.draw(this.upgradeLevels, open.length, keep);
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
    this.startNextWave();
  }

  gameOver() {
    this.state = "gameover";
    this.spawnExplosion(this.tower.x, this.tower.y);
    this.saveBest(this.wave);
    this.ui.show("gameover");
    LST.audio.stopMusic();
    LST.audio.play("gameOver");
    LST.haptics.buzz([120, 60, 250]);
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
    this.updateSpawning(dt);
    this.tower.update(dt, this);
    this.updateList(this.enemies, dt);
    this.updateList(this.projectiles, dt);
    this.checkLowHp();

    if (this.tower.hp <= 0) {
      this.gameOver();
    } else if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
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
    this.coins += e.coins;
    this.score += e.score * this.wave;
    this.kills += 1;
    if (this.tower.lifesteal > 0) this.tower.heal(this.tower.maxHp * this.tower.lifesteal);
    LST.audio.play("pop", { pitch: { basic: 1, fast: 1.3, tank: 0.75, boss: 0.5 }[e.type] });
    LST.audio.play("coin");
    if (e.type === "boss") {
      this.hitStop = 0.16;
      this.flash = 1;
      this.shake = 1;
      this.spawnHitSparks(e.x, e.y, "#ffd23f", 30, 280);
      LST.audio.play("bossDown");
      LST.haptics.buzz(90);
    }
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
