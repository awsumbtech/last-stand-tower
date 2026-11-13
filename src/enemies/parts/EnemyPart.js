// EnemyPart: base class for one behavior piece an archetype is built from (src/enemies/parts).
// A PartEnemy owns a list of parts and asks each of them, in order:
//   attach(enemy)                 once, right after the enemy is made
//   update(dt, enemy, game)       every step, before the enemy moves
//   absorb(amount, enemy, game)   on every hit / tick; returns the damage that gets through
//   blocksSlow(enemy)             true = slows (Frost Shots, Frostbite chill, Freeze ability) don't land
// Parts own their own state and never reach into game rules; the default does nothing.
LST.EnemyPart = class EnemyPart {
  constructor(cfg) { this.cfg = cfg || {}; this.enemy = null; }
  attach(enemy) { this.enemy = enemy; return this; }
  update() {}
  absorb(amount) { return amount; }
  blocksSlow() { return false; }
};
