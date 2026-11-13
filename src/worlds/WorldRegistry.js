// WorldRegistry: world id -> WorldDefinition, in map order, and which one the player picked.
//   isUnlocked(id)  the world's own rule, OR the dev test door (?debug=1&unlock=beach via
//                   LST.DevFlags.unlocks, local hosts only). The door never writes the
//                   save: select() below doesn't store a door pick and LST.DevRunGuard throws
//                   away everything a door run would have saved.
//   selected()      the saved pick (meta.state.world) if it's open right now, else the first world
//   select(id)      picks an open world and returns it (null if locked). The pick is saved to
//                   meta.state.world only when the world is open by its own rule; a world open
//                   only through the dev door is picked for this page load and never saved.
LST.WorldRegistry = {
  worlds: {},
  register(def) { this.worlds[def.id] = def; return def; },
  get(id) { return this.worlds[id] || null; },
  list() { return Object.values(this.worlds).sort((a, b) => a.order - b.order); },
  first() { return this.list()[0]; },
  devUnlocked(id, flags = LST.DevFlags) { return !!(flags && flags.enabled && flags.unlocks && flags.unlocks.includes(id)); },
  isUnlocked(id, meta = LST.meta, flags = LST.DevFlags) {
    const w = this.get(id);
    return !!w && (w.isUnlockedBy(meta) || this.devUnlocked(id, flags));
  },
  selected(meta = LST.meta, flags = LST.DevFlags) {
    const id = meta && meta.state && meta.state.world;
    return id && this.isUnlocked(id, meta, flags) ? this.get(id) : this.first();
  },
  select(id, meta = LST.meta, flags = LST.DevFlags) {
    if (!this.isUnlocked(id, meta, flags)) return null;
    const w = this.get(id);
    if (meta && meta.state && w.isUnlockedBy(meta)) { meta.state.world = id; meta.save(); }
    return w;
  },
};
