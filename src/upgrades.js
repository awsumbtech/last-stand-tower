// Upgrade definitions. To add a new upgrade, add an entry here:
//   color / icon -> card bubble color and inner SVG shapes (24x24 viewBox)
//   cost(level)  -> coins for the next purchase
//   apply(tower) -> mutate tower stats
//   stat(tower)  -> short "current value" text for the card
//   maxLevel     -> optional cap
LST.UPGRADES = [
  {
    id: "damage",
    color: "#ff4757",
    icon: '<path d="M12 2l2.6 6.2 6.4-1.6-3.9 5.4 3.9 5.4-6.4-1.6L12 22l-2.6-6.2-6.4 1.6L6.9 12 3 6.6l6.4 1.6z"/>',
    name: "Damage",
    desc: "+25% projectile damage",
    cost: (lvl) => Math.round(10 * Math.pow(1.5, lvl)),
    apply: (t) => { t.damage *= 1.25; },
    stat: (t) => `${t.damage.toFixed(1)} dmg`,
  },
  {
    id: "fireRate",
    color: "#ffb020",
    icon: '<path d="M13.5 2L4 13.5h6.5L9 22l10-12h-6.6z"/>',
    name: "Fire Rate",
    desc: "+15% shots per second",
    cost: (lvl) => Math.round(12 * Math.pow(1.55, lvl)),
    apply: (t) => { t.fireRate *= 1.15; },
    stat: (t) => `${t.fireRate.toFixed(2)} /s`,
    maxLevel: 20,
  },
  {
    id: "range",
    color: "#5ec8ff",
    icon: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.8"/>',
    name: "Range",
    desc: "+25 range",
    cost: (lvl) => Math.round(8 * Math.pow(1.45, lvl)),
    apply: (t) => { t.range += 25; },
    stat: (t) => `${Math.round(t.range)} range`,
    maxLevel: 8,
  },
  {
    id: "maxHp",
    color: "#ff6fb5",
    icon: '<path d="M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.7 12 21 12 21z"/>',
    name: "Max HP",
    desc: "+25 max HP (also heals 25)",
    cost: (lvl) => Math.round(10 * Math.pow(1.45, lvl)),
    apply: (t) => { t.maxHp += 25; t.hp = Math.min(t.maxHp, t.hp + 25); },
    stat: (t) => `${Math.round(t.maxHp)} HP`,
  },
  {
    id: "repair",
    color: "#3ddc84",
    icon: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    name: "Repair",
    desc: "Restore 50% of max HP",
    cost: (lvl) => Math.round(6 * Math.pow(1.25, lvl)),
    apply: (t) => { t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.5); },
    stat: (t) => `${Math.ceil(t.hp)} / ${Math.round(t.maxHp)}`,
    canBuy: (t) => t.hp < t.maxHp,
  },
  {
    id: "multishot",
    color: "#8e6cff",
    icon: '<circle cx="6" cy="16" r="3.6"/><circle cx="12" cy="7" r="3.6"/><circle cx="18" cy="16" r="3.6"/>',
    name: "Multishot",
    desc: "+1 target per volley",
    cost: (lvl) => Math.round(40 * Math.pow(2.2, lvl)),
    apply: (t) => { t.targets += 1; },
    stat: (t) => `${t.targets} target${t.targets > 1 ? "s" : ""}`,
    maxLevel: 5,
  },
];
