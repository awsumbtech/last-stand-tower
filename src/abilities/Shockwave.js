// Shockwave: knocks back and stuns every enemy near the tower (bosses less), with a shockwave
// burst and a screen shake.
LST.Shockwave = LST.Ability.register(class Shockwave extends LST.Ability {
  static get id() { return "shockwave"; }
  get name() { return "Shockwave"; }
  get desc() { return "Knock back + stun"; }
  get icon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" class="fill"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4M3.5 3.5a12 12 0 0 0 0 17M20.5 3.5a12 12 0 0 1 0 17"/></svg>'; }
  activate(game) {
    const c = this.config, r2 = c.radius * c.radius, t = game.tower;
    for (const e of game.enemies) {
      if (e.dead || LST.utils.dist2(t.x, t.y, e.x, e.y) > r2) continue;
      if (e.isBoss) e.knock(c.bossKnockback, c.bossStun);
      else e.knock(c.knockback, c.stun);
    }
    game.bursts.push(new LST.Burst(t.x, t.y, "#ffffff", c.radius, "shockwave"));
    game.shake = Math.min(1, game.shake + 0.6);
  }
});
