# Last Stand Tower: object-oriented migration plan

Status: living plan. Audited at `fc3f443`. **Main is `24349b8`** (PR #7, OO PR 8 game systems, merged Nov 14, 4:08 PM ET; live as SW v27). PR 8b (N8 world split, N12 render pipeline, N24 FX batcher) merged as `2fb06e6` (Nov 15, 8:30 AM ET; live as SW v28). PR 9 (N14 UI screens, N25 UpdateNotifier, `game.state` compat removed; SW v29) is on `oo-9-ui-screens`.
Brian's direction (Nov 12, 11:56 PM ET, his words relayed by Chief of Staff): "Fix everything to object orientated... EVERYTHING... Not just art. All of it object orientated."

Every rule and decision says whose call it is and how it arrived: **Brian's words, relayed by Chief of Staff** (CoS passed on his words or his card answer), or **a design call** by Tower Defense Games Dev that Chief of Staff endorsed (not Brian's words).

Rules for every PR below:
- One visual or system per class per file.
- No code-drawn art and no tints/recolors used as a look. Images are drawn with `drawImage`; moving, scaling, rotating or fading (opacity) a real image is fine. White flashes and recolors stay banned (Decision 10).
- UI chrome counts as drawn art: buttons, cards, panels, bars and tiles need authored images (Decision 11). The small chips in F7 and text outlines / focus rings in F9 stay code-styled (Decisions 11 and 13).
- The backyard sims must stay byte-identical: `9abf01291693`, `b9a690d334ab`, `339ce064390e`, `9e0a4dc20206`. Render-only PRs cannot touch sim state. Logic PRs must keep the RNG call order the same.
- Each PR needs a PR Verifier PASS.
- Merges: Brian's standing yes (Nov 13, 8:06 AM ET, relayed by Chief of Staff with his exact words): each refactor PR may be merged and deployed by its game bot once PR Verifier passes it. No force-push.
- PR Verifier findings: fix every finding, P1 through P3, in one pass before re-review, with no partial pushes (Brian's yes, Nov 13, 8:43 AM ET, relayed by Chief of Staff).

---

## Decisions (whose call and how it arrived, on each item)
Decisions 1 and 3–8 are **Tower Defense Games Dev's design calls, endorsed by Chief of Staff on Nov 13 at 12:08 AM ET** ("All other design calls stand"). They are not Brian's words. Decisions 2 and 9–13 are Brian's, labelled on each item.
1. **Hit flash:** one shared `HitFlash` overlay image object (`src/elements/looks/HitFlash.js`), not per-sheet hurt frames. Replaces TINT.flash / TINT.bossFlash.
2. **Neon and pixel themes (Brian, Nov 14, 2:59 PM ET, relayed by Chief of Staff): they stay hidden behind the flag, not deleted.** Done in PR #5: `LST.ThemeSelector.ALT_THEMES` (`src/themes/ThemeSelector.js`) is off, so `index.html` / `styles.html` do not load `src/themes/neon.js` / `pixel.js`, `sw.js` does not precache them, `?style=` is ignored and the styles.html picker lists cartoon only. The files stay in the repo. No PR deletes them. Cartoon is the game.
3. **Bars** (enemy HP, boss HP, unlock, ability cooldown): an image frame plus an image fill, owned by a `Bar` object (`src/ui/Bar.js`). Done late in the UI art PR.
4. **Range ring, screen flash and finale dim:** images, each owned by an object (`RangeRing`, `ScreenFlash`, `FinaleDim`).
5. **Particles:** fixed colour variants baked into the art. Never tint.
6. **Slow as a proper status (N11):** only if all 4 Backyard sim hashes stay identical. Otherwise `Enemy.slowTimer` stays the source and `ChillFrost` reads it.
7. **Big Red:** add a `ChargeGlow` overlay object (`src/bosses/looks/ChargeGlow.js`). Replaces TINT.charge.
8. **ChillFrost now, in PR #5:** the frozen/slow tint is removed in PR #5 and `ChillFrost` (`src/elements/looks/ChillFrost.js`) owns the slowed look. Art: Game Art & Motion ChillFrost v0.1.1, variant c (`assets/sprites/looks/ChillFrost/ChillFrost_c.*`, sha256 in `assets/sprites/looks/PROVENANCE.json`; replaced v0.1.0 b). QA: `docs/qa/world2/*chill*` (index: `docs/qa/world2/chill-shots.json`).
9. **Low-HP vignette (B21) (Brian, Nov 14, 2:59 PM ET, relayed by Chief of Staff):** it gets real vignette art (`vignette_red.png`, owned by `LowHpVignette`, `src/fx/LowHpVignette.js`). No code-drawn vignette: the `render.js:173-182` radial gradient (since PR 8b: `render/OverlayLayer.js:8-17`) is deleted in PR 2. Its pulse is an opacity fade of the image (Decision 10).
10. **Fades and flashes (Brian, Nov 14, 2:59 PM ET, relayed by Chief of Staff):** opacity fades of real art are allowed. White flashes and recolors stay banned. What this changes in the plan:
    - Look fades are fine as authored frames **or** as an opacity fade of the look's own image (ChillFrost `fade`, IceCrust/BurnFlames end-of-status fades, LowHpVignette pulse, FinaleDim, ScreenScrim).
    - **HitFlash stays its own art** (Decision 1): an authored overlay sheet drawn on top of the enemy and faded out with opacity. It is never a white-out or recolor of the enemy sprite (`TINT.flash` / `TINT.bossFlash` and `SpriteTinter` are still deleted in PR 1).
    - **ScreenFlash (B20)** was planned as a radial white `flash_burst.png`. White flashes are banned, so it is not white. **Decided (Decision 12):** a non-white burst image that fades.
    - CSS: `opacity` on real images is allowed. `filter: grayscale()/saturate()/hue-rotate()` and `--accent` recolors of icons are banned (F8, F1).
11. **UI chrome is drawn art (Brian, Nov 13, 8:16 AM ET, relayed by Chief of Staff; the sliders / text boxes / small chips ruling: Brian, Nov 13, 8:48 AM ET (Simple PDF), relayed by Chief of Staff):** buttons, cards, panels, bars and tiles styled in code (CSS backgrounds, borders, gradients, box-shadows, rounded panels) need real image art, each owned by an object. See F6 for every item in `style.css` and the HTML, with its owner and image plan. Brian allowed code styling for sliders, text boxes and small chips (his Simple PDF ruling, Nov 13, 8:48 AM ET, relayed by Chief of Staff). Last Stand Tower has no sliders or text boxes; its small chips are listed separately in F7 as **allowed code-styled controls**. This replaces the old F5 call that "button box-shadows stay CSS".
12. **Big-hit screen flash (B20) (Brian, Nov 14, 3:28 PM ET, his card answer relayed by Chief of Staff):** "use a non-white burst image that fades." B20 is unblocked: `ScreenFlash` (`src/fx/ScreenFlash.js`) owns an authored non-white burst image and fades it out with opacity (Decision 10). See B20 and PR 2.
13. **Text outlines and focus rings (F9) (Brian, Nov 14, 3:28 PM ET, his card answer relayed by Chief of Staff):** "Text outlines and focus rings can stay in code." F9 T1 (text-shadow / text-stroke on live text) and Q1 (`:focus-visible` outlines) are decided: they are **allowed code-styled controls**, like the F7 chips. `tools/ui-chrome-scan.js` counts them in the allowed category.

### Landed in PR 7 (GitHub PR #6, `oo-7-game-flow`): N1 (flow slice), N2, N15
Owner objects, one class per file:
- `GameState` (`src/core/GameState.js`): the base class. It declares `id`, `runClock`, `pausesWhenHidden`, `update(game, dt)` and `onKey(game, code, ev)`.
- `GameStateMachine` (`src/core/GameStateMachine.js`): `game.flow`. It holds one instance per state, `set(id)` throws on an unknown id, and `update(game, dt)` runs the run clock and then the current state's update.
- The 10 state classes (`src/core/states/`): `MenuState` ("menu"), `PlayingState` ("playing"), `PausedState` ("paused"), `CelebrateState` ("celebrate"), `ShopState` ("upgrade"), `GotchaState` ("gotcha"), `GameOverState` ("gameover"), `WorkshopState` ("workshop"), `VictoryState` ("victory"), `ClearedState` ("cleared").
- `InputController` (`src/core/InputController.js`): created once in `main.js:31`. It owns the shared keys and the hidden-tab auto-pause. Keys used by one state live on that state's `onKey`.
- `Game.update` (`game.js:175-184` after PR 8) is now hit-stop, effects, then `this.flow.update(this, dt)`. Nothing in it checks a state string.
- Proof: `tools/flow-test.js` checks the old `main.js` keydown and visibilitychange listeners, loaded from `src/main.js@99ea184` with `git show` (CI checks out with `fetch-depth: 0`). All 760 state × key × resultsDelay × Workshop-open cases match. The 4 sims are identical.
- N1 flow slice only. PR 8 then moved the shop, abilities, workshop, finale, results and boss events out of `Game` (see "Landed in PR 8").

#### `game.state` is a compat getter/setter (removed in PR 9)
`game.js:40-41`: `get state()` returns `this.flow.id`, and `set state(id)` calls `this.flow.set(id)`. It exists only so the remaining string reads and writes keep working until PR 9 moves them onto state objects. PR 8 removed every compat use in `game.js` (except the constructor's, `game.js:32`), `render.js`, `FxDirector.js` and `demo.js`. The state classes already use the machine directly: `PlayingState` calls `game.flow.is("playing")`, `VictoryState` calls `game.flow.set("cleared")`, and `GameStateMachine.is(id)` was added for this. `flow-test` checks that no state class uses `game.state`. **Removal step (PR 9, last commit):** delete `game.js:40-41` and switch every row below to `game.flow.is()` / `game.flow.set()`. Then `node tools/flow-state-sweep.js` must find 0 compat sites, and the flow-test compat checks become a check that `"state" in game` is false. The sims must stay identical; the tools only read the id.

**Sweep:** `tools/flow-state-sweep.js` (`FlowStateSweep`, run on its own and by flow-test in CI) finds every `game.state`, `g.state`, `this.game.state`, `scene.state` and Game/DemoScene `this.state` read or write in `src/`, `tools/`, `sw.js` and `index.html`. It fails if any file:line is missing from this table, if a listed line no longer has a site (stale row, added in PR 8), or if a site appears in a file PR 8 cleared (its `cleared` list: `render.js`, `FxDirector.js`, `demo.js`, `SceneFlags.js` and the 13 system files; `game.js` may keep only line 32). Last run (PR 8): 51 sites on 39 lines, 0 unlisted, 0 stale, 0 in cleared files. It skips other `.state` fields: `meta.state` (113 sites), Coconut / ShellShield / AudioContext / ServiceWorker `.state` (21), and comments (10). `sw.js` and `index.html` have none.

Every remaining compat site, and the PR that removes it:

| Where (current lines) | Use | Removed in | Becomes |
|---|---|---|---|
| `game.js:32` | constructor sets "menu" | PR 9 (compat removal) | `this.flow.set("menu")` |
| `tools/sim.js:306, 315, 319, 328, 329, 335` | sim loop reads / sets the id | PR 9 (compat removal) | `game.flow.is()` / `game.flow.set()` (sims must stay identical) |
| `tools/world-test.js:52, 55, 156, 171, 385, 425, 427-429, 436-437, 470, 477-481, 483, 494, 503` | test setup, run loops and messages (483: door-run finale assert) | PR 9 (compat removal) | `game.flow.is()` / `game.flow.set()` |
| `tools/card-layout-test.py:135, 227` | page setup | PR 9 (compat removal) | `game.flow.set("menu")`, `game.flow.is("playing")` |
| `tools/flow-test.js:55, 59-62, 122, 155` | tests of the compat itself: 55 checks that no state class uses it, 59-62 the getter/setter and the `"state"` own-property check, 122 the stub getter the old main.js oracle needs, 155 a message | PR 9 (compat removal) | the `"state" in game` check above; the oracle stub keeps its own getter (the old code reads `game.state`) |

**Removed in PR 8** (main `738409a` lines; these are no longer compat sites, so they are not table rows):
- `game.js:79` `selectWorld`: `WorkshopController.selectWorld` asks `flow.current.allowsWorldPick` (`MenuState`, `WorkshopState`) (`src/core/WorkshopController.js:10-17`).
- `game.js:121, 142, 262, 297, 346, 379, 385, 405, 425, 763` shop: `ShopController` (`src/shop/ShopController.js`) guards with `flow.is("upgrade")` (its `open` getter, :9) and enters with `enter()` (:12-17) / `beginHeadStart` (`flow.set("upgrade")`, :36).
- `game.js:173, 243, 253, 255, 375, 612` wave flow: `WaveFlow` (`src/core/WaveFlow.js`): `startNextWave` (:18), `afterStep` (:30), `endWave` (:60), `finishCelebration` (:69, :71), `dismissGotcha` (:83).
- `game.js:192, 195` abilities: `AbilitySystem.ready()` / `use()` ask `flow.current.allowsAbility` (true only on `PlayingState`) (`src/abilities/AbilitySystem.js:11-15`).
- `game.js:437, 450, 747, 759, 769`: `RunRecorder.gameOver` / `finishRun` (`src/core/RunRecorder.js:10, 24`), `FinaleController.won` / `continueEndless` / `retireToWorkshop` (`src/bosses/FinaleController.js:56, 69, 78`).
- `game.js:478, 480, 488, 489, 545`: `WorkshopController.open` / `close` / `toMenu` (`src/core/WorkshopController.js:21-23, 33-34, 94`).
- `game.js:552, 553, 556, 557` pause: `Game.togglePause` (`game.js:166`) calls `flow.current.togglePause`; `PlayingState.pause()` (`states/PlayingState.js:11-15`) and `PausedState.resume()` (`states/PausedState.js:6-10`); every other state ignores it.
- `render.js:133, 139, 141, 143, 174` and `fx/FxDirector.js:137`: they read `scene.sceneFlags` (`render.js:132-143, 174`; `FxDirector.js:137`), a `SceneFlags` object (`src/core/SceneFlags.js`): `showsFinaleIntro`, `banner` ("wave" / "celebrate" / "victory" / null), `lowHpPulse`, `towerAura`. `Game.sceneFlags` (`game.js:43`) returns `flow.current.sceneFlags`; `GameState` returns `SceneFlags.NONE`, and `PlayingState` / `PausedState` / `CelebrateState` / `VictoryState` return PLAYING / PAUSED / CELEBRATE / VICTORY. `tools/systems-test.js` checks all 10 states against the old string checks, which it cuts out of `render.js` / `FxDirector.js` at `738409a` with `git show` (PR 8b; before that it used a typed-in table). This is the state-flag slice of N12/N24; the layer and batcher split landed in PR 8b, where the reads are `render/HudCanvasLayer.js:7-23` and `render/OverlayLayer.js:8`.
- `demo.js:7`: `DemoScene` dropped its `state` field. It sets `this.sceneFlags = LST.SceneFlags.PLAYING` (`demo.js:7`); `styles.html` loads `SceneFlags.js`.

### Landed in PR 8 (GitHub PR #7, merged as `24349b8`): N3, N4, N5, N6, N7 and the PR 8 state checks
`Game` (`game.js`, 812 → 262 lines) keeps the run's data, `reset`, `newGame`, `step`, low-HP, spawning and the World event hooks. Each public method that moved is now a one-line hand-off to its system (`game.js:99-166`, `251-261`), so `ui.js`, the states, `InputController` and the tools call the same names. Each system is created once in the `Game` constructor (`game.js:22-31`) with a back-reference to the game, and lives as long as the game. The RNG call order is unchanged; the 4 sims are identical.
- **N3** `AbilitySystem` (`src/abilities/AbilitySystem.js:4-30`): `equip`, `ready`, `use`, `tick`. `Ability` base (`src/abilities/Ability.js:5-15`, registry by id) and `Shockwave` (`Shockwave.js:3-18`), `Freeze` (`Freeze.js:2-12`), `Overdrive` (`Overdrive.js:2-12`), each with its `name`, `desc`, `icon` (moved from the deleted `ui.js:684-690` maps; `ui.js` reads `LST.Ability.get(id)`) and `activate(game)`.
- **N4** `ShopController` (`src/shop/ShopController.js:6-237`): `enter`, `beginHeadStart`, `advanceDraft`, `autoDraft` / `takeBest`, `deal`, `price`, `takeCard`, `openMysteryBox`, `returnableTrap`, `returnTrap`, `reroll`, `repair`, `canLeave`, `leave`. `game.shop` stays the shop's data (the UI reads it).
- **N5** `RewardRules` (`src/core/RewardRules.js:4-12`): kill coins, score, the mini-boss bonus, and the pop pitch, read from the archetype: `CONFIG.enemies.*.popPitch` and `CONFIG.enemies.boss.killBonus` (`config.js:35-38`). `KillFeedback` (`src/core/KillFeedback.js:4-41`): `onKill` and `bossDown`. No `e.type === "boss"` and no pitch map left in `Game`.
- **N6** `BossEventRouter` (`src/bosses/BossEventRouter.js:5-81`): windup, slam, charge, mole rise / burrow / phase, scripted phase banners (one `phaseBanner` method for both), Crabclaw arrival, coconuts, boss spawn. `FinaleController` (`src/bosses/FinaleController.js:5-83`): `begin`, `tick`, `holdsWave`, `won`, `continueEndless`, `retireToWorkshop`.
- **N7** `RunRecorder` (`src/core/RunRecorder.js:5-58`): `gameOver`, `finishRun`, `showResults`, `saveBest`. `WorkshopController` (`src/core/WorkshopController.js:5-97`): `selectWorld`, `open`, `close`, `buyUpgrade`, `pickAbility`, `toggleBench`, `resetProgress`, `unlockCard`, `toMenu`.
- Wave flow: `WaveFlow` (`src/core/WaveFlow.js:4-90`): `startNextWave`, `afterStep`, `endWave`, `finishCelebration`, `dismissGotcha`.
- State flags: `GameState.allowsAbility` / `allowsWorldPick` / `sceneFlags` / `togglePause` (`src/core/GameState.js:17-20`); `SceneFlags` (`src/core/SceneFlags.js:9-22`).
- Proof: `tools/systems-test.js` (`SystemsTest`, in CI): each system is one class in its own file, loaded by `index.html`, `sw.js` and the sim; every moved `Game` method is a one-line hand-off; each system driven directly does its job; `SceneFlags` match the old state checks in all 10 states; `DemoScene` has no `state` field.
- **Split for review size:** N8 (`EnemySpawner` / `DamageSystem` / `FxSpawner`), N12 (`RenderPipeline` layers) and N24 (`FxRenderer` batcher) move to PR 8b. PR 8 is about 2,000 changed lines; the three together would add roughly 1,200 more.

### Landed in PR 9 (`oo-9-ui-screens`): N14, N25 and the compat removal
`ui.js` (694 lines at `2fb06e6`) is split into one object per screen; markup, classes, text and listeners moved as-is (no art, no tint, no new CSS).
- **N14** `UI` (`src/ui.js:8-57`) builds the objects once and `show(name)` (`ui.js:34-41`) shows exactly one screen and sets the HUD; `renderStart` / `renderShop` / `renderWorkshop` / `updateHud` / `updateToggles` / `toast` are one-line hand-offs (`ui.js:43-48`) because the controllers and tools call them. `Screen` base (`src/ui/screens/Screen.js:7-18`: `el`, `hidesHud`, `onShow`, `leave`) and, in `src/ui/screens/`: `StartScreen` (4-56, with `WorldSelect`), `ShopScreen` (5-144), `PauseScreen` (4-22), `ConfirmScreen` (3-14), `ResultsScreen` (4-117, Gears count-up), `WorkshopScreen` (4-81) with `CardsTab` (`workshop/CardsTab.js:3-32`), `UpgradesTab` (3-34), `DeckTab` (3-40), `CodexTab` (3-31), `GotchaScreen` (3-41), `ClearedScreen` (3-27); `Hud` (4-39) with `AbilityButton` (3-27) and `BossBar` (3-24); `SettingsToggles` (4-27); `Toast` (3-25); `UiIcons` (`src/ui/UiIcons.js:3-7`).
- **Switched by the states:** each `GameState` names its screen and the UI flags (`src/core/GameState.js:27-31`): `screen`, `showScreen(game)`, `hudLive`, `runPaused`, `closePauseMenu(game)`. MenuState "start", ShopState "upgrade", PausedState "pause" (+ `hudLive`, `runPaused`, resume on Done), GotchaState "gotcha", GameOverState "results" (Done goes back to them), WorkshopState "workshop", ClearedState "cleared", PlayingState none (+ `hudLive`). Every caller that enters a state now calls `flow.current.showScreen` (ShopController, WaveFlow, FinaleController, RunRecorder.showResults, WorkshopController.close / toMenu, PlayingState.pause, PausedState.resume, VictoryState, the Game constructor). Only two `ui.show` calls name a screen directly: the HUD-less "dying" beat (`RunRecorder.js:14`) and the Workshop opened over the results (`WorkshopController.js:26`).
- The three `ui.js` state checks moved onto the states: `ui.js@2fb06e6:132` (Resume / Done) is `closePauseMenu`, `:190` (Paused vs Settings) is `runPaused`, `:555` (ability button and boss bar) is `hudLive`.
- **N25** `UpdateNotifier` (`src/ui/UpdateNotifier.js:4-51`) replaces the `pwa.js` IIFE and offers the update through `Toast.offer`; `pwa.js` only starts it.
- Proof: `tools/ui-test.js` (`UiTest`, in CI): one class per file, no loose functions or constants, load order, no UI file reads the flow state, every state's screen / flags / Done, the `ui.show` call sites, and `UpdateNotifier` with stubs. `tools/screen-snapshot-test.py` (`ScreenSnapshotTest`, in CI): the same 30 clicks and game calls on `2fb06e6` (git worktree) and this tree in Chromium, seeded and frame-free, give identical `<body>` markup at every step (start, settings, confirm, workshop tabs, codex, HUD, boss bar, pause, shop, card taken, reroll, repair, gotcha, dying, results, workshop over results, cleared, toast), and each screen object owns its element.

### Landed in PR 8b (GitHub PR #8, merged as `2fb06e6`): N8, N12, N24
Code moved as-is (no art change, no tint); the RNG call order is unchanged and the 4 sims are identical. SW v28.
- **N8** `World` (`world.js`, 205 → 102 lines) keeps the entity lists, `updateEffects` / `updateList` and targeting (`nearestEnemies`, `bossFocus`). It creates its three objects in its constructor (`world.js:11-13`), so Game and DemoScene each get their own, and its old methods are one-line hand-offs (`world.js:58-59, 88-101`) because entities, bosses, Game (`super.onX`) and the sim call those names.
  - `EnemySpawner` (`src/core/EnemySpawner.js:5-55`): `spawn` (edge spawn, mini-boss HP curve and early tuning, BOSS banner), `minions`, `create`, `isMiniBoss`. The `type === "boss"` branch (`world.js@24349b8:70`) is now the archetype flag `CONFIG.enemies.boss.miniBoss` (`config.js:38`; Elite Big Red shares that archetype).
  - `DamageSystem` (`src/core/DamageSystem.js:5-32`): `bossSlam` (tower damage, then Thorns back to the boss) and `splash`.
  - `FxSpawner` (`src/fx/FxSpawner.js:5-83`): `hit`, `kill`, `corpse`, `towerHit`, `slamHit`, `thorns`, `splash`, `minionPop`, `bossSpawn`, `confetti`, `sparks`, `explosion` (the same Burst / FloatText / Particle / Confetti / Corpse objects as before).
- **N12** `Renderer.draw` (`render.js:60-94`) sets up the canvas (pixel-theme low-res pass, DPR) and runs `RenderPipeline` (`src/render/RenderPipeline.js:6-38`): world transform with shake, then the layers in order, each a `RenderLayer` (`src/render/RenderLayer.js:4-7`, `space` "world" or "screen"):
  1. `BackdropLayer` (`src/render/BackdropLayer.js:4-14`): world backdrop or theme background, range, ground hazards, FX ground glow, `OverdriveRing` (`src/render/OverdriveRing.js:3-13`, the old inline Overdrive pulse).
  2. `EnemyLayer` (`src/render/EnemyLayer.js:3-14`): particles, corpses, shadows, enemies.
  3. `TowerLayer` (`src/render/TowerLayer.js:3-10`): projectile trails, projectiles, tower, air hazards.
  4. `FxLayer` (`src/render/FxLayer.js:3-11`): world FX, bursts, confetti, text glows, popup text.
  5. `HudCanvasLayer` (`src/render/HudCanvasLayer.js:4-35`): finale dim, then the one banner `SceneFlags.banner` picks.
  6. `OverlayLayer` (`src/render/OverlayLayer.js:5-24`): low-HP vignette, hit flash, FX screen flashes.
  The pipeline refuses a world layer after a screen layer. `Renderer.drawOverlays` is gone (nothing else called it); `LST.draw` helpers stay (`render.js:97+`, C3).
- **N24** `FxRenderer` (`src/fx/FxRenderer.js:6-36`) is a thin batcher: it holds the theme, the frame counter and the drawn count, and each `drawX` method hands off to one drawer (`FxRenderer.js:27-34`), all in `src/fx/draw/`: `GlowSprites` (3-34, the glow cache), `TowerGroundGlow` (3-18), `ProjectileTrails` (3-57), `ChainArcs` (3-48), `TextGlows` (3-21), `ParticleBatch` (5-94, motes and streaks), `ImpactPulses` (3-33), `ImpactFlashes` (3-21).
- Proof: `tools/render-test.js` (`RenderTest`, with `DrawRecorder`, `tools/draw-recorder.js`; in CI) draws 140 frames (10 states × 14 scene cases) with the new pipeline, with `render.js@24349b8` and with `render.js@738409a` (both loaded with `git show`) into recording canvases and stubs: every call and property write matches, in order. `FxRenderer.js@24349b8` and the new batcher match the same way for every method, FX theme and quality. It also checks the layer order, one class per file and the loaders. `tools/systems-test.js` checks that `World` only hands off, that each N8 object does its job driven directly, and that a scripted spawn / hit / slam / splash / kill run on `world.js@24349b8` and on the split objects leaves an identical world.

### Landed in PR #5 (2026-11-13)
- `ChillFrost`: StatusLook, active while `Enemy.slowTimer > 0` and not frozen. Plays `attach` (2f @12 fps, once), then `loop` (4f @8 fps); `still` for reduced motion; `fade` (2f @12 fps, once) when the slow wears off. No fade when the enemy freezes (IceCrust takes over at once), dies, or with reduced motion. Draws nothing until its sheet loads.
- `StatusLook.release()/revive()` and `LookLayer` support a look that fades out after its state ends (generic; only ChillFrost uses it).
- Deleted: `TINT.frozen`, the frozen branch of `spriteTint`, King Mole's frozen sprite tint and the vector `#bfefff` fills. `SpriteTinter` stays only for hit flash + Big Red charge (removed in PR 1 with HitFlash / ChargeGlow).
- Scans (tools/elements-test.js): status-ring scan over `src/fx`, `src/themes`, `src/sprites`; canvas shape/tint scan over `src/sprites` (SpriteTinter excepted until PR 1); no slow/frozen tint anywhere in `src/themes` or `src/sprites`. (A full shape scan over `src/themes` would fail on the planned PR 1–5 items, so it lands with them.)
- Neon / pixel hidden behind `ThemeSelector.ALT_THEMES` (Decision 2: they stay hidden, not deleted).

---

## 0. The frozen/slow TINT: same status as IceCrust, or separate?

**It is a separate state.** The tint has no look object of its own.

| | Frozen TINT (blue recolor) | IceCrust look |
|---|---|---|
| Keyed on | `e.slowTimer > 0` (`themes/cartoon/enemies.js:29`, `enemy-mole.js:49,129`) | StatusEffect `"frozen"` (`LST.Frozen`, `src/elements/Frostbite.js:8-10`) |
| Set by | `Enemy.applySlow` (`entities.js:116-120`). Three sources: **Frost Shots** card, every hit (`entities.js:252`, 1.2 s, `config.js:26`); **Frostbite chill**, every hit (`Frostbite.js:22`, 15% for 1.5 s); **Freeze ability**, every enemy on screen (`game.js:208-211`, 60% for **4 s**, `config.js:81`) | Only every 3rd Frostbite hit on an enemy that is already slowed |
| Lifetime | 1.2–4 s, refreshed on each hit | 0.65 s (bosses 0.2 s, then a 4 s cooldown) |
| Effect | slows movement | full stop (freeze) |

So deleting the tint in PR #5 would leave the Freeze ability, Frost Shots and plain Frostbite chill with no look at all. IceCrust only covers the short freeze. The freeze needs an enemy that is already slowed, so both show at once only during that 0.65 s.

**New look object: `ChillFrost`** (`src/elements/looks/ChillFrost.js`, extends `StatusLook`, registered in `LookRegistry`):
- `isActive(e) = e.slowTimer > 0 && !LST.StatusEffects.get(e, "frozen")`. IceCrust takes over while the enemy is frozen.
- This is render-only and reads existing state, so the sims stay identical.
- **Art ask, "ChillFrost":** a frost-rim / rime overlay that hugs the body outline, plus a few cold-breath flecks.
  - Same contract as the other looks: `refBodyR 88`, anchor at body centre, a `.q.png` quality pass.
  - Loop: 4 frames at 6–8 fps. Optional 2-frame attach and 2-frame fade-out.
  - A static frame 0 for reduced motion.
  - Variant: none. It scales to body radius, so one sheet fits basic, fast, tank, Big Red, King Mole and the World 2 enemies.
- Once ChillFrost ships: delete `TINT.frozen`, the `frozen` branch of `spriteTint` and the vector `#bfefff` fills.

Per Decision 8, the frozen tint and its SpriteTinter use are removed in PR #5, and ChillFrost is added there. PR 1 below still removes the hit-flash and charge tints, and SpriteTinter with them.

---

## 1. Visual inventory (code-drawn art; audited at fc3f443, status refreshed at PR #5 v25)

Status column: **done** = landed in PR #5; **PR n** = planned PR in section 3; line numbers are current on main `99ea184` (PR 7 changed only `game.js` and `main.js` among these files; PR 8 moved the `game.js` B-row sites into the system files named in the rows, and changed `render.js:132-143, 174` and `FxDirector.js:137` only for `SceneFlags`; PR 8b moved the `world.js`, `render.js` and `FxRenderer.js` sites into `FxSpawner`, the render layers and the `src/fx/draw/` drawers, and those rows give the current files and lines; section 2 gives the current lines).

The image check:
- **Real image files:** all enemy bodies (basic, fast body/face, tank, big_red, all King Mole sheets, with clips for walk/idle/death and boss attacks). The pupils (EyeLayer) are images too.
- **World 2 is already OO and image-only:** BeachBackdrop, the HermitCrab/Seagull/Crabclaw/EliteShell/Coconut renderers, and the status looks (BurnFlames, IceCrust, VenomDrips, SparkCrackle).
- **Not images:** the tower, projectiles, backyard lawn, every burst, particle and glow, the banners, and all icons.

### A. Status tints and enemy overlays — 7 items
| # | Where | Looks like / when | New owner (class, file) | Art ask |
|---|---|---|---|---|
| A1 | **done (PR #5).** Was: TINT.frozen (`palette.js`), the frozen branch of `spriteTint`, `enemies.js` / `enemy-mole.js` frozen fills and King Mole's frozen sprite tint. All deleted | Slowed enemies: `ChillFrost` frost-chip ring (attach → loop, still for reduced motion, fade on slow end) | `ChillFrost`, `src/elements/looks/ChillFrost.js` | Delivered: ChillFrost v0.1.1 (`ChillFrost_c.*`) |
| A2 | **PR 1.** `palette.js:18-23` TINT.flash; `enemy-parts.js:28-31` `spriteTint`; `enemy-mole.js:129`; drawn by `SpriteTinter` via `EnemySpriteRenderer.js:106` on `tinted` layers; vector fill `enemies.js:30` | Enemy flashes white for a frame when hit | `HitFlash` look, `src/elements/looks/HitFlash.js` | **Decided (Decision 1):** one shared HitFlash overlay sheet, 2–3 frames one-shot, refBodyR 88, anchor at body centre |
| A3 | **PR 1.** TINT.bossFlash (`palette.js:20`); vector fills `enemies.js:30` (`#ff8a95`), `enemy-mole.js:49` (`#c8a99b`) | Boss blush on hit | Same `HitFlash` | Same shared HitFlash sheet (no per-boss art) |
| A4 | **PR 1.** TINT.charge (`palette.js`); `enemy-parts.js:30`; vector fill `enemies.js:30` | Big Red flickers red while charging | `ChargeGlow` look, `src/bosses/looks/ChargeGlow.js` (with the existing `charge` clip) | **Decided (Decision 7):** "ChargeGlow" red speed-aura loop, 4 frames, anchor at body centre |
| A5 | `enemy-fx.js:7-41` | Slam telegraph: red ring growing, dashed line to the tower, "!" | `SlamTelegraph`, `src/bosses/fx/SlamTelegraph.js` | Ring sheet (fill-up 8 frames, or one ring scaled), dashed line segment tile, "!" badge (2-frame pulse) |
| A6 | `enemy-fx.js:44-55` | Dizzy stars orbiting a stunned enemy | `DizzyStars` look, `src/elements/looks/DizzyStars.js` | 3-star orbit loop, 6 frames, anchor above head |
| A7 | `enemy-parts.js:7-12` `shadow()` (also the tower shadow at `tower.js:24`) | Soft ellipse ground shadow | `GroundShadow`, `src/render/GroundShadow.js` | `shadow_soft.png` ellipse, scaled per body |

### B. FX, particles and screen effects — 24 items
| # | Where | Looks like / when | Owner | Art ask |
|---|---|---|---|---|
| B1 | `effects.js:10-82`, kind `shockwave` (`abilities/Shockwave.js:15`) | White ring, Shockwave ability | `ShockwaveRing`, `src/fx/bursts/ShockwaveRing.js` | Ring expand one-shot, 8 frames |
| B2 | same, `freeze` (`abilities/Freeze.js:10`) | Blue ring plus stars, Freeze ability | `FreezeBlast` | Ice ring and snowflake burst, 8 frames |
| B3 | same, `overdrive` (`abilities/Overdrive.js:10`) | Orange ring, Overdrive starts | `OverdriveBurst` | Orange ring, 8 frames |
| B4 | same, `slam` (`fx/FxSpawner.js:48`) | Red ring when the tower is hit | `SlamRing` | Red impact ring, 6 frames |
| B5 | same, `dirt` (`bosses/BossEventRouter.js:26,34`) | Dirt puff, mole dig/rise | `DirtPuff` | Dirt clod puff, 6 frames |
| B6 | same, `splash` (`fx/FxSpawner.js:57`) | Splash-damage ring | `SplashRing` | Orange splash ring, 6 frames |
| B7 | same, `hit` / crit (`fx/FxSpawner.js:11`; minion pop `:59`) | Small hit star | `HitStar` | 4-frame hit star; crit variant |
| B8 | same, `kill` (`fx/FxSpawner.js:26`) | "Pow" star when an enemy dies | `KillPow` | Pow star, 6 frames |
| B9 | `effects.js:84-94`; `fx/FxSpawner.js:67-70` | Confetti rectangles | `ConfettiPiece`, `src/fx/ConfettiPiece.js` | Confetti sheet: 6 shapes × 4 flip frames |
| B10 | `projectiles.js:33-38` particle; `fx/FxSpawner.js:72-82` sparks / explosion | Colored dots (enemy color) | `SparkParticle`, `src/fx/particles/SparkParticle.js` | Spark sprite; a neutral white plus 4 palette variants (no tinting) |
| B11 | `render/OverdriveRing.js:4-12` (drawn by `BackdropLayer.js:12`) | Pulsing orange arc around the tower during Overdrive | `OverdrivePulse`, `src/fx/OverdrivePulse.js` | overdrive_aura loop, 6 frames |
| B12 | `fx/draw/GlowSprites.js:10-28` `get()` (`FxRenderer.glow`) (procedural radial gradient into an offscreen canvas) | Soft bloom used by all FX | `GlowSprite`, `src/fx/GlowSprite.js` | `glow_soft.png` (white core), plus one variant per element color |
| B13 | `fx/draw/TowerGroundGlow.js:5-17` (drawUnder) | Tower ground aura (by tier) | `TowerAuraView`, `src/fx/TowerAuraView.js` | Aura ring loop per tier (3 variants), 6 frames |
| B14 | `fx/draw/ProjectileTrails.js:5-56` (drawProjectiles) | Comet tail behind shots, element colors | `ProjectileTrail`, `src/fx/ProjectileTrail.js` | Trail strip image (base + ember/frost/spark/venom) |
| B15 | `fx/draw/ChainArcs.js:5-47` (drawArcs) | Chain Spark bolts and arc-flash rings | `ChainBoltFx` plus `ArcFlash` | Bolt segment sheet (3 jagged variants × 2 frames), flash ring, 4 frames |
| B16 | `fx/draw/TextGlows.js:5-20` (drawTextGlows) | Glow behind crit/bonus numbers | `TextGlow` (uses GlowSprite) | Covered by B12 |
| B17 | `fx/draw/ParticleBatch.js:15-48` (drawPool) motes | Particle motes for bossKill, finaleWon, tierUp, elem* presets (`FxPresets.js:78-107`) | `MoteParticle` | Mote sprite set (round, star, flake, ember, venom drop) |
| B18 | `fx/draw/ParticleBatch.js:49-93` drawStreaks | Speed streaks (`streakBurst`) | `StreakParticle` | Streak sprite, with an ink-outlined variant |
| B19 | `fx/draw/ImpactPulses.js:6-32` (drawPulses, ImpactSync) | Impact ring pulses | `ImpactPulse` | Ring sheet, 6 frames (can share B4) |
| B20 | **PR 2, decided (Decision 12).** `fx/draw/ImpactFlashes.js:6-20` (drawFlashes); `render/OverlayLayer.js:18-21` scene.flash | Big-hit screen flash (today a code-drawn white fill) | `ScreenFlash`, `src/fx/ScreenFlash.js` | **Non-white burst image that fades:** authored `screen_burst.png` (warm, non-white radial burst, cover-fit), owned by `ScreenFlash`. Created on a big hit, drawn with `drawImage` and faded out with opacity only (no tint, no white). Removed when its alpha reaches 0. Off in reduced motion, like today. The `OverlayLayer.js:18-21` white fill and the `ImpactFlashes` flash fills are deleted in PR 2 |
| B21 | **PR 2, decided (Decision 9).** `render/OverlayLayer.js:8-17` | Red radial vignette at low tower HP | `LowHpVignette`, `src/fx/LowHpVignette.js` | **Real vignette art:** `vignette_red.png` full-screen (cover-fit), pulsed with opacity. No code-drawn vignette |
| B22 | **PR 2.** `render/HudCanvasLayer.js:8-13` | Finale intro: the lawn dims | `FinaleDim`, `src/fx/FinaleDim.js` | **Decided (Decision 4):** `vignette_dark.png` owned by `FinaleDim` |
| B23 | `text.js:22-52` FloatText kinds `coin` (spinning ellipse) and `crit` (starburst) | Coin icon next to "+N"; star behind crit numbers | `CoinPopText`, `CritPopText` (FloatText subclasses) | Coin spin, 6 frames; crit starburst, 1–2 frames. The number text stays text |
| B24 | `text.js:68-112` bossBanner | Yellow/ink hazard-stripe band, "BOSS" | `BossBanner`, `src/ui/canvas/BossBanner.js` | Banner band image (stripes) plus a slam-in, 4 frames. WAVE banner `text.js:54-65` is text only (**judgment**) |

Infrastructure only, not art: `src/fx/FxOverlay.js:15` is the menu FX canvas host.

### C. Enemies and bosses — 4 items
| # | Where | What | Owner | Art ask |
|---|---|---|---|---|
| C1 | `enemy-bodies.js:7-52` `vectorBody` | Vector fallback for basic, fast, tank and Big Red before sprites load | Delete. `EnemyView` draws nothing until loaded, like World 2 | none |
| C2 | `enemy-mole.js:7-119` `drawMole` | Vector King Mole fallback (mound, claws, crown, teeth) | Delete. `KingMoleView` sprite-only | none (sheets exist) |
| C3 | `primitives.js` outlined/eyes/star; `render.js:97+` `LST.draw` polygon/confetti/roundRect | Drawing helpers | Delete once nothing calls them | none |
| C4 | `enemy-parts.js:14-26` hpBar (also `enemyHud` for World 2) | Rounded HP bar with ink outline | `EnemyHpBar`, `src/ui/canvas/EnemyHpBar.js` | **Decided (Decision 3):** `Bar` object with an image frame + image fill (late in PR 6) |

The enemy views become `BasicView`, `FastView`, `TankView`, `BigRedView` and `KingMoleView` (`src/enemies/views/`). They replace the cartoon `enemy()`/`moleSprite` dispatch and the `e.type` frequency branches (`enemies.js:20-22`).

### D. Tower and projectiles — 3 items
| # | Where | What | Owner | Art ask |
|---|---|---|---|---|
| D1 | `themes/cartoon/tower.js:10-141` (shadow 24, cannon 28-37 with recoil, 8 bolts 41-46, body, highlight 51, face 57-130: eyes with look-follow, blink 74, `> <` squint 66, worried brows 95, cheeks 103, mouth O/wobble/smile 109, sweat drop 129) | The whole tower is vector art | `TowerView`, `src/tower/TowerView.js`, with `TowerFace` (`src/tower/TowerFace.js`) | **Tower sheet**, layered:<br>- base/body with bolts, cannon (separate layer, pivot at the joint, recoil 3 frames);<br>- face states: idle, blink (3 frames), fire "O", hurt squint, low-HP worried, sweat-drop loop (4 frames);<br>- pupil image;<br>- tier variants if tiers change the look;<br>- anchor at body centre; size about 2× R |
| D2 | `projectiles.js:10-31` | Yellow ball with speed lines | `ProjectileView`, `src/tower/ProjectileView.js` | Projectile sheet: normal (2-frame spin), crit, plus element variants ember/frost/spark/venom as separate art |
| D3 | **PR 4.** `lawn.js:108-121` | Dashed range ring | `RangeRing`, `src/tower/RangeRing.js` | **Decided (Decision 4):** ring image (dash pattern, scaled) owned by `RangeRing` |

### E. Backgrounds and map — 2 items
| # | Where | What | Owner | Art ask |
|---|---|---|---|---|
| E1 | `lawn.js:9-96` `buildGround` (offscreen procedural: mowed checker 19, tufts 30, pebbles 44, flowers 56, dirt patch, soft vignette) | Backyard lawn | `BackyardBackdrop`, `src/worlds/render/BackyardBackdrop.js` (mirrors BeachBackdrop) | `backyard_bg_a.png` at the beach_bg_a size and contract: cover-fit, centre dirt patch under the tower, 16 px overdraw margin |
| E2 | **Hidden (PR #5), stays hidden (Decision 2, Nov 14).** `src/themes/neon.js` (164 lines), `src/themes/pixel.js` (334 lines), `FX_THEMES.neon/pixel` (`FxPresets.js:135-137`). `LST.ThemeSelector.ALT_THEMES` is off: not loaded by `index.html` / `styles.html`, not precached, `?style=` ignored (`main.js:6` → `ThemeSelector.pick`), picker lists cartoon only | Two complete code-drawn alternate themes (unreachable) | `ThemeSelector`, `src/themes/ThemeSelector.js` | none (hidden, not deleted) |

### F. UI art (DOM) — about 75 items in 5 groups
| # | Where | What | Owner | Art ask |
|---|---|---|---|---|
| F1 | Inline SVG card icons: `upgrades.js:15-105` (12), `meta.js:16-30` (8), `traps.js:16-83` (8), element cards (5) | 33 card icons | `IconAtlas` plus `UiIcon` (`src/ui/IconAtlas.js`) | Icon sheet: 33 card icons at 96 px, `.q.png`. Recoloring through CSS `--accent` is a tint, so bake in the colors |
| F2 | `index.html` 19 SVGs (lines 31, 35, 36, 56, 63, 64, 68, 87, 91, 95, 109-112, 126, 134, 186, 191, 202); `UiIcons` getters `src/ui/UiIcons.js:4` GEAR, `:5` EYE and `:6` LOCK (were `ui.js@2fb06e6:683, 684, 686`, moved in PR 9); the three ability icons are the `get icon()` getters (`abilities/Shockwave.js:7`, `Freeze.js:6`, `Overdrive.js:6`, PR 8); `CardFlip.js:71` | HUD and menu icons (heart, sound, music, settings, gear, speed, restart, abilities, eye, lock, trophy) | Same `IconAtlas` | UI icon sheet, about 16 icons at 64 px, plus on/off states for toggles |
| F3 | `style.css:61` | Coin icon (radial gradient) | `UiIcon("coin")` | Coin icon (can reuse the B23 frame 0) |
| F4 | `style.css` rarity and decoration gradients: 322-323, 551-552, 723-724 (rare/epic cards); 330, 576 (shimmer, sparkle); 514, 564, 732, 826, 857, 860, 1112 (stripes, locked, card back, codex unknown); 1150 (info back) | Card frames, shimmer, card backs | `CardFrame` CSS class backed by images (`assets/ui/`) | Card frame set: common, rare, epic, locked, back, codex-unknown, info-back; shimmer sweep strip; sparkle sprite |
| F5 | `style.css:533-534, 928, 978, 984` (unlock bar, conic ability cooldown, boss HP fill); 45 `box-shadow`s; about 20 keyframes | Bars and chunky button shadows | `Bar` (`src/ui/Bar.js`); shadows go into the F6 frame images | **Decided (Decision 3):** HP / unlock / cooldown / boss bars become `Bar` objects (image frame + image fill, late in PR 6). **Changed by Decision 11:** box-shadows are chrome, so they are baked into the F6 frame images, not kept as CSS. Keyframes that only move, scale or fade stay CSS |

#### F6. Code-styled UI chrome that needs authored image art (Decision 11: UI chrome counts as drawn art)
Every `style.css` rule that paints a button, card, panel, bar or tile in code. `tools/ui-chrome-scan.js` lists them and fails CI if a selector is missing from this section. Line numbers are `style.css` lines.

| # | Item | style.css rules (line) | Used in | Owner object | Authored-image plan |
|---|---|---|---|---|---|
| U1 | Coin icon (radial gradient + ring) | `.coin` (54) | index.html:27,80,92,96; src/ui/screens/ShopScreen.js:96 | `UiIcon("coin")`, `src/ui/IconAtlas.js` (F3) | coin icon PNG (can reuse B23 frame 0) |
| U2 | HUD / start pills: coins, best, best-new, gears, trophy | `.pill` (65); `.pill.coins` (79); `.pill.best` (80); `.pill.best.new` (81); `.pill.gears-pill` (474); `.trophy-pill` (1006) | index.html:26,27,28,66,67,68... | `Pill`, `src/ui/chrome/Pill.js` | 9-slice pill frame images: coins (yellow), best, best-new, gears, trophy; ink outline and drop shadow baked in |
| U3 | Text buttons: primary (Play, Next wave), secondary, danger, small (Reroll, Repair), disabled, pressed, urgent repair, return-to-run, toast button | `.btn` (112); `.btn:active, .btn.pressed` (126); `.btn.secondary` (132); `.btn:disabled` (291); `.btn.small` (395); `#btn-repair.urgent` (414); `.update-toast .btn` (470); `.shop-footer #btn-next` (655); `.btn.danger` (744); `.panel.workshop .ws-buttons .btn` (789); `.return-btn` (814) | index.html:62,64,83,86,90,94,99,114,115,127,149,150,161,162,191,192,213,214; src/ui/screens/Toast.js:18 | `UiButton`, `src/ui/chrome/UiButton.js` | 9-slice button frames: primary, secondary, danger, small, disabled, pressed (drop shadow removed, 6 px down), urgent pulse (2 frames), return; label stays text |
| U4 | Round icon buttons (sound, music, settings, pause, speed) and their off / pressed states; pause glyph bars | `.round` (134); `.round:active` (148); `.pause-icon` (149); `.round.toggle.off` (158) | index.html:35,36,37,38,56 | `RoundButton`, `src/ui/chrome/RoundButton.js` (glyphs from `IconAtlas`, F2) | round button face: normal, pressed, off; pause glyph as an icon |
| U5 | Settings rows | `.setting` (161); `.setting:active` (178) | index.html:109,110,111,112 | `SettingRow`, `src/ui/chrome/SettingRow.js` | 9-slice row frame, normal + pressed |
| U6 | Tower HP bar (frame, fill, low-HP fill) | `.hp-bar` (202); `#hud-hp-fill` (212); `#hud-hp-fill.low` (220) | index.html:32; src/ui/screens/Hud.js:12 | `Bar` (`src/ui/Bar.js`, Decision 3) as `HudHpBar` | bar frame + green fill + red low fill, 9-slice / cropped by value |
| U7 | Page background and the menu scrims behind screens | `html, body` (31); `.screen` (241); `.screen.start` (252) | index.html:55,77,105,121,132,156... | `ScreenScrim`, `src/ui/chrome/ScreenScrim.js` | `scrim_dark.png` (and a lighter start-screen variant), faded with opacity (allowed, Nov 14); body colour shows only before the canvas paints |
| U8 | Dialog panels (start, pause/settings, shop, results, workshop, gotcha, confirm, cleared) | `.panel` (254); `.screen.start .panel` (272) | index.html:55,57,77,78,105,106...; src/ui.js:38 | `Panel`, `src/ui/chrome/Panel.js` | 9-slice panel frame (cream paper, ink outline, drop shadow), start-screen translucent variant |
| U9 | Logo tile around the app icon | `.logo` (274) | index.html:58 | `LogoBadge`, `src/ui/chrome/LogoBadge.js` | framed logo image (frame baked into the icon art) |
| U10 | Update toast and mini toast | `.update-toast, .mini-toast` (451) | src/ui/screens/Toast.js:8,17 | `Toast` (PR 9 screen) with `Panel` art | 9-slice toast frame |
| U11 | Info boxes: welcome note, gotcha lesson, results codex note, codex detail | `.welcome` (489); `.gotcha-lesson` (843); `.res-codex` (848); `.ws-hint.codex-detail` (863) | index.html:70,125,188,210 | `InfoBox`, `src/ui/chrome/InfoBox.js` | 9-slice info-box frame (one style, 2 tints authored as separate images if needed) |
| U12 | Results stat tiles | `.res-stats div` (496) | index.html:137,173 | `StatTile`, `src/ui/chrome/StatTile.js` | 9-slice stat tile |
| U13 | Gears box (gradient panel) and its total divider | `.gears-box` (512); `.gears-total` (518); `.panel.cleared .gears-row.total` (1000) | index.html:142-145, 180-186 | `GearsBox`, `src/ui/chrome/GearsBox.js` | gears box frame image + divider strip |
| U14 | Next-unlock row: frame, ready state, icon tile, progress bar | `.next-unlock` (523); `.next-unlock.ready` (524); `.nu-icon` (525); `.next-unlock.ready .nu-icon` (527); `.nu-bar` (532); `.nu-bar i` (533); `.next-unlock.ready .nu-bar i` (534) | index.html:189; src/ui/screens/ResultsScreen.js:69,71,74 | `NextUnlockRow` + `Bar` (Decision 3) | row frame (normal, ready), icon tile, bar frame + fill |
| U15 | Shop card frame: base, rare, epic + shimmer, pressed, icon tile, action tag (take / free / done), eye badge, cursed glow, flip marker, card back + info back | `.card` (303); `.card.rare` (322); `.card.epic` (323); `.card.epic::after` (324); `.card:active:not(.taken):not(.locked)` (336); `.card .icon` (354); `.card .tag` (367); `.card .tag.free` (381); `.card .tag.done` (382); `.card` (620); `.card .eye` (806); `.card.cursed:not(.taken)` (810); `.card .flip-marker` (1101); `.card .flip-marker.known` (1106); `.card .card-back` (1109); `.card .card-back` (1131); `.card .flip-marker.info` (1148); `.card .card-back.info` (1149) | src/ui.js:29; src/ui/screens/GotchaScreen.js:23; src/ui/screens/ShopScreen.js:84 | `CardFrame`, `src/ui/chrome/CardFrame.js` (F4) | card frame set: common, rare, epic, pressed, cursed glow; icon tile; tag button (take/free/done); eye badge; flip marker (known/info); card back + info back; shimmer sweep strip (moved, not tinted) |
| U16 | Workshop card frame: base, rare, epic, icon tile, lock badge, locked, afford, revealed shimmer, upgrade icon tile | `.ws-card` (545); `.ws-card.rare` (551); `.ws-card.epic` (552); `.ws-card .icon` (554); `.ws-card .icon svg.lock` (556); `.ws-card.locked` (564); `.ws-card.locked .icon` (565); `.ws-card.afford` (569); `.ws-card.revealed::after` (574); `.ws-card.upg .icon` (706) | src/ui.js:29; src/ui/screens/workshop/CardsTab.js:19; src/ui/screens/workshop/UpgradesTab.js:17 | `CardFrame` (workshop variant) | workshop frame set: common, rare, epic, locked, afford, revealed sweep; icon tile; lock badge |
| U17 | Deck card frame: base, rare, epic, icon tile, lock badge, locked, benched + benched stamp | `.deck-card` (717); `.deck-card.rare` (723); `.deck-card.epic` (724); `.deck-card .icon` (726); `.deck-card .icon svg.lock` (728); `.deck-card.locked` (732); `.deck-card.locked .icon` (733); `.deck-card.benched` (736); `.deck-card.benched::after` (739) | src/ui/screens/workshop/DeckTab.js:29 | `CardFrame` (deck variant) | deck frame set: common, rare, epic, locked, benched; icon tile; lock badge; benched stamp image |
| U18 | Head Start picker button (on / off) | `.headstart-chip` (679); `.headstart-chip.off` (690) | index.html:63 | `UiButton` (chip variant) | 9-slice chip-button frame, on + off |
| U19 | Workshop tab bar and tabs | `.tabs` (695); `.tab` (696); `.tab::before` (698); `.tab.active` (699) | index.html:204,205,206,207,208; src/ui/screens/WorkshopScreen.js:53,68,76 | `TabBar`, `src/ui/chrome/TabBar.js` | tab bar frame, tab normal + active images |
| U20 | Gotcha reveal card: faces, back, icon tile, TRAP stamp | `.gotcha-flip .face` (820); `.gotcha-flip .face.back` (826); `.gotcha-flip .icon` (829); `.gotcha-flip .stamp, .codex-tile .stamp` (835) | index.html:124; src/ui/screens/GotchaScreen.js:21 | `CardFrame` (gotcha variant) + `StampBadge` | gotcha card front + back images, icon tile, TRAP stamp image |
| U21 | Codex tiles: base, icon tile, unknown, trap, trap-unknown, selected, stamp | `.codex-tile` (852); `.codex-tile .icon` (854); `.codex-tile.unknown` (857); `.codex-tile.unknown .icon` (858); `.codex-tile.trap` (859); `.codex-tile.trap.unknown` (860); `.codex-tile .stamp` (861); `.codex-tile.sel` (862) | src/ui/screens/workshop/CodexTab.js:20 | `CodexTile`, `src/ui/chrome/CodexTile.js` | codex tile set: known, unknown, trap, trap-unknown, selected; icon tile |
| U22 | Ability button: face, ready per ability, pressed, conic cooldown ring | `.ability` (909); `.ability .ab-ring` (928); `.ability.ready` (932); `.ability[data-id="freeze"].ready` (934); `.ability[data-id="overdrive"].ready` (935); `.ability:active` (952) | index.html:46 | `AbilityButton`, `src/ui/chrome/AbilityButton.js` + `Bar` (radial cooldown, Decision 3) | button face per ability (shockwave, freeze, overdrive) ready + not ready, pressed; cooldown ring sheet (frames by %)  |
| U23 | Boss HP bar: track, fill, finale fill, phase pips | `.boss-track` (974); `#boss-fill` (978); `.boss-bar .pip` (979); `.boss-bar.finale #boss-fill` (984) | index.html:41,43; src/ui/screens/BossBar.js:7 | `Bar` as `BossBar` (PR 9 screen) | bar frame + red fill + finale fill + pip image |
| U24 | Workshop ability picker tiles (on / locked / afford, per-ability icon tile) | `.ab-chip` (1010); `.ab-chip .ab-ico` (1015); `.ab-chip.on` (1022); `.ab-chip.on .ab-ico` (1023); `.ab-chip.on[data-ability="freeze"] .ab-ico` (1024); `.ab-chip.on[data-ability="overdrive"] .ab-ico` (1025); `.ab-chip` (1040) | src/ui/screens/workshop/DeckTab.js:19 | `AbilityChip`, `src/ui/chrome/AbilityChip.js` | tile frame: normal, on, locked, afford; per-ability icon tile on/off |
| U25 | World select cards: frame, pressed, selected (outline), picture strip | `.world-card` (1166); `.world-card:active` (1171); `.world-card.on` (1172); `.world-card .wc-pic` (1174) | src/ui/WorldSelect.js:36 | `WorldCard`, `src/ui/chrome/WorldCard.js` | world card frame: normal, pressed, selected; picture uses the world's backdrop art |

#### F7. Allowed code-styled controls (Decision 11: Brian's Simple PDF ruling, small chips, sliders and text boxes may stay code-styled)
Last Stand Tower has no sliders or text boxes. These are the small, non-button text chips and badges. They stay CSS, marked **allowed code-styled control** so the verifier can see them.

| # | Chip | style.css rules (line) | Used in | Status |
|---|---|---|---|---|
| K1 | Settings ON/OFF state chip | `.setting .state` (176); `.setting.off .state` (177) | index.html:109-112; src/ui/screens/SettingsToggles.js:23 | allowed code-styled control |
| K2 | Notification badge "!" | `.badge` (475) | index.html:64,191 | allowed code-styled control |
| K3 | Tab notification dot | `.tab .dot` (701) | index.html:205,206; src/ui/screens/WorkshopScreen.js:72 | allowed code-styled control |
| K4 | "free" word chip in the shop hint | `.shop-hint.free b` (294) | index.html:81 | allowed code-styled control |
| K5 | Price chip inside Reroll / Repair | `.btn.small .price` (408); `.btn.small:disabled .price` (413) | index.html:92,96 | allowed code-styled control |
| K6 | Rarity ribbon label on a shop card | `.card .ribbon` (337); `.card.common .ribbon` (352) | src/ui/screens/GotchaScreen.js:24; src/ui/screens/ShopScreen.js:101 | allowed code-styled control |
| K7 | "full" fine-print chip on a card | `.card .fine.full` (805) | src/ui/screens/GotchaScreen.js:28; src/ui/screens/ShopScreen.js:107 | allowed code-styled control |
| K8 | Workshop card rarity / price / level chips | `.ws-card .rar` (560); `.ws-price` (562); `.ws-card.next .ws-price` (568); `.ws-card.afford .ws-price` (570); `.ws-card.owned .ws-price` (571); `.ws-card.upg .icon .lvl` (708); `.ws-card.upg.owned .ws-price` (713) | src/ui/screens/workshop/CardsTab.js:27,28; src/ui/screens/workshop/UpgradesTab.js:28,29,30 | allowed code-styled control |
| K9 | Deck card state chip (In deck / Benched / Locked) | `.deck-card .state` (731); `.deck-card.locked .state` (735); `.deck-card.benched .state` (738) | src/ui/screens/workshop/DeckTab.js:29 | allowed code-styled control |
| K10 | Results card chips (icon + xN) | `.chip` (504); `.chip svg` (508); `.chip.rare` (509); `.chip.epic` (509) | src/ui/screens/ResultsScreen.js:41 | allowed code-styled control |
| K11 | "Head Start n / m" chip in the shop title | `.title .hand` (692) | src/ui/screens/ShopScreen.js:56 | allowed code-styled control |
| K12 | Ability name chip under the ability button | `.ability .ab-name` (946); `.ability:not(.ready) .ab-name` (951) | index.html:50; src/ui/screens/AbilityButton.js:20 | allowed code-styled control |
| K13 | "first clear!" chip | `.first-tag` (1001) | index.html:143 | allowed code-styled control |
| K14 | Dev-only "door" chip on a world card (hidden for players) | `.world-card .wc-dev` (1183) | src/ui/WorldSelect.js:36 | allowed code-styled control |
| K15 | Card-back label chip | `.card-back .back-label` (1117); `.card-back.info .back-label` (1153) | src/ui/CardFlip.js:15,30,47 | allowed code-styled control |

#### F8. CSS recolor filters (banned: recolors stay banned, Nov 14)
| # | Item | style.css rules (line) | Used in | Owner object | Replacement art |
|---|---|---|---|---|---|
| X1 | Taken shop card: `filter: saturate(1.1)` plus a green inset ring | `.card.taken` (383) | src/ui.js:29; src/ui/screens/GotchaScreen.js:23; src/ui/screens/ShopScreen.js:84 | `CardFrame` state `taken` | authored `card_taken` frame (green ring baked in); no filter |
| X2 | Locked shop card: `filter: grayscale(.55)` | `.card.locked` (385); `.card.locked .tag` (386) | src/ui.js:29; src/ui/screens/GotchaScreen.js:23; src/ui/screens/ShopScreen.js:84 | `CardFrame` state `locked` | authored `card_locked` frame + locked icon variant; opacity fade allowed (Nov 14), grayscale is not |
| X3 | Benched deck icon: `filter: grayscale(1)` | `.deck-card.benched .icon` (737) | src/ui/screens/workshop/DeckTab.js:29 | `IconAtlas` benched variant | authored greyed icon variant per card (F1 sheet), opacity allowed |
| X4 | HUD heart: SVG `fill: var(--red)` + drop-shadow filter | `.heart` (190) | index.html:31 | `UiIcon("heart")` (F2) | heart icon image with its shadow baked in |

#### F9. Text outlines and focus rings: allowed code-styled controls (Decision 13, Brian, Nov 14, 3:28 PM ET, his card answer relayed by Chief of Staff)
Brian: "Text outlines and focus rings can stay in code." These stay CSS as **allowed code-styled controls**. `tools/ui-chrome-scan.js` puts F7 and F9 in the allowed category.

| # | Item | style.css rules (line) | Status |
|---|---|---|---|
| T1 | Text outlines / text-shadow on live text (title, HP number, epic ribbon text, cooldown seconds, boss name) | `.title` (85); `#hud-hp-text` (221); `.card.epic .ribbon` (353); `.ability .ab-cd` (940); `.boss-bar .boss-top b` (969); `.boss-bar .boss-top span` (973) | allowed code-styled control (Decision 13) |
| Q1 | Keyboard focus rings (`:focus-visible` outlines, accessibility rule I7/A) | `.card:focus-visible` (1093); `.card button.tag:focus-visible` (1099); `.card button.flip-marker:focus-visible` (1145); `.card-back button.flip-back:focus-visible` (1162) | allowed code-styled control (Decision 13) |

**Visual totals:** A 7, B 24, C 4, D 3, E 2, F 5 icon groups (about 75 icons or decorations), plus F6 25 code-styled chrome items (25 owner objects / variants) and F8 4 banned CSS recolors. F7 15 chip groups and F9 2 groups (text outlines, focus rings) stay code-styled (allowed). That is about 40 canvas visual objects plus the UI art.

---

## 2. Non-OO code inventory
| # | Where | Problem | Becomes (class, file) |
|---|---|---|---|
| N1 | `game.js` (812 lines after PR 7; 262 after PR 8), `Game extends World` | God class: run flow, shop, abilities, workshop, finale, results, boss events | **Flow slice landed in PR 7** (`game.flow`). **Systems landed in PR 8** (N3–N7 below); `Game` keeps run data, `reset`, `newGame`, `step` and the World hooks, and hands each moved method to its system (`game.js:99-166, 251-261`) |
| N2 | **Landed in PR 7.** Was `game.js@99ea184:573-618` update. Now `game.js:175-184` update calls `this.flow.update`; `game.js:40-41` compat getter/setter | String state machine (`this.state === "playing"` and so on) | `GameStateMachine` (`src/core/GameStateMachine.js:6-28`) and `GameState` (`src/core/GameState.js:8-15`), plus `MenuState` (`states/MenuState.js:2-9`), `PlayingState` (`states/PlayingState.js:3-24`), `PausedState` (`states/PausedState.js:2-4`), `CelebrateState` (`states/CelebrateState.js:2-9`), `ShopState` ("upgrade", `states/ShopState.js:3-13`), `GotchaState` (`states/GotchaState.js:2-8`), `GameOverState` (`states/GameOverState.js:3-17`), `WorkshopState` (`states/WorkshopState.js:3-9`), `VictoryState` (`states/VictoryState.js:3-11`), `ClearedState` (`states/ClearedState.js:2-8`). Remaining id comparisons: see "`game.state` is a compat getter/setter" |
| N3 | **Landed in PR 8.** Was `game.js@738409a:192-220` useAbility | `if id === "shockwave" / "freeze" / "overdrive"` | `AbilitySystem` (`src/abilities/AbilitySystem.js:4-30`) plus `Ability` (`Ability.js:5-15`), `Shockwave` (`Shockwave.js:3-18`), `Freeze` (`Freeze.js:2-12`), `Overdrive` (`Overdrive.js:2-12`). The `ui.js@738409a:684-690` icon, name and description maps moved onto these classes (`ui.js` reads `LST.Ability.get(id)`) |
| N4 | **Landed in PR 8.** Was `game.js@738409a:104-161, 266-434` (Head Start draft and shop) | Mixed into Game | `ShopController` (`src/shop/ShopController.js:6-237`) |
| N5 | **Landed in PR 8.** Was `game.js@738409a:658-686` onEnemyKilled | `e.type === "boss"`, plus the `{basic,fast,tank,boss}[e.type]` pitch map | `RewardRules` (`src/core/RewardRules.js:4-12`) and `KillFeedback` (`src/core/KillFeedback.js:4-41`); pitch and bonus live on the archetype (`config.js:35-38`: `popPitch`, `killBonus`) |
| N6 | **Landed in PR 8.** Was `game.js@738409a:689-799` boss events and finale (plus finale start 175-187 and intro 594-603) | Boss event handlers in Game | `BossEventRouter` (`src/bosses/BossEventRouter.js:5-81`) plus `FinaleController` (`src/bosses/FinaleController.js:5-83`) |
| N7 | **Landed in PR 8.** Was `game.js@738409a:436-549, 568-574` (results, best wave, workshop, menu) | Mixed in | `RunRecorder` (`src/core/RunRecorder.js:5-58`), `WorkshopController` (`src/core/WorkshopController.js:5-97`); wave flow `WaveFlow` (`src/core/WaveFlow.js:4-90`) |
| N8 | **Landed in PR 8b.** Was `world.js@24349b8` (205), type branch at 70 | Spawning, damage, splash and FX spawning in one class | `EnemySpawner` (`src/core/EnemySpawner.js:5-55`; mini-boss by `CONFIG.enemies.*.miniBoss`, `config.js:38`), `DamageSystem` (`src/core/DamageSystem.js:5-32`), `FxSpawner` (`src/fx/FxSpawner.js:5-83`); `World` hands off (`world.js:58-59, 88-101`) |
| N9 | `entities.js` (519): `Enemy.updateBoss` 156-202, `type==="boss"` at 134, `isBoss` at 113 | Big Red is a type branch inside Enemy | `BigRed extends Enemy` (`src/bosses/BigRed.js`) |
| N10 | `entities.js` FloatText kinds 338, 345; Burst kinds; Particle, Confetti, Corpse, KingMole all in one file | One file for many entities, plus kind switches | One file each: `src/entities/*.js`, `src/bosses/KingMole.js`, FloatText and Burst subclasses (see B) |
| N11 | `Enemy.slowTimer` / `slowAmount` ad-hoc fields (`entities.js:116-127, 443`; `BossScript.js:27`) | Slow is not a StatusEffect, unlike frozen/burn/venom | `Chill` StatusEffect (`src/elements/Chill.js`). **Sim risk:** it must keep the exact tick order. Optional, and last |
| N12 | **Landed in PR 8b.** Was `render.js@24349b8` Renderer.draw and drawOverlays (57-189). Its state-string checks were removed in PR 8 (`SceneFlags`) | Theme dispatch, inline overdrive and finale, banner branches by state (now by `SceneFlags`) | `RenderPipeline` (`src/render/RenderPipeline.js:6-38`) with ordered `RenderLayer` objects (`src/render/*.js`): `BackdropLayer`, `EnemyLayer`, `TowerLayer`, `FxLayer`, `HudCanvasLayer`, `OverlayLayer`, plus `OverdriveRing`; `Renderer.draw` (`render.js:60-94`) runs it |
| N13 | `themes/cartoon/*.js` via `LST.CartoonKit.methods` | Procedural object-literal theme assembly | Removed. Every visual is a view class (sections A–E) |
| N14 | **Landed in PR 9.** Was `ui.js` (701 before PR 8): constructor 5-180 wires the DOM; inline `innerHTML` screens: start 202, results 277, workshop tabs 405-523, shop 587 | Screens built as strings inside one class | `UI` (`src/ui.js:8-57`) plus `Screen` base and `StartScreen`, `ShopScreen`, `PauseScreen`, `ConfirmScreen`, `ResultsScreen`, `WorkshopScreen` (`CardsTab`, `UpgradesTab`, `DeckTab`, `CodexTab` in `workshop/`), `GotchaScreen`, `ClearedScreen`, `Hud`, `AbilityButton`, `BossBar`, `SettingsToggles`, `Toast` (`src/ui/screens/*.js`), `UiIcons` (`src/ui/UiIcons.js`); the states pick the screen (`GameState.js:27-31`) |
| N15 | **Landed in PR 7.** Was `main.js@99ea184:30-64` (keydown chain 30-59, visibilitychange 62-64) | Keyboard `switch` on `game.state` | `InputController` (`src/core/InputController.js:5-40`), attached at `main.js:31`. Each state owns its own keys (`onKey`) |
| N16 | `meta.js:34-325` | IIFE singleton with closure state | `MetaStore` (`src/meta/MetaStore.js`) plus `SaveMigrations` |
| N17 | `audio.js:10-536`: module `let` state, SFX function table 123-396, music 409-500 | Procedural singleton | `AudioEngine`, `SfxLibrary` (one `Sfx` object per sound), `MusicSequencer` (`src/audio/*.js`) |
| N18 | `settings.js`, haptics | Singletons | `Settings`, `Haptics` classes |
| N19 | `upgrades.js` CARDS with `apply` closures plus `shopRules`; `traps.js`; `LST.cardById` | Data plus loose functions | `CardDefinition` / `CardRegistry`, `ShopRules`, `TrapCard` (`src/cards/*.js`) |
| N20 | `waves.js` | Object literal of curves | `WaveCurve` class |
| N21 | `config.js` LST.CONFIG, mutated at runtime by `CaptainCrabclaw.js:10,26` | Global mutable config | Frozen config plus per-archetype definitions in `EnemyRegistry`. No runtime writes |
| N22 | `WorldRenderers.js:24` sets static `LST.SheetRenderer.reduced` each frame; type-keyed maps | Static mutable flag | Pass a `RenderContext {reduced, low}`; `WorldRendererRegistry` class |
| N23 | `EnemyAnimationRules` keyed by type | Rules table outside the enemy views | Moved into each `EnemyView` |
| N24 | **Landed in PR 8b.** Was `FxRenderer.js@24349b8` (one class draws every FX kind; FxDirector's state check was removed in PR 8: `SceneFlags.towerAura`) | God renderer | Thin batcher `FxRenderer` (`src/fx/FxRenderer.js:6-36`) handing off to one drawer per effect in `src/fx/draw/` (`GlowSprites`, `TowerGroundGlow`, `ProjectileTrails`, `ChainArcs`, `TextGlows`, `ParticleBatch`, `ImpactPulses`, `ImpactFlashes`). The art views (section B) replace these drawers in the art PRs |
| N25 | **Landed in PR 9.** Was `pwa.js@2fb06e6` | IIFE that builds an inline toast | `UpdateNotifier` (`src/ui/UpdateNotifier.js:4-51`) using `Toast.offer` (`src/ui/screens/Toast.js:14-24`); `pwa.js` starts it |
| N26 | `index.html` script-order loading on the global `LST` | Implicit dependencies | Keep the globals for now (no bundler). Order is documented per module. **Judgment** |
| N27 | **Tool objects landed in PR 7 (and PR 8).** `tools/ui-chrome-scan.js`, `tools/flow-test.js`, `tools/flow-state-sweep.js`, `tools/systems-test.js` | Scanner / test logic used to be loose module code | `UiTest` (`tools/ui-test.js`, PR 9) and `ScreenSnapshotTest` (`tools/screen-snapshot-test.py`, PR 9): the screen objects own their DOM and behaviour, and every screen's markup matches `2fb06e6`; `UiChromeScanner` (`tools/ui-chrome-scan.js:11-103`): scans CSS + doc coverage and categories (image art / allowed code-styled / banned recolor); `FlowTest` (`tools/flow-test.js:14-169`): game-flow tests + git oracle; `FlowStateSweep` (`tools/flow-state-sweep.js`): all compat reads/writes mapped with file:line, plus (PR 8) stale-row and cleared-file checks; `SystemsTest` (`tools/systems-test.js`, PR 8; PR 8b adds the World split and the `git show` SceneFlags oracle): the game systems own their behaviour; `RenderTest` (`tools/render-test.js`, PR 8b) with `DrawRecorder` (`tools/draw-recorder.js`): the render pipeline and FX drawers draw exactly what the old code did. Each owns its root path, methods and run result, created once by the one-line CLI entry point and discarded on exit. They change no game state outside the test sandbox. No loose functions (only class methods and callbacks inside them). `world-test.js` / `sim.js` edits add no functions; their pre-existing helpers are unchanged |

---

## 3. Conversion order (single PRs, after PR #5)
Each PR is shippable on its own. Each one: unit tests, the 4 sim hashes unchanged, design-review OO gate, PR Verifier PASS, then merge under Brian's standing yes for refactor PRs (relayed by Chief of Staff, Nov 13, 8:06 AM ET).

1. **PR 1: Status tints → looks, enemy overlays** (A1–A7).
   - Adds HitFlash (shared overlay), ChargeGlow, SlamTelegraph, DizzyStars, GroundShadow. (ChillFrost already ships in PR #5.)
   - Deletes SpriteTinter, TINT, spriteTint and the `tinted` rig flags.
   - Art: shared HitFlash overlay sheet (refBodyR 88, 2–3 frames, one-shot); ChargeGlow loop; telegraph ring, dash and "!"; dizzy stars loop; shadow PNG.
2. **PR 2: FX and particles** (B1–B24).
   - Adds the burst subclasses, ConfettiPiece, Spark/Mote/Streak particles, GlowSprite, TowerAuraView, ProjectileTrail, ChainBoltFx/ArcFlash, ImpactPulse, ScreenFlash, LowHpVignette, FinaleDim, CoinPop/CritPop text, BossBanner.
   - FxRenderer becomes a batcher.
   - Art: 8 burst one-shots, confetti sheet, spark/mote/streak sprites, glow PNGs, aura ×3 tiers, trail strips ×5, bolt and flash sheets, **red vignette (B21, decided: real art)**, **non-white screen burst (B20, decided: `screen_burst.png` faded with opacity)**, coin spin, crit star, boss banner band. (Biggest art ask; it could split into 2a bursts/particles and 2b glows/trails/screen.)
3. **PR 3: Enemies and bosses** (C1–C4, N9, N10 for enemies, N23).
   - Adds EnemyView subclasses, the BigRed and KingMole classes and EnemyHpBar.
   - Deletes vectorBody, drawMole and the primitives.
   - Art: none required here. The HP bar is a `Bar` with image frame + fill (Decision 3), drawn in PR 6.
4. **PR 4: Tower and projectiles** (D1–D3).
   - Adds TowerView/TowerFace, ProjectileView and RangeRing.
   - Art: layered tower sheet with face states, projectile sheet ×5 variants, range ring.
5. **PR 5: Backgrounds and map** (E1–E2).
   - Adds BackyardBackdrop.
   - Neon/pixel stay hidden behind `ThemeSelector.ALT_THEMES` and are not deleted (Decision 2). Removes the `themes/cartoon` leftovers and the `LST.draw` helpers (neon/pixel keep their own copies).
   - Art: backyard_bg_a.
6. **PR 6: UI art** (F1–F8).
   - Adds IconAtlas/UiIcon and the CardFrame images.
   - Adds the F6 chrome objects (`src/ui/chrome/`): `Pill`, `UiButton`, `RoundButton`, `SettingRow`, `ScreenScrim`, `Panel`, `LogoBadge`, `InfoBox`, `StatTile`, `GearsBox`, `NextUnlockRow`, `CardFrame` (shop / workshop / deck / gotcha), `StampBadge`, `TabBar`, `CodexTile`, `AbilityButton`, `AbilityChip`, `WorldCard`. Their CSS backgrounds, borders, gradients and box-shadows are deleted, and the images are drawn as 9-slice `border-image` / `background-image` of authored PNGs.
   - Replaces the F8 recolor filters with authored state images.
   - Adds a scan: `tools/ui-chrome-scan.js` (already in CI from PR 7) is tightened so only the allowed code-styled controls (F7 chips, F9 text outlines and focus rings) and image-backed rules remain.
   - Adds the `Bar` object (frame + fill images) for HP, boss HP, unlock and cooldown bars, late in this PR.
   - Art: 33 card icons, about 16 UI icons with toggle states, coin, card frame set, shimmer, sparkle, bar frames and fills, and the F6 frame sets (buttons, round buttons, pills, panels, rows, tiles, tabs, world cards).
7. **PR 7: Game flow** (N1 flow slice, N2, N15). **Landed** (GitHub PR #6): GameState, GameStateMachine, the 10 state classes and InputController. Art: none.
8. **PR 8: Game systems** (N3–N7). AbilitySystem/abilities, ShopController, RewardRules/KillFeedback, BossEventRouter, FinaleController, RunRecorder, WorkshopController, WaveFlow. It removes every `game.state` comparison in `game.js` (except the constructor's), `render.js` and `FxDirector.js` (`SceneFlags`; `DemoScene` drops its `state`). SW v27. Art: none.
   **Landed** (GitHub PR #7, `24349b8`, SW v27).
   - **PR 8b** (split for review size): N8 EnemySpawner/DamageSystem/FxSpawner, N12 RenderPipeline layers, N24 FxRenderer batcher. SW v28. Art: none. **Landed** (GitHub PR #8, `2fb06e6`).
9. **PR 9: UI screens** (N14, N25). Screen classes, Hud, BossBar, Toast, UpdateNotifier. It removes the `ui.js` state comparisons, then (last commit) **deletes the `game.state` compat getter/setter** (`game.js:40-41`) and moves the tools to `game.flow`. SW v29. Art: none. **On `oo-9-ui-screens`.**
10. **PR 10: Stores, services and data** (N16–N22, optionally N11). MetaStore, AudioEngine/SfxLibrary/MusicSequencer, Settings/Haptics, Card/Trap registries, WaveCurve, frozen config, RenderContext. Art: none.

The art PRs (1–6) are blocked on Game Art & Motion delivering. The logic PRs (7–10) need no art, so they can run while art is in production.

---

## 4. Main notes
- Main is `2fb06e6` (PR #8 / OO PR 8b merged Nov 15, 8:30 AM ET; live as SW v28). Before that `24349b8` (PR #7 / OO PR 8, Nov 14, 4:08 PM ET, SW v27), `738409a` (PR #6 / OO PR 7, Nov 14, 3:40 PM ET, SW v26) and `99ea184` (PR #5, Nov 13, 8:07 AM ET, SW v25). The old main `70bff8c` code-drawn LookKit looks and `FxRenderer.drawStatusRings` are gone from main.
- `tools/sim-check.js` still compares against the committed hashes recorded at `70bff8c`; they are unchanged by PR #5, PR 7, PR 8, PR 8b and PR 9.

## 5. Other tower-defense repos under /workspace
None. The only TD code is clones of last-stand-tower:
- `oo-audit/last-stand-tower` (e7c2e4f);
- `art-audit/last-stand-tower` (e847cb8);
- `graphify-trial/last-stand-tower` (5e6b2c5).

`lst`, `lst2`–`lst4` are working folders, not repos. Other projects (bounce-arena, shardfall, blackhole_game, simple-pdf) are not TD. `awsumbtech/frontier-outpost` exists on GitHub (type unknown) and is not on the box.

## 6. Ambiguities / judgment calls (answered: see Decisions)
1. **Hit flash:** per-enemy hurt frames (more art, cleanest) or one shared HitFlash overlay sheet?
2. **Neon/pixel themes:** delete them, or commission two more full art sets? (Answered Nov 14: keep hidden, not deleted.)
3. **HP bars** (enemy, boss DOM bar, unlock bar, ability cooldown): keep as plain bars, or use image frames?
4. **Range ring:** image, or keep as a plain stroke because it is a UI indicator?
5. **Full-screen fills** (white screen flash, finale dim): plain alpha fills, or images? (Answered: images, Decision 4; the screen flash is a non-white burst image that fades, Decision 12.)
6. **Text:** floating numbers and the WAVE banner are text (kept). Their ink outline and pop are text styling. Coin and crit decorations become art.
7. **CSS:** buttons' box-shadows and keyframes stay CSS. Card rarity gradients, stripes and shimmer become images (recommended).
8. **Particle colors:** particles are colored by `e.color`. Image art needs either a fixed palette of variants or neutral white art. Neutral white with a tint would break the no-tint rule, so use palette variants.
9. **Chill as a StatusEffect (N11):** cleaner, but touches sim tick order. It needs sim proof or should be skipped.
10. **Big Red charge:** is the existing `charge` sheet clip enough, or is a ChargeGlow overlay wanted?
