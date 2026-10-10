// Service worker: makes the game work offline.
//
// Strategy: network-first for everything we own, falling back to the cache when
// offline. Fresh files are copied into the cache as they're fetched, so an
// online reload always gets the latest version.
//
// Bump VERSION whenever you deploy changes. That installs a new worker, which
// precaches the new files, and the page shows a "New version available" toast.
const VERSION = "v5";
const CACHE = `last-stand-tower-${VERSION}`;

const PRECACHE = [
  "./",
  "index.html",
  "styles.html",
  "style.css",
  "manifest.webmanifest",
  "src/config.js",
  "src/utils.js",
  "src/settings.js",
  "src/audio.js",
  "src/upgrades.js",
  "src/entities.js",
  "src/world.js",
  "src/waves.js",
  "src/render.js",
  "src/themes/neon.js",
  "src/themes/pixel.js",
  "src/themes/cartoon.js",
  "src/ui.js",
  "src/game.js",
  "src/demo.js",
  "src/main.js",
  "src/pwa.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "fonts/Fredoka.woff2",
];

const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  // cache: "reload" skips the HTTP cache so we precache what's really deployed.
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })))
    )
  );
  // First install: take over right away. Updates wait for the page's "Refresh" tap.
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("last-stand-tower-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await withTimeout(fetch(req), NETWORK_TIMEOUT_MS);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // Offline (or very slow): serve the cached copy. Query strings like
    // ?style=pixel are ignored so the cached page still matches.
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === "navigate") {
      const shell = await cache.match("index.html");
      if (shell) return shell;
    }
    throw err;
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
