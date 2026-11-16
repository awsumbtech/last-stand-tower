# Last Stand Tower: object-oriented, data-driven migration plan

Status: living plan. **Main is `ca3e982`**: PR 9 (GitHub PR #9: N14 UI screens, N25 UpdateNotifier, `game.state` compat removed) merged Nov 15, 9:26 AM ET, live as SW v29. Before that, PR 8b merged as `2fb06e6` (Nov 15, 8:30 AM ET, SW v28) and PR 8 as `24349b8` (Nov 14, 4:08 PM ET, SW v27). The first audit was at `fc3f443`. The data-driven gap audit (section G) was run at `ca3e982`. **PR 10a** (FX manifest + image-backed FX, with Game Art & Motion's PR10a effects v1, Nov 16) is on `oo-10a-fx-manifest`, open for Brian's look check (shots in `docs/qa/pr10a/`).

Brian's directions, his words relayed by Chief of Staff:
- **Nov 12, 11:56 PM ET:** "Fix everything to object orientated... EVERYTHING... Not just art. All of it object orientated."
- **Nov 15, 10:13 PM ET (the bar, Decision 14):** every tower, enemy, projectile, effect, UI art and theme is an object whose **art and settings come from art files plus a data list or manifest**. Brian can then change one, add one, or re-theme the whole game **only by adding or swapping art files and list entries, with no code edits**. Class-only moves don't count.
- **Nov 16, 9:04 AM ET (Decision 15):** he approved the revised order (10a, 10b, 11-18) and starting 10a: "Move ahead with the tower game".

Every rule and decision says whose call it is and how it arrived. **Brian's words, relayed by Chief of Staff** means CoS passed on his words or his card answer. **A design call** means Tower Defense Games Dev made it and Chief of Staff endorsed it; those are not Brian's words.

## The bar (Decision 14), in checkable terms
An object meets the bar when all of these hold:
1. **Art from files.** Every pixel it shows comes from an image file drawn with `drawImage` (canvas) or `background-image` / `border-image` (DOM).
2. **Settings from data.** Its frames, fps, loop / one-shot, anchor, size, blend, opacity curve, and which art it uses all come from the art's JSON or from a manifest / data list entry. None of them live in JS.
3. **No type lists.** No hard-coded list of type ids and no `if` / `switch` on a type id. Callers ask for a thing by id, and the manifest says what that id is.
4. **Add, change or re-theme by data.** A new entry plus its art file shows up with **zero code edits**. That includes the `index.html` / `sw.js` lists: the offline cache reads the manifests.

**Fails:**
- code-drawn art (canvas `arc` / `fill` / `stroke` / gradients for visuals, or CSS backgrounds, borders, gradients and box-shadows as chrome);
- tinting or recolouring one image by hex (each colour is its own baked file);
- look constants in JS;
- type lists and type-id branches;
- class-only moves (art in a file, but its settings or its existence in code).

**Allowed:**
- opacity fades of real art (Decision 10);
- text outlines and focus rings in code (Decision 13);
- sliders, text boxes and the F7 small chips styled in code (Decision 11);
- game logic in code (where and when an effect plays, damage, AI), as long as the look is data.

Rules for every PR below:
- One object per file. Since Decision 14, the object is **generic** and its look is a **manifest entry** (one `SpriteEffect`, not one class per effect).
- No code-drawn art and no tints or recolours used as a look. White flashes and recolours stay banned (Decision 10). Nothing draws until its art loads: no drawn fallback, and **no placeholder or code-made art ships** (no-interim rule).
- UI chrome counts as drawn art (Decision 11). F7 chips and F9 text outlines / focus rings stay code-styled (Decisions 11 and 13).
- The Backyard sims stay byte-identical: `9abf01291693`, `b9a690d334ab`, `339ce064390e`, `9e0a4dc20206`. Render-only PRs cannot touch sim state. Logic PRs keep the RNG call order the same.
- Each PR needs a PR Verifier PASS.
- **Merges:** Brian's standing yes (Nov 13, 8:06 AM ET, relayed by Chief of Staff with his exact words). Each refactor PR may be merged and deployed by its game bot once PR Verifier passes it. No force-push.
- **PR Verifier findings:** fix every finding, P1 through P3, in one pass before re-review, with no partial pushes (Brian's yes, Nov 13, 8:43 AM ET, relayed by Chief of Staff).

---

## Decisions (whose call and how it arrived, on each item)
Decisions 1 and 3–8 are **Tower Defense Games Dev's design calls, endorsed by Chief of Staff on Nov 13 at 12:08 AM ET** ("All other design calls stand"). They are not Brian's words. Decisions 2 and 9–15 are Brian's, labelled on each item.

**How Decision 14 reads on 1–13.** Each earlier decision still holds for **what** a thing looks like. Where it names a per-visual class (`HitFlash`, `ChargeGlow`, `RangeRing`, `ScreenFlash`, `FinaleDim`, `LowHpVignette`, `Bar`), that class becomes a **manifest entry drawn by a generic object**. Under Decision 14 a class per look is a class-only move. The art asks are unchanged.

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
14. **The data-driven bar (Brian, Nov 15, 10:13 PM ET, relayed by Chief of Staff):** every tower, enemy, projectile, effect, UI art and theme is an object whose art and settings come from art files plus a data list or manifest. He can then change one, add one, or switch the whole theme only by adding or swapping art files and list entries, with no code edits. Class-only moves don't count. The checkable form is at the top of this doc. The 91 gaps against it, with file:line and the PR that closes each, are in section G.
15. **Revised PR order approved; start 10a (Brian, Nov 16, 9:04 AM ET, his words relayed by Chief of Staff):** "Move ahead with the tower game." This approves the order in section 3: 10a, 10b, 11, 12, 13, 14, 15, 16, 17, 18. It replaces the old art PRs 1–6 and the old PR 10, which are folded into it (the mapping is in section 3). PR 10a is the next PR.

### Landed in PR 7 (GitHub PR #6, `oo-7-game-flow`): N1 (flow slice), N2, N15
Owner objects, one class per file:
- `GameState` (`src/core/GameState.js`): the base class. It declares `id`, `runClock`, `pausesWhenHidden`, `update(game, dt)` and `onKey(game, code, ev)`.
- `GameStateMachine` (`src/core/GameStateMachine.js`): `game.flow`. It holds one instance per state, `set(id)` throws on an unknown id, and `update(game, dt)` runs the run clock and then the current state's update.
- The 10 state classes (`src/core/states/`): `MenuState` ("menu"), `PlayingState` ("playing"), `PausedState` ("paused"), `CelebrateState` ("celebrate"), `ShopState` ("upgrade"), `GotchaState` ("gotcha"), `GameOverState` ("gameover"), `WorkshopState` ("workshop"), `VictoryState` ("victory"), `ClearedState` ("cleared").
- `InputController` (`src/core/InputController.js`): created once in `main.js:31`. It owns the shared keys and the hidden-tab auto-pause. Keys used by one state live on that state's `onKey`.
- `Game.update` (`game.js:173-182` after PR 9; 175-184 after PR 8) is now hit-stop, effects, then `this.flow.update(this, dt)`. Nothing in it checks a state string.
- Proof: `tools/flow-test.js` checks the old `main.js` keydown and visibilitychange listeners, loaded from `src/main.js@99ea184` with `git show` (CI checks out with `fetch-depth: 0`). All 760 state × key × resultsDelay × Workshop-open cases match. The 4 sims are identical.
- N1 flow slice only. PR 8 then moved the shop, abilities, workshop, finale, results and boss events out of `Game` (see "Landed in PR 8").

#### `game.state` is a compat getter/setter (removed in PR 9)
**Removed in PR 9 (last commit).** At `2fb06e6`, `game.js:40-41` was `get state()` (returns `this.flow.id`) and `set state(id)` (calls `this.flow.set(id)`), kept only so the remaining string reads and writes worked. PR 9 deleted both lines and changed the constructor's write (`game.js:32`) to `this.flow.set("menu")`. The run state is now read and set only through the machine: `game.flow.is(id)`, `game.flow.set(id)`, `game.flow.id`, `game.flow.current` (its flags: `allowsAbility`, `allowsWorldPick`, `sceneFlags`, and PR 9's `screen`, `hudLive`, `runPaused`, `closePauseMenu`). `"state" in game` is false (`flow-test`).

**Sweep:** `tools/flow-state-sweep.js` (`FlowStateSweep`, run on its own and by flow-test in CI) finds every `game.state`, `g.state`, `this.game.state`, `scene.state`, Game/DemoScene `this.state` and `"state"`-key use on a game object in `src/`, `tools/`, `sw.js` and `index.html`. Since PR 9 it expects **0 sites and fails on any**, and it fails if this section lists a compat row again. One line is allowed by its exact text: flow-test's `spyGame` stub (not a Game) defines its own `state` getter, because the keyboard oracle it feeds is the old `src/main.js@99ea184`, which reads `game.state`. Last run (PR 9): 0 sites, 1 oracle stub, 0 rows. It skips other `.state` fields: `meta.state`, Coconut / ShellShield / AudioContext / ServiceWorker `.state`, and comments. (PR 8 count: 51 sites on 39 lines; PR 8b: 46.)

What the last compat sites became (`2fb06e6` lines):
- `game.js:32` constructor write: `this.flow.set("menu")`; `game.js:40-41` getter/setter: deleted.
- `tools/sim.js:306, 315, 319, 328, 329, 335` sim loop: `game.flow.is()` / `game.flow.set()` (sims identical).
- `tools/world-test.js:52, 55, 156, 171, 385, 425, 427-429, 436-437, 470, 477-481, 483, 494, 503`: `game.flow.is()` / `game.flow.set()` / `game.flow.id`.
- `tools/card-layout-test.py:135, 227`: `g.flow.set("menu")`, `g.flow.is('playing')`.
- `tools/flow-test.js:59-62` compat getter/setter checks: `flow.id` / `flow.set` checks and `!("state" in game)`; `:55, 155` messages reworded; `:122` the oracle stub's own getter stays (allowed above).
- `src/ui.js:132, 190, 555` (moved earlier in PR 9): `closePauseMenu`, `runPaused`, `hudLive` on the states.

**Removed in PR 8** (main `738409a` lines; these are no longer compat sites, so they are not table rows):
- `game.js:79` `selectWorld`: `WorkshopController.selectWorld` asks `flow.current.allowsWorldPick` (`MenuState`, `WorkshopState`) (`src/core/WorkshopController.js:10-17`).
- `game.js:121, 142, 262, 297, 346, 379, 385, 405, 425, 763` shop: `ShopController` (`src/shop/ShopController.js`) guards with `flow.is("upgrade")` (its `open` getter, :9) and enters with `enter()` (:12-17) / `beginHeadStart` (`flow.set("upgrade")`, :36).
- `game.js:173, 243, 253, 255, 375, 612` wave flow: `WaveFlow` (`src/core/WaveFlow.js`): `startNextWave` (:18), `afterStep` (:30), `endWave` (:60), `finishCelebration` (:69, :71), `dismissGotcha` (:83).
- `game.js:192, 195` abilities: `AbilitySystem.ready()` / `use()` ask `flow.current.allowsAbility` (true only on `PlayingState`) (`src/abilities/AbilitySystem.js:11-15`).
- `game.js:437, 450, 747, 759, 769`: `RunRecorder.gameOver` / `finishRun` (`src/core/RunRecorder.js:10, 24`), `FinaleController.won` / `continueEndless` / `retireToWorkshop` (`src/bosses/FinaleController.js:56, 69, 78`).
- `game.js:478, 480, 488, 489, 545`: `WorkshopController.open` / `close` / `toMenu` (`src/core/WorkshopController.js:21-23, 33-34, 94`).
- `game.js:552, 553, 556, 557` pause: `Game.togglePause` (`game.js:164`) calls `flow.current.togglePause`; `PlayingState.pause()` (`states/PlayingState.js:11-15`) and `PausedState.resume()` (`states/PausedState.js:6-10`); every other state ignores it.
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

### Landed in PR 9 (GitHub PR #9, merged as `ca3e982`, Nov 15, 9:26 AM ET; SW v29): N14, N25 and the compat removal
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
- **N24** `FxRenderer` (`src/fx/FxRenderer.js:6-36`) is a thin batcher: it holds the theme, the frame counter and the drawn count, and each `drawX` method hands off to one drawer (`FxRenderer.js:27-34`), all in `src/fx/draw/`: `GlowSprites` (the glow cache; **deleted in PR 10a**: the 10b drawers `ProjectileTrails` and `ParticleBatch` now take named glow images from `fx.json` `glowColors` via `FxRenderer.glow`), `TowerGroundGlow` (3-18), `ProjectileTrails` (3-57), `ChainArcs` (3-48), `TextGlows` (3-21), `ParticleBatch` (5-94, motes and streaks), `ImpactPulses` (3-33), `ImpactFlashes` (3-21).
- Proof: `tools/render-test.js` (`RenderTest`, with `DrawRecorder`, `tools/draw-recorder.js`; in CI) draws 140 frames (10 states × 14 scene cases) with the new pipeline, with `render.js@24349b8` and with `render.js@738409a` (both loaded with `git show`) into recording canvases and stubs: every call and property write matches, in order. `FxRenderer.js@24349b8` and the new batcher match the same way for every method, FX theme and quality. It also checks the layer order, one class per file and the loaders. `tools/systems-test.js` checks that `World` only hands off, that each N8 object does its job driven directly, and that a scripted spawn / hit / slam / splash / kill run on `world.js@24349b8` and on the split objects leaves an identical world.

### Landed in PR #5 (2026-11-13)
- `ChillFrost`: StatusLook, active while `Enemy.slowTimer > 0` and not frozen. Plays `attach` (2f @12 fps, once), then `loop` (4f @8 fps); `still` for reduced motion; `fade` (2f @12 fps, once) when the slow wears off. No fade when the enemy freezes (IceCrust takes over at once), dies, or with reduced motion. Draws nothing until its sheet loads.
- `StatusLook.release()/revive()` and `LookLayer` support a look that fades out after its state ends (generic; only ChillFrost uses it).
- Deleted: `TINT.frozen`, the frozen branch of `spriteTint`, King Mole's frozen sprite tint and the vector `#bfefff` fills. `SpriteTinter` stays only for hit flash + Big Red charge (removed in PR 1 with HitFlash / ChargeGlow).
- Scans (tools/elements-test.js): status-ring scan over `src/fx`, `src/themes`, `src/sprites`; canvas shape/tint scan over `src/sprites` (SpriteTinter excepted until PR 1); no slow/frozen tint anywhere in `src/themes` or `src/sprites`. (A full shape scan over `src/themes` would fail on the planned PR 1–5 items, so it lands with them.)
- Neon / pixel hidden behind `ThemeSelector.ALT_THEMES` (Decision 2: they stay hidden, not deleted).

---

## G. Gap register against the Nov 15 bar (Decision 14): 91 gaps
Audited at `ca3e982` (read-only, Nov 16; full notes in `/workspace/lst-oop/DATA-DRIVEN-GAPS.md` on the box). Line numbers are at `ca3e982`. **Fails:** CD code-drawn, RC recolour / tint by hex, TL type list or type-id branch, LC look constants in code, NM no manifest (art or settings named in JS, so adding one needs a code edit). **PR** is the section 3 PR that closes the gap.

| Group | Gaps | Closed by |
|---|---|---|
| Towers | 5 | 14 |
| Enemies | 12 | 13 |
| Projectiles | 4 | 10b (P2, P3), 14 (P1, P4) |
| Effects / FX | 19 | 10a (X1-X6, X8), 10b (X7, X12-X14), 12 (X9-X11, X15-X18), 13 (X19) |
| Map / backdrop | 4 | 15 |
| UI chrome / icons | 32 | 17 |
| Themes | 6 | 11 (H1, H6), 18 (H2-H5) |
| Game data | 9 (+3 acceptable: D1, D5, D10) | 13 (D2), 15 (D4, D5), 16 (D3, D6-D9, D11, D12) |
| **Total** | **91** (+3 acceptable data cases = 94 findings) | |

What "adding one" needs today (traced at `ca3e982`):
- **A new enemy by data only** (`LST.CONFIG.enemies.beetle = {...}`, spawned in Chromium) crashes the frame draw: `TypeError: Cannot read properties of undefined (reading 'body')` at `themes/cartoon/enemies.js:30` (`COLORS[e.type]` at :18). Backyard waves never offer it (`waves.js:35-37`). Adding one with art needs edits in 6-9 places: `config.js`, `waves.js`, `palette.js`, `enemy-bodies.js`, `enemies.js`, `SpriteLibrary.js`, `EnemyAnimationRules.js`, `sw.js`, and boss lists if it is a boss.
- **A new tower:** there is no tower type at all (one `LST.Tower`, one stats block, one code-drawn `theme.tower()`).
- **A theme switch:** `ThemeSelector.js:8-18` hard-codes the ids, and themes are JS.
- **Manifests today:** only three sheet lists exist, all JS literals: `SPRITE_MANIFEST` (`SpriteLibrary.js:32-45`), `LOOK_SHEETS` (`LookSheetLibrary.js:53-59`) and `WORLD2_SHEETS` (`World2Sheets.js:3-16`). The art JSON behind them already carries frames, fps, anchors and refBodyR. The game loaded no data file. `sw.js` PRECACHE was hand-written. PR 10a adds the first loaded data manifest, `assets/fx/fx.json`.

### G.T Towers
| # | file:line | Fails | Fix: object + manifest entry + art | PR |
|---|---|---|---|---|
| T1 | `themes/cartoon/tower.js:10-139`: cannon 28-37, bolts 41-47, body 48-50, highlight 52-55, face 57-108 (eyes, blink, squint, brows, cheeks), mouth 110-127, sweat 128-136; hex at 25, 34, 36, 45, 50, 54, 84, 91, 106, 113, 135 | CD, LC | `TowerView` (generic, layered) driven by `towers.json` entry `{id:"classic", rig:"tower_classic.json", layers:[base, cannon{pivot, recoilFrames}, face{states}], scale:{by:"radius", mult}}`. Art: `tower_classic.png/json` (base, cannon, face states idle/blink/fire/hurt/worried, sweat loop, pupils) | 14 |
| T2 | `tower.js:50` `hit > 0 ? "#ff9a9a"` | RC | Same rig: a `hurt` face/body frame (or the shared HitFlash overlay entry) | 14 |
| T3 | `tower.js:23-26` shadow ellipse | CD | `GroundShadow` entry `shadow:{art:"shadow_soft.png", scale}` in the tower rig manifest | 14 |
| T4 | `themes/cartoon/lawn.js:108-121` range ring (dashed stroke, white fill) | CD, LC | `RangeRing` manifest entry `{art:"range_ring.png", fitTo:"tower.range", spin:10}` | 14 |
| T5 | `entities.js:4` one `LST.Tower`; `config.js:13-31` one stats block; no tower list | TL, NM | A `towers.json` list (stats + rig + projectile id + fx ids) and a `TowerRegistry` that reads it. Cards keep changing stats. | 14 |

### G.E Enemies
| # | file:line | Fails | Fix: object + manifest entry + art | PR |
|---|---|---|---|---|
| E1 | `themes/cartoon/enemies.js:12` mole branch, `:18` `COLORS[e.type]`, `:20` pop by boss, `:22` wobble freq by fast/basic, `:30` fill; **crash on a data-only enemy (trace above)** | TL, LC | One generic `EnemyView` whose settings (pop time, wobble freq, squash) come from the enemy's manifest entry | 13 |
| E2 | `themes/cartoon/palette.js:7-13` COLORS per type, `:18-22` TINT flash / bossFlash / charge | LC, RC | Delete. Hit flash is a `HitFlash` overlay entry and charge is a `ChargeGlow` overlay entry (Decisions 1 and 7), both art files | 13 |
| E3 | `sprites/SpriteTinter.js:22-42`; `EnemySpriteRenderer.js:106` (`fx.tint && l.tinted`); `enemy-parts.js:28-32` spriteTint; `enemy-mole.js:129` TINT.flash | RC | Delete SpriteTinter. Overlays come from the manifest (`hitFlash.json`, `chargeGlow.json`) | 13 |
| E4 | `themes/cartoon/enemy-bodies.js:7-52` vectorBody, if-chain at 9/14/24 plus an `else` that gives any unknown type Big Red horns | CD, TL | Delete. Draw nothing until the sheet loads, as World 2 does | 13 |
| E5 | `themes/cartoon/enemy-mole.js:7-119` drawMole | CD | Delete. King Mole is sheet-only | 13 |
| E6 | `themes/cartoon/enemy-fx.js:7-41` slam telegraph: dashed line, ring fill and stroke, "!" (hex 13, 22, 28, 37) | CD, LC | `SlamTelegraph` FX entry: `telegraph_ring.json` (fill-up 8 frames), `telegraph_dash.png` tile, `telegraph_bang.json` (2 frames) | 13 |
| E7 | `enemy-fx.js:44-55` dizzy stars | CD | `DizzyStars` look entry, `dizzy_stars.json` (6-frame orbit) | 13 |
| E8 | `enemy-parts.js:7-12` shadow ellipse | CD | `GroundShadow` entry, `shadow_soft.png` | 13 |
| E9 | `enemy-parts.js:14-26` HP bar (boss branch `:17`, colours `:23`), also used for World 2 (`enemies.js:51-56`) | CD, TL, LC | `Bar` object with a manifest entry `{frame:"bar_enemy_frame.png", fill:"bar_enemy_fill.png", low:"bar_enemy_low.png", offset by rig}` | 13 |
| E10 | `sprites/SpriteLibrary.js:32-45` sheet list; `EnemyAnimationRules.js:15-58` rigs and per-type rules (boss :34-39, mole :44-55), deathRig :57, mole death :73 | NM, TL | `enemies.json` holds each enemy's rig (layer list) and clip rules as data (`{when:"charging", clip:"charge"}`, …). An `EnemyRigRegistry` reads it | 13 |
| E11 | `entities.js:113` isBoss type list, `:134` boss AI branch, `:139` `shape==="triangle"` spin, `:198` minions `"basic"`; `BossEventRouter.js:8,14` mole pitch / haptics; `game.js:245` haptics by boss; `BossBar.js:14` mole; `enemies.js:68` corpse mole | TL | Flags on the enemy entry (`boss`, `bossBar:"finale"`, `haptic`, `spin`, `minion`). Behaviour by named part ids (`parts:["slamBoss"]`) | 13 |
| E12 | `worlds/render/WorldRenderers.js:14-20` bodies / overlays / backdrops maps keyed by id, `:25` gull shadow by id; one renderer class per enemy (`HermitCrabRenderer`, `SeagullRenderer`, `CrabclawRenderer`, `EliteShellRenderer`) with clip choice in code | TL, NM | The same generic `EnemyView` plus manifest rules; shadow and overlay become rig layers in data | 13 |

### G.P Projectiles
| # | file:line | Fails | Fix: object + manifest entry + art | PR |
|---|---|---|---|---|
| P1 | `themes/cartoon/projectiles.js:10-31` (speed lines 15-22, ellipse 24-25 `#ffe14d`, highlight 26-29) | CD, LC | `ProjectileView` + `projectiles.json` entry `{id:"ball", art:"projectile_ball.json", spinFps, scale}` | 14 |
| P2 | `fx/draw/ProjectileTrails.js:10-44` stroked tails (`T.color` and white core at 24), element tails recoloured by `p.tint` (28-44), glow recolour 47-52; constants `FxPresets.js:50-60` | CD, RC, LC | `ProjectileTrail` art strip per variant (`trail_base.png`, `trail_ember`, `trail_frost`, `trail_spark`, `trail_venom`) named by the projectile/element entry | 10b |
| P3 | `elements/ElementRegistry.js:43` shotTint, `entities.js:63` `p.tint` = element hex | RC | Elements name a `variant` id (`"ember"`), not a colour | 10b |
| P4 | `entities.js:222` single `LST.Projectile`; no projectile list | TL, NM | A `projectiles.json` list, referenced by the tower entry | 14 |

### G.X Effects / FX
| # | file:line | Fails | Fix: object + manifest entry + art | PR |
|---|---|---|---|---|
| X1 | `render/OverdriveRing.js:4-12` (drawn by `BackdropLayer.js:12`) | CD, LC | entry `overdriveAura` → `overdrive_aura.json` | 10a |
| X2 | `fx/draw/ChainArcs.js:5-47`, plus glow recolour by `a.color` :41-42 and `ChainSpark.js:30` colour | CD, RC, LC (white flash ring) | entries `chainBolt` (`chain_bolt.json`), `chainArcFlash` (`chain_arc_flash.json`), `chainNodeGlow` | 10a |
| X3 | `fx/draw/ImpactFlashes.js:6-20` | RC | **Landed in PR 10a:** entry `impactFlash` → `screen_burst/screen_burst.png` (Game Art v2, non-white amber; Decision 12), the old flash's size and fade, opacity fade only. The X13 white overlay flash moves to the same art in 10b | 10a |
| X4 | `fx/draw/TowerGroundGlow.js:5-17` + `FxPresets.js:38-45` | RC, LC | entry `towerAura` with `tiers:["tower_aura_t0" … "t4"]` | 10a |
| X5 | `fx/draw/GlowSprites.js:10-27`: a radial gradient canvas made per CSS colour. This is the recolour engine behind X2, X3, X4, X6, X7, X8 and P2 | CD, RC | Delete. Named glow images (`glow_gold.png`, …) | 10a |
| X6 | `fx/draw/ImpactPulses.js:16-29` stroked rings in `p.color` + glow recolour :20; colour from `FxDirector.js:90` (card colour) and `ImpactSync.js:51` | CD, RC | entry `impactRing` with variants (`impact_ring_gold/red/blue/green/purple.json`) | 10a |
| X7 | `fx/draw/ParticleBatch.js:28` glow by palette, `:37-42` arc/fillRect motes + `#fffdf2` core, `:49-82` stroked streaks in palette colours | CD, RC | `motes.json` atlas (named variants) and `streak.json`; presets list variant names, not hex | 10b |
| X8 | `fx/draw/TextGlows.js:11-17` kind if-chain, glow `#ffd23f` / `#ffb347` | TL, RC | `textGlow` entries per text kind (`glow_gold`, `glow_amber`) | 10a |
| X9 | `themes/cartoon/effects.js:10-82` burst kind if-chain (16, 30, 40, 49, 59) with code-drawn rings, stars, dirt, splash and pow; hex map :17, :22 | CD, TL, LC | `bursts.json` keyed by kind → one-shot sheets (B1-B8) | 12 |
| X10 | `effects.js:84-93` confetti; `fx/FxSpawner.js:68` colour list | CD, LC | `confetti.json` sheet (6 shapes × 4 flip frames, colours baked) | 12 |
| X11 | `themes/cartoon/projectiles.js:33-38` particle (recolour map :37); sparks in hex at `FxSpawner.js:10, 25, 41, 49, 79-80`, `KillFeedback.js:36`, `BossEventRouter.js:27,35`, `FinaleController.js:47`; enemy `color` (`config.js:35-39`, `BeachEnemies.js:10,15`) | CD, RC, LC | `sparks.json` variants; the enemy entry names `sparkVariant` | 12 |
| X12 | `fx/FxPresets.js:21-107` preset colour lists; `:133-137` FX_THEMES (blend, ink, glow) | LC | Move into `fx.json` (counts, speeds and variant names; no hex) | 10b |
| X13 | `render/OverlayLayer.js:10-17` vignette radial gradient; `:18-21` white full-screen flash | CD, banned white | `lowHpVignette` → `vignette_red.png` (Decision 9); `screenBurst` (Decision 12) | 10b |
| X14 | `render/HudCanvasLayer.js:11-12` finale dim `fillRect` | CD | `finaleDim` → `vignette_dark.png` (Decision 4) | 10b |
| X15 | `themes/cartoon/text.js:33-37` spinning coin ellipse, `:42-44` crit starburst; kind if-chain `text.js:33-49`, `entities.js:338, 345` | CD, TL | `textKinds` entries (`coin_spin.json`, `crit_star.json`); number text stays text (allowed) | 12 |
| X16 | `text.js:68-113` boss banner hazard stripes (`rect`, stripe `lineTo`, `strokeRect`) | CD | `bossBanner` → `boss_banner_band.json` (slam-in 4 frames) | 12 |
| X17 | Burst kind ids and hex at call sites: `Shockwave.js:15`, `Freeze.js:10`, `Overdrive.js:10`, `FxSpawner.js:11, 26, 48, 57, 59`, `BossEventRouter.js:26, 34` | TL, LC | Callers name an effect id only (`fx.play("shockwave")`); look and settings in `fx.json` | 12 |
| X18 | FloatText colours in code: `WaveFlow.js:49, 63`, `BossEventRouter.js:20`, `KillFeedback.js:23`, `FxSpawner.js:17-18, 27, 42, 50, 54` | LC | Text kind entries carry the colour (text colour is text, allowed), not call sites | 12 |
| X19 | Status looks: image-backed (good), but one JS class each (`elements/looks/BurnFlames.js:4-7`, `IceCrust`, `VenomDrips`, `SparkCrackle`, `ChillFrost`) plus `LOOK_SHEETS` (`LookSheetLibrary.js:53-59`) | NM | `looks` entries `{status:"burn", sheet:"BurnFlames_a.json"}`; one generic `StatusLook` | 13 |

### G.M Map / backdrop
| # | file:line | Fails | Fix: object + manifest entry + art | PR |
|---|---|---|---|---|
| M1 | `themes/cartoon/lawn.js:9-94` Backyard ground: checker 20-26, tufts 30-43, pebbles 44-55, flowers 56-76, dirt 77-84, vignette gradient 86-91 | CD, LC | `backdrops` entry `backyard` → `backyard_bg_a.json` (same contract as `beach_bg_a`) | 15 |
| M2 | `Backyard.js:17` `art.background: null`, so it falls back to the theme's code lawn (`BackdropLayer.js:8`) | NM | World entry names its backdrop id | 15 |
| M3 | `WorldRenderers.js:20, 26` backdrops map in code; `BeachBackdrop.js` is a bespoke class (surf placement :28) | TL, NM | Generic `SheetBackdrop` with layers from data (`{base, overlays:[{sheet:"beach_surf", placement}]}`) | 15 |
| M4 | Worlds are JS files with code hooks: `Backyard.js:10-15`, `Beach.js:51-58` (finale `create`), loaded by `index.html` / `sw.js` | NM | `worlds/*.json` (scaling, plan, enemies, finale boss id, backdrop, card art, copy); finale spawn rules as data | 15 |

### G.U UI chrome / icons
| # | file:line | Fails | Fix: object + manifest entry + art | PR |
|---|---|---|---|---|
| U1 | `style.css:54` (Coin icon (radial gradient + ring); selectors in F6 U1) | CD (CSS chrome) | F6 U1 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U2 | `style.css:65, 79, 80, 81, 474, 1006` (HUD / start pills: coins, best, best-new, gears, trophy; selectors in F6 U2) | CD (CSS chrome) | F6 U2 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U3 | `style.css:112, 126, 132, 291, 395, 414, 470, 655, 744, 789, 814` (Text buttons: primary (Play, Next wave), secondary, danger, small (Reroll, Repair), disabled, pressed, urgent repair, return-to-run, toast button; selectors in F6 U3) | CD (CSS chrome) | F6 U3 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U4 | `style.css:134, 148, 149, 158` (Round icon buttons (sound, music, settings, pause, speed) and their off / pressed states; pause glyph bars; selectors in F6 U4) | CD (CSS chrome) | F6 U4 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U5 | `style.css:161, 178` (Settings rows; selectors in F6 U5) | CD (CSS chrome) | F6 U5 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U6 | `style.css:202, 212, 220` (Tower HP bar (frame, fill, low-HP fill); selectors in F6 U6) | CD (CSS chrome) | F6 U6 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U7 | `style.css:31, 241, 252` (Page background and the menu scrims behind screens; selectors in F6 U7) | CD (CSS chrome) | F6 U7 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U8 | `style.css:254, 272` (Dialog panels (start, pause/settings, shop, results, workshop, gotcha, confirm, cleared); selectors in F6 U8) | CD (CSS chrome) | F6 U8 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U9 | `style.css:274` (Logo tile around the app icon; selectors in F6 U9) | CD (CSS chrome) | F6 U9 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U10 | `style.css:451` (Update toast and mini toast; selectors in F6 U10) | CD (CSS chrome) | F6 U10 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U11 | `style.css:489, 843, 848, 863` (Info boxes: welcome note, gotcha lesson, results codex note, codex detail; selectors in F6 U11) | CD (CSS chrome) | F6 U11 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U12 | `style.css:496` (Results stat tiles; selectors in F6 U12) | CD (CSS chrome) | F6 U12 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U13 | `style.css:512, 518, 1000` (Gears box (gradient panel) and its total divider; selectors in F6 U13) | CD (CSS chrome) | F6 U13 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U14 | `style.css:523, 524, 525, 527, 532, 533, 534` (Next-unlock row: frame, ready state, icon tile, progress bar; selectors in F6 U14) | CD (CSS chrome) | F6 U14 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U15 | `style.css:303, 322, 323, 324, 336, 354, 367, 381, 382, 620, 806, 810, 1101, 1106, 1109, 1131, 1148, 1149` (Shop card frame: base, rare, epic + shimmer, pressed, icon tile, action tag (take / free / done), eye badge, cursed glow, flip marker, card back + info back; selectors in F6 U15) | CD (CSS chrome) | F6 U15 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U16 | `style.css:545, 551, 552, 554, 556, 564, 565, 569, 574, 706` (Workshop card frame: base, rare, epic, icon tile, lock badge, locked, afford, revealed shimmer, upgrade icon tile; selectors in F6 U16) | CD (CSS chrome) | F6 U16 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U17 | `style.css:717, 723, 724, 726, 728, 732, 733, 736, 739` (Deck card frame: base, rare, epic, icon tile, lock badge, locked, benched + benched stamp; selectors in F6 U17) | CD (CSS chrome) | F6 U17 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U18 | `style.css:679, 690` (Head Start picker button (on / off); selectors in F6 U18) | CD (CSS chrome) | F6 U18 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U19 | `style.css:695, 696, 698, 699` (Workshop tab bar and tabs; selectors in F6 U19) | CD (CSS chrome) | F6 U19 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U20 | `style.css:820, 826, 829, 835` (Gotcha reveal card: faces, back, icon tile, TRAP stamp; selectors in F6 U20) | CD (CSS chrome) | F6 U20 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U21 | `style.css:852, 854, 857, 858, 859, 860, 861, 862` (Codex tiles: base, icon tile, unknown, trap, trap-unknown, selected, stamp; selectors in F6 U21) | CD (CSS chrome) | F6 U21 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U22 | `style.css:909, 928, 932, 934, 935, 952` (Ability button: face, ready per ability, pressed, conic cooldown ring; selectors in F6 U22) | CD (CSS chrome) | F6 U22 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U23 | `style.css:974, 978, 979, 984` (Boss HP bar: track, fill, finale fill, phase pips; selectors in F6 U23) | CD (CSS chrome) | F6 U23 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U24 | `style.css:1010, 1015, 1022, 1023, 1024, 1025, 1040` (Workshop ability picker tiles (on / locked / afford, per-ability icon tile); selectors in F6 U24) | CD (CSS chrome) | F6 U24 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U25 | `style.css:1166, 1171, 1172, 1174` (World select cards: frame, pressed, selected (outline), picture strip; selectors in F6 U25) | CD (CSS chrome) | F6 U25 art, listed in `ui.json` (`{id, art, slice}`) and applied by one generic `UiSkin`, not a class per chrome item | 17 |
| U26 | F8 recolours: `style.css:383` saturate, `:385` grayscale, `:737` grayscale, `:190/200` heart fill + drop-shadow | RC | Authored state images (F8) named in `ui.json` | 17 |
| U27 | `style.css:440` `@keyframes blink { 50% { filter: brightness(1.5) } }` on the low-HP fill (`style.css:220`); new, it was not in the doc | RC | `hpBar.low` 2-frame art in `ui.json`. `ui-chrome-scan.js:45` skips keyframe steps (`from`, `to`, `N%`), so it never sees this | 17 |
| U28 | **New, not in the doc:** `style.css:582` `@keyframes glow` animates a box-shadow ring (green) | CD | Authored glow frames; the scanner has the same blind spot | 17 |
| U29 | `--accent` recolour of icon tiles from card hex: `CardsTab.js:22-23`, `DeckTab.js:30`, `CodexTab.js:22`, `UpgradesTab.js:19`, `ResultsScreen.js:41, 71`, `GotchaScreen.js:19-20, 23`; CSS consumers `style.css:304, 358, 508, 527, 546`; rarity hex `upgrades.js:113-117` | RC | Icon art with its tile colour baked in, per card id, in `icons.json` | 17 |
| U30 | Inline SVG icon art in data and code: `upgrades.js` (12 icons), `meta.js:16-30` (8), `traps.js` (8), element cards (`Ember.js:21`, …, 5), abilities (`Shockwave.js:7`, `Freeze.js:6`, `Overdrive.js:6`), `ui/UiIcons.js:4-6`, `ui/CardFlip.js:71`, `index.html` (19 `<svg>`) | CD (vector icons in code), NM | `icons.json` + `icons.png` atlas; data entries name an icon id | 17 |
| U31 | `style.css:12-22` `:root` palette (`--ink`, `--yellow`, `--red` …) and font stack `:37`. The look is defined in CSS constants | LC | Theme manifest carries the UI art; text colours may stay as theme data | 17 |
| U32 | No UI-art manifest or loader; the planned F6 owner objects (`Pill`, `UiButton`, … in §3 PR 6) are per-object JS + CSS | NM | One `UiSkin` loader that reads `ui.json` and applies frames (CSS `border-image` / `background-image` generated from data) | 17 |

### G.H Themes
| # | file:line | Fails | Fix: object + manifest entry + art | PR |
|---|---|---|---|---|
| H1 | `themes/ThemeSelector.js:8-18` hard-coded ids (`cartoon`, HIDDEN `neon`, `pixel`), `ALT_THEMES` constant | TL | `assets/themes/index.json` lists themes; `ThemeSelector` reads it | 11 |
| H2 | Themes are code: `themes/cartoon/index.js:6-7` ORDER method list (14 draw methods), `neon.js` (164 lines), `pixel.js` (334 lines) all code-drawn | CD, NM | `assets/themes/<id>/theme.json` maps every visual id (tower, enemies, projectiles, fx, backdrops, ui, icons) to art files + settings | 18 |
| H3 | `themes/cartoon/palette.js:5-22` INK / FONT / COLORS / TINT | LC | Theme manifest (fonts and text colours only) | 18 |
| H4 | `fx/FxPresets.js:133-137` FX_THEMES blend / ink / glow per theme | LC | Theme manifest | 18 |
| H5 | `style.css` is one fixed skin (`:root` at 12-22, 1204 lines) | LC | Theme manifest supplies the UI skin (`ui.json`) | 18 |
| H6 | Asset paths are spread across 3 JS lists (`SpriteLibrary.js:32`, `LookSheetLibrary.js:53`, `World2Sheets.js:3`), world files (`Backyard.js:17`, `Beach.js:60`) and the hand `sw.js` PRECACHE | NM | One manifest tree. `sw.js` precaches whatever the active theme manifest lists (or a build check generates the list) | 11 |

### G.D Game data
| # | file:line | Fails | Fix: object + manifest entry + art | PR |
|---|---|---|---|---|
| D1 | Tower stats `config.js:13-31` | JS literal | **OK** for tuning one tower. Fails for adding a tower (T5) | acceptable (data); adding a tower is T5 (PR 14) |
| D2 | Enemy stats `config.js:34-40`; Beach `BeachEnemies.js:8-21` (stats + parts) | JS literal | **Fails**: a new entry alone crashes the render and is never spawned (trace). `color` / `shape` are look fields in stats (LC) | 13 |
| D3 | `bosses/CaptainCrabclaw.js:26` writes `LST.CONFIG.enemies.crabclaw` at runtime | code | Fails (N21): stats outside the config file | 16 |
| D4 | Backyard waves `waves.js:29-47` with the type list and unlock waves at `:35-37` (ignores `Backyard.js:7` `enemies`) | code | **Fails (TL)**. Beach plan `Beach.js:15-46` (`LevelPlan` acts and mixes) is **OK** (add a mix entry, no code) | 15 |
| D5 | Bosses / finale `config.js:42-76` | JS literal | **OK** for numbers. Minion type literal `entities.js:198` and finale `create()` (`Backyard.js:10-15`, `Beach.js:51-57`) are code | acceptable for the numbers; the minion literal and finale `create()` close in PR 15 |
| D6 | Shop cards `upgrades.js:11-110` (`LST.CARDS`) | JS literal with `apply` / `stat` closures, inline SVG, hex | **Partly**: a card that only changes existing tower fields is one entry, but the entry is code (closures) plus inline art and hex (U29, U30). A new mechanic needs code. `mysteryBox` special case `ShopController.js:122` (TL). Fix: `cards.json` with a small op vocabulary (`{stat:"damage", op:"add", value:0.3, of:"base"}`) | 16 |
| D7 | Traps `traps.js:13-90` | JS literal with `apply` / `remove` closures | Same as D6 | 16 |
| D8 | Workshop upgrades `meta.js:15-30` + `config.js:129-138` | data list | **Fails**: effects hard-coded per id at `meta.js:233-240`, armor `:63-66, 203`, headStart `:244-251`, appraisal `ShopController.js:158`, `ShopScreen.js:74`, `UpgradesTab.js:21` | 16 |
| D9 | Elements `Ember.js:20-23`, `Frostbite.js:44`, `Venom.js:38`, `ChainSpark.js:30`, `Shatter.js:8` | data literal inside a class file each | Behaviour in code is acceptable. Colour and icon fail (P3, U30); new element = new file + `index.html` / `sw.js` / sim edits | 16 |
| D10 | Abilities `config.js:79-83` + one class each (`Shockwave.js`, `Freeze.js`, `Overdrive.js`) | numbers OK | Behaviour code is acceptable; icons and colours fail (U30, X17) | acceptable (numbers); icons and colours are U30 / X17 |
| D11 | Rarity table `upgrades.js:113-117` (hex), `TowerAura.js:19` rarity weights in code | literal / code | Partly: move weights and labels to data, colours to art | 16 |
| D12 | Loading: every data and code file is a `<script>` (`index.html`, 167 tags) + `sw.js` + `tools/sim.js:28` | code | Fails (NM): no data file is ever loaded | 16 |

No gap is left without a PR. The old plan (art PRs 1–6, old PR 10) covered X1–X11, X13–X16, P2, E1–E11, T1–T4, P1, M1–M2, U1–U26, U29–U30 and D3, D4, D6, D7, but only as one class per look. It had no manifest, no loader and no manifest-driven offline cache, and it did not cover X12, X17–X19, E12, T5, P3, P4, M3, M4, D2, D8, D11, D12, H1–H6, U27, U28, U31 or U32. Section 3 now covers every one.

### G art list: PR 10a / 10b art from Game Art & Motion

Rules for every file:
- No white flashes and no recolours: each colour is its own baked file.
- Cores are a lighter tint of the same hue, never pure white.
- Transparent PNG (pngquant `.q.png` + RGBA master), with a JSON sheet in the existing format (frames, frameTags, pivot, refBodyR / scaleRule).
- Opacity fades are done in code (allowed). Rows 1–4 and 6–8 were asked for PR 10a on Nov 16 (`overdrive_aura`, `chain_bolt`, `chain_arc_flash`, `chain_node_glow`, `tower_aura_t0`–`t4`, `glow_<10 colours>`, `impact_ring_<5 colours>`); rows 5 and 9–13 are PR 10b.

| # | File | Frame size | Frames | What it shows | Replaces |
|---|---|---|---|---|---|
| 1 | `fx/overdrive_aura.json/.png` | 256×256 | 6, loop 10 fps | Hot orange heat ring pulsing around the tower base (ink-free soft edge), refBodyR = tower radius 26 | X1 OverdriveRing |
| 2 | `fx/chain_bolt.json/.png` | 256×48 | 3 jagged variants × 3 frames (fresh, mid, fade), one-shot about 0.2 s | Yellow lightning bolt segment with a dark ink underlay baked in, stretchable along its length (pivot at the left end) | X2 bolt strokes |
| 3 | `fx/chain_arc_flash.json/.png` | 96×96 | 4, one-shot | Yellow spark ring on each struck enemy (not white) | X2 white arc rings |
| 4 | `fx/chain_node_glow.png` | 64×64 | 1 | Soft yellow glow under each bolt node | X2 glow |
| 5 | `fx/screen_burst.png` | 512×512 (cover-fit) | 1 (optional 3-frame one-shot) | Warm amber, **non-white** radial burst, fully transparent edges (Decision 12) | X3 ImpactFlashes, X13 white flash |
| 6 | `fx/tower_aura_t0..t4.json/.png` (5 files) | 256×256 | 6, slow loop 4 fps | Ground glow under the tower per tier: t0 pale gold, t1 gold, t2 amber, t3 deep gold / orange, t4 rainbow (gold / pink / blue / purple) | X4 TowerGroundGlow |
| 7 | `fx/glow_<name>.png` (10 files): gold, amber, pale, yellow, red, pink, blue, purple, orange-ember, green-venom | 64×64 | 1 | Soft round bloom, same-hue core | X5 GlowSprites and every `fx.glow(hex)` |
| 8 | `fx/impact_ring_<variant>.json/.png` (5): gold (default), red (tower hit / slam), blue (frost), green (venom), purple (epic card) | 192×192 | 6, one-shot | Expanding ring with the ink outline baked in, thinning as it grows | X6 ImpactPulses |
| 9 | `fx/motes.json/.png` atlas | 32×32 cells | 1 each (+2-frame twinkle optional) | Round mote in 8 colours (gold, pale, pink, blue, red, purple, green, orange) plus star, snowflake, ember, venom drop | X7 motes |
| 10 | `fx/streak_<variant>.json/.png` (4): gold, red, blue, pale | 64×16 | 3 (fade steps) | Ink-outlined speed streak, stretched along velocity | X7 streaks |
| 11 | `fx/trail_<variant>.png` (5): base yellow, ember, frost, spark, venom | 128×24 | 1 (2 optional) | Comet tail strip, stretched behind the shot | P2 ProjectileTrails |
| 12 | `fx/vignette_red.png` | 1024×1024 (cover-fit) | 1 | Red low-HP edge vignette, clear centre (Decision 9) | X13 vignette |
| 13 | `fx/vignette_dark.png` | 1024×1024 (cover-fit) | 1 | Dark purple finale dim (Decision 4) | X14 finale dim |

Text glows (X8) reuse #7 gold and amber. 37 PNGs in total (13 rows; rows 6-11 are multi-file).

---

## 3. Conversion order under the bar (Decision 15: approved Nov 16, 9:04 AM ET)
Each PR ships on its own. Each one needs:
- unit tests, plus a **data-only acceptance test** (add an entry and its art, and it works with zero code edits);
- the 4 sim hashes unchanged;
- the design-review OO gate and a PR Verifier PASS;
- then a merge under Brian's standing yes for refactor PRs (Nov 13, 8:06 AM ET, relayed by Chief of Staff).

**No placeholder or code-made art ships.** A PR whose art has not arrived pushes its branch and opens no PR until the art lands. The gap ids are from section G.

1. **PR 10a: FX manifest + image-backed FX** (X1, X2, X3, X4, X5, X6, X8). **Built on `oo-10a-fx-manifest`; PR open, waiting on Brian's look check.**
   - **Data:** `assets/fx/fx.json` lists effects by id. Each entry names its sheet (an art JSON in a Game Art & Motion format: "strips", or the flat FX sheet the v1 delivery uses, where a grid sheet gives one strip per row) and its settings: size rule, blend, opacity curve, pulse, offset, and low-quality skip. The art JSON carries frames, fps, loop / one-shot and anchor.
   - **Objects:** `FxManifest` (fetch loader, like `LookSheetLibrary`), one generic `SpriteEffect` (sheet, frames, fps, loop / one-shot, anchor, scale, blend, opacity fade only), and `EffectPlayer` (plays any id at a point, with zero code).
   - **Converted to entries:** OverdriveRing (`overdriveAura`), ChainArcs (`chainBolt`, `chainArcFlash`, `chainNodeGlow`), ImpactFlashes (`impactFlash` → `screen_burst`, Decision 12), TowerGroundGlow (`towerAura`, one sheet per tier), ImpactPulses (`impactRing.*` and `impactBloom.*`, picked by impact name), and TextGlows (`textGlow.<kind>`). Callers ask by id.
   - **Deleted:** GlowSprites, the radial-gradient recolour engine. The 10b drawers (ParticleBatch, ProjectileTrails) get named glow images through a colour-to-glow table in `fx.json` until 10b names variants.
   - **Offline cache:** `sw.js` v30 reads `fx.json` at install and caches every sheet JSON and PNG it lists.
   - **Tests:** a data-only acceptance test (temp entry + PNG fixture plays with zero code edits), render-test updates, and `tools/fx-art-scan.js` (fails on fill / stroke / arc / gradient / tint calls in the converted files).
   - **Art (asked of Game Art & Motion, Nov 16):** `overdrive_aura`, `chain_bolt`, `chain_arc_flash`, `chain_node_glow`, `tower_aura_t0`–`t4`, `glow_<10 colours>`, `impact_ring_<5 colours>` (section G art list rows 1–4 and 6–8).
   - **Art landed (Game Art & Motion PR10a effects v1, Nov 16, plus v2 additions at 9:58 AM ET):** 27 sheets in `assets/fx/` (sub-folders per effect), byte-identical to the delivery, with its `PROVENANCE.json` (every PNG listed with its sha256; `tools/fx-test.js` checks it) and `LICENSE.md`; about 3.7 MB. `fx.json` is built from the delivery's `fx.manifest.json` in our schema. Glow colours: amber, blue, cyan, gold, green, lime, orange, pink, purple, red, plus v2 **pale** (warm cream) and **yellow**. v2 also brought `screen_burst` (amber, no near-white pixels), which closes the PR Verifier's P2-1 stand-in (the flash had used `glow_gold`). Mapping: white and pale (`#ffffff`, `#fff3a0`, `#fff6a8`) → `glow_pale`, yellow (`#ffe14d`, `#ffe680`) → `glow_yellow`, gold stays gold (P3-2); boss kill, finale, tier-up and spark blooms → `impactBloom.pale` (their old bloom colour); frost / shatter blooms → cyan, venom → lime. **PR 10a is complete: no stand-in art left.**
   - **Sizes (a design call: match the look each effect replaces, not the delivery preview).** Game Art's preview assumed fixed CSS sizes; ours follow the old drawing (CSS px at the phone's 0.629 px per world unit):
     - overdrive: frame half-width 2.25 x tower radius (about 74 px; preview 72), so the flames reach as far as the old disc's pulse;
     - tower aura: 2.22 to 3.6 x tower radius by tower power (about 73 to 118 px; preview 90), matched to the old glow's alpha mass;
     - chain bolt: stretched along each hop, about 18 px thick (preview 64 x 12), matching the old jag envelope;
     - arc flash 44 px (preview 28; its last ring at the old radius 22) and node glow 30 px (preview 14; the old radius 24);
     - glows: coin 22, crit 30, blooms 0.35 to 0.7 x the impact ring (preview 20);
     - screen burst: half the 512 frame = half the screen's long side, centred on the impact (844 px across on a 390 x 844 phone; preview 900 px centred), the old flash's size; the art's alpha-mass radius 0.41 matches the old glow's 0.43. Opacity = flash strength x (1 - life)^2, the old timing;
     - impact rings: relative to each impact's ring radius (30 to 320 world units), ending on it as the old stroke did (preview 48 px fixed). Small element rings match the old look. Big rings (boss kill, finale, tier-up, cards) come out much thicker than the old 3 to 12 px stroke, because the art's band scales with the ring. That is a look question for Brian (`docs/qa/pr10a/pr10a-03b`, `-03c`).
