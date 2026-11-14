// Entry point: create the game, run the loop, wire keyboard shortcuts.
(function () {
  const canvas = document.getElementById("game");
  // Art style: cartoon. ?style= only picks a theme the ThemeSelector offers (neon / pixel are hidden).
  const styleId = new URLSearchParams(location.search).get("style");
  const renderer = new LST.Renderer(canvas, LST.ThemeSelector.pick(styleId));
  renderer.resize();
  window.addEventListener("resize", () => renderer.resize());

  const game = new LST.Game(renderer);
  window.game = game; // handy for debugging in the console

  // Effects listen to the game's events (?fx=off turns them off, for A/B checks).
  const fxOff = new URLSearchParams(location.search).get("fx") === "off";
  const fx = fxOff || !LST.FxDirector ? null : new LST.FxDirector({ bus: game.events, audio: LST.audio, settings: LST.settings, win: window });
  if (fx) fx.onRunStart(game);
  renderer.fx = fx;
  LST.fxDirector = fx;

  // Browsers (especially iOS) only allow audio after a user gesture.
  // The first tap/click/key unlocks it and starts the music.
  LST.audio.startMusic();
  const unlockEvents = ["pointerdown", "touchend", "click", "keydown"];
  const unlock = () => {
    LST.audio.unlock();
    if (LST.audio.unlocked) unlockEvents.forEach((ev) => window.removeEventListener(ev, unlock, true));
  };
  unlockEvents.forEach((ev) => window.addEventListener(ev, unlock, true));

  // Keyboard shortcuts + auto-pause on a hidden tab (src/core/InputController.js).
  game.input = new LST.InputController(game, { doc: document, settings: LST.settings }).attach(window);

  let last = performance.now();
  function frame(now) {
    const frameMs = now - last;
    const dt = Math.min(LST.CONFIG.MAX_DT, frameMs / 1000);
    last = now;
    game.update(dt);
    if (fx) fx.update(dt, game, frameMs);
    const t0 = performance.now();
    renderer.draw(game, dt);
    if (fx) fx.endFrame(frameMs, performance.now() - t0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
