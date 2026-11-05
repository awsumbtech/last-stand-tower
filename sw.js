// Service worker: makes the game work offline.
//
// Strategy: network-first for everything we own, falling back to the cache when
// offline. Fresh files are copied into the cache as they're fetched, so an
// online reload always gets the latest version.
//
// Bump VERSION whenever you deploy changes. That installs a new worker, which
// precaches the new files, and the page shows a "New version available" toast.
const VERSION = "v18"; // Elemental cards + status looks: flames / ice / goo / sparks drawn on enemies
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
  "src/core/EventBus.js",
  "src/audio.js",
  "src/upgrades.js",
  "src/traps.js",
  "src/elements/StatusEffect.js",
  "src/elements/Element.js",
  "src/elements/PairBonus.js",
  "src/elements/ElementRegistry.js",
  "src/elements/Ember.js",
  "src/elements/Frostbite.js",
  "src/elements/ChainSpark.js",
  "src/elements/Venom.js",
  "src/elements/Shatter.js",
  "src/meta.js",
  "src/entities.js",
  "src/world.js",
  "src/waves.js",
  "src/render.js",
  "src/sprites/SpriteAtlas.js",
  "src/sprites/SpriteLibrary.js",
  "src/sprites/AnimationPlayer.js",
  "src/sprites/SpriteTinter.js",
  "src/sprites/EyeLayer.js",
  "src/sprites/EnemyAnimationRules.js",
  "src/sprites/EnemySpriteRenderer.js",
  "src/themes/neon.js",
  "src/themes/pixel.js",
  "src/themes/cartoon/palette.js",
  "src/themes/cartoon/primitives.js",
  "src/themes/cartoon/enemy-fx.js",
  "src/themes/cartoon/enemy-parts.js",
  "src/themes/cartoon/enemy-mole.js",
  "src/themes/cartoon/enemy-bodies.js",
  "src/themes/cartoon/enemies.js",
  "src/themes/cartoon/lawn.js",
  "src/themes/cartoon/tower.js",
  "src/themes/cartoon/projectiles.js",
  "src/themes/cartoon/effects.js",
  "src/themes/cartoon/text.js",
  "src/themes/cartoon/index.js",
  "src/fx/FxPresets.js",
  "src/fx/ParticlePool.js",
  "src/fx/Emitter.js",
  "src/fx/FxCamera.js",
  "src/fx/FxQuality.js",
  "src/fx/FrameStats.js",
  "src/fx/TowerAura.js",
  "src/fx/ImpactSync.js",
  "src/fx/ScreenAnchors.js",
  "src/fx/FxRenderer.js",
  "src/elements/looks/StatusLook.js",
  "src/elements/looks/BurnFlames.js",
  "src/elements/looks/IceCrust.js",
  "src/elements/looks/VenomDrips.js",
  "src/elements/looks/SparkCrackle.js",
  "src/fx/FxOverlay.js",
  "src/fx/FxDirector.js",
  "src/ui/CardFlip.js",
  "src/ui.js",
  "src/game.js",
  "src/demo.js",
  "src/main.js",
  "src/core/DevFlags.js",
  "src/pwa.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "fonts/Fredoka.woff2",
  // Enemy sprite sheets (~2.3 MB unquantized; King Mole is most of it)
  "assets/sprites/enemies/basic/basic.json",
  "assets/sprites/enemies/basic/basic.png",
  "assets/sprites/enemies/basic/basic_pupil.png",
  "assets/sprites/enemies/fast/fast.json",
  "assets/sprites/enemies/fast/fast.png",
  "assets/sprites/enemies/fast/fast_body.json",
  "assets/sprites/enemies/fast/fast_body.png",
  "assets/sprites/enemies/fast/fast_face.json",
  "assets/sprites/enemies/fast/fast_face.png",
  "assets/sprites/enemies/fast/fast_pupil.png",
  "assets/sprites/enemies/tank/tank.json",
  "assets/sprites/enemies/tank/tank.png",
  "assets/sprites/enemies/big_red/big_red.json",
  "assets/sprites/enemies/big_red/big_red.png",
  "assets/sprites/enemies/king_mole/king_mole_hole.json",
  "assets/sprites/enemies/king_mole/king_mole_hole.png",
  "assets/sprites/enemies/king_mole/king_mole_body.json",
  "assets/sprites/enemies/king_mole/king_mole_body.png",
  "assets/sprites/enemies/king_mole/king_mole_angry_body.json",
  "assets/sprites/enemies/king_mole/king_mole_angry_body.png",
  "assets/sprites/enemies/king_mole/king_mole_front.json",
  "assets/sprites/enemies/king_mole/king_mole_front.png",
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
