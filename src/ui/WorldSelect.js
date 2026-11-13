// WorldSelect: the world cards on the start screen (ROADMAP Sprint 6 "World select").
// Single job: show one card per registered world (art, name, best wave, Gear multiplier, locked /
// cleared state) and turn a tap into game.selectWorld(id). Lifecycle: made once by the UI, render()
// on every start-screen show. The card art is an <img> of the world's card image; if it fails to
// load the <img> is removed and the card is text only (no drawn stand-in).
LST.WorldSelect = class WorldSelect {
  constructor(game, root, opts = {}) {
    this.game = game;
    this.root = root;
    this.onChange = opts.onChange || null;
    this.registry = opts.registry || LST.WorldRegistry;
    if (root) root.addEventListener("click", (ev) => this.onTap(ev));
  }

  // Plain data for one card (also what the tests read).
  card(w) {
    const m = LST.meta, R = this.registry;
    const open = R.isUnlocked(w.id);
    const rec = w.record(m);
    const best = w.loadBest();
    const lockedBy = w.unlock && R.get(w.unlock.cleared);
    return {
      id: w.id, name: w.name, open, selected: this.game.world === w,
      cleared: !!(rec && rec.cleared), best, gearMult: w.gearMult, art: w.art && w.art.card,
      dev: open && !w.isUnlockedBy(m),
      lockText: open ? "" : `Beat ${lockedBy ? lockedBy.name : "the last world"} wave ${(lockedBy && lockedBy.plan ? lockedBy.plan.finaleWave : LST.CONFIG.finale.wave)} to unlock`,
    };
  }

  cards() { return this.registry.list().map((w) => this.card(w)); }

  render() {
    if (!this.root) return;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    this.root.innerHTML = this.cards().map((c) => `
      <button class="world-card${c.selected ? " on" : ""}${c.open ? "" : " locked"}" data-world="${c.id}" aria-pressed="${c.selected}"
        aria-label="${esc(c.name)}${c.open ? `, best wave ${c.best}, Gears x${c.gearMult}` : `, locked. ${esc(c.lockText)}`}">
        ${c.art ? `<span class="wc-pic"><img class="wc-art" src="${esc(c.art)}" alt="" draggable="false">${c.open ? "" : `<img class="wc-lock" src="${LST.WorldSelect.LOCK_ART}" alt="" draggable="false">`}</span>` : ""}
        <span class="wc-body">
          <span class="wc-name">${esc(c.name)}${c.cleared ? ' <i class="wc-done">&#10003;</i>' : ""}${c.dev ? ' <i class="wc-dev">test</i>' : ""}</span>
          <span class="wc-line">${c.open ? `Best wave <b>${c.best}</b>` : esc(c.lockText.replace(/ to unlock$/, ""))}</span>
          <span class="wc-mult">Gears <b>x${c.gearMult}</b></span>
        </span>
      </button>`).join("");
    for (const img of this.root.querySelectorAll("img.wc-art, img.wc-lock")) {
      img.addEventListener("error", () => img.remove(), { once: true });
    }
  }

  onTap(ev) {
    const el = ev.target.closest("[data-world]");
    if (!el) return;
    const id = el.dataset.world;
    if (!this.registry.isUnlocked(id)) {
      if (LST.UI && LST.UI.pop) LST.UI.pop(el, "shake");
      if (LST.audio) LST.audio.play("deny");
      return;
    }
    if (this.game.selectWorld(id)) {
      if (LST.audio) LST.audio.play("tap");
      if (this.onChange) this.onChange(id); else this.render();
    }
  }
};
// Game Art & Motion's lock illustration, laid over a locked world's card art (dimmed by CSS).
LST.WorldSelect.LOCK_ART = "assets/sprites/world2/cards/card_locked_overlay.png";
