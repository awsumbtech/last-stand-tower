// ShopController: the between-waves shop (pick 1 of 3 for free, then spend coins) and the
// Head Start draft that replays skipped shops. game.shop holds this shop's data:
// { cards: [{ card, taken }], picked, extras, rerolls, repairs, freeRerolls }. The first card
// taken is free; each extra one costs coins (price rises per extra). Rerolling re-deals the
// cards not taken yet. Every action only works while ShopState ("upgrade") is current.
LST.ShopController = class ShopController {
  constructor(game) { this.game = game; }

  get open() { return this.game.flow.is("upgrade"); }

  // Deal a new shop and enter ShopState (after a wave, a Gotcha reveal, or World cleared!).
  enter() {
    const g = this.game;
    this.deal();
    g.flow.set("upgrade");
    g.ui.show("upgrade");
  }

  // Head Start: skip the first `skip` waves. Their shops are replayed as a quick draft:
  // hand k pays wave k's coins (kills + clear bonus), deals a free pick, and sells
  // extras at wave-k prices, exactly like playing them. "Auto" finishes the draft for you.
  beginHeadStart(skip) {
    const g = this.game, income = [], D = g.director;
    for (let w = 1; w <= skip; w++) {
      const m = D.multipliers(w);
      let coins = D.clearBonus(w);
      for (const ty of D.build(w).queue) coins += Math.max(1, Math.round(LST.CONFIG.enemies[ty].coins * m.coins * g.coinMult));
      if (D.isBossWave(w)) coins += g.rewards.bossBonus();
      income.push(coins);
    }
    g.headStart = skip;
    g.bossWavesCleared = D.bossWavesIn(skip);
    for (let w = 1; w <= skip; w++) if (D.isBossWave(w)) g.bossKills += 1;
    if (skip >= D.finaleWave) g.endless = true;
    g.draft = { hand: 0, of: skip, income };
    g.flow.set("upgrade");
    this.advanceDraft();
    g.ui.show("upgrade");
    LST.audio.play("waveClear");
  }

  // Next draft hand. Returns false when the draft is over.
  advanceDraft() {
    const g = this.game, d = g.draft;
    if (!d || d.hand >= d.of) return false;
    d.hand += 1;
    g.wave = d.hand;
    g.coins += d.income[d.hand - 1];
    g.coinsEarned += d.income[d.hand - 1];
    this.deal();
    return true;
  }

  // Auto-draft: free pick (attack cards and fresh cards first) plus up to two extras per
  // hand while coins allow, for every hand left. Stops on the last hand so you shop it yourself.
  autoDraft() {
    const g = this.game;
    if (!this.open || !g.draft) return;
    while (g.draft.hand < g.draft.of) {
      if (!g.shop.picked) this.takeBest();
      for (let k = 0; k < 2 && g.coins >= this.price("extraCard"); k++) if (!this.takeBest()) break;
      this.advanceDraft();
    }
    LST.audio.play("epic");
    g.ui.renderShop({ deal: true });
    g.ui.updateHud();
    g.events.emit(LST.EVENTS.CARD_TAKEN, { index: -1, card: null, levels: g.upgradeLevels, paid: 0, epic: true });
  }

  // One auto-draft pick. Skips traps you already know; unknown ones can still fool it, same as you.
  takeBest() {
    const g = this.game, lvl = (id) => g.upgradeLevels[id] || 0;
    const open = g.shop.cards.map((c, i) => ({ c, i })).filter((o) => !o.c.taken && LST.shopRules.available(o.c.card, g.upgradeLevels) && !(o.c.card.trap && LST.meta.knowsTrap(o.c.card.id)));
    if (!open.length) return false;
    open.sort((a, b) => (b.c.card.offense ? 1 : 0) - (a.c.card.offense ? 1 : 0) || lvl(a.c.card.id) - lvl(b.c.card.id));
    const pick = Math.random() < 0.7 ? open[0] : open[Math.floor(Math.random() * open.length)];
    return this.takeCard(pick.i, { quiet: true });
  }

  // Deal this wave's cards into a fresh game.shop.
  deal() {
    const g = this.game, n = LST.CONFIG.shop.cards;
    const bossWave = g.director.rareShop(g.wave); // Rare+ slot after gates (and Beach supply waves)
    const cards = LST.shopRules.draw(g.upgradeLevels, n, [], bossWave, { wave: g.wave });
    LST.meta.seeCards(cards.filter((c) => !c.trap).map((c) => c.id));
    g.shop = {
      freeRerolls: 0, // Appraisal L3: returning a free-pick trap gives a free reroll
      cards: cards.map((card) => ({ card, taken: false })),
      picked: false,
      extras: 0,
      rerolls: 0,
      repairs: 0,
    };
  }

  // Coin price of the next extra card / reroll / repair in this shop.
  price(kind) {
    const g = this.game, s = g.shop;
    if (kind === "reroll" && s.freeRerolls > 0) return 0;
    const times = { extraCard: s.extras, reroll: s.rerolls, repair: s.repairs }[kind];
    return LST.shopRules.price(kind, g.wave, times);
  }

  // Take card `index`. Returns true if it was taken.
  takeCard(index, opts = {}) {
    const g = this.game, s = g.shop;
    const slot = s && s.cards[index];
    if (!this.open || !slot || slot.taken) return false;
    if (!LST.shopRules.available(slot.card, g.upgradeLevels)) return false;
    let paid = 0;
    if (s.picked) {
      const price = this.price("extraCard");
      if (g.coins < price) { LST.audio.play("deny"); return false; }
      g.coins -= price;
      s.extras += 1;
      paid = price;
    }
    s.picked = true;
    slot.taken = true;
    g.upgradeLevels[slot.card.id] = (g.upgradeLevels[slot.card.id] || 0) + 1;
    // Mystery Box: swap in the card inside (50% Common, 25% Rare/Epic, 25% another trap).
    if (slot.card.id === "mysteryBox") {
      LST.meta.discoverTrap("mysteryBox");
      slot.from = slot.card;
      slot.card = this.openMysteryBox();
      g.upgradeLevels[slot.card.id] = (g.upgradeLevels[slot.card.id] || 0) + 1;
    }
    slot.card.apply(g.tower, g);
    if (slot.card.trap) {
      g.trapLog.push({ id: slot.card.id, wave: g.wave, paid });
      if (!LST.meta.knowsTrap(slot.card.id) && !g.pendingGotchas.some((p) => p.id === slot.card.id)) {
        g.pendingGotchas.push({ id: slot.card.id, wave: g.wave });
      }
    }
    if (opts.quiet) return true;
    if (slot.from) LST.audio.play("reroll");
    LST.audio.play(slot.card.rarity === "epic" ? "epic" : "buy");
    LST.haptics.buzz(slot.card.rarity === "epic" ? [20, 30, 40] : 15);
    g.ui.renderShop({ took: index });
    g.ui.updateHud();
    g.events.emit(LST.EVENTS.CARD_TAKEN, { index, card: slot.card, levels: g.upgradeLevels, paid, epic: slot.card.rarity === "epic" });
    return true;
  }

  openMysteryBox() {
    const g = this.game, r = Math.random();
    const ok = (c) => LST.shopRules.available(c, g.upgradeLevels);
    const commons = LST.CARDS.filter((c) => c.rarity === "common" && ok(c));
    const shiny = LST.CARDS.filter((c) => c.rarity !== "common" && ok(c));
    const traps = LST.TRAPS.filter((c) => c.id !== "mysteryBox" && ok(c));
    const pool = r < 0.5 ? commons : r < 0.75 ? (shiny.length ? shiny : commons) : (traps.length ? traps : commons);
    return pool[Math.floor(Math.random() * pool.length)] || LST.CARDS[0];
  }

  // Appraisal L3: the trap you can return right now (taken this shop or in the last one).
  returnableTrap() {
    const g = this.game;
    if (!this.open || LST.meta.level("appraisal") < 3 || g.draft) return null;
    const w = LST.CONFIG.traps.returnWaves;
    for (let i = g.trapLog.length - 1; i >= 0; i--) {
      const t = g.trapLog[i];
      if (!t.returned && g.wave - t.wave <= w) return t;
    }
    return null;
  }

  returnTrap() {
    const g = this.game, t = this.returnableTrap();
    if (!t) return false;
    const card = LST.cardById(t.id);
    card.remove(g.tower, g);
    t.returned = true;
    g.upgradeLevels[t.id] = Math.max(0, (g.upgradeLevels[t.id] || 0) - 1);
    if (t.paid) g.coins += t.paid;
    else g.shop.freeRerolls += 1;
    // If it's still on the table in this shop, put it back.
    const slot = g.shop.cards.find((c) => c.taken && c.card.id === t.id);
    if (slot) slot.taken = false;
    LST.audio.play("unbench");
    g.ui.renderShop({ returned: t.id });
    g.ui.updateHud();
    return true;
  }

  reroll() {
    const g = this.game, s = g.shop;
    if (!this.open || !s) return false;
    const open = s.cards.filter((c) => !c.taken);
    const price = this.price("reroll");
    if (!open.length || g.coins < price) { LST.audio.play("deny"); return false; }
    g.coins -= price;
    if (s.freeRerolls > 0) s.freeRerolls -= 1; else s.rerolls += 1;
    const keep = s.cards.filter((c) => c.taken).map((c) => c.card.id);
    const fresh = LST.shopRules.draw(g.upgradeLevels, open.length, keep, false, { wave: g.wave });
    LST.meta.seeCards(fresh.filter((c) => !c.trap).map((c) => c.id));
    let k = 0;
    s.cards = s.cards.map((c) => (c.taken ? c : fresh[k] ? { card: fresh[k++], taken: false } : null)).filter(Boolean);
    LST.audio.play("reroll");
    g.ui.renderShop({ rerolled: true });
    g.ui.updateHud();
    return true;
  }

  repair() {
    const g = this.game, s = g.shop, t = g.tower;
    if (!this.open || !s || t.hp >= t.maxHp) return false;
    const price = this.price("repair");
    if (g.coins < price) { LST.audio.play("deny"); return false; }
    g.coins -= price;
    s.repairs += 1;
    t.heal(t.maxHp * LST.CONFIG.shop.repair.heal);
    LST.audio.play("buy");
    LST.haptics.buzz(15);
    g.ui.renderShop({ repaired: true });
    g.ui.updateHud();
    return true;
  }

  // Next wave needs the free pick to be used (unless nothing can be taken).
  canLeave() {
    const s = this.game.shop;
    return !s || s.picked || !s.cards.some((c) => !c.taken);
  }

  leave() {
    const g = this.game;
    if (!this.open || !this.canLeave()) return;
    if (g.draft && this.advanceDraft()) {
      LST.audio.play("deal");
      g.ui.renderShop({ deal: true });
      g.ui.updateHud();
      return;
    }
    g.draft = null;
    g.startNextWave();
  }
};
