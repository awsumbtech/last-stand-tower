// Freeze: slows every living enemy for a few seconds, with a frost burst.
LST.Freeze = LST.Ability.register(class Freeze extends LST.Ability {
  static get id() { return "freeze"; }
  get name() { return "Freeze"; }
  get desc() { return "Slow all 60%, 4s"; }
  get icon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"/></svg>'; }
  activate(game) {
    const c = this.config, t = game.tower;
    for (const e of game.enemies) if (!e.dead) e.applySlow(c.slow, c.time);
    game.bursts.push(new LST.Burst(t.x, t.y, "#8fdcff", 420, "freeze"));
  }
});
