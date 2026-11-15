// StartScreen ("start"): the menu. World cards (WorldSelect), best wave, Gears, the Workshop
// badge, the Head Start chip, the one-time welcome note and the trophy. Play, Workshop and
// Settings (the pause panel as a settings panel) buttons.
LST.StartScreen = class StartScreen extends LST.Screen {
  constructor(ui, game) {
    super(ui, game, document.getElementById("screen-start"), true);
    const $ = (id) => document.getElementById(id);
    this.gears = $("start-gears");
    this.badge = $("start-badge");
    this.welcome = $("start-welcome");
    this.trophy = $("start-trophy");
    this.headStart = $("btn-headstart");
    this.headStartLabel = $("headstart-label");
    this.best = $("start-best");
    // World cards on the start screen (src/ui/WorldSelect.js).
    this.worldSelect = LST.WorldSelect ? new LST.WorldSelect(game, $("world-select"), { onChange: () => this.render() }) : null;
    $("btn-start").addEventListener("click", () => game.newGame());
    $("btn-workshop").addEventListener("click", () => game.openWorkshop("start"));
    this.headStart.addEventListener("click", () => {
      LST.meta.cycleHeadStart(game.bestWave, game.world.id);
      LST.UI.pop(this.headStart, "bump");
      this.render();
    });
    // Settings (start screen) reuses the pause panel.
    $("btn-settings").addEventListener("click", () => ui.show("pause"));
  }

  onShow() { this.render(); }

  render() {
    const m = LST.meta;
    if (this.worldSelect) this.worldSelect.render();
    this.best.textContent = this.game.bestWave;
    this.gears.textContent = LST.utils.formatNumber(m.state.gears);
    this.badge.classList.toggle("hidden", !m.anyAffordable());
    // Head Start chip: tap to cycle the start wave (0, 5, 10 ... up to the max allowed).
    const max = m.headStartMax(this.game.bestWave, this.game.world.id);
    this.headStart.classList.toggle("hidden", max <= 0);
    const hs = m.headStartWave(this.game.bestWave, this.game.world.id);
    this.headStartLabel.innerHTML = hs > 0 ? `Head Start: <b>wave ${hs + 1}</b>` : "Head Start: <b>off</b>";
    this.headStart.classList.toggle("off", hs <= 0);
    // One-time hello for players from before Gears existed.
    const w = this.welcome;
    this.trophy.classList.toggle("hidden", !m.worldCleared());
    if (m.state.finaleNotice) {
      w.innerHTML = `New: bosses fight back, and <b>King Mole</b> waits at wave 20! Tap the big button for a <b>Shockwave</b>.`;
      w.classList.remove("hidden");
    } else if (m.state.armorNotice) {
      w.innerHTML = `New: <b>Armor</b> now blocks damage (-${(m.armorReduction() * 100).toFixed(0)}% at your level)${m.state.armorRefund ? `, and you got <b>${m.state.armorRefund} Gears</b> back for levels above the new max` : ""}.`;
      w.classList.remove("hidden");
    } else if (m.state.veteranBonus && !m.state.seenWorkshop) {
      w.innerHTML = `Welcome back! Your best wave earned you <b>${m.state.veteranBonus} Gears</b>. Spend them in the Workshop.`;
      w.classList.remove("hidden");
    } else w.classList.add("hidden");
  }
};