2. **PR 10b: The rest of the canvas FX** (X7, X12, X13, X14, P2, P3).
   - ParticleBatch motes and streaks and ProjectileTrails become `fx.json` entries.
   - The low-HP vignette (Decision 9), screen burst (Decision 12) and finale dim (Decision 4) also become entries.
   - Presets name variants, not hex (`FX_PRESETS` and `FX_THEMES` move into `fx.json`), and elements name a trail variant, not a colour. The 10a colour-to-glow table goes away.
   - Art: motes, streaks, trails, `vignette_red`, `vignette_dark`, `screen_burst`.
3. **PR 11: Asset and theme manifest foundation** (H1, H6).
   - `assets/themes/index.json` and `assets/themes/cartoon/theme.json` absorb `SPRITE_MANIFEST`, `LOOK_SHEETS`, `WORLD2_SHEETS` and `fx.json`. `ThemeSelector` reads them.
   - `sw.js` precaches what the manifests list (generalising the 10a `fx.json` read), with a CI check that every listed file exists.
4. **PR 12: Bursts, particles, confetti, text pops, boss banner** (X9, X10, X11, X15, X16, X17, X18). This is the rest of the old PR 2. Callers say `fx.play(id)`, and burst kinds and FloatText colours move into entries.
5. **PR 13: Enemies as data** (E1–E12, D2, X19).
   - `enemies.json` holds stats, rig layers, clip rules, overlays, spark variant and flags.
   - One generic `EnemyView` replaces the cartoon dispatch and the World 2 renderer classes.
   - Overlays become entries: HitFlash, ChargeGlow, SlamTelegraph, DizzyStars and GroundShadow (old PR 1, Decisions 1 and 7). The HP bar uses `Bar` (Decision 3).
   - SpriteTinter and the vector fallbacks are deleted. Status looks become entries.
   - **Acceptance:** an enemy added with only a JSON entry and art files spawns, draws and dies.
