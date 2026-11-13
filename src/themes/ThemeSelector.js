// ThemeSelector: which art themes the game and the style preview (styles.html) may use.
// Cartoon is the game. Neon and pixel are HIDDEN, not deleted (pending Brian: docs/OO-MIGRATION.md,
// Decisions 2): with ALT_THEMES off, index.html and styles.html do not load src/themes/neon.js or
// src/themes/pixel.js, ?style= is ignored, and the preview lists cartoon only. Their code stays in
// the repo. To bring them back: set ALT_THEMES to true and load the two scripts again before
// src/themes/cartoon/index.js in index.html and styles.html.
LST.ThemeSelector = class ThemeSelector {
  static get ALT_THEMES() { return false; }
  static get HIDDEN() { return ["neon", "pixel"]; }
  // Theme ids on offer, cartoon first (hidden ones only with the flag on and their script loaded).
  static available() {
    const alt = this.ALT_THEMES ? this.HIDDEN.filter((id) => LST.themes && LST.themes[id]) : [];
    return ["cartoon", ...alt];
  }
  // The theme for a ?style= id: cartoon unless that id is on offer.
  static pick(styleId) {
    return this.available().includes(styleId) ? LST.themes[styleId] : LST.themes.cartoon;
  }
};
