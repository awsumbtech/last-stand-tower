// Upgrade cards for the between-wave shop (pick 1 of 3).
// To add a card, add an entry here:
//   rarity       -> "common" | "rare" | "epic" (sets draw chance and card color)
//   offense      -> attack card (every shop offers at least one)
//   color / icon -> icon bubble color and inner SVG shapes (24x24 viewBox)
//   desc         -> what one more level does
//   apply(tower) -> mutate tower stats
//   stat(tower)  -> short "current value" text for the card
//   maxLevel     -> optional cap (maxed cards stop showing up)
LST.CARDS = [
  // ---------- Common ----------
  {
    id: "damage", offense: true, rarity: "common", color: "#ff4757",
    icon: '<path d="M12 2l2.6 6.2 6.4-1.6-3.9 5.4 3.9 5.4-6.4-1.6L12 22l-2.6-6.2-6.4 1.6L6.9 12 3 6.6l6.4 1.6z"/>',
    // Additive (a share of the *base* damage) so free picks can't snowball forever.
    name: "Damage", desc: "+30% base damage",
    apply: (t) => { t.damage += LST.CONFIG.tower.damage * 0.3; },
    stat: (t) => `${t.damage.toFixed(1)} dmg`,
  },
  {
    id: "fireRate", offense: true, rarity: "common", color: "#ffb020",
    icon: '<path d="M13.5 2L4 13.5h6.5L9 22l10-12h-6.6z"/>',
    name: "Fire Rate", desc: "+10% shots per second",
    apply: (t) => { t.fireRate *= 1.1; },
    stat: (t) => `${t.fireRate.toFixed(2)} /s`,
    maxLevel: 12,
  },
  {
    id: "range", rarity: "common", color: "#5ec8ff",
    icon: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.8"/>',
    name: "Range", desc: "+20 range",
    apply: (t) => { t.range += 20; },
    stat: (t) => `${Math.round(t.range)} range`,
    maxLevel: 6,
  },
  {
    id: "maxHp", rarity: "common", color: "#ff6fb5",
    icon: '<path d="M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.7 12 21 12 21z"/>',
    name: "Max HP", desc: "+30 max HP, heals 30",
    apply: (t) => { t.maxHp += 30; t.hp = Math.min(t.maxHp, t.hp + 30); },
    stat: (t) => `${Math.round(t.maxHp)} HP`,
    maxLevel: 15,
  },
  // ---------- Rare ----------
  {
    id: "multishot", offense: true, rarity: "rare", color: "#8e6cff",
    icon: '<circle cx="6" cy="16" r="3.6"/><circle cx="12" cy="7" r="3.6"/><circle cx="18" cy="16" r="3.6"/>',
    name: "Multishot", desc: "+1 target per volley",
    apply: (t) => { t.targets += 1; },
    stat: (t) => `${t.targets} target${t.targets > 1 ? "s" : ""}`,
    maxLevel: 4,
  },
  {
    id: "crit", offense: true, rarity: "rare", color: "#ffd23f",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5l1.6 3.6 3.9.4-2.9 2.6.8 3.9L12 15l-3.4 2 .8-3.9-2.9-2.6 3.9-.4z"/>',
    name: "Lucky Shot", desc: "+7% crit chance",
    apply: (t) => { t.critChance += 0.07; },
    stat: (t) => `${Math.round(t.critChance * 100)}% crit`,
    maxLevel: 5,
  },
  {
    id: "pierce", offense: true, rarity: "rare", color: "#ff9f43",
    icon: '<path d="M2 12h14M12 6l7 6-7 6"/><path d="M4 8l3 4-3 4"/>',
    name: "Pierce", desc: "Shots pass through +1 enemy",
    apply: (t) => { t.pierce += 1; },
    stat: (t) => `pierces ${t.pierce}`,
    maxLevel: 2,
  },
  {
    id: "slow", rarity: "rare", color: "#7fe3ff",
    icon: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 3.8L12 6l2.5-2.2M9.5 20.2L12 18l2.5 2.2"/>',
    name: "Frost Shots", desc: "Hits slow enemies 15% more",
    apply: (t) => { t.slow = Math.min(0.45, t.slow + 0.15); },
    stat: (t) => `${Math.round(t.slow * 100)}% slow`,
    maxLevel: 3,
  },
  {
    id: "regen", rarity: "rare", color: "#3ddc84",
    icon: '<path d="M12 21C6 17 4 12.5 4 9a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 3.5-2 8-8 12z"/><path d="M12 9v6M9 12h6"/>',
    name: "Regen", desc: "+0.5% max HP / sec in waves",
    apply: (t) => { t.regen += 0.005; },
    stat: (t) => `${(t.regen * 100).toFixed(1)}% /s`,
    maxLevel: 4,
  },
  // ---------- Epic ----------
  {
    id: "splash", offense: true, rarity: "epic", color: "#ff5e3a",
    icon: '<circle cx="12" cy="12" r="4"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4M4.6 4.6l2.8 2.8M16.6 16.6l2.8 2.8M4.6 19.4l2.8-2.8M16.6 7.4l2.8-2.8"/>',
    name: "Splash", desc: "Hits blast nearby enemies",
    apply: (t) => { t.splash += t.splash ? 0.15 : 0.35; t.splashRadius = t.splashRadius ? t.splashRadius + 12 : 55; },
    stat: (t) => `${Math.round(t.splash * 100)}% splash`,
    maxLevel: 2,
  },
  {
    id: "lifesteal", rarity: "epic", color: "#d63384",
    icon: '<path d="M12 2.5C9 7.5 6.5 10.6 6.5 14a5.5 5.5 0 0 0 11 0c0-3.4-2.5-6.5-5.5-11.5z"/>',
    name: "Vampire", desc: "Kills heal 0.5% max HP",
    apply: (t) => { t.lifesteal += 0.005; },
    stat: (t) => `${(t.lifesteal * 100).toFixed(1)}% / kill`,
    maxLevel: 3,
  },
  {
    id: "overcharge", offense: true, rarity: "epic", color: "#b06cff",
    icon: '<path d="M8 2l1.6 4.4L14 8l-4.4 1.6L8 14l-1.6-4.4L2 8l4.4-1.6zM16.5 10l1.2 3.3 3.3 1.2-3.3 1.2-1.2 3.3-1.2-3.3-3.3-1.2 3.3-1.2z"/>',
    name: "Overcharge", desc: "Crits deal +100% damage",
    apply: (t) => { t.critMult += 1; },
    stat: (t) => `crit x${t.critMult}`,
    maxLevel: 1,
  },
];

