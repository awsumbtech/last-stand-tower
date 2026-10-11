// Trap ("gotcha") cards. They look like normal shop cards, cost the same, and sound good.
// Read them carefully: each has a catch. The tell is the wording plus a tiny grey fine-print line.
//
//   kind   -> "cursed" (real upside + a cost), "delayed" (cost shows up later), "build" (only good
//             with the right build), "gamble", or "dud" (does nothing useful: read-carefully lessons)
//   desc   -> what the card says          fine  -> the tiny fine print (always shown, tiny)
//   truth  -> what it really does (shown after discovery or with Appraisal L2)
//   lesson -> the Codex tip
//   apply(tower, game) / remove(tower, game) -> remove() undoes it (Appraisal L3 returns)
//
// Appearance rules live in LST.shopRules.draw (src/upgrades.js) and CONFIG.traps.

LST.TRAPS = [
  {
    id: "glassCannon", trap: true, kind: "cursed", rarity: "epic", color: "#7fd8ff",
    icon: '<path d="M9 2h6l-1 5 4 3-6 12-6-12 4-3z"/>',
    name: "Glass Cannon", desc: "+35% damage!", fine: "*hull made of glass",
    truth: "+35% damage, but max HP x0.6 (current HP too).",
    lesson: "Big damage, tiny tower. Only worth it with Regen, Vampire or lots of Armor.",
    apply: (t) => { t.damageMult *= 1.35; t.maxHp *= 0.6; t.hp = Math.min(t.maxHp, t.hp * 0.6); },
    remove: (t) => { t.damageMult /= 1.35; t.hp = t.hp / 0.6; t.maxHp /= 0.6; },
  },
  {
    id: "bigBertha", trap: true, kind: "cursed", rarity: "rare", color: "#8d6e63",
    icon: '<circle cx="9" cy="14" r="6"/><path d="M13 10l8-6M16 5l4 4"/>',
    name: "Big Bertha", desc: "+80% damage per shot", fine: "*heavy shells, slow reload",
    truth: "+80% damage per shot, but -45% fire rate and -30% shot speed (no more damage per second).",
    lesson: "Damage per second = damage x fire rate. 1.8 x 0.55 is about 1. Only good with Splash.",
    apply: (t) => { t.damage *= 1.8; t.fireRate *= 0.55; t.projectileSpeed *= 0.7; },
    remove: (t) => { t.damage /= 1.8; t.fireRate /= 0.55; t.projectileSpeed /= 0.7; },
  },
  {
    id: "longShot", trap: true, kind: "dud", rarity: "common", color: "#4fc3f7",
    icon: '<circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
    name: "Long Shot", desc: "+90 range", fine: "*-15% dmg",
    truth: "+90 range, -15% damage. Enemies are already in range most of the time, so it mostly just costs damage.",
    lesson: "More range only helps if enemies are out of reach. Look at the screen first.",
    apply: (t) => { t.range += 90; t.damageMult *= 0.85; },
    remove: (t) => { t.range -= 90; t.damageMult /= 0.85; },
  },
  {
    id: "thorns", trap: true, kind: "dud", rarity: "rare", color: "#66bb6a",
    icon: '<path d="M12 3c-4 4-6 7-6 10a6 6 0 0 0 12 0c0-3-2-6-6-10z"/><path d="M3 10l3 2M21 10l-3 2M5 19l3-2M19 19l-3-2"/>',
    name: "Thorns", desc: "Enemies touching the tower take 300% of their HP", fine: "*on contact",
    truth: "Does nothing (for now): enemies already pop when they crash into the tower. Boss slams will make it real later.",
    lesson: "Ask what it changes. If enemies already die on contact, hurting them on contact does nothing.",
    // Sprint 4: reflects 25% of boss slam damage once bosses stop and slam.
    apply: () => {},
    remove: () => {},
  },
  {
    id: "overclock", trap: true, kind: "delayed", rarity: "rare", color: "#ff7043",
    icon: '<circle cx="12" cy="13" r="8"/><path d="M12 13l4-4M9 2h6"/>',
    name: "Overclock", desc: "+40% fire rate", fine: "*may overheat",
    truth: "+40% fire rate for 3 waves, then it overheats: -20% fire rate for the rest of the run.",
    lesson: "Great to get through a boss wave. A trap if you take it early.",
    apply: (t, game) => { t.fireRate *= 1.4; if (game) game.overclock = { waves: 3, hot: true }; },
    remove: (t, game) => {
      const hot = !game || !game.overclock || game.overclock.hot;
      t.fireRate /= hot ? 1.4 : 0.8;
      if (game) game.overclock = null;
    },
  },
  {
    id: "hotStreak", trap: true, kind: "build", rarity: "common", color: "#ffa726",
    icon: '<path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z"/>',
    name: "Hot Streak", desc: "Crits hit x3!", fine: "*cools your other shots",
    truth: "Crits hit x3 instead of x2, but every shot does -15% damage. At the base 10% crit chance that's about -7% damage per second; with Lucky Shot stacked it pays off.",
    lesson: "A bonus to crits is only as good as your crit chance. Stack Lucky Shot or Sharp Eye first.",
    apply: (t) => { t.critMult += 1; t.damageMult *= 0.85; },
    remove: (t) => { t.critMult -= 1; t.damageMult /= 0.85; },
  },
  {
    id: "piggyBank", trap: true, kind: "cursed", rarity: "rare", color: "#f48fb1",
    icon: '<path d="M4 12a7 6 0 0 1 14-1l3-1v4l-2 1a7 6 0 0 1-3 3v2h-3v-1H9v1H6v-2.5A6 6 0 0 1 4 12z"/><path d="M10 5h4"/>',
    name: "Piggy Bank", desc: "+40% Gears this run", fine: "*savings come out of your shells",
    truth: "-3% damage for the rest of the run, but +40% Gears at the end.",
    lesson: "A real choice: a weaker run for faster Workshop progress. Skip it when chasing a best wave.",
    apply: (t, game) => { t.damageMult *= 0.97; if (game) game.gearMult *= 1.4; },
    remove: (t, game) => { t.damageMult /= 0.97; if (game) game.gearMult /= 1.4; },
  },
  {
    id: "mysteryBox", trap: true, kind: "gamble", rarity: "epic", color: "#ab47bc",
    icon: '<path d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v9"/>',
    name: "Mystery Box", desc: "Could be anything!", fine: "*no refunds",
    truth: "Turns into a random card: 50% a Common, 25% a Rare or Epic, 25% another trap.",
    lesson: "Odds: 50% Common, 25% Rare/Epic, 25% trap. Usually worse than just picking a good card.",
    apply: () => {}, // takeCard() swaps it for the card inside
    remove: () => {},
  },
];
LST.TRAPS.forEach((c) => { c.maxLevel = 1; c.stat = () => ""; });

// Every card, normal and trap, by id.
LST.cardById = (id) => LST.CARDS.find((c) => c.id === id) || LST.TRAPS.find((c) => c.id === id);
