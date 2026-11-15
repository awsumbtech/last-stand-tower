// UpdateNotifier: service worker registration + the "update available" flow.
// When a new version is deployed, the new worker installs in the background and waits. A
// Toast offers "Refresh"; tapping it activates the worker and the page reloads.
LST.UpdateNotifier = class UpdateNotifier {
  constructor(win = window, toast = new LST.Toast(win.document)) {
    this.win = win;
    this.toast = toast;
    this.reloading = false;
  }

  start() {
    const win = this.win, nav = win.navigator;
    if (!("serviceWorker" in nav) || win.location.protocol === "file:") return;
    // On a first visit the brand-new worker claims the page; that first
    // controller change needs no reload. Any later one is an update.
    this.skipNextChange = !nav.serviceWorker.controller;
    nav.serviceWorker.addEventListener("controllerchange", () => this.onControllerChange());
    win.addEventListener("load", () => this.register());
  }

  onControllerChange() {
    if (this.skipNextChange) { this.skipNextChange = false; return; }
    if (this.reloading) return;
    this.reloading = true;
    this.win.location.reload();
  }

  offer(worker) {
    this.toast.offer("New version available!", "Refresh", () => worker.postMessage({ type: "SKIP_WAITING" }));
  }

  register() {
    const nav = this.win.navigator, doc = this.win.document;
    nav.serviceWorker.register("sw.js", { scope: "./" }).then((reg) => {
      // Only offer an update if a worker is already controlling this page
      // (on the very first visit there is nothing to update from).
      if (reg.waiting && nav.serviceWorker.controller) this.offer(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && nav.serviceWorker.controller) this.offer(nw);
        });
      });
      // Check for a new version whenever the app comes back to the foreground.
      doc.addEventListener("visibilitychange", () => {
        if (!doc.hidden) reg.update().catch(() => {});
      });
    }).catch((err) => console.warn("Service worker registration failed:", err));
  }
};
