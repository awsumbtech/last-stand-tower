// DOM overlays: HUD, start / upgrade / pause / game over screens.
// The UI never changes game state directly; it calls methods on the game.

LST.UI = class UI {
  constructor(game) {
    this.game = game;
    const $ = (id) => document.getElementById(id);
    this.el = {
      hud: $("hud"),
      wave: $("hud-wave"),
      coins: $("hud-coins"),
      score: $("hud-score"),
      hpFill: $("hud-hp-fill"),
      hpText: $("hud-hp-text"),
      speed: $("btn-speed"),
      screens: {
        start: $("screen-start"),
        upgrade: $("screen-upgrade"),
        pause: $("screen-pause"),
        gameover: $("screen-gameover"),
      },
      startBest: $("start-best"),
      upWave: $("up-wave"),
      upCoins: $("up-coins"),
      cardRow: $("card-row"),
      shopHint: $("shop-hint"),
      reroll: $("btn-reroll"),
      rerollPrice: $("reroll-price"),
      repair: $("btn-repair"),
      repairPrice: $("repair-price"),
      repairHp: $("repair-hp"),
      next: $("btn-next"),
      goWave: $("go-wave"),
      goScore: $("go-score"),
      goBest: $("go-best"),
    };

    $("btn-start").addEventListener("click", () => game.newGame());
    $("btn-restart").addEventListener("click", () => game.newGame());
    $("btn-next").addEventListener("click", () => game.leaveShop());
    this.el.reroll.addEventListener("click", () => game.rerollShop());
    this.el.repair.addEventListener("click", () => game.repairTower());
    $("btn-pause").addEventListener("click", () => game.togglePause());
    $("btn-resume").addEventListener("click", () => game.togglePause());
    $("btn-quit").addEventListener("click", () => game.toMenu());
    this.el.speed.addEventListener("click", () => game.toggleSpeed());

    // Sound / music / vibration toggles (HUD icons and pause-menu rows).
    this.toggles = [...document.querySelectorAll(".toggle[data-setting]")];
    for (const b of this.toggles) {
      b.addEventListener("click", () => {
        LST.settings.toggle(b.dataset.setting);
        if (b.dataset.setting === "haptics") LST.haptics.buzz(40);
      });
    }
    if (!LST.haptics.supported) document.querySelectorAll(".haptics-only").forEach((el) => el.remove());
    LST.settings.onChange(() => this.updateToggles());
    this.updateToggles();

    // Every button click gets a little "tap" (buying plays its own sound).
    document.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (b && !b.classList.contains("card") && !b.closest(".shop-actions")) LST.audio.play("tap");
    });

    // One delegated listener for the shop cards.
    this.el.cardRow.addEventListener("click", (ev) => {
      const card = ev.target.closest("[data-slot]");
      if (!card) return;
      if (card.classList.contains("locked")) { LST.audio.play("deny"); LST.UI.pop(card, "shake"); return; }
      game.takeCard(+card.dataset.slot);
    });
  }

  // Show exactly one screen (or none, while playing).
  show(name) {
    for (const [key, el] of Object.entries(this.el.screens)) {
      el.classList.toggle("hidden", key !== name);
    }
    this.el.hud.classList.toggle("hidden", name === "start" || name === "gameover");
    if (name) LST.UI.pop(this.el.screens[name].querySelector(".panel"));
    if (name === "start") this.el.startBest.textContent = this.game.bestWave;
    if (name === "upgrade") this.renderShop({ deal: true });
    if (name === "gameover") {
      const g = this.game;
      this.el.goWave.textContent = g.wave;
      this.el.goScore.textContent = LST.utils.formatNumber(g.score);
      this.el.goBest.textContent = g.newBest ? `New best: wave ${g.bestWave}!` : `Best wave: ${g.bestWave}`;
      this.el.goBest.classList.toggle("new", g.newBest);
    }
  }

  updateToggles() {
    for (const b of this.toggles) {
      const on = LST.settings.get(b.dataset.setting);
      b.classList.toggle("off", !on);
      b.setAttribute("aria-pressed", String(on));
      const state = b.querySelector(".state");
      if (state) state.textContent = on ? "ON" : "OFF";
    }
  }

  updateHud() {
    const g = this.game;
    const t = g.tower;
    this.el.wave.textContent = g.wave;
    this.el.coins.textContent = LST.utils.formatNumber(g.coins);
    this.el.score.textContent = LST.utils.formatNumber(g.score);
    const pct = Math.max(0, t.hp / t.maxHp);
    this.el.hpFill.style.width = (pct * 100).toFixed(1) + "%";
    this.el.hpFill.classList.toggle("low", pct < 0.3);
    this.el.hpText.textContent = `${Math.ceil(t.hp)} / ${Math.round(t.maxHp)}`;
    this.el.speed.textContent = g.speed + "x";
  }

  // Draw the pick-1-of-3 shop.
  // opts.deal: cards fly in (new shop) · opts.rerolled: open cards re-deal · opts.took: slot just taken
  renderShop(opts = {}) {
    const g = this.game;
    const s = g.shop;
    if (!s) return;
    if (opts.took !== undefined || opts.repaired || opts.rerolled) LST.UI.pop(document.getElementById("up-coins-pill"), "bump");
    this.el.upWave.textContent = g.wave;
    this.el.upCoins.textContent = LST.utils.formatNumber(g.coins);

    const extraPrice = g.shopPrice("extraCard");
    const open = s.cards.filter((c) => !c.taken).length;
    this.el.shopHint.innerHTML = !s.picked
      ? "Pick a card. It's <b>free</b>!"
      : open ? "Want another? Extra cards cost coins." : "All cards taken. Nice haul!";
    this.el.shopHint.classList.toggle("free", !s.picked);

    this.el.cardRow.innerHTML = "";
    s.cards.forEach((slot, i) => {
      const { card, taken } = slot;
      const lvl = g.upgradeLevels[card.id] || 0;
      const shownLvl = taken ? lvl : lvl + 1; // level after taking it
      const rar = LST.RARITY[card.rarity];
      const locked = !taken && s.picked && g.coins < extraPrice;
      const el = document.createElement("button");
      el.className = `card ${card.rarity}` + (taken ? " taken" : "") + (locked ? " locked" : "") +
        (opts.took === i ? " bought" : "") +
        (opts.deal || (opts.rerolled && !taken) ? " deal" : "");
      el.style.setProperty("--accent", card.color);
      el.style.setProperty("--rarity", rar.color);
      el.style.setProperty("--i", i);
      el.dataset.slot = i;
      el.setAttribute("aria-label", `${card.name}, ${rar.label}: ${card.desc}`);
      const tag = taken ? '<span class="tag done">&#10003; Taken</span>'
        : !s.picked ? '<span class="tag free">FREE</span>'
        : `<span class="tag"><i class="coin"></i>${extraPrice}</span>`;
      el.innerHTML = `
        <span class="ribbon">${rar.label}</span>
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${card.icon}</svg></span>
        <span class="name">${card.name}</span>
        <span class="level">${shownLvl === 1 && !taken ? "NEW" : "Lv " + shownLvl}${card.maxLevel ? " / " + card.maxLevel : ""}</span>
        <span class="desc">${card.desc}</span>
        <span class="stat">${card.stat(g.tower)}</span>
        ${tag}`;
      this.el.cardRow.appendChild(el);
    });

    const rerollPrice = g.shopPrice("reroll");
    this.el.rerollPrice.textContent = rerollPrice;
    this.el.reroll.disabled = !open || g.coins < rerollPrice;
    const t = g.tower;
    const repairPrice = g.shopPrice("repair");
    this.el.repairPrice.textContent = repairPrice;
    this.el.repairHp.textContent = `${Math.ceil(t.hp)}/${Math.round(t.maxHp)}`;
    this.el.repair.disabled = t.hp >= t.maxHp || g.coins < repairPrice;
    this.el.repair.classList.toggle("urgent", t.hp < t.maxHp * 0.4 && !this.el.repair.disabled);
    if (opts.repaired) LST.UI.pop(this.el.repair, "bump");

    const canGo = g.canLeaveShop();
    this.el.next.disabled = !canGo;
    this.el.next.innerHTML = canGo ? "Next wave &#9654;" : "Pick a card first";
    if (opts.deal) LST.audio.play("deal");
  }
};

// Restart a CSS "squash & stretch" entrance animation on an element.
LST.UI.pop = function (el, cls = "pop") {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // force reflow so the animation replays
  el.classList.add(cls);
};
