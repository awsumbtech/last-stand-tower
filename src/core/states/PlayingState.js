// PlayingState ("playing"): a wave is on. Eases the low-HP slow-mo, runs the sim steps (two
// normal-size steps at 2x speed so fast shots never skip enemies), and beats the low-HP heart.
LST.PlayingState = LST.GameStateMachine.register(class PlayingState extends LST.GameState {
  static get id() { return "playing"; }
  get runClock() { return true; }
  get pausesWhenHidden() { return true; }
  update(game, dt) {
    let scale = 1;
    if (game.slowmo > 0) {
      game.slowmo -= dt;
      scale = 0.35 + 0.65 * (1 - Math.max(0, game.slowmo) / 0.9);
    }
    for (let i = 0; i < game.speed && game.state === "playing"; i++) game.step(dt * scale);

    if (game.lowHpActive && game.state === "playing") {
      game.heartbeat -= dt;
      if (game.heartbeat <= 0) {
        LST.audio.play("heartbeat");
        game.heartbeat = 1.3;
      }
    }
    game.ui.updateHud();
  }
});
