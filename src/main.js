// Entry point: create the game, run the loop, wire keyboard shortcuts.
(function () {
  const canvas = document.getElementById("game");
  const renderer = new LST.Renderer(canvas);
  renderer.resize();
  window.addEventListener("resize", () => renderer.resize());

  const game = new LST.Game(renderer);
  window.game = game; // handy for debugging in the console

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "KeyP" || e.code === "Escape") {
      e.preventDefault();
      game.togglePause();
    } else if (e.code === "KeyF") {
      game.toggleSpeed();
    } else if (e.code === "Enter") {
      if (game.state === "menu" || game.state === "gameover") game.newGame();
      else if (game.state === "upgrade") game.startNextWave();
    }
  });

  // Auto-pause when the tab is hidden so you don't come back to a dead tower.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.state === "playing") game.togglePause();
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(LST.CONFIG.MAX_DT, (now - last) / 1000);
    last = now;
    game.update(dt);
    renderer.draw(game, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
