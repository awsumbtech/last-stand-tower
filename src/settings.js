// Player settings saved in localStorage: sound effects, music, vibration.
// Other modules subscribe with LST.settings.onChange(fn).
LST.settings = (function () {
  const DEFAULTS = { sfx: true, music: true, haptics: true };
  const values = {};
  for (const key of Object.keys(DEFAULTS)) values[key] = LST.utils.storage.get("lst." + key, DEFAULTS[key]);
  const listeners = [];
  return {
    get: (key) => values[key],
    set(key, value) {
      values[key] = !!value;
      LST.utils.storage.set("lst." + key, values[key]);
      for (const fn of listeners) fn(key, values[key]);
    },
    toggle(key) { this.set(key, !values[key]); return values[key]; },
    onChange(fn) { listeners.push(fn); },
  };
})();

// Haptic feedback where supported (Android Chrome; iOS Safari has no vibrate API).
LST.haptics = {
  supported: typeof navigator !== "undefined" && typeof navigator.vibrate === "function",
  buzz(pattern) {
    if (!this.supported || !LST.settings.get("haptics")) return;
    try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  },
};
