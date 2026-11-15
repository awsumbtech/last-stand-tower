// CardsTab: the Workshop's Cards tab. One tile per lockable card (owned / locked / affordable /
// next), and the hint for what to unlock next.
LST.CardsTab = class CardsTab {
  constructor(screen) { this.screen = screen; }

  render(grid, opts) {
    const m = LST.meta;
    const next = m.nextUnlock();
    const justName = opts.unlocked && m.card(opts.unlocked).name;
    this.screen.hint.innerHTML = justName ? `<b>${justName}</b> can now show up in the shop!`
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
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg>${owned ? "" : LST.UiIcons.LOCK}</span>
        <span class="ws-body"><span class="name">${c.name} <i class="rar">${rar.label}</i></span><span class="desc">${c.desc}</span></span>
        <span class="ws-price">${owned ? "&#10003;" : `${LST.UiIcons.GEAR}<b>${c.unlockCost}</b>`}</span>`;
      grid.appendChild(el);
    }
  }
};
