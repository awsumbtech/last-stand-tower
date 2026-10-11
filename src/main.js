// Entry point: create the game, run the loop, wire keyboard shortcuts.
(function () {
  const canvas = document.getElementById("game");
  // Art style: cartoon by default; ?style=neon or ?style=pixel for comparison.
  const styleId = new URLSearchParams(location.search).get("style");
  const renderer = new LST.Renderer(canvas, LST.themes[styleId] || LST.themes.cartoon);
  renderer.resize();
  window.addEventListener("resize", () => renderer.resize());

  const game = new LST.Game(renderer);
  window.game = game; // handy for debugging in the console

  // Browsers (especially iOS) only allow audio after a user gesture.
  // The first tap/click/key unlocks it and starts the music.
  LST.audio.startMusic();
  const unlockEvents = ["pointerdown", "touchend", "click", "keydown"];
  const unlock = () => {
    LST.audio.unlock();
    if (LST.audio.unlocked) unlockEvents.forEach((ev) => window.removeEventListener(ev, unlock, true));
  };
  unlockEvents.forEach((ev) => window.addEventListener(ev, unlock, true));

  window.addEventListener("keydown", (e) => {
    const inWorkshop = !document.getElementById("screen-workshop").classList.contains("hidden");
    if (inWorkshop && (e.code === "Escape" || e.code === "KeyW")) {
      game.closeWorkshop();
    } else if (e.code === "Space" || e.code === "KeyP" || e.code === "Escape") {
      e.preventDefault();
      game.togglePause();
    } else if (e.code === "KeyW" && (game.state === "menu" || (game.state === "gameover" && !game.resultsDelay))) {
      game.openWorkshop(game.state === "gameover" ? "results" : "start");
    } else if (e.code === "KeyF") {
      game.toggleSpeed();
    } else if (e.code === "Enter" && game.state === "gotcha") {
      game.dismissGotcha();
    } else if (e.code === "Enter") {
      if (game.state === "menu" || game.state === "workshop" || (game.state === "gameover" && !game.resultsDelay)) game.newGame();
      else if (game.state === "upgrade") game.leaveShop();
    } else if (game.state === "upgrade" && /^(Digit|Numpad)[1-3]$/.test(e.code)) {
      game.takeCard(+e.code.slice(-1) - 1);
    } else if (game.state === "upgrade" && e.code === "KeyR") {
      game.rerollShop();
    } else if (game.state === "upgrade" && e.code === "KeyH") {
      game.repairTower();
    } else if (e.code === "KeyM") {
      LST.settings.toggle("music");
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
