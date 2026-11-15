// PauseScreen ("pause"): the pause panel mid-run, or the same panel as Settings elsewhere. The
// current state decides which (GameState.runPaused) and what Resume / Done does
// (GameState.closePauseMenu). Quit goes to the menu; Reset progress asks first (ConfirmScreen).
LST.PauseScreen = class PauseScreen extends LST.Screen {
  constructor(ui, game) {
    super(ui, game, document.getElementById("screen-pause"));
    const $ = (id) => document.getElementById(id);
    this.title = $("pause-title");
    this.resume = $("btn-resume");
    this.quit = $("btn-quit");
    $("btn-reset").addEventListener("click", () => ui.show("confirm"));
    this.resume.addEventListener("click", () => game.flow.current.closePauseMenu(game));
    this.quit.addEventListener("click", () => game.toMenu());
  }

  onShow() {
    const inRun = this.game.flow.current.runPaused;
    this.title.textContent = inRun ? "Paused" : "Settings";
    this.resume.textContent = inRun ? "Resume" : "Done";
    this.quit.classList.toggle("hidden", !inRun);
  }
};
