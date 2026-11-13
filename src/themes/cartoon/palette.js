// Cartoon theme, part 1 of the split: shared palette and constants.
// Every cartoon/*.js file reads from and adds to LST.CartoonKit; index.js
// assembles the final LST.themes.cartoon object. Load order: see index.html.
(function () {
  const INK = "#2b1d3a";
  const FONT = 'Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
  const COLORS = {
    basic: { body: "#ff6fb5", shade: "#e04f98" },
    fast: { body: "#ffd23f", shade: "#e8b417" },
    tank: { body: "#ff9f43", shade: "#e07b1c" },
    boss: { body: "#ff4757", shade: "#d42a3a" },
    mole: { body: "#8d6e63", shade: "#6d4c41" },
  };

  // The same color cues as the vector fills, blended into the sprite (SpriteTinter keeps
  // the ink outlines): flash lights it up, charge flickers red. Slowed enemies get the
  // ChillFrost look (src/elements/looks/ChillFrost.js), never a tint.
  const TINT = {
    flash: [{ color: "#ffffff", alpha: 1, mode: "overlay" }, { color: "#ffffff", alpha: 0.6, mode: "overlay" }],
    bossFlash: [{ color: "#ff8a95", alpha: 1, mode: "overlay" }, { color: "#ffffff", alpha: 0.5, mode: "overlay" }],
    charge: { color: "#ff1f3d", alpha: 0.8, mode: "overlay" },
  };

  // Small seeded random so the ground looks the same every frame.
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  LST.CartoonKit = { INK, FONT, COLORS, TINT, rng, methods: {} };
})();