LST.RARITY = {
  common: { label: "Common", color: "#ffffff", glow: "#d9d2c5" },
  rare:   { label: "Rare",   color: "#5ec8ff", glow: "#2e8fd9" },
  epic:   { label: "Epic",   color: "#b06cff", glow: "#7a3fd1" },
};

// Shop rules shared by the game and the balance simulator.
LST.shopRules = {
  // Coin price of a shop action ("extraCard" | "reroll" | "repair") at a wave,
  // after it has already been used `times` times in this shop.
  price(kind, wave, times = 0) {
    const c = LST.CONFIG.shop[kind];
    return Math.round(c.base * Math.pow(c.growth, wave - 1) * Math.pow(c.step, times));
  },

  available(card, levels) {
    const lvl = levels[card.id] || 0;
    return card.maxLevel === undefined || lvl < card.maxLevel;
  },

  // Draw `n` different cards. Rarity first (weighted), then a card of that rarity.
  // `minRare` guarantees at least one rare-or-better card (after boss waves), and every
  // full deal contains at least one attack card so a shop is never all duds.
  draw(levels, n, exclude = [], minRare = false) {
    const weights = LST.CONFIG.shop.rarityWeights;
    const pool = LST.CARDS.filter((c) => this.available(c, levels) && !exclude.includes(c.id));
    const out = [];
    while (out.length < n && pool.length) {
      const needRare = minRare && out.length === n - 1 && !out.some((c) => c.rarity !== "common");
      const rarities = Object.keys(weights).filter((r) => pool.some((c) => c.rarity === r) && !(needRare && r === "common"));
      if (!rarities.length) break;
      const rarity = LST.utils.pick(rarities.map((r) => [r, weights[r]]));
      const options = pool.filter((c) => c.rarity === rarity);
      const card = options[Math.floor(Math.random() * options.length)];
      out.push(card);
      pool.splice(pool.indexOf(card), 1);
    }
    if (n >= 3 && out.length && !out.some((c) => c.offense)) {
      const attack = pool.filter((c) => c.offense && (!minRare || out.slice(0, -1).some((o) => o.rarity !== "common") || c.rarity !== "common"));
      if (attack.length) out[out.length - 1] = attack[Math.floor(Math.random() * attack.length)];
    }
    return out;
  },
};
