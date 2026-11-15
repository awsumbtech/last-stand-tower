// UI: owns the DOM overlays and switches between them. One object per screen
// (src/ui/screens/*.js: StartScreen, ShopScreen, PauseScreen, ConfirmScreen, ResultsScreen,
// WorkshopScreen, GotchaScreen, ClearedScreen), the Hud (with the AbilityButton and BossBar),
// the SettingsToggles and the Toast. show(name) shows exactly one screen; the state objects
// say which (GameState.screen / showScreen). The UI never changes game state directly; it
// calls methods on the game. The methods below that hand off keep their names because the
// controllers, the tests and the tools call them.
LST.UI = class UI {
  constructor(game) {
    this.game = game;
    this.toaster = new LST.Toast(document);
    this.hud = new LST.Hud(game);
    this.screens = {
      start: new LST.StartScreen(this, game),
      upgrade: new LST.ShopScreen(this, game),
      pause: new LST.PauseScreen(this, game),
      results: new LST.ResultsScreen(this, game),
      workshop: new LST.WorkshopScreen(this, game),
      confirm: new LST.ConfirmScreen(this, game),
      gotcha: new LST.GotchaScreen(this, game),
      cleared: new LST.ClearedScreen(this, game),
      dying: new LST.Screen(this, game, null, true), // the tower just fell: no screen, no HUD
    };
    this.toggles = new LST.SettingsToggles();

    // Every button click gets a little "tap" (buying plays its own sound).
    document.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (b && !b.classList.contains("card") && !b.classList.contains("ws-card") && !b.closest(".shop-actions")) LST.audio.play("tap");
    });
  }

  // Show exactly one screen (or none, while playing).
  show(name) {
    const cur = this.screens[name] || null;
    for (const [key, s] of Object.entries(this.screens)) s.setVisible(key === name);
    this.hud.setVisible(!(cur && cur.hidesHud));
    if (cur && cur.el) LST.UI.pop(cur.el.querySelector(".panel"));
    for (const [key, s] of Object.entries(this.screens)) if (key !== name) s.leave();
    if (cur) cur.onShow();
  }

  renderStart() { this.screens.start.render(); }
  renderShop(opts) { this.screens.upgrade.render(opts); }
  renderWorkshop(opts) { this.screens.workshop.render(opts); }
  updateHud() { this.hud.update(); }
  updateToggles() { this.toggles.update(); }
  toast(text) { this.toaster.mini(text); }

  // Restart a CSS "squash & stretch" entrance animation on an element.
  static pop(el, cls = "pop") {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // force reflow so the animation replays
    el.classList.add(cls);
  }
};
