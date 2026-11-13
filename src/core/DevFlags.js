// Developer-only switches, read once from the URL.
// ?debug=1 or ?dev=1 adds the "dev" class to <html>, which reveals any
// element marked .dev-only (e.g. the Art style preview link). Players never
// see those elements. The dev pages themselves (styles.html) stay reachable
// by URL either way.
//
// &unlock=beach (comma list of world ids) opens those worlds for this page load only, only
// together with ?debug=1 / ?dev=1, and only on a local host (localhost, 127.0.0.1, ::1 or file:).
// On any other host (GitHub Pages included) it is ignored. It never touches the normal unlock
// rule (LST.WorldRegistry.isUnlocked reads DevFlags.unlocks as a separate test door), and a run
// in a door-only world writes nothing to the save (LST.DevRunGuard).
window.LST = window.LST || {};
LST.DevFlags = (function () {
  const params = new URLSearchParams(location.search);
  const on = (k) => { const v = params.get(k); return v !== null && v !== "0" && v !== "false"; };
  const enabled = on("debug") || on("dev");
  document.documentElement.classList.toggle("dev", enabled);
  const local = location.protocol === "file:" || ["localhost", "127.0.0.1", "::1", "[::1]"].includes(location.hostname);
  const unlocks = enabled && local ? String(params.get("unlock") || "").split(",").map((s) => s.trim()).filter(Boolean) : [];
  return Object.freeze({ enabled, local, unlocks: Object.freeze(unlocks) });
})();
