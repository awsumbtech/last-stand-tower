// Effect tuning as data. Parts read these; nothing here runs code.
//
//   LST.FX_ROUTES   which impact each game moment plays
//   LST.FX_QUALITY  particle caps and the frame-time thresholds for the low-quality fallback
//
// The emitter presets, the impacts and the FX themes are in assets/fx/fx.json since PR 10b
// ("presets", "impacts", "themes"; read through FxManifest), with particle variant names, not colours.

// Which impact (fx.json "impacts") each game moment plays; null = no impact for it.
// Brian, Nov 1 2026: "Not on the card purchases or gear upgrades. But the enemy kills are good".
// So shop card picks (every rarity) and Gear spending (Workshop upgrades, card / ability unlocks)
// play no burst, bass hit or flash; their own pre-FX sounds and UI animation are unchanged.
LST.FX_ROUTES = {
  bossKilled: "bossKill",
  finaleWon: "finaleWon",
  towerTierUp: "tierUp",
  cardTaken: null,       // was "cardPick"
  cardTakenEpic: null,   // was "cardPickEpic"
  workshopUpgrade: null, // was "workshop"
  unlock: null,          // was "unlock"
  // ELEMENT_HIT events, keyed "element:<id>"
  "element:ember": "elemEmber",
  "element:frostbite": "elemFrost",
  "element:chainSpark": "elemSpark",
  "element:venom": "elemVenom",
  "element:shatter": "elemShatter",
};

LST.FX_QUALITY = {
  capWorld: 240,     // hard cap, lawn particles
  capScreen: 60,     // hard cap, screen-space (above menus) particles  -> 300 total
  lowScale: 0.45,    // low quality: fraction of the cap and of every emitter count
  reducedScale: 0.35, // reduced motion: fewer particles (and no shake / flash)
  slowFrameMs: 21,   // frame-time EMA above this for slowHoldS seconds -> low quality
  slowHoldS: 0.5,
  okFrameMs: 17.5,   // ...back to high after okHoldS seconds under this
  okHoldS: 4.0,
};
