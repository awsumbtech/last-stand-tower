// Service worker registration + "update available" flow.
// When a new version is deployed, the new worker installs in the background and
// waits. We show a small toast; tapping "Refresh" activates it and reloads.
(function () {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;

  // On a first visit the brand-new worker claims the page; that first
  // controller change needs no reload. Any later one is an update.
  let skipNextChange = !navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (skipNextChange) { skipNextChange = false; return; }
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  function showUpdateToast(worker) {
    if (document.querySelector(".update-toast")) return;
    const toast = document.createElement("div");
    toast.className = "update-toast";
    toast.innerHTML = '<span>New version available!</span><button type="button" class="btn">Refresh</button>';
    toast.querySelector("button").addEventListener("click", () => {
      worker.postMessage({ type: "SKIP_WAITING" });
      toast.remove();
    });
    document.body.appendChild(toast);
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).then((reg) => {
      // Only offer an update if a worker is already controlling this page
      // (on the very first visit there is nothing to update from).
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) showUpdateToast(nw);
        });
      });
      // Check for a new version whenever the app comes back to the foreground.
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) reg.update().catch(() => {});
      });
    }).catch((err) => console.warn("Service worker registration failed:", err));
  });
})();
