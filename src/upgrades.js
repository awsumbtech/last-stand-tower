// Upgrade definitions. To add a new upgrade, add an entry here:
//   cost(level)  -> coins for the next purchase
//   apply(tower) -> mutate tower stats
//   stat(tower)  -> short "current value" text for the card
//   maxLevel     -> optional cap
LST.UPGRADES = [
  {
    id: "damage",
    name: "Damage",
    desc: "+25% projectile damage",
    cost: (lvl) => Math.round(10 * Math.pow(1.5, lvl)),
    apply: (t) => { t.damage *= 1.25; },
    stat: (t) => `${t.damage.toFixed(1)} dmg`,
  },
  {
    id: "fireRate",
    name: "Fire Rate",
    desc: "+15% shots per second",
    cost: (lvl) => Math.round(12 * Math.pow(1.55, lvl)),
    apply: (t) => { t.fireRate *= 1.15; },
    stat: (t) => `${t.fireRate.toFixed(2)} /s`,
    maxLevel: 20,
  },
  {
    id: "range",
    name: "Range",
    desc: "+25 range",
    cost: (lvl) => Math.round(8 * Math.pow(1.45, lvl)),
    apply: (t) => { t.range += 25; },
    stat: (t) => `${Math.round(t.range)} range`,
    maxLevel: 8,
  },
  {
    id: "maxHp",
    name: "Max HP",
    desc: "+25 max HP (also heals 25)",
    cost: (lvl) => Math.round(10 * Math.pow(1.45, lvl)),
    apply: (t) => { t.maxHp += 25; t.hp = Math.min(t.maxHp, t.hp + 25); },
    stat: (t) => `${Math.round(t.maxHp)} HP`,
  },
  {
    id: "repair",
    name: "Repair",
    desc: "Restore 50% of max HP",
    cost: (lvl) => Math.round(6 * Math.pow(1.25, lvl)),
    apply: (t) => { t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.5); },
    stat: (t) => `${Math.ceil(t.hp)} / ${Math.round(t.maxHp)}`,
    canBuy: (t) => t.hp < t.maxHp,
  },
  {
    id: "multishot",
    name: "Multishot",
    desc: "+1 target per volley",
    cost: (lvl) => Math.round(40 * Math.pow(2.2, lvl)),
    apply: (t) => { t.targets += 1; },
    stat: (t) => `${t.targets} target${t.targets > 1 ? "s" : ""}`,
    maxLevel: 5,
  },
];
