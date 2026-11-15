// AbilityButton: the big round active-ability button. Fires on pointerdown (no tap delay);
// shows the equipped ability's icon and name, a radial cooldown fill and the "ready" bounce.
LST.AbilityButton = class AbilityButton {
  constructor(game, el) {
    this.el = el;
    // pointerdown: fires the instant your thumb lands (no 300 ms tap delay)
    el.addEventListener("pointerdown", (ev) => { ev.preventDefault(); game.useAbility(); });
    el.addEventListener("click", (ev) => ev.preventDefault());
    this.game = game;
  }

  update(live) {
    const ab = this.game.ability, btn = this.el;
    btn.classList.toggle("hidden", !live);
    if (!live) return;
    if (btn.dataset.id !== ab.id) {
      btn.dataset.id = ab.id;
      btn.querySelector(".ab-icon").innerHTML = LST.Ability.get(ab.id).icon;
      btn.setAttribute("aria-label", LST.Ability.get(ab.id).name);
      btn.querySelector(".ab-name").textContent = LST.Ability.get(ab.id).name;
    }
    const k = ab.cd > 0 ? ab.cd / ab.max : 0;
    btn.style.setProperty("--cd", (k * 360).toFixed(1) + "deg");
    btn.classList.toggle("ready", k === 0);
    btn.querySelector(".ab-cd").textContent = k > 0 ? Math.ceil(ab.cd) : "";
  }
};
