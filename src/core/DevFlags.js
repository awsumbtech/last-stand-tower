// Developer-only switches, read once from the URL.
// ?debug=1 or ?dev=1 adds the "dev" class to <html>, which reveals any
// element marked .dev-only (e.g. the Art style preview link). Players never
// see those elements. The dev pages themselves (styles.html) stay reachable
// by URL either way.
//
// &unlock=beach (comma list of world ids) opens those worlds for this page load only, and
// only together with ?debug=1 / ?dev=1. It never writes the save and never touches the normal
// unlock rule (LST.WorldRegistry.isUnlocked reads DevFlags.unlocks as a separate test door).
window.LST = window.LST || {};
LST.DevFlags = (function () {
  const params = new URLSearchParams(location.search);
  const on = (k) => { const v = params.get(k); return v !== null && v !== "0" && v !== "false"; };
  const enabled = on("debug") || on("dev");
  document.documentElement.classList.toggle("dev", enabled);
  const unlocks = enabled ? String(params.get("unlock") || "").split(",").map((s) => s.trim()).filter(Boolean) : [];
  return Object.freeze({ enabled, unlocks: Object.freeze(unlocks) });
})();
