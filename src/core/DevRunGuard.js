// DevRunGuard: a run started through the dev test door (?debug=1&unlock=<world> on a local host,
// see DevFlags) must never change the save. Single job: when such a run starts, snapshot
// LST.meta.state and turn LST.meta.save() into a no-op; when the run ends (finishRun) put the
// snapshot back byte-for-byte and restore save(). Gears, clears, best wave, codex, unlocks and the
// world pick made during the run are thrown away. Inert (no snapshot, no hooks) for every normal run.
LST.DevRunGuard = {
  active: false,
  snapshot: null,
  _save: null,

  // True when this game's world is open only because of the dev door.
  isDoorRun(game, registry = LST.WorldRegistry, meta = LST.meta) {
    const w = game && game.world;
    return !!(w && registry && !w.isUnlockedBy(meta) && registry.devUnlocked(w.id));
  },

  begin(game, meta = LST.meta) {
    if (this.active) this.end(meta);
    if (!this.isDoorRun(game, LST.WorldRegistry, meta)) return false;
    this.active = true;
    this.snapshot = JSON.stringify(meta.state);
    this._save = meta.save;
    meta.save = function () {}; // nothing reaches localStorage during a door run
    return true;
  },

  end(meta = LST.meta) {
    if (!this.active) return false;
    // In place, so anything holding meta.state sees the restore; key order comes back too.
    for (const k of Object.keys(meta.state)) delete meta.state[k];
    Object.assign(meta.state, JSON.parse(this.snapshot));
    meta.save = this._save;
    this.active = false; this.snapshot = null; this._save = null;
    return true;
  },
};
