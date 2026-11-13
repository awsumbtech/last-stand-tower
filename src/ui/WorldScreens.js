// WorldScreens: the per-world words and numbers on the results and World cleared! screens.
// Single job: fill those DOM bits from the run's world (no game rules, no drawing).
//   results(r)   the "<World> Gears xG" row (hidden for x1 worlds; notes a dev-door test run)
//   cleared(g)   "<World> cleared!" title, sub line and the next-world line
// Called once each from UI.renderResults / UI.renderCleared.
LST.WorldScreens = {
  results(r, doc = document) {
    const row = doc.getElementById("res-g-worldmult");
    if (!row) return;
    const w = LST.WorldRegistry.get(r.world);
    const mult = r.worldGearMult || 1;
    row.classList.toggle("hidden", !(mult > 1));
    // Dev door run (local only): say plainly that none of it was kept (LST.DevRunGuard).
    row.querySelector("span").textContent = `${w ? w.name : "World"} Gears` + (r.devRun ? " (test run, not saved)" : "");
    row.querySelector("b").textContent = `x${mult}`;
  },

  cleared(game, doc = document) {
    const c = game.world.copy || {};
    const set = (id, html) => { const el = doc.getElementById(id); if (el && html) el.innerHTML = html; };
    set("cl-title", c.clearedTitle);
    set("cl-sub", c.clearedSub);
    set("cl-next", c.next);
  },
};
