// BossBar: the big boss HP bar under the HUD (mini-bosses and King Mole). Name, fill, phase
// text and pips; hidden when no boss is up.
LST.BossBar = class BossBar {
  constructor(el) {
    this.el = el;
    this.name = document.getElementById("boss-name");
    this.fill = document.getElementById("boss-fill");
    this.phase = document.getElementById("boss-phase");
  }

  update(boss) {
    this.el.classList.toggle("hidden", !boss);
    if (!boss) return;
    const mole = boss.type === "mole";
    this.el.classList.toggle("finale", mole || !!boss.finaleBoss);
    // Scripted bosses (src/bosses) name themselves; King Mole and Big Red as before.
    this.name.textContent = boss.hudName || (mole ? "KING MOLE" : boss.charging ? "BIG RED IS CHARGING!" : "BIG RED");
    this.fill.style.width = (Math.max(0, boss.hp / boss.maxHp) * 100).toFixed(1) + "%";
    this.phase.textContent = boss.hudPhase || (mole ? `Phase ${boss.phase + 1} / 3` : "");
    // Phase ticks: King Mole's 3 thirds by default; a scripted boss with one HP gate shows a single mid tick.
    this.el.classList.toggle("pips-half", !!(boss.cfg && boss.cfg.phaseAt && boss.cfg.phaseAt.length === 1));
    this.el.classList.toggle("under", !!boss.untargetable);
  }
};