6. **PR 14: Tower and projectiles as data** (T1–T5, P1, P4). `towers.json`, `projectiles.json`, a generic `TowerView`, and `RangeRing` as an entry (Decision 4). This is the old PR 4.
7. **PR 15: Worlds and backdrops as data** (M1–M4, D4, D5). `worlds/*.json`, a generic `SheetBackdrop`, Backyard waves moved to data, and `backyard_bg` art. This is the old PR 5. Neon and pixel stay hidden (Decision 2).
8. **PR 16: Game data stores** (D3, D6–D9, D11, D12; N16–N22, optionally N11). This is the old PR 10.
   - `cards.json`, `traps.json` and `upgrades.json` use an effect-op vocabulary instead of closures.
   - MetaStore, AudioEngine / SfxLibrary / MusicSequencer, Settings / Haptics, and a frozen config.
9. **PR 17: UI skin from a manifest** (U1–U32). This is the old PR 6, revised.
   - `ui.json` and an `icons.json` atlas, with one generic `UiSkin` instead of a class per chrome item.
   - F8 recolours become state images.
   - It also fixes the `ui-chrome-scan` keyframe blind spot (U27, U28).
10. **PR 18: Theme switch** (H2–H5). A second theme is just another `assets/themes/<id>/` folder. Neon and pixel stay hidden unless they are re-authored as art (Decision 2).

