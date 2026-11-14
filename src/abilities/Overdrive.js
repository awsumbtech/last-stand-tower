// Overdrive: the tower fires twice as fast for a few seconds.
LST.Overdrive = LST.Ability.register(class Overdrive extends LST.Ability {
  static get id() { return "overdrive"; }
  get name() { return "Overdrive"; }
  get desc() { return "2x fire rate, 5s"; }
  get icon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>'; }
  activate(game) {
    const t = game.tower;
    t.overdrive = this.config.time;
    game.bursts.push(new LST.Burst(t.x, t.y, "#ff9f43", 90, "overdrive"));
  }
});
