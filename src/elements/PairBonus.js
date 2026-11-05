// PairBonus: an extra rule that turns on when the tower owns every element in `needs`.
//   modify(hit) -> damage multiplier for this hit (1 = no change)
LST.PairBonus = class PairBonus {
  constructor(def) { Object.assign(this, def); }
  owned(tower) { return !!tower.elements && this.needs.every((id) => (tower.elements[id] || 0) > 0); }
  modify() { return 1; }
};
