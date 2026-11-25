// Service worker: makes the game work offline.
//
// Strategy: network-first for everything we own, falling back to the cache when
// offline. Fresh files are copied into the cache as they're fetched, so an
// online reload always gets the latest version.
//
// Bump VERSION whenever you deploy changes. That installs a new worker, which
// precaches the new files, and the page shows a "New version available" toast.
const VERSION = "v33"; // skippable wave-clear and death wait; WAVE banner 0.8s
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
  "src/core/EnemySpawner.js",
  "src/core/DamageSystem.js",
  "src/fx/FxSpawner.js",
  "src/world.js",
  "src/waves.js",
  "src/enemies/parts/EnemyPart.js",
  "src/enemies/parts/ShellShield.js",
  "src/enemies/parts/Flyer.js",
  "src/enemies/PartEnemy.js",
  "src/enemies/EnemyArchetype.js",
  "src/enemies/EnemyRegistry.js",
  "src/enemies/BeachEnemies.js",
  "src/bosses/BossScript.js",
  "src/bosses/Coconut.js",
  "src/bosses/CaptainCrabclaw.js",
  "src/worlds/LevelPlan.js",
  "src/worlds/ClassicWaveDirector.js",
  "src/worlds/LevelDirector.js",
  "src/worlds/WorldDefinition.js",
  "src/worlds/WorldRegistry.js",
  "src/worlds/Backyard.js",
  "src/worlds/Beach.js",
  "src/render/RenderLayer.js",
  "src/render/OverdriveRing.js",
  "src/render/BackdropLayer.js",
  "src/render/EnemyLayer.js",
  "src/render/TowerLayer.js",
  "src/render/FxLayer.js",
  "src/render/HudCanvasLayer.js",
  "src/render/OverlayLayer.js",
  "src/render/RenderPipeline.js",
  "src/render.js",
  "src/sprites/SpriteAtlas.js",
  "src/sprites/SpriteLibrary.js",
  "src/sprites/AnimationPlayer.js",
  "src/sprites/SheetAnimation.js",
  "src/sprites/LookSheetLibrary.js",
  "src/worlds/render/AtlasSheetAdapter.js",
  "src/worlds/render/World2Sheets.js",
  "src/worlds/render/SheetRenderer.js",
  "src/worlds/render/HermitCrabRenderer.js",
  "src/worlds/render/SeagullRenderer.js",
  "src/worlds/render/CrabclawRenderer.js",
  "src/worlds/render/EliteShellRenderer.js",
  "src/worlds/render/CoconutRenderer.js",
  "src/worlds/render/BeachBackdrop.js",
  "src/worlds/render/WorldRenderers.js",
  "src/sprites/SpriteTinter.js",
  "src/sprites/EyeLayer.js",
  "src/sprites/EnemyAnimationRules.js",
  "src/sprites/EnemySpriteRenderer.js",
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
  "src/themes/ThemeSelector.js",
  "src/fx/FxPresets.js",
  "src/fx/ParticlePool.js",
  "src/fx/Emitter.js",
  "src/fx/FxCamera.js",
  "src/fx/FxQuality.js",
  "src/fx/FrameStats.js",
  "src/fx/TowerAura.js",
  "src/fx/ImpactSync.js",
  "src/fx/ScreenAnchors.js",
  "src/fx/SpriteEffect.js",
  "src/fx/FxManifest.js",
  "src/fx/EffectPlayer.js",
  "src/fx/draw/TowerGroundGlow.js",
  "src/fx/draw/ProjectileTrails.js",
  "src/fx/draw/ChainArcs.js",
  "src/fx/draw/TextGlows.js",
  "src/fx/draw/ParticleBatch.js",
  "src/fx/draw/ImpactPulses.js",
  "src/fx/draw/ImpactFlashes.js",
  "src/fx/FxRenderer.js",
  "src/elements/looks/StatusLook.js",
  "src/elements/looks/LookRegistry.js",
  "src/elements/looks/LookLayer.js",
  "src/elements/looks/BurnFlames.js",
  "src/elements/looks/IceCrust.js",
  "src/elements/looks/VenomDrips.js",
  "src/elements/looks/SparkCrackle.js",
  "src/elements/looks/ChillFrost.js",
  "src/fx/FxOverlay.js",
  "src/fx/FxDirector.js",
  "src/ui/CardFlip.js",
  "src/ui/WorldSelect.js",
  "src/ui/WorldScreens.js",
  "src/ui/UiIcons.js",
  "src/ui/screens/Toast.js",
  "src/ui/UpdateNotifier.js",
  "src/ui/screens/Screen.js",
  "src/ui/screens/StartScreen.js",
  "src/ui/screens/ShopScreen.js",
  "src/ui/screens/PauseScreen.js",
  "src/ui/screens/ConfirmScreen.js",
  "src/ui/screens/ResultsScreen.js",
  "src/ui/screens/workshop/CardsTab.js",
  "src/ui/screens/workshop/UpgradesTab.js",
  "src/ui/screens/workshop/DeckTab.js",
  "src/ui/screens/workshop/CodexTab.js",
  "src/ui/screens/WorkshopScreen.js",
  "src/ui/screens/GotchaScreen.js",
  "src/ui/screens/ClearedScreen.js",
  "src/ui/screens/AbilityButton.js",
  "src/ui/screens/BossBar.js",
  "src/ui/screens/Hud.js",
  "src/ui/screens/SettingsToggles.js",
  "src/ui.js",
  "src/core/SceneFlags.js",
  "src/core/GameState.js",
  "src/core/GameStateMachine.js",
  "src/core/states/MenuState.js",
  "src/core/states/PlayingState.js",
  "src/core/states/PausedState.js",
  "src/core/states/CelebrateState.js",
  "src/core/states/ShopState.js",
  "src/core/states/GotchaState.js",
  "src/core/states/GameOverState.js",
  "src/core/states/WorkshopState.js",
  "src/core/states/VictoryState.js",
  "src/core/states/ClearedState.js",
  "src/core/InputController.js",
  "src/abilities/Ability.js",
  "src/abilities/Shockwave.js",
  "src/abilities/Freeze.js",
  "src/abilities/Overdrive.js",
  "src/abilities/AbilitySystem.js",
  "src/shop/ShopController.js",
  "src/core/RewardRules.js",
  "src/core/KillFeedback.js",
  "src/bosses/BossEventRouter.js",
  "src/bosses/FinaleController.js",
  "src/core/RunRecorder.js",
  "src/core/WorkshopController.js",
  "src/core/WaveFlow.js",
  "src/game.js",
  "src/demo.js",
  "src/main.js",
  "src/core/DevFlags.js",
  "src/core/DevRunGuard.js",
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
  // Status look sheets (Game Art & Motion v0.1.0, ~700 KB)
  "assets/sprites/looks/BurnFlames/BurnFlames_a.json",
  "assets/sprites/looks/BurnFlames/BurnFlames_a.q.png",
  "assets/sprites/looks/IceCrust/IceCrust_a.json",
  "assets/sprites/looks/IceCrust/IceCrust_a.q.png",
  "assets/sprites/looks/IceCrust/IceCrust_a_snap.q.png",
  "assets/sprites/looks/VenomDrips/VenomDrips_a.json",
  "assets/sprites/looks/VenomDrips/VenomDrips_a.q.png",
  "assets/sprites/looks/SparkCrackle/SparkCrackle_c.json",
  "assets/sprites/looks/SparkCrackle/SparkCrackle_c.q.png",
  "assets/sprites/looks/ChillFrost/ChillFrost_c.json",
  "assets/sprites/looks/ChillFrost/ChillFrost_c.q.png",
  "assets/sprites/looks/ChillFrost/ChillFrost_c_attach.q.png",
  "assets/sprites/looks/ChillFrost/ChillFrost_c_still.q.png",
  "assets/sprites/looks/ChillFrost/ChillFrost_c_fade.q.png",
  // World 2 (Beach) art, Game Art & Motion v0.1.2 recommended picks (tools/world-test.js checks each exists).
  "assets/sprites/world2/background/beach_bg_a.json",
  "assets/sprites/world2/background/beach_bg_a.q.png",
  "assets/sprites/world2/background/beach_surf.json",
  "assets/sprites/world2/background/beach_surf.q.png",
  "assets/sprites/world2/cards/card_backyard.png",
  "assets/sprites/world2/cards/card_beach.png",
  "assets/sprites/world2/cards/card_locked_overlay.png",
  "assets/sprites/world2/cards/cards.json",
  "assets/sprites/world2/coconut/coconut_spin.json",
  "assets/sprites/world2/coconut/coconut_spin.q.png",
  "assets/sprites/world2/coconut/coconut_splat.json",
  "assets/sprites/world2/coconut/coconut_splat.q.png",
  "assets/sprites/world2/coconut/coconut_warning_decal.json",
  "assets/sprites/world2/coconut/coconut_warning_decal.q.png",
  "assets/sprites/world2/crabclaw/crabclaw_b.json",
  "assets/sprites/world2/crabclaw/crabclaw_b.q.png",
  "assets/sprites/world2/crabclaw/crabclaw_b_angry.json",
  "assets/sprites/world2/crabclaw/crabclaw_b_angry.q.png",
  "assets/sprites/world2/elite_shell/elite_shell_c.json",
  "assets/sprites/world2/elite_shell/elite_shell_c.q.png",
  "assets/sprites/world2/hermit_crab/hermit_crab_b.json",
  "assets/sprites/world2/hermit_crab/hermit_crab_b.q.png",
  "assets/sprites/world2/seagull/seagull_a.json",
  "assets/sprites/world2/seagull/seagull_a.q.png",
  "assets/sprites/world2/seagull/seagull_a_shadow.json",
  "assets/sprites/world2/seagull/seagull_a_shadow.q.png",
];

