// DOM overlays: HUD, start / shop / pause / results / workshop screens.
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
        results: $("screen-results"),
        workshop: $("screen-workshop"),
      },
      startGears: $("start-gears"),
      startBadge: $("start-badge"),
      startWelcome: $("start-welcome"),
      wsGears: $("ws-gears"),
      wsHint: $("ws-hint"),
      wsGrid: $("ws-grid"),
      wsStarter: $("ws-starter"),
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
    };

    $("btn-start").addEventListener("click", () => game.newGame());
    $("btn-restart").addEventListener("click", () => game.newGame());
    $("btn-workshop").addEventListener("click", () => game.openWorkshop("start"));
    $("btn-res-workshop").addEventListener("click", () => game.openWorkshop("results"));
    $("btn-ws-back").addEventListener("click", () => game.closeWorkshop());
    $("btn-ws-play").addEventListener("click", () => game.newGame());
    this.el.wsGrid.addEventListener("click", (ev) => {
      const card = ev.target.closest("[data-card]");
      if (!card || card.classList.contains("owned")) return;
      if (!game.unlockCard(card.dataset.card)) {
        LST.UI.pop(card, "shake");
        const c = LST.meta.card(card.dataset.card);
        this.el.wsHint.innerHTML = `Need <b>${c.unlockCost - LST.meta.state.gears}</b> more Gears for ${c.name}. Play a run!`;
      }
    });
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
      if (b && !b.classList.contains("card") && !b.classList.contains("ws-card") && !b.closest(".shop-actions")) LST.audio.play("tap");
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
    this.el.hud.classList.toggle("hidden", name === "start" || name === "results" || name === "workshop" || name === "dying");
    if (this.el.screens[name]) LST.UI.pop(this.el.screens[name].querySelector(".panel"));
    if (name !== "results") this.stopCount();
    if (name === "start") this.renderStart();
    if (name === "upgrade") this.renderShop({ deal: true });
    if (name === "results") this.renderResults();
    if (name === "workshop") this.renderWorkshop();
  }

  renderStart() {
    const m = LST.meta;
    this.el.startBest.textContent = this.game.bestWave;
    this.el.startGears.textContent = LST.utils.formatNumber(m.state.gears);
    this.el.startBadge.classList.toggle("hidden", !m.anyAffordable());
    // One-time hello for players from before Gears existed.
    const w = this.el.startWelcome;
    if (m.state.veteranBonus && !m.state.seenWorkshop) {
      w.innerHTML = `Welcome back! Your best wave earned you <b>${m.state.veteranBonus} Gears</b>. Spend them in the Workshop.`;
      w.classList.remove("hidden");
    } else w.classList.add("hidden");
  }

  // ---------- Results screen ----------
  renderResults() {
    const g = this.game;
    const r = g.result;
    if (!r) return;
    const $ = (id) => document.getElementById(id);
    const fmt = LST.utils.formatNumber;
    $("res-wave").textContent = r.wave;
    const best = $("res-best");
    best.textContent = r.newBest ? `New best: wave ${g.bestWave}!` : `Best wave: ${g.bestWave}`;
    best.classList.toggle("new", r.newBest);
    const sec = Math.round(r.time);
    $("res-time").textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
    $("res-kills").textContent = fmt(r.kills);
    $("res-coins").textContent = fmt(r.coins);
    $("res-score").textContent = fmt(r.score);

    // Cards taken this run, as little icon chips.
    const cards = r.cards.map(([id, n]) => [LST.meta.card(id), n]).filter(([c]) => c);
    $("res-cards").innerHTML = cards.length
      ? cards.map(([c, n]) => `<span class="chip ${c.rarity}" style="--accent:${c.color}" title="${c.name}"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg>${n > 1 ? `<b>x${n}</b>` : ""}</span>`).join("")
      : '<small>No cards this time</small>';

    $("res-g-wave-n").textContent = `wave ${r.wave}`;
    $("res-g-waves").textContent = `+${r.gears.waves}`;
    $("res-g-boss-n").textContent = `x${r.bossWaves}`;
    $("res-g-bosses").textContent = `+${r.gears.bosses}`;
    $("res-gears").textContent = "+0";
    document.getElementById("res-badge").classList.add("hidden");
    this.renderNextUnlock(r.gearsBefore);
    this.countGears(r);
  }

  // "Next unlock: Multishot, 15 Gears (you have 12)" with a progress bar.
  renderNextUnlock(have) {
    const el = document.getElementById("res-next");
    const r = this.game.result;
    const c = r && r.nextUnlock && !LST.meta.isUnlocked(r.nextUnlock.id) ? r.nextUnlock : LST.meta.nextUnlock();
    if (!c) { el.innerHTML = '<span class="nu-text"><b>Every card unlocked!</b> More coming soon.</span>'; return; }
    const pct = Math.min(1, have / c.unlockCost);
    const ready = have >= c.unlockCost;
    el.className = "next-unlock" + (ready ? " ready" : "");
    el.innerHTML = `
      <span class="nu-icon" style="--accent:${c.color}"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg></span>
      <span class="nu-body">
        <span class="nu-text">${ready ? "Ready to unlock: " : "Next unlock: "}<b>${c.name}</b>, ${c.unlockCost} Gears <small>(you have ${fmtInt(have)})</small></span>
        <span class="nu-bar"><i style="width:${(pct * 100).toFixed(1)}%"></i></span>
      </span>`;
    function fmtInt(n) { return LST.utils.formatNumber(n); }
  }

  // Gears count up with a coin-pop clink per step, then a ka-ching.
  countGears(r) {
    this.stopCount();
    const total = r.gears.total;
    const box = document.getElementById("res-gears-total");
    const num = document.getElementById("res-gears");
    const dur = Math.min(1.6, 0.5 + total * 0.02) * 1000;
    const startAt = performance.now() + 450; // after the panel pops in
    let shown = 0;
    const tick = (now) => {
      const t = Math.max(0, Math.min(1, (now - startAt) / dur));
      const v = Math.round(total * (1 - Math.pow(1 - t, 2)));
      if (v > shown) {
        shown = v;
        num.textContent = `+${v}`;
        LST.UI.pop(box, "bump");
        LST.audio.play("gear", { pitch: 1 + 0.5 * t });
        this.renderNextUnlock(r.gearsBefore + v);
      }
      if (t < 1) this.countRaf = requestAnimationFrame(tick);
      else {
        this.countRaf = 0;
        num.textContent = `+${total}`;
        box.classList.add("done");
        LST.audio.play("gearsTotal");
        this.renderNextUnlock(r.gearsAfter);
        const badge = document.getElementById("res-badge");
        badge.classList.toggle("hidden", !LST.meta.anyAffordable());
        if (LST.meta.anyAffordable()) LST.UI.pop(document.getElementById("btn-res-workshop"), "bump");
      }
    };
    document.getElementById("res-gears-total").classList.remove("done");
    this.countRaf = requestAnimationFrame(tick);
  }

  stopCount() {
    if (this.countRaf) cancelAnimationFrame(this.countRaf);
    this.countRaf = 0;
  }

  // ---------- Workshop ----------
  // opts.unlocked: id of the card just unlocked (plays its reveal animation)
  renderWorkshop(opts = {}) {
    const m = LST.meta;
    this.el.wsGears.textContent = LST.utils.formatNumber(m.state.gears);
    if (opts.unlocked) LST.UI.pop(document.getElementById("ws-gears-pill"), "bump");
    const next = m.nextUnlock();
    const justName = opts.unlocked && m.card(opts.unlocked).name;
    this.el.wsHint.innerHTML = justName ? `<b>${justName}</b> can now show up in the shop!`
      : !next ? "Every card unlocked. Nice work!"
      : m.anyAffordable() ? "Tap a glowing card to unlock it!"
      : `Earn Gears by playing. Next: <b>${next.name}</b> for ${next.unlockCost}.`;

    this.el.wsStarter.innerHTML = LST.CARDS.filter((c) => !c.unlockCost)
      .map((c) => `<span class="chip" style="--accent:${c.color}" title="${c.name}: ${c.desc}"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg><em>${c.name}</em></span>`).join("");

    this.el.wsGrid.innerHTML = "";
    for (const c of m.lockable()) {
      const owned = m.isUnlocked(c.id);
      const afford = !owned && m.state.gears >= c.unlockCost;
      const rar = LST.RARITY[c.rarity];
      const el = document.createElement("button");
      el.className = `ws-card ${c.rarity}` + (owned ? " owned" : " locked") + (afford ? " afford" : "") +
        (next && c.id === next.id && !afford ? " next" : "") + (opts.unlocked === c.id ? " revealed" : "");
      el.dataset.card = c.id;
      el.style.setProperty("--accent", c.color);
      el.style.setProperty("--rarity", rar.color);
      el.setAttribute("aria-label", `${c.name}, ${rar.label}: ${c.desc}. ${owned ? "Unlocked" : c.unlockCost + " Gears"}`);
      el.innerHTML = `
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg>${owned ? "" : LOCK_SVG}</span>
        <span class="ws-body"><span class="name">${c.name} <i class="rar">${rar.label}</i></span><span class="desc">${c.desc}</span></span>
        <span class="ws-price">${owned ? "&#10003;" : `${GEAR_SVG}<b>${c.unlockCost}</b>`}</span>`;
      this.el.wsGrid.appendChild(el);
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

const GEAR_SVG = '<svg class="gear" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.22 4.28L10.11 1.16L13.89 1.16L14.78 4.28L15.49 4.58L18.33 3.00L21.00 5.67L19.42 8.51L19.72 9.22L22.84 10.11L22.84 13.89L19.72 14.78L19.42 15.49L21.00 18.33L18.33 21.00L15.49 19.42L14.78 19.72L13.89 22.84L10.11 22.84L9.22 19.72L8.51 19.42L5.67 21.00L3.00 18.33L4.58 15.49L4.28 14.78L1.16 13.89L1.16 10.11L4.28 9.22L4.58 8.51L3.00 5.67L5.67 3.00L8.51 4.58Z M12 8.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 1 0 0-7.2Z"/></svg>';
const LOCK_SVG = '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';

// Restart a CSS "squash & stretch" entrance animation on an element.
LST.UI.pop = function (el, cls = "pop") {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // force reflow so the animation replays
  el.classList.add(cls);
};
