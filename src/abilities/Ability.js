// Ability: base class for one active ability (the HUD button). Each subclass lives in its own
// file and owns its id, its HUD / Workshop name, description and icon, and what it does when
// used (activate). Subclasses register themselves (LST.Ability.register) when their file loads;
// AbilitySystem (src/abilities/AbilitySystem.js) runs the cooldown and calls activate().
LST.Ability = class Ability {
  static register(cls) { (this.types || (this.types = {}))[cls.id] = new cls(); return cls; }
  static get(id) { return (this.types || {})[id] || null; }
  static get id() { return null; }
  get id() { return this.constructor.id; }
  get config() { return LST.CONFIG.abilities[this.id]; }
  get name() { return ""; }
  get desc() { return ""; }
  get icon() { return ""; }
  activate(game) {}
};
