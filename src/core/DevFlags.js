// Developer-only switches, read once from the URL.
// ?debug=1 or ?dev=1 adds the "dev" class to <html>, which reveals any
// element marked .dev-only (e.g. the Art style preview link). Players never
// see those elements. The dev pages themselves (styles.html) stay reachable
// by URL either way.
window.LST = window.LST || {};
LST.DevFlags = (function () {
  const params = new URLSearchParams(location.search);
  const on = (k) => { const v = params.get(k); return v !== null && v !== "0" && v !== "false"; };
  const enabled = on("debug") || on("dev");
  document.documentElement.classList.toggle("dev", enabled);
  return Object.freeze({ enabled });
})();