**Where the old plan went:**
- **Old PR 1** (A1–A7) → PR 13.
- **Old PR 2** (B1–B24):
  - B11, B12, B13, B15, B16, B19 → PR 10a;
  - B14, B17, B18, B20, B21, B22 → PR 10b;
  - B1–B10, B23, B24 → PR 12.
- **Old PR 3** (C1–C4) → PR 13.
- **Old PR 4** (D1–D3) → PR 14.
- **Old PR 5** (E1–E2) → PR 15.
- **Old PR 6** (F1–F8) → PR 17.
- **Old PR 10** → PR 16.
- **PRs 7, 8, 8b and 9 landed** (logic only, no art). See the "Landed in" sections.

The art PRs are blocked on Game Art & Motion delivering. Code is built and tested against test fixtures in the meantime (fixtures live under `tools/fixtures/`, are never precached or loaded by the game, and never ship as art).

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

**Read with Decision 14.** Sections 0–2 are the first audit (what is code-drawn, and where). The "Owner" column names the look and its art ask. Under Decision 14 each owner is a **manifest entry drawn by a generic object**, not its own class, and the "PR n" numbers are the old plan. Section 3 ("Where the old plan went") maps them to the new PRs, and section G gives the entry, art and PR for every gap.

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
| B12 | **Deleted in PR 10a.** Was `fx/draw/GlowSprites.js:10-28` `get()` (`FxRenderer.glow`) (procedural radial gradient into an offscreen canvas). `FxRenderer.glow(color)` now returns the named glow image `fx.json` `glowColors` gives that colour; the 10b drawers (ProjectileTrails, ParticleBatch) use it until 10b names variants | Soft bloom used by all FX | `GlowSprite`, `src/fx/GlowSprite.js` | `glow_soft.png` (white core), plus one variant per element color |
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
| N2 | **Landed in PR 7.** Was `game.js@99ea184:573-618` update. Now `game.js:173-182` update calls `this.flow.update`; the `game.js:40-41` compat getter/setter was removed in PR 9 | String state machine (`this.state === "playing"` and so on) | `GameStateMachine` (`src/core/GameStateMachine.js:6-28`) and `GameState` (`src/core/GameState.js:8-15`), plus `MenuState` (`states/MenuState.js:2-9`), `PlayingState` (`states/PlayingState.js:3-24`), `PausedState` (`states/PausedState.js:2-4`), `CelebrateState` (`states/CelebrateState.js:2-9`), `ShopState` ("upgrade", `states/ShopState.js:3-13`), `GotchaState` (`states/GotchaState.js:2-8`), `GameOverState` (`states/GameOverState.js:3-17`), `WorkshopState` (`states/WorkshopState.js:3-9`), `VictoryState` (`states/VictoryState.js:3-11`), `ClearedState` (`states/ClearedState.js:2-8`). The compat getter/setter and its last uses: see "`game.state` is a compat getter/setter" (removed in PR 9) |
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
| N24 | **Landed in PR 8b.** Was `FxRenderer.js@24349b8` (one class draws every FX kind; FxDirector's state check was removed in PR 8: `SceneFlags.towerAura`) | God renderer | Thin batcher `FxRenderer` (`src/fx/FxRenderer.js:6-36`) handing off to one drawer per effect in `src/fx/draw/` (`GlowSprites`, deleted in PR 10a (the 10b drawers use `fx.json` `glowColors`); `TowerGroundGlow`, `ProjectileTrails`, `ChainArcs`, `TextGlows`, `ParticleBatch`, `ImpactPulses`, `ImpactFlashes`). The art views (section B) replace these drawers in the art PRs |
| N25 | **Landed in PR 9.** Was `pwa.js@2fb06e6` | IIFE that builds an inline toast | `UpdateNotifier` (`src/ui/UpdateNotifier.js:4-51`) using `Toast.offer` (`src/ui/screens/Toast.js:14-24`); `pwa.js` starts it |
| N26 | `index.html` script-order loading on the global `LST` | Implicit dependencies | Keep the globals for now (no bundler). Order is documented per module. **Judgment** |
| N27 | **Tool objects landed in PR 7 (and PR 8).** `tools/ui-chrome-scan.js`, `tools/flow-test.js`, `tools/flow-state-sweep.js`, `tools/systems-test.js` | Scanner / test logic used to be loose module code | `UiTest` (`tools/ui-test.js`, PR 9) and `ScreenSnapshotTest` (`tools/screen-snapshot-test.py`, PR 9): the screen objects own their DOM and behaviour, and every screen's markup matches `2fb06e6`; `UiChromeScanner` (`tools/ui-chrome-scan.js:11-103`): scans CSS + doc coverage and categories (image art / allowed code-styled / banned recolor); `FlowTest` (`tools/flow-test.js:14-169`): game-flow tests + git oracle; `FlowStateSweep` (`tools/flow-state-sweep.js`): all compat reads/writes mapped with file:line, plus (PR 8) stale-row and cleared-file checks; `SystemsTest` (`tools/systems-test.js`, PR 8; PR 8b adds the World split and the `git show` SceneFlags oracle): the game systems own their behaviour; `RenderTest` (`tools/render-test.js`, PR 8b) with `DrawRecorder` (`tools/draw-recorder.js`): the render pipeline and FX drawers draw exactly what the old code did. Each owns its root path, methods and run result, created once by the one-line CLI entry point and discarded on exit. They change no game state outside the test sandbox. No loose functions (only class methods and callbacks inside them). `world-test.js` / `sim.js` edits add no functions; their pre-existing helpers are unchanged |

---
---

## 4. Main notes
- Main is `ca3e982` (PR #9 / OO PR 9 merged Nov 15, 9:26 AM ET; live as SW v29). Before that `2fb06e6` (PR #8 / OO PR 8b, Nov 15, 8:30 AM ET, SW v28), `24349b8` (PR #7 / OO PR 8, Nov 14, 4:08 PM ET, SW v27), `738409a` (PR #6 / OO PR 7, Nov 14, 3:40 PM ET, SW v26) and `99ea184` (PR #5, Nov 13, 8:07 AM ET, SW v25). The old main `70bff8c` code-drawn LookKit looks and `FxRenderer.drawStatusRings` are gone from main.
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
