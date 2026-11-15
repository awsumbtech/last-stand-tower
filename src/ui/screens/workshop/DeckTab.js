// DeckTab: the Workshop's Deck tab. The active-ability strip (equip or unlock) and one tile per
// card to bench or bring back.
LST.DeckTab = class DeckTab {
  constructor(screen) { this.screen = screen; }

  render(grid, opts) {
    const m = LST.meta, hint = this.screen.hint;
    const n = m.state.benched.length, max = LST.CONFIG.meta.benchMax;
    hint.innerHTML = opts.benched
      ? (m.isBenched(opts.benched) ? `<b>${m.card(opts.benched).name}</b> benched. It won't show up in the shop.` : `<b>${m.card(opts.benched).name}</b> is back in the deck.`)
      : `Tap a card to bench it (${n}/${max}). Benched cards stay out of the shop.`;
    if (opts.ability) hint.innerHTML = `<b>${LST.Ability.get(opts.ability).name}</b> equipped: ${LST.Ability.get(opts.ability).desc}.`;
    // Active ability strip: tap to equip (or unlock with Gears).
    const strip = document.createElement("div");
    strip.className = "ab-strip";
    for (const id of Object.keys(LST.CONFIG.abilities)) {
      const owned = m.abilityUnlocked(id), on = m.state.ability === id, cost = LST.CONFIG.abilities[id].unlockCost;
      const b = document.createElement("button");
      b.className = "ab-chip" + (on ? " on" : "") + (owned ? "" : " locked") + (!owned && m.state.gears >= cost ? " afford" : "") + (opts.ability === id ? " bought" : "");
      b.dataset.ability = id;
      b.setAttribute("aria-label", `${LST.Ability.get(id).name}: ${LST.Ability.get(id).desc}. ${on ? "Equipped" : owned ? "Tap to equip" : cost + " Gears"}`);
      b.innerHTML = `<span class="ab-ico">${LST.Ability.get(id).icon}</span><span class="ab-txt"><b>${LST.Ability.get(id).name}</b><small>${on ? "Equipped" : owned ? LST.Ability.get(id).desc : `${LST.UiIcons.GEAR}${cost}`}</small></span>`;
      strip.appendChild(b);
    }
    grid.appendChild(strip);
    for (const c of LST.CARDS) {
      const unlocked = m.isUnlocked(c.id), benched = m.isBenched(c.id);
      const el = document.createElement("button");
      el.className = `deck-card ${c.rarity}` + (unlocked ? "" : " locked") + (benched ? " benched" : "") + (opts.benched === c.id ? " flipped" : "");
      el.style.setProperty("--accent", c.color);
      if (unlocked) el.dataset.bench = c.id;
      el.setAttribute("aria-label", `${c.name}: ${unlocked ? (benched ? "benched" : "in deck") : "locked"}`);
      el.innerHTML = `
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg>${unlocked ? "" : LST.UiIcons.LOCK}</span>
        <span class="name">${c.name}</span>
        <span class="state">${!unlocked ? "Locked" : benched ? "Benched" : "In deck"}</span>`;
      grid.appendChild(el);
    }
  }
};
