// BossEventRouter: the real game's response to boss events (sound, haptics, banners, shake,
// dirt bursts). Bosses and BossScripts call the game hooks (onSlamWindup, onBossSlam, ...);
// Game runs World's shared part, then hands the event here. DemoScene has no router, so the
// art demo stays silent.
LST.BossEventRouter = class BossEventRouter {
  constructor(game) { this.game = game; }

  windup(e) { LST.audio.play("windup", { pitch: e.type === "mole" ? 0.8 : 1 }); }

  slam(e, damage) {
    this.game.events.emit(LST.EVENTS.BOSS_SLAM, { boss: e, damage });
    LST.audio.play("slam");
    LST.audio.play("towerHit");
    LST.haptics.buzz(e.type === "mole" ? 140 : 90);
  }

  charge(e) {
    const g = this.game;
    g.bossEscapes += 1;
    g.texts.push(new LST.FloatText(e.x, e.y - e.radius * 2, "CHARGE!", "#ff4757", "bonus"));
    LST.audio.play("charge");
  }

  moleRise(m) {
    const g = this.game;
    g.bursts.push(new LST.Burst(m.x, m.y, "#8d6e63", 70, "dirt"));
    g.spawnHitSparks(m.x, m.y, "#8d6e63", 18, 180);
    g.shake = Math.min(1, g.shake + 0.4);
    LST.audio.play("popUp");
  }

  moleBurrow(m) {
    const g = this.game;
    g.bursts.push(new LST.Burst(m.x, m.y, "#8d6e63", 60, "dirt"));
    g.spawnHitSparks(m.x, m.y, "#8d6e63", 12, 140);
    LST.audio.play("burrow");
  }

  molePhase(m) {
    const text = m.phase === 1 ? ["PHASE 2", "He's digging deeper!"] : ["PHASE 3", "King Mole is MAD!"];
    this.phaseBanner(text[0], text[1], m.phase);
  }

  // Scripted bosses (src/bosses/BossScript.js): phase change or frenzy banner.
  bossPhase(boss, banner) {
    if (!banner) return;
    this.phaseBanner(banner.text, banner.sub, boss.phase);
  }

  // The canvas phase banner, flash, shake, phase sting and music tension for a new phase.
  phaseBanner(text, sub, phase) {
    const g = this.game;
    g.phaseBanner = { text, sub, t: 2.2, max: 2.2 };
    g.flash = 0.7;
    g.shake = 1;
    LST.audio.play("phase");
    LST.audio.setTension(phase + 1);
    LST.haptics.buzz([60, 40, 60, 40, 120]);
  }

  // Captain Crabclaw walks on after the Beach finale intro.
  crabclawArrive() {
    const g = this.game;
    g.shake = Math.min(1, g.shake + 0.4);
    LST.audio.play("boss");
    LST.haptics.buzz([60, 40, 140]);
  }

  coconutThrow() { LST.audio.play("windup", { pitch: 1.3 }); }

  // A coconut lands on the tower: same damage path as a boss slam (armor, Thorns, shake).
  coconutHit(c) {
    const boss = c.boss && !c.boss.dead ? c.boss : { dead: true };
    this.game.onBossSlam(boss, c.damage);
  }

  bossSpawn() {
    LST.audio.play("boss");
    LST.haptics.buzz([60, 40, 140]);
  }
};
