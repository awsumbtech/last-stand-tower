// ClearedScreen ("cleared"): World cleared! Run time, kills, bosses, the world bonus and the
// run's Gears, with Keep going (endless) and Retire to the Workshop.
LST.ClearedScreen = class ClearedScreen extends LST.Screen {
  constructor(ui, game) {
    super(ui, game, document.getElementById("screen-cleared"), true);
    document.getElementById("btn-endless").addEventListener("click", () => game.continueEndless());
    document.getElementById("btn-retire").addEventListener("click", () => game.retireToWorkshop());
  }

  onShow() { this.render(); }

  render() {
    const g = this.game, wb = g.worldBonus || { bonus: 0, first: false };
    const $ = (id) => document.getElementById(id);
    const runGears = LST.meta.gearsFor(g.wave + 1, g.bossWavesCleared, g.runGearMult(), 0, g.bossKills).total;
    if (LST.WorldScreens) LST.WorldScreens.cleared(g);
    const sec = Math.round(g.runTime);
    $("cl-time").textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
    $("cl-kills").textContent = g.kills;
    $("cl-bosses").textContent = g.bossKills;
    $("cl-bonus").textContent = "+" + wb.bonus;
    $("cl-first").classList.toggle("hidden", !wb.first);
    $("cl-run").textContent = "+" + runGears;
    $("cl-total").textContent = LST.utils.formatNumber(LST.meta.state.gears);
    LST.UI.pop($("cl-trophy"), "bump");
  }
};
