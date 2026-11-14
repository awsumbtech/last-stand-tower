// ShopState ("upgrade"): the between-waves shop. 1-3 take a card, R rerolls, H repairs,
// Enter leaves. The run clock keeps counting.
LST.ShopState = LST.GameStateMachine.register(class ShopState extends LST.GameState {
  static get id() { return "upgrade"; }
  get runClock() { return true; }
  onKey(game, code) {
    if (code === "Enter") { game.leaveShop(); return true; }
    if (/^(Digit|Numpad)[1-3]$/.test(code)) { game.takeCard(+code.slice(-1) - 1); return true; }
    if (code === "KeyR") { game.rerollShop(); return true; }
    if (code === "KeyH") { game.repairTower(); return true; }
    return false;
  }
});
