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
        confirm: $("screen-confirm"),
        gotcha: $("screen-gotcha"),
      },
      startGears: $("start-gears"),
      startBadge: $("start-badge"),
      startWelcome: $("start-welcome"),
      wsGears: $("ws-gears"),
      wsHint: $("ws-hint"),
      wsGrid: $("ws-grid"),
      headStart: $("btn-headstart"),
      headStartLabel: $("headstart-label"),
      auto: $("btn-auto"),
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
    // Workshop: one delegated listener for all three tabs.
    this.wsTab = "cards";
    this.el.wsGrid.addEventListener("click", (ev) => {
      const el = ev.target.closest("[data-card],[data-upgrade],[data-bench],[data-codex]");
      if (!el) return;
      const m = LST.meta;
      if (el.dataset.card) {
        if (el.classList.contains("owned")) return;
        if (!game.unlockCard(el.dataset.card)) {
          LST.UI.pop(el, "shake");
          const c = m.card(el.dataset.card);
          this.el.wsHint.innerHTML = `Need <b>${c.unlockCost - m.state.gears}</b> more Gears for ${c.name}. Play a run!`;
        }
      } else if (el.dataset.upgrade) {
        const id = el.dataset.upgrade;
        if (!game.buyUpgrade(id)) {
          LST.UI.pop(el, "shake");
          const cost = m.upgradeCost(id);
          this.el.wsHint.innerHTML = cost === Infinity ? "That one is maxed out!" : `Need <b>${cost - m.state.gears}</b> more Gears.`;
        }
      } else if (el.dataset.codex) {
        this.codexSel = this.codexSel === el.dataset.codex ? null : el.dataset.codex;
        LST.audio.play("tap");
        this.renderWorkshop();
      } else if (el.dataset.bench) {
        const why = m.benchBlock(el.dataset.bench);
        if (!game.toggleBench(el.dataset.bench)) {
          LST.UI.pop(el, "shake");
          this.el.wsHint.textContent = why;
        }
      }
    });
    document.querySelectorAll(".tabs .tab").forEach((t) => t.addEventListener("click", () => {
      if (this.wsTab === t.dataset.tab) return;
      this.wsTab = t.dataset.tab;
      this.renderWorkshop({ tab: true });
    }));
    this.el.headStart.addEventListener("click", () => {
      LST.meta.cycleHeadStart(game.bestWave);
      LST.UI.pop(this.el.headStart, "bump");
      this.renderStart();
    });
    this.el.auto.addEventListener("click", () => game.autoDraft());
    $("btn-return").addEventListener("click", () => game.returnTrap());
    $("btn-gotcha").addEventListener("click", () => game.dismissGotcha());
    // Settings (start screen) reuses the pause panel; reset progress asks first.
    $("btn-settings").addEventListener("click", () => this.show("pause"));
    $("btn-reset").addEventListener("click", () => this.show("confirm"));
    $("btn-confirm-cancel").addEventListener("click", () => this.show("pause"));
    $("btn-confirm-reset").addEventListener("click", () => {
      game.resetProgress();
      LST.audio.play("reroll");
      this.toast("Progress reset. Fresh start!");
    });
    $("btn-next").addEventListener("click", () => game.leaveShop());
    this.el.reroll.addEventListener("click", () => game.rerollShop());
    this.el.repair.addEventListener("click", () => game.repairTower());
    $("btn-pause").addEventListener("click", () => game.togglePause());
    $("btn-resume").addEventListener("click", () => (game.state === "paused" ? game.togglePause() : this.show(game.state === "gameover" ? "results" : "start")));
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
    this.el.hud.classList.toggle("hidden", name === "start" || name === "results" || name === "workshop" || name === "dying" || name === "gotcha");
    if (this.el.screens[name]) LST.UI.pop(this.el.screens[name].querySelector(".panel"));
    if (name !== "results") this.stopCount();
    if (name === "start") this.renderStart();
    if (name === "pause") {
      const inRun = this.game.state === "paused";
      document.getElementById("pause-title").textContent = inRun ? "Paused" : "Settings";
      document.getElementById("btn-resume").textContent = inRun ? "Resume" : "Done";
      document.getElementById("btn-quit").classList.toggle("hidden", !inRun);
    }
    if (name === "upgrade") this.renderShop({ deal: true });
    if (name === "results") this.renderResults();
    if (name === "gotcha") this.renderGotcha();
    if (name === "workshop") this.renderWorkshop();
  }

  renderStart() {
    const m = LST.meta;
    this.el.startBest.textContent = this.game.bestWave;
    this.el.startGears.textContent = LST.utils.formatNumber(m.state.gears);
    this.el.startBadge.classList.toggle("hidden", !m.anyAffordable());
    // Head Start chip: tap to cycle the start wave (0, 5, 10 ... up to the max allowed).
    const max = m.headStartMax(this.game.bestWave);
    this.el.headStart.classList.toggle("hidden", max <= 0);
    const hs = m.headStartWave(this.game.bestWave);
    this.el.headStartLabel.innerHTML = hs > 0 ? `Head Start: <b>wave ${hs + 1}</b>` : "Head Start: <b>off</b>";
    this.el.headStart.classList.toggle("off", hs <= 0);
    // One-time hello for players from before Gears existed.
    const w = this.el.startWelcome;
    if (m.state.armorNotice) {
      w.innerHTML = `New: <b>Armor</b> now blocks damage (-${(m.armorReduction() * 100).toFixed(0)}% at your level)${m.state.armorRefund ? `, and you got <b>${m.state.armorRefund} Gears</b> back for levels above the new max` : ""}.`;
      w.classList.remove("hidden");
    } else if (m.state.veteranBonus && !m.state.seenWorkshop) {
      w.innerHTML = `Welcome back! Your best wave earned you <b>${m.state.veteranBonus} Gears</b>. Spend them in the Workshop.`;
      w.classList.remove("hidden");
    } else w.classList.add("hidden");
  }

  // ---------- "Gotcha!" reveal ----------
  renderGotcha() {
    const id = this.game.gotchaQueue[0];
    const c = id && LST.cardById(id);
    if (!c) return;
    const rar = LST.RARITY[c.rarity];
    const flip = document.getElementById("gotcha-flip");
    flip.style.setProperty("--accent", c.color);
    flip.style.setProperty("--rarity", rar.color);
    flip.className = `gotcha-flip ${c.rarity}`;
    flip.innerHTML = `
      <div class="face front card ${c.rarity}" style="--accent:${c.color};--rarity:${rar.color}">
        <span class="ribbon">${rar.label}</span>
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg></span>
        <span class="name">${c.name}</span>
        <span class="desc">${c.desc}</span>
        <span class="fine">${c.fine}</span>
      </div>
      <div class="face back">
        <span class="stamp">GOTCHA!</span>
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg></span>
        <span class="name">${c.name} <i class="kind">${KIND_LABEL[c.kind]}</i></span>
        <span class="truth">${c.truth}</span>
      </div>`;
    document.getElementById("gotcha-lesson").innerHTML = `<b>Lesson:</b> ${c.lesson}`;
    void flip.offsetWidth;
    flip.classList.add("go");
    setTimeout(() => { LST.audio.play("stamp"); LST.haptics.buzz(30); }, 900);
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
    const cards = r.cards.filter(([, n]) => n > 0).map(([id, n]) => [LST.cardById(id), n]).filter(([c]) => c && c.id !== "mysteryBox");
    $("res-cards").innerHTML = cards.length
      ? cards.map(([c, n]) => `<span class="chip ${c.rarity}" style="--accent:${c.color}" title="${c.name}"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg>${n > 1 ? `<b>x${n}</b>` : ""}</span>`).join("")
      : '<small>No cards this time</small>';

    $("res-g-wave-n").textContent = `wave ${r.wave}`;
    $("res-g-waves").textContent = `+${r.gears.waves}`;
    $("res-g-boss-n").textContent = `x${r.bossWaves}`;
    $("res-g-bosses").textContent = `+${r.gears.bosses}`;
    $("res-gears").textContent = "+0";
    const piggy = $("res-g-piggy");
    piggy.classList.toggle("hidden", !(r.gearMult > 1));
    piggy.querySelector("b").textContent = `x${(r.gearMult || 1).toFixed(1)}`;
    const nc = $("res-codex");
    nc.classList.toggle("hidden", !r.newCodex.length);
    nc.innerHTML = r.newCodex.length ? `${EYE_SVG}<span>New in the Codex: <b>${r.newCodex.map((id) => LST.cardById(id).name).join(", ")}</b></span>` : "";
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

  // ---------- Workshop: Cards / Upgrades / Deck tabs ----------
  // opts.unlocked / opts.bought / opts.benched: id that just changed (plays its animation)
  renderWorkshop(opts = {}) {
    const m = LST.meta;
    const tab = this.wsTab;
    this.el.wsGears.textContent = LST.utils.formatNumber(m.state.gears);
    if (opts.unlocked || opts.bought) LST.UI.pop(document.getElementById("ws-gears-pill"), "bump");
    document.querySelectorAll(".tabs .tab").forEach((t) => {
      const on = t.dataset.tab === tab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
      const dot = t.querySelector(".dot");
      if (dot) dot.classList.toggle("hidden", t.dataset.tab === "cards" ? !m.cardsAffordable() : !m.upgradesAffordable());
    });
    const grid = this.el.wsGrid;
    grid.className = `ws-list tab-${tab}` + (opts.tab ? " swap" : "");
    grid.innerHTML = "";
    if (tab === "cards") this.renderCardsTab(grid, opts);
    else if (tab === "upgrades") this.renderUpgradesTab(grid, opts);
    else if (tab === "codex") this.renderCodexTab(grid, opts);
    else this.renderDeckTab(grid, opts);
    [...grid.children].forEach((c, i) => c.style.setProperty("--n", i));
  }

  renderCardsTab(grid, opts) {
    const m = LST.meta;
    const next = m.nextUnlock();
    const justName = opts.unlocked && m.card(opts.unlocked).name;
    this.el.wsHint.innerHTML = justName ? `<b>${justName}</b> can now show up in the shop!`
      : !next ? "Every card unlocked. Nice work!"
      : m.cardsAffordable() ? "Tap a glowing card to unlock it!"
      : `Earn Gears by playing. Next: <b>${next.name}</b> for ${next.unlockCost}.`;
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
      grid.appendChild(el);
    }
  }

  renderUpgradesTab(grid, opts) {
    const m = LST.meta;
    const cfg = LST.CONFIG.meta.upgrades;
    const best = this.game.bestWave;
    this.el.wsHint.innerHTML = opts.bought ? `${LST.UPGRADES.find((u) => u.id === opts.bought).name} upgraded!`
      : "Lasting upgrades. They apply to every run.";
    for (const u of LST.UPGRADES) {
      const lvl = m.level(u.id), max = cfg[u.id].max, cost = m.upgradeCost(u.id);
      const maxed = cost === Infinity;
      const afford = !maxed && m.state.gears >= cost;
      const el = document.createElement("button");
      el.className = "ws-card upg" + (maxed ? " owned" : afford ? " afford" : "") + (opts.bought === u.id ? " bought" : "");
      el.dataset.upgrade = u.id;
      el.style.setProperty("--accent", u.color);
      let note = lvl ? u.desc(lvl) : "Not built yet";
      if (u.id === "headStart") {
        const cap = m.headStartMax(best), want = lvl * cfg.headStart.per;
        note = lvl ? (cap < want ? `Up to wave ${want + 1} (best ${best} allows ${cap + 1})` : u.desc(lvl)) : "Skip early waves (and replay their shops)";
      }
      const nextTxt = maxed ? "Maxed" : `Next: ${u.desc(lvl + 1).replace(/^Start up to /, "")}`;
      el.setAttribute("aria-label", `${u.name}, level ${lvl} of ${max}. ${note}. ${maxed ? "Maxed" : cost + " Gears"}`);
      el.innerHTML = `
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${u.icon}</svg><i class="lvl">${lvl}</i></span>
        <span class="ws-body"><span class="name">${u.name} <i class="rar">Lv ${lvl}/${max}</i></span><span class="desc">${note}</span><span class="next-txt">${nextTxt}</span></span>
        <span class="ws-price">${maxed ? "MAX" : `${GEAR_SVG}<b>${LST.utils.formatNumber(cost)}</b>`}</span>`;
      grid.appendChild(el);
    }
  }

  renderDeckTab(grid, opts) {
    const m = LST.meta;
    const n = m.state.benched.length, max = LST.CONFIG.meta.benchMax;
    this.el.wsHint.innerHTML = opts.benched
      ? (m.isBenched(opts.benched) ? `<b>${m.card(opts.benched).name}</b> benched. It won't show up in the shop.` : `<b>${m.card(opts.benched).name}</b> is back in the deck.`)
      : `Tap a card to bench it (${n}/${max}). Benched cards stay out of the shop.`;
    for (const c of LST.CARDS) {
      const unlocked = m.isUnlocked(c.id), benched = m.isBenched(c.id);
      const el = document.createElement("button");
      el.className = `deck-card ${c.rarity}` + (unlocked ? "" : " locked") + (benched ? " benched" : "") + (opts.benched === c.id ? " flipped" : "");
      el.style.setProperty("--accent", c.color);
      if (unlocked) el.dataset.bench = c.id;
      el.setAttribute("aria-label", `${c.name}: ${unlocked ? (benched ? "benched" : "in deck") : "locked"}`);
      el.innerHTML = `
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg>${unlocked ? "" : LOCK_SVG}</span>
        <span class="name">${c.name}</span>
        <span class="state">${!unlocked ? "Locked" : benched ? "Benched" : "In deck"}</span>`;
      grid.appendChild(el);
    }
  }

  // Codex: every card you've been dealt, and the traps you've discovered (with their lesson).
  renderCodexTab(grid, opts) {
    const m = LST.meta;
    const found = LST.TRAPS.filter((t) => m.knowsTrap(t.id)).length;
    const seen = LST.CARDS.filter((c) => m.state.codex.seen.includes(c.id)).length;
    const sel = this.codexSel && LST.cardById(this.codexSel);
    const known = sel && (sel.trap ? m.knowsTrap(sel.id) : m.state.codex.seen.includes(sel.id));
    this.el.wsHint.innerHTML = sel && known
      ? (sel.trap ? `<b>${sel.name}:</b> ${sel.truth} <i>${sel.lesson}</i>` : `<b>${sel.name}:</b> ${sel.desc}`)
      : sel ? "Not found yet. Keep playing!"
      : `Cards <b>${seen}/${LST.CARDS.length}</b> &middot; Traps found <b>${found}/${LST.TRAPS.length}</b>. Tap one to read it.`;
    this.el.wsHint.classList.toggle("codex-detail", !!(sel && known));
    const add = (c, isTrap) => {
      const has = isTrap ? m.knowsTrap(c.id) : m.state.codex.seen.includes(c.id);
      const el = document.createElement("button");
      el.className = `codex-tile ${c.rarity}` + (isTrap ? " trap" : "") + (has ? " found" : " unknown") + (this.codexSel === c.id ? " sel" : "");
      el.dataset.codex = c.id;
      el.style.setProperty("--accent", c.color);
      el.setAttribute("aria-label", has ? c.name : "Unknown card");
      el.innerHTML = `<span class="icon">${has ? `<svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg>` : "?"}</span>
        <span class="name">${has ? c.name : "???"}</span>${isTrap && has ? '<span class="stamp">GOTCHA</span>' : ""}`;
      grid.appendChild(el);
    };
    LST.CARDS.forEach((c) => add(c, false));
    LST.TRAPS.forEach((c) => add(c, true));
  }

  // Small floating message at the bottom of the screen.
  toast(text) {
    const t = document.createElement("div");
    t.className = "mini-toast";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
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
    const d = g.draft;
    document.getElementById("up-title").innerHTML = d ? `Head Start <span class="hand">${d.hand} / ${d.of}</span>` : `Wave <span id="up-wave">${g.wave}</span> cleared!`;
    this.el.upCoins.textContent = LST.utils.formatNumber(g.coins);

    const extraPrice = g.shopPrice("extraCard");
    const open = s.cards.filter((c) => !c.taken).length;
    this.el.shopHint.innerHTML = d && !s.picked
      ? `Wave ${d.hand}'s shop: pick a card, it's <b>free</b>!`
      : !s.picked
      ? "Pick a card. It's <b>free</b>!"
      : open ? "Want another? Extra cards cost coins." : "All cards taken. Nice haul!";
    this.el.auto.classList.toggle("hidden", !d || d.hand >= d.of);
    this.el.reroll.classList.toggle("hidden", !!d && d.hand < d.of);
    this.el.shopHint.classList.toggle("free", !s.picked);

    this.el.cardRow.innerHTML = "";
    s.cards.forEach((slot, i) => {
      const { card, taken } = slot;
      const lvl = g.upgradeLevels[card.id] || 0;
      const appraisal = LST.meta.level("appraisal");
      const known = card.trap && LST.meta.knowsTrap(card.id);
      const shownLvl = taken ? lvl : lvl + 1; // level after taking it
      const rar = LST.RARITY[card.rarity];
      const locked = !taken && s.picked && g.coins < extraPrice;
      const el = document.createElement("button");
      el.className = `card ${card.rarity}` + (taken ? " taken" : "") + (locked ? " locked" : "") +
        (opts.took === i ? " bought" : "") + (slot.from && opts.took === i ? " mystery" : "") +
        (card.trap && appraisal >= 1 && card.kind !== "dud" && card.kind !== "build" ? " cursed" : "") +
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
        ${known ? `<span class="eye" title="Known trap">${EYE_SVG}</span>` : ""}
        <span class="level">${slot.from ? "from Mystery Box" : card.trap ? "NEW" : (shownLvl === 1 && !taken ? "NEW" : "Lv " + shownLvl) + (card.maxLevel ? " / " + card.maxLevel : "")}</span>
        <span class="desc">${card.desc}</span>
        ${card.trap ? `<span class="fine${appraisal >= 2 || known ? " full" : ""}">${appraisal >= 2 || known ? card.truth : card.fine}</span>` : `<span class="stat">${card.stat(g.tower)}</span>`}
        ${tag}`;
      this.el.cardRow.appendChild(el);
    });

    // Appraisal L3: return a trap you just took.
    const ret = g.returnableTrap();
    const retEl = document.getElementById("btn-return");
    retEl.classList.toggle("hidden", !ret);
    if (ret) retEl.innerHTML = `&#8617; Return ${LST.cardById(ret.id).name} <small>(${ret.paid ? "+" + ret.paid + " coins" : "free reroll"})</small>`;
    if (opts.returned) this.el.shopHint.innerHTML = `${LST.cardById(opts.returned).name} returned. Good eye!`;

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
    this.el.next.innerHTML = !canGo ? "Pick a card first" : d && d.hand < d.of ? "Next hand &#9654;" : `${d ? "Start wave " + (d.of + 1) : "Next wave"} &#9654;`;
    if (opts.deal) LST.audio.play("deal");
  }
};

const GEAR_SVG = '<svg class="gear" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.22 4.28L10.11 1.16L13.89 1.16L14.78 4.28L15.49 4.58L18.33 3.00L21.00 5.67L19.42 8.51L19.72 9.22L22.84 10.11L22.84 13.89L19.72 14.78L19.42 15.49L21.00 18.33L18.33 21.00L15.49 19.42L14.78 19.72L13.89 22.84L10.11 22.84L9.22 19.72L8.51 19.42L5.67 21.00L3.00 18.33L4.58 15.49L4.28 14.78L1.16 13.89L1.16 10.11L4.28 9.22L4.58 8.51L3.00 5.67L5.67 3.00L8.51 4.58Z M12 8.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 1 0 0-7.2Z"/></svg>';
const EYE_SVG = '<svg class="eye-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/></svg>';
const KIND_LABEL = { cursed: "Cursed", delayed: "Delayed cost", build: "Build-dependent", gamble: "Gamble", dud: "Dud" };
const LOCK_SVG = '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';

// Restart a CSS "squash & stretch" entrance animation on an element.
LST.UI.pop = function (el, cls = "pop") {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // force reflow so the animation replays
  el.classList.add(cls);
};
