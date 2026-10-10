// DOM overlays: HUD, start / upgrade / pause / game over screens.
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
        gameover: $("screen-gameover"),
      },
      startBest: $("start-best"),
      upWave: $("up-wave"),
      upCoins: $("up-coins"),
      upgradeList: $("upgrade-list"),
      goWave: $("go-wave"),
      goScore: $("go-score"),
      goBest: $("go-best"),
    };

    $("btn-start").addEventListener("click", () => game.newGame());
    $("btn-restart").addEventListener("click", () => game.newGame());
    $("btn-next").addEventListener("click", () => game.startNextWave());
    $("btn-pause").addEventListener("click", () => game.togglePause());
    $("btn-resume").addEventListener("click", () => game.togglePause());
    $("btn-quit").addEventListener("click", () => game.toMenu());
    this.el.speed.addEventListener("click", () => game.toggleSpeed());

    // One delegated listener for all upgrade cards.
    this.el.upgradeList.addEventListener("click", (ev) => {
      const card = ev.target.closest("[data-upgrade]");
      if (card && !card.disabled) game.buyUpgrade(card.dataset.upgrade);
    });
  }

  // Show exactly one screen (or none, while playing).
  show(name) {
    for (const [key, el] of Object.entries(this.el.screens)) {
      el.classList.toggle("hidden", key !== name);
    }
    this.el.hud.classList.toggle("hidden", name === "start" || name === "gameover");
    if (name === "start") this.el.startBest.textContent = this.game.bestWave;
    if (name === "upgrade") this.renderUpgrades();
    if (name === "gameover") {
      const g = this.game;
      this.el.goWave.textContent = g.wave;
      this.el.goScore.textContent = LST.utils.formatNumber(g.score);
      this.el.goBest.textContent = g.newBest ? `New best wave: ${g.bestWave}!` : `Best wave: ${g.bestWave}`;
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

  renderUpgrades() {
    const g = this.game;
    this.el.upWave.textContent = g.wave;
    this.el.upCoins.textContent = LST.utils.formatNumber(g.coins);
    this.el.upgradeList.innerHTML = "";
    for (const up of LST.UPGRADES) {
      const lvl = g.upgradeLevels[up.id] || 0;
      const maxed = up.maxLevel !== undefined && lvl >= up.maxLevel;
      const cost = up.cost(lvl);
      const allowed = !up.canBuy || up.canBuy(g.tower);
      const card = document.createElement("button");
      card.className = "upgrade" + (maxed ? " maxed" : "");
      card.dataset.upgrade = up.id;
      card.disabled = maxed || !allowed || g.coins < cost;
      card.innerHTML = `
        <span class="name">${up.name} <span class="level">Lv ${lvl}</span></span>
        <span class="desc">${up.desc}</span>
        <span class="stat">${up.stat(g.tower)}</span>
        <span class="cost">${maxed ? "MAX" : "&#9679; " + cost}</span>`;
      this.el.upgradeList.appendChild(card);
    }
  }
};
