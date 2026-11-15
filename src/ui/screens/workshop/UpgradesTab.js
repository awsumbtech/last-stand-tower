// UpgradesTab: the Workshop's Upgrades tab. One tile per lasting upgrade with its level, what
// it does now, the next level and the price (Head Start notes the cap your best wave allows).
LST.UpgradesTab = class UpgradesTab {
  constructor(screen) { this.screen = screen; }

  render(grid, opts) {
    const m = LST.meta, game = this.screen.game;
    const cfg = LST.CONFIG.meta.upgrades;
    const best = game.bestWave;
    this.screen.hint.innerHTML = opts.bought ? `${LST.UPGRADES.find((u) => u.id === opts.bought).name} upgraded!`
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
        const cap = m.headStartMax(best, game.world.id), want = lvl * cfg.headStart.per;
        note = lvl ? (cap < want ? `Up to wave ${want + 1} (best ${best} allows ${cap + 1})` : u.desc(lvl)) : "Skip early waves (and replay their shops)";
      }
      const nextTxt = maxed ? "Maxed" : `Next: ${u.desc(lvl + 1).replace(/^Start up to /, "")}`;
      el.setAttribute("aria-label", `${u.name}, level ${lvl} of ${max}. ${note}. ${maxed ? "Maxed" : cost + " Gears"}`);
      el.innerHTML = `
        <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true">${u.icon}</svg><i class="lvl">${lvl}</i></span>
        <span class="ws-body"><span class="name">${u.name} <i class="rar">Lv ${lvl}/${max}</i></span><span class="desc">${note}</span><span class="next-txt">${nextTxt}</span></span>
        <span class="ws-price">${maxed ? "MAX" : `${LST.UiIcons.GEAR}<b>${LST.utils.formatNumber(cost)}</b>`}</span>`;
      grid.appendChild(el);
    }
  }
};
