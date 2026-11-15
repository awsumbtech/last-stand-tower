// ConfirmScreen ("confirm"): "Reset progress?" Cancel goes back to the settings panel; Reset
// wipes progress and says so in a toast.
LST.ConfirmScreen = class ConfirmScreen extends LST.Screen {
  constructor(ui, game) {
    super(ui, game, document.getElementById("screen-confirm"));
    const $ = (id) => document.getElementById(id);
    $("btn-confirm-cancel").addEventListener("click", () => ui.show("pause"));
    $("btn-confirm-reset").addEventListener("click", () => {
      game.resetProgress();
      LST.audio.play("reroll");
      ui.toast("Progress reset. Fresh start!");
    });
  }
};
