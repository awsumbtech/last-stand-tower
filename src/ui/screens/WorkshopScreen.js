// WorkshopScreen ("workshop"): between runs. Gears, the tab bar and one tab object per tab
// (CardsTab, UpgradesTab, DeckTab, CodexTab) drawing into the shared grid, with the hint line.
// One delegated listener turns a tap into unlock / buy / bench / equip / read.
LST.WorkshopScreen = class WorkshopScreen extends LST.Screen {
  constructor(ui, game) {
    super(ui, game, document.getElementById("screen-workshop"), true);
    const $ = (id) => document.getElementById(id);
    this.gears = $("ws-gears");
    this.hint = $("ws-hint");
    this.grid = $("ws-grid");
    this.tab = "cards";
    this.codexSel = null;
    this.tabs = { cards: new LST.CardsTab(this), upgrades: new LST.UpgradesTab(this), deck: new LST.DeckTab(this), codex: new LST.CodexTab(this) };
    $("btn-ws-back").addEventListener("click", () => game.closeWorkshop());
    $("btn-ws-play").addEventListener("click", () => game.newGame());
    // One delegated listener for all the tabs.
    this.grid.addEventListener("click", (ev) => {
      const el = ev.target.closest("[data-card],[data-upgrade],[data-bench],[data-codex],[data-ability]");
      if (!el) return;
      const m = LST.meta;
      if (el.dataset.ability) {
        const id = el.dataset.ability, cost = LST.CONFIG.abilities[id].unlockCost;
        if (!game.pickAbility(id)) {
          LST.UI.pop(el, "shake");
          this.hint.innerHTML = `Need <b>${cost - m.state.gears}</b> more Gears for ${LST.Ability.get(id).name}.`;
        }
      } else if (el.dataset.card) {
        if (el.classList.contains("owned")) return;
        if (!game.unlockCard(el.dataset.card)) {
          LST.UI.pop(el, "shake");
          const c = m.card(el.dataset.card);
          this.hint.innerHTML = `Need <b>${c.unlockCost - m.state.gears}</b> more Gears for ${c.name}. Play a run!`;
        }
      } else if (el.dataset.upgrade) {
        const id = el.dataset.upgrade;
        if (!game.buyUpgrade(id)) {
          LST.UI.pop(el, "shake");
          const cost = m.upgradeCost(id);
          this.hint.innerHTML = cost === Infinity ? "That one is maxed out!" : `Need <b>${cost - m.state.gears}</b> more Gears.`;
        }
      } else if (el.dataset.codex) {
        this.codexSel = this.codexSel === el.dataset.codex ? null : el.dataset.codex;
        LST.audio.play("tap");
        this.render();
      } else if (el.dataset.bench) {
        const why = m.benchBlock(el.dataset.bench);
        if (!game.toggleBench(el.dataset.bench)) {
          LST.UI.pop(el, "shake");
          this.hint.textContent = why;
        }
      }
    });
    document.querySelectorAll(".tabs .tab").forEach((t) => t.addEventListener("click", () => {
      if (this.tab === t.dataset.tab) return;
      this.tab = t.dataset.tab;
      this.render({ tab: true });
    }));
  }

  onShow() { this.render(); }

  // opts.unlocked / opts.bought / opts.benched / opts.ability: id that just changed (plays its animation)
  render(opts = {}) {
    const m = LST.meta;
    const tab = this.tab;
    this.gears.textContent = LST.utils.formatNumber(m.state.gears);
    if (opts.unlocked || opts.bought) LST.UI.pop(document.getElementById("ws-gears-pill"), "bump");
    document.querySelectorAll(".tabs .tab").forEach((t) => {
      const on = t.dataset.tab === tab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
      const dot = t.querySelector(".dot");
      if (dot) dot.classList.toggle("hidden", t.dataset.tab === "cards" ? !m.cardsAffordable() : !m.upgradesAffordable());
    });
    const grid = this.grid;
    grid.className = `ws-list tab-${tab}` + (opts.tab ? " swap" : "");
    grid.innerHTML = "";
    (this.tabs[tab] || this.tabs.deck).render(grid, opts);
    [...grid.children].forEach((c, i) => c.style.setProperty("--n", i));
  }
};
