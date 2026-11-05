// Element: the base every elemental card module extends (src/elements/Ember.js etc.).
//
// An element is data (id, name, color, rarity, unlockCost, per-level numbers) plus one hook:
//   onHit(hit) -> true when something visible happened (the registry then emits ELEMENT_HIT)
// where hit = { proj, enemy, damage, level, game, tower }.
// card() builds the shop card the same shape as LST.CARDS entries; a level is one more pick.
// 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 -> "11th", 22 -> "22nd"
LST.ordinal = (n) => { const t = n % 100, s = t >= 11 && t <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" })[n % 10] || "th"; return n + s; };
LST.Element = class Element {
  constructor(def) { Object.assign(this, def); }

  level(tower) { return tower && tower.elements ? tower.elements[this.id] || 0 : 0; }
  // Per-level number: base + step * (level - 1)
  at(stat, level) { const s = this.stats[stat]; return Array.isArray(s) ? s[0] + s[1] * Math.max(0, level - 1) : s; }

  // Card front text, built from stats (see desc() in each element); never hard-code numbers.
  desc() { return ""; }
  onHit() { return false; }
  // Plain-language explanation for the card back (CardFlip).
  details() { return ""; }
  statText() { return ""; }
  // Card-back line for pair bonuses this element is part of (e.g. Shatter), built from the pair's numbers.
  pairText() { return LST.ElementRegistry.pairs.filter((p) => p.needs.includes(this.id)).map((p) => ` With ${p.short(this.id)}.`).join(""); }

  card() {
    const el = this;
    return {
      id: el.id, element: el.element, rarity: el.rarity, color: el.color, icon: el.icon,
      name: el.name, get desc() { return el.desc(); }, unlockCost: el.unlockCost, offense: true, maxLevel: el.maxLevel,
      apply: (t) => { t.elements = Object.assign({}, t.elements); t.elements[el.id] = (t.elements[el.id] || 0) + 1; },
      stat: (t) => el.statText(Math.max(1, el.level(t))),
      details: (t) => el.details(el.level(t) + 1),
    };
  }
};
