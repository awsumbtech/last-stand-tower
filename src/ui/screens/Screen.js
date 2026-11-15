// Screen: base class for one DOM overlay (`.screen` element) the UI switches between. The UI
// (src/ui.js) makes one of each and the state objects pick which one shows (GameState.screen).
//   el         the screen's root element (null for a moment with no screen, e.g. "dying")
//   hidesHud   true when the HUD is hidden while this screen shows
//   onShow()   fill the screen from the game (called each time it shows)
//   leave()    the screen is being switched away from (stop its timers)
LST.Screen = class Screen {
  constructor(ui, game, el, hidesHud = false) {
    this.ui = ui;
    this.game = game;
    this.el = el;
    this.hidesHud = hidesHud;
  }

  setVisible(on) { if (this.el) this.el.classList.toggle("hidden", !on); }
  onShow() {}
  leave() {}
};
