// SettingsToggles: the sound / music / vibration switches (HUD icons and pause-panel rows).
// A tap flips the setting; every switch shows the current value (off class, aria-pressed,
// ON / OFF). Vibration rows are removed where the device can't vibrate.
LST.SettingsToggles = class SettingsToggles {
  constructor() {
    this.toggles = [...document.querySelectorAll(".toggle[data-setting]")];
    for (const b of this.toggles) {
      b.addEventListener("click", () => {
        LST.settings.toggle(b.dataset.setting);
        if (b.dataset.setting === "haptics") LST.haptics.buzz(40);
      });
    }
    if (!LST.haptics.supported) document.querySelectorAll(".haptics-only").forEach((el) => el.remove());
    LST.settings.onChange(() => this.update());
    this.update();
  }

  update() {
    for (const b of this.toggles) {
      const on = LST.settings.get(b.dataset.setting);
      b.classList.toggle("off", !on);
      b.setAttribute("aria-pressed", String(on));
      const state = b.querySelector(".state");
      if (state) state.textContent = on ? "ON" : "OFF";
    }
  }
};
