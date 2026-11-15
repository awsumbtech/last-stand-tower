// ResultsScreen ("results"): the run's end. Title, wave, best, time / kills / coins / score,
// the cards taken, the Gears breakdown counting up (a clink per step, then a ka-ching), the
// next-unlock bar and the Workshop badge. Play again and Workshop buttons.
LST.ResultsScreen = class ResultsScreen extends LST.Screen {
  constructor(ui, game) {
    super(ui, game, document.getElementById("screen-results"), true);
    this.countRaf = 0;
    document.getElementById("btn-restart").addEventListener("click", () => game.newGame());
    document.getElementById("btn-res-workshop").addEventListener("click", () => game.openWorkshop("results"));
  }

  onShow() { this.render(); }
  leave() { this.stopCount(); }

  render() {
    const g = this.game;
    const r = g.result;
    if (!r) return;
    const $ = (id) => document.getElementById(id);
    const fmt = LST.utils.formatNumber;
    $("res-wave").textContent = r.wave;
    const title = $("res-title");
    title.textContent = r.won ? "World cleared!" : r.endless ? "Endless run over!" : "Tower down!";
    title.classList.toggle("red", !r.won);
    title.classList.toggle("green", !!r.won);
    const wbRow = $("res-g-world");
    wbRow.classList.toggle("hidden", !r.worldBonus);
    if (r.worldBonus) wbRow.querySelector("b").textContent = `+${r.worldBonus.bonus} (banked)`;
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
    $("res-g-boss-n").textContent = `x${r.bossKills}`;
    $("res-g-bosses").textContent = `+${r.gears.bosses}`;
    $("res-gears").textContent = "+0";
    const piggy = $("res-g-piggy");
    piggy.classList.toggle("hidden", !(r.gearMult > 1));
    piggy.querySelector("b").textContent = `x${(r.gearMult || 1).toFixed(1)}`;
    if (LST.WorldScreens) LST.WorldScreens.results(r);
    const nc = $("res-codex");
    nc.classList.toggle("hidden", !r.newCodex.length);
    nc.innerHTML = r.newCodex.length ? `${LST.UiIcons.EYE}<span>New in the Codex: <b>${r.newCodex.map((id) => LST.cardById(id).name).join(", ")}</b></span>` : "";
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
        <span class="nu-text">${ready ? "Ready to unlock: " : "Next unlock: "}<b>${c.name}</b>, ${c.unlockCost} Gears <small>(you have ${LST.utils.formatNumber(have)})</small></span>
        <span class="nu-bar"><i style="width:${(pct * 100).toFixed(1)}%"></i></span>
      </span>`;
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
};
