// Chunky cartoon (the default look): thick ink outlines, bright flat colors,
// googly eyes, a tower with a face, and squash & stretch on everything that moves.
// Assembler: builds LST.themes.cartoon from the parts in src/themes/cartoon/.
(function () {
  const M = LST.CartoonKit.methods;
  const ORDER = ["background", "range", "tower", "enemy", "corpseLife", "corpse", "projectile",
    "particle", "burst", "text", "confetti", "banner", "bossBanner"];
  const theme = {
    id: "cartoon",
    name: "Cartoon",
    label: "Chunky cartoon: thick outlines, flat colors, squash & stretch",

    // Enemy sprite sheets load in the background; vector art covers until they're in.
    init() {
      if (LST.sprites) LST.sprites.preload();
    },
  };
  for (const k of ORDER) {
    if (typeof M[k] !== "function") throw new Error("cartoon theme: missing part " + k);
    theme[k] = M[k];
  }
  LST.themes.cartoon = theme;
})();
