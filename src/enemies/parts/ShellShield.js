// ShellShield (Hermit Crab's shell; Elite Big Red's shield phase at Beach Gate III).
// Single job: a pool of shield HP that soaks every hit before the body takes damage, breaks
// when emptied, and regrows to full ONCE after cfg.regrowDelay seconds. After that the body is bare.
// Lifecycle: attach -> first use sizes it (shield = cfg.share x the enemy's max HP, read after the
//   spawn has applied boss HP scaling) -> absorb hits -> broken ->
//   regrowDelay -> regrown (regrowsLeft 1 -> 0) -> absorb -> broken for good.
// Damage over the shield's remainder carries through to the body on the same hit.
// Read by HermitCrabRenderer: state, brokeAt / regrewAt (enemy.age stamps) for its one-shot strips.
//   cfg = { share, regrowDelay, regrows }
LST.ShellShield = class ShellShield extends LST.EnemyPart {
  attach(enemy) {
    super.attach(enemy);
    this.max = 0; this.hp = 0; this.sized = false;
    this.regrowsLeft = this.cfg.regrows != null ? this.cfg.regrows : 1;
    this.timer = 0;       // seconds until the shell regrows (while broken)
    this.breaks = 0;
    this.brokeAt = -1;    // enemy.age when it last broke
    this.regrewAt = -1;   // enemy.age when it last regrew
    return this;
  }

  size() {
    if (this.sized || !this.enemy) return;
    this.sized = true;
    this.max = this.hp = this.enemy.maxHp * (this.cfg.share != null ? this.cfg.share : 0.8);
  }

  get up() { this.size(); return this.hp > 0; }
  // "shell" | "broken" (bare, will regrow) | "bare" (gone for good)
  get state() { this.size(); return this.hp > 0 ? "shell" : this.regrowsLeft > 0 ? "broken" : "bare"; }

  absorb(amount, enemy) {
    this.size();
    if (this.hp <= 0 || amount <= 0) return amount;
    const soak = Math.min(this.hp, amount);
    this.hp -= soak;
    if (this.hp <= 1e-9) {
      this.hp = 0;
      this.breaks += 1;
      this.brokeAt = enemy.age;
      if (this.regrowsLeft > 0) this.timer = this.cfg.regrowDelay != null ? this.cfg.regrowDelay : 3;
    }
    return amount - soak;
  }

  update(dt, enemy) {
    this.size();
    if (this.hp > 0 || this.regrowsLeft <= 0) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.hp = this.max;
      this.regrowsLeft -= 1;
      this.regrewAt = enemy.age;
    }
  }
};
