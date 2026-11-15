// Hud: the in-run top bar. Wave, coins, score, the tower HP bar and its numbers, the speed
// button and the pause button; it carries the AbilityButton and the BossBar, which show only
// while the current state has a live run on screen (GameState.hudLive).
LST.Hud = class Hud {
  constructor(game) {
    this.game = game;
    const $ = (id) => document.getElementById(id);
    this.el = $("hud");
    this.wave = $("hud-wave");
    this.coins = $("hud-coins");
    this.score = $("hud-score");
    this.hpFill = $("hud-hp-fill");
    this.hpText = $("hud-hp-text");
    this.speed = $("btn-speed");
    this.ability = new LST.AbilityButton(game, $("btn-ability"));
    this.bossBar = new LST.BossBar($("boss-bar"));
    $("btn-pause").addEventListener("click", () => game.togglePause());
    this.speed.addEventListener("click", () => game.toggleSpeed());
  }

  setVisible(on) { this.el.classList.toggle("hidden", !on); }

  update() {
    const g = this.game;
    const t = g.tower;
    this.wave.textContent = g.wave;
    this.coins.textContent = LST.utils.formatNumber(g.coins);
    this.score.textContent = LST.utils.formatNumber(g.score);
    const pct = Math.max(0, t.hp / t.maxHp);
    this.hpFill.style.width = (pct * 100).toFixed(1) + "%";
    this.hpFill.classList.toggle("low", pct < 0.3);
    this.hpText.textContent = `${Math.ceil(t.hp)} / ${Math.round(t.maxHp)}`;
    this.speed.textContent = g.speed + "x";
    const live = g.flow.current.hudLive;
    this.ability.update(live);
    // Big boss HP bar (mini-bosses and King Mole).
    this.bossBar.update(live ? g.enemies.find((e) => e.isBoss && !e.dead) : null);
  }
};