// Data manifests whose files are precached by reading them, not listed by hand: the manifest
// itself, every sheet JSON it lists (relative to it) and every strip image each sheet names.
// A new fx.json entry + art is cached offline with no sw.js edit (bump VERSION to ship it).
const MANIFESTS = ["assets/fx/fx.json"];

const NETWORK_TIMEOUT_MS = 4000;

// Every file one manifest names (it, its sheets' JSON, their strip images); fetch(url) -> Response.
async function manifestFiles(url, fetchJson) {
  const dir = (u) => u.slice(0, u.lastIndexOf("/") + 1);
  const data = await fetchJson(url), files = [url];
  for (const file of Object.values(data.sheets || {})) {
    const sheetUrl = dir(url) + file, sheet = await fetchJson(sheetUrl);
    files.push(sheetUrl);
    // "strips" sheets name an image per strip; flat FX sheets name one image for all rows.
    for (const strip of Object.values(sheet.strips || {})) files.push(dir(sheetUrl) + strip.image);
    if (sheet.image) files.push(dir(sheetUrl) + sheet.image);
  }
  return [...new Set(files)];
}

async function precacheManifests(cache) {
  const fetchJson = async (u) => {
    const res = await fetch(new Request(u, { cache: "reload" }));
    if (!res.ok) throw new Error(u + ": " + res.status);
    return res.json();
  };
  for (const m of MANIFESTS) {
    const files = await manifestFiles(m, fetchJson);
    await cache.addAll(files.map((url) => new Request(url, { cache: "reload" })));
  }
}

self.addEventListener("install", (event) => {
  // cache: "reload" skips the HTTP cache so we precache what's really deployed.
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })))
        .then(() => precacheManifests(cache))
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
