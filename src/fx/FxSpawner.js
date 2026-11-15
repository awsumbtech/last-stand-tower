// FxSpawner: the World's own feedback objects (sparks, bursts, popup numbers, confetti, corpses,
// screen shake, the BOSS banner timer). Game and DemoScene share it; Game adds sound on top.
// Everything here is the same entity objects as before (no new art); it only owns where they
// are made.
LST.FxSpawner = class FxSpawner {
  constructor(world) { this.world = world; }

  hit(e, damage, crit) {
    const w = this.world;
    this.sparks(e.x, e.y, e.color, crit ? 9 : 5);
    w.bursts.push(new LST.Burst(e.x, e.y, crit ? "#ffd23f" : "#ffffff", e.radius * (crit ? 1.3 : 0.9), "hit"));
    if (damage) {
      const n = Math.max(1, Math.round(damage));
      const x = e.x + LST.utils.rand(-8, 8);
      const y = e.y - e.radius * 1.4 - 18; // above the enemy's HP bar
      w.texts.push(crit
        ? new LST.FloatText(x, y, n + "!", "#ffd23f", "crit")
        : new LST.FloatText(x, y, String(n), "#ffffff", "hit"));
    }
  }

  kill(e) {
    const w = this.world;
    this.corpse(e);
    this.sparks(e.x, e.y, e.color, 14, 160);
    w.bursts.push(new LST.Burst(e.x, e.y, e.color, e.radius * 1.8, "kill"));
    w.texts.push(new LST.FloatText(e.x, e.y - e.radius, "+" + e.coins, "#ffd93d", "coin"));
  }

  // The active theme decides whether a kill leaves a death animation, and for how long.
  corpse(e) {
    const w = this.world;
    const theme = w.renderer && w.renderer.theme;
    const life = theme && theme.corpseLife ? theme.corpseLife(e) : 0;
    if (life > 0) w.corpses.push(e.corpse = new LST.Corpse(e, life));
  }

  towerHit(e) {
    const w = this.world;
    w.shake = Math.min(1, w.shake + 0.4);
    this.sparks(e.x, e.y, "#ff4d6d", 12, 140);
    w.texts.push(new LST.FloatText(e.x, e.y, "-" + Math.round(e.damage), "#ff4d6d", "damage"));
  }

  slamHit(t, damage) {
    const w = this.world;
    w.shake = Math.min(1, w.shake + 0.7);
    w.bursts.push(new LST.Burst(t.x, t.y, "#ff4757", t.radius * 3.2, "slam"));
    this.sparks(t.x, t.y, "#ff4757", 16, 200);
    w.texts.push(new LST.FloatText(t.x + LST.utils.rand(-10, 10), t.y - 40, "-" + Math.round(damage * (1 - t.armor)), "#ff4d6d", "damage"));
  }

  thorns(boss, back) {
    this.world.texts.push(new LST.FloatText(boss.x, boss.y - boss.radius * 1.6, "Thorns " + Math.round(back), "#66bb6a", "bonus"));
  }

  splash(center, radius) { this.world.bursts.push(new LST.Burst(center.x, center.y, "#ff9f43", radius * 0.8, "splash")); }

  minionPop(e) { this.world.bursts.push(new LST.Burst(e.x, e.y, "#ffffff", 22, "hit")); }

  bossSpawn() {
    const w = this.world;
    w.bossIntro = 2.4;
    w.shake = Math.min(1, w.shake + 0.5);
  }

  confetti(x, y, count = 70) {
    const colors = ["#ff6fb5", "#ffd23f", "#5ec8ff", "#3ddc84", "#ff9f43", "#8e6cff"];
    for (let i = 0; i < count; i++) this.world.confetti.push(new LST.Confetti(x, y, colors[i % colors.length]));
  }

  sparks(x, y, color, count, speed = 90) {
    for (let i = 0; i < count; i++) {
      this.world.particles.push(new LST.Particle(x, y, color, speed, LST.utils.rand(0.25, 0.55), LST.utils.rand(2, 4)));
    }
  }

  explosion(x, y) {
    this.sparks(x, y, "#00f0ff", 60, 320);
    this.sparks(x, y, "#ff4d6d", 40, 240);
    this.world.shake = 1;
  }
};
