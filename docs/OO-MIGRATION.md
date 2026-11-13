# Last Stand Tower: object-oriented migration plan

Status: **read-only audit, not committed.** Base: PR #5 head `fc3f443` (branch `world-2-beach`). Main is `70bff8c`.
Brian's direction: "Fix everything to object orientated... EVERYTHING... Not just art. All of it object orientated."

Rules for every PR below:
- One visual or system per class per file.
- No code-drawn art and no tints/recolors used as a look. Images are drawn with `drawImage`; moving, scaling, rotating or fading a real image is fine.
- The backyard sims must stay byte-identical: `9abf01291693`, `b9a690d334ab`, `339ce064390e`, `9e0a4dc20206`. Render-only PRs cannot touch sim state. Logic PRs must keep the RNG call order the same.
- Each PR needs a PR Verifier PASS.
- Brian approves merges. No force-push.

---

## Decisions (Brian, 2026-11-13 12:08 AM ET)
1. **Hit flash:** one shared `HitFlash` overlay image object (`src/elements/looks/HitFlash.js`), not per-sheet hurt frames. Replaces TINT.flash / TINT.bossFlash.
2. **Neon and pixel themes:** **pending Brian.** Not deleted. Hidden behind a flag instead (done early, in PR #5): `LST.ThemeSelector.ALT_THEMES` (`src/themes/ThemeSelector.js`) is off, so `index.html` / `styles.html` no longer load `src/themes/neon.js` / `pixel.js`, `sw.js` does not precache them, `?style=` is ignored and the styles.html picker lists cartoon only. The code stays until Brian decides. Cartoon is the game, and features are frozen.
3. **Bars** (enemy HP, boss HP, unlock, ability cooldown): an image frame plus an image fill, owned by a `Bar` object (`src/ui/Bar.js`). Done late in the UI art PR.
4. **Range ring, screen flash and finale dim:** images, each owned by an object (`RangeRing`, `ScreenFlash`, `FinaleDim`).
5. **Particles:** fixed colour variants baked into the art. Never tint.
6. **Slow as a proper status (N11):** only if all 4 Backyard sim hashes stay identical. Otherwise `Enemy.slowTimer` stays the source and `ChillFrost` reads it.
7. **Big Red:** add a `ChargeGlow` overlay object (`src/bosses/looks/ChargeGlow.js`). Replaces TINT.charge.
8. **ChillFrost now, in PR #5:** the frozen/slow tint is removed in PR #5 and `ChillFrost` (`src/elements/looks/ChillFrost.js`) owns the slowed look. Art: Game Art & Motion ChillFrost v0.1.0, variant b (`assets/sprites/looks/ChillFrost/ChillFrost_b.*`, sha256 in `assets/sprites/looks/PROVENANCE.json`).

### Landed in PR #5 (2026-11-13)
- `ChillFrost`: StatusLook, active while `Enemy.slowTimer > 0` and not frozen. Plays `attach` (2f @12 fps, once), then `loop` (4f @8 fps); `still` for reduced motion; `fade` (2f @12 fps, once) when the slow wears off. No fade when the enemy freezes (IceCrust takes over at once), dies, or with reduced motion. Draws nothing until its sheet loads.
- `StatusLook.release()/revive()` and `LookLayer` support a look that fades out after its state ends (generic; only ChillFrost uses it).
- Deleted: `TINT.frozen`, the frozen branch of `spriteTint`, King Mole's frozen sprite tint and the vector `#bfefff` fills. `SpriteTinter` stays only for hit flash + Big Red charge (removed in PR 1 with HitFlash / ChargeGlow).
- Scans (tools/elements-test.js): status-ring scan over `src/fx`, `src/themes`, `src/sprites`; canvas shape/tint scan over `src/sprites` (SpriteTinter excepted until PR 1); no slow/frozen tint anywhere in `src/themes` or `src/sprites`. (A full shape scan over `src/themes` would fail on the planned PR 1–5 items, so it lands with them.)
- Neon / pixel hidden behind `ThemeSelector.ALT_THEMES` (Decision 2).

---

## 0. The frozen/slow TINT: same status as IceCrust, or separate?

**It is a separate state.** The tint has no look object of its own.

| | Frozen TINT (blue recolor) | IceCrust look |
|---|---|---|
| Keyed on | `e.slowTimer > 0` (`themes/cartoon/enemies.js:29`, `enemy-mole.js:49,129`) | StatusEffect `"frozen"` (`LST.Frozen`, `src/elements/Frostbite.js:8-10`) |
| Set by | `Enemy.applySlow` (`entities.js:116-120`). Three sources: **Frost Shots** card, every hit (`entities.js:252`, 1.2 s, `config.js:26`); **Frostbite chill**, every hit (`Frostbite.js:22`, 15% for 1.5 s); **Freeze ability**, every enemy on screen (`game.js:203-206`, 60% for **4 s**, `config.js:81`) | Only every 3rd Frostbite hit on an enemy that is already slowed |
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

## 1. Visual inventory (code-drawn art at fc3f443)

The image check:
- **Real image files:** all enemy bodies (basic, fast body/face, tank, big_red, all King Mole sheets, with clips for walk/idle/death and boss attacks). The pupils (EyeLayer) are images too.
- **World 2 is already OO and image-only:** BeachBackdrop, the HermitCrab/Seagull/Crabclaw/EliteShell/Coconut renderers, and the status looks (BurnFlames, IceCrust, VenomDrips, SparkCrackle).
- **Not images:** the tower, projectiles, backyard lawn, every burst, particle and glow, the banners, and all icons.

### A. Status tints and enemy overlays — 7 items
| # | Where | Looks like / when | New owner (class, file) | Art ask |
|---|---|---|---|---|
| A1 | `palette.js:17-22` TINT.frozen; `enemies.js:29,31,40`; `enemy-parts.js:28-33`; `enemy-mole.js:49,129`; `src/sprites/SpriteTinter.js` (scratch canvas + `globalCompositeOperation`); `EnemyAnimationRules` `tinted` flags | Icy blue recolor while slowed | `ChillFrost`, `src/elements/looks/ChillFrost.js` | ChillFrost sheet (section 0) |
| A2 | TINT.flash (white overlay ×2); vector `#ffffff` fill | Enemy flashes white for a frame when hit | `HitFlash` look, `src/elements/looks/HitFlash.js` (or a sheet "hurt" clip) | Preferred: a 1–2 frame **hurt** frame per enemy sheet (basic, fast_body, tank, big_red, king_mole body/angry). Fallback: one shared "impact sparkle" overlay sheet, 3 frames, refBodyR 88. **Judgment call** |
| A3 | TINT.bossFlash; vector `#ff8a95` / mole `#c8a99b` | Boss blush on hit | Same as A2 | Covered by A2 hurt frames for big_red and king_mole |
| A4 | TINT.charge; `enemies.js:30` `charge` flicker | Big Red flickers red while charging | Big Red `charge` clip (already in the sheet) plus `ChargeGlow` look `src/bosses/looks/ChargeGlow.js` | "ChargeGlow" red speed-aura loop, 4 frames, anchor at body centre (or drop it if the charge clip reads well alone) |
| A5 | `enemy-fx.js:7-41` | Slam telegraph: red ring growing, dashed line to the tower, "!" | `SlamTelegraph`, `src/bosses/fx/SlamTelegraph.js` | Ring sheet (fill-up 8 frames, or one ring scaled), dashed line segment tile, "!" badge (2-frame pulse) |
| A6 | `enemy-fx.js:44-55` | Dizzy stars orbiting a stunned enemy | `DizzyStars` look, `src/elements/looks/DizzyStars.js` | 3-star orbit loop, 6 frames, anchor above head |
| A7 | `enemy-parts.js:7-12` `shadow()` (also the tower shadow at `tower.js:24`) | Soft ellipse ground shadow | `GroundShadow`, `src/render/GroundShadow.js` | `shadow_soft.png` ellipse, scaled per body |

### B. FX, particles and screen effects — 24 items
| # | Where | Looks like / when | Owner | Art ask |
|---|---|---|---|---|
| B1 | `effects.js:10-82`, kind `shockwave` (`game.js:201`) | White ring, Shockwave ability | `ShockwaveRing`, `src/fx/bursts/ShockwaveRing.js` | Ring expand one-shot, 8 frames |
| B2 | same, `freeze` (`game.js:206`) | Blue ring plus stars, Freeze ability | `FreezeBlast` | Ice ring and snowflake burst, 8 frames |
| B3 | same, `overdrive` (`game.js:209`) | Orange ring, Overdrive starts | `OverdriveBurst` | Orange ring, 8 frames |
| B4 | same, `slam` (`world.js:124`) | Red ring when the tower is hit | `SlamRing` | Red impact ring, 6 frames |
| B5 | same, `dirt` (`game.js:739,746`) | Dirt puff, mole dig/rise | `DirtPuff` | Dirt clod puff, 6 frames |
| B6 | same, `splash` (`world.js:161`) | Splash-damage ring | `SplashRing` | Orange splash ring, 6 frames |
| B7 | same, `hit` / crit (`world.js:115,140`) | Small hit star | `HitStar` | 4-frame hit star; crit variant |
| B8 | same, `kill` (`world.js:177`) | "Pow" star when an enemy dies | `KillPow` | Pow star, 6 frames |
| B9 | `effects.js:84-94`; `world.js:166` | Confetti rectangles | `ConfettiPiece`, `src/fx/ConfettiPiece.js` | Confetti sheet: 6 shapes × 4 flip frames |
| B10 | `projectiles.js:33-38` particle; `world.js:194-202` spawnHitSparks / explosion | Colored dots (enemy color) | `SparkParticle`, `src/fx/particles/SparkParticle.js` | Spark sprite; a neutral white plus 4 palette variants (no tinting) |
| B11 | `render.js:104-112` | Pulsing orange arc around the tower during Overdrive | `OverdrivePulse`, `src/fx/OverdrivePulse.js` | overdrive_aura loop, 6 frames |
| B12 | `FxRenderer.js:20-35` `glow()` (procedural radial gradient into an offscreen canvas) | Soft bloom used by all FX | `GlowSprite`, `src/fx/GlowSprite.js` | `glow_soft.png` (white core), plus one variant per element color |
| B13 | `FxRenderer.js:48-60` drawUnder | Tower ground aura (by tier) | `TowerAuraView`, `src/fx/TowerAuraView.js` | Aura ring loop per tier (3 variants), 6 frames |
| B14 | `FxRenderer.js:63-114` drawProjectiles | Comet tail behind shots, element colors | `ProjectileTrail`, `src/fx/ProjectileTrail.js` | Trail strip image (base + ember/frost/spark/venom) |
| B15 | `FxRenderer.js:117-158` drawArcs | Chain Spark bolts and arc-flash rings | `ChainBoltFx` plus `ArcFlash` | Bolt segment sheet (3 jagged variants × 2 frames), flash ring, 4 frames |
| B16 | `FxRenderer.js:162-177` drawTextGlows | Glow behind crit/bonus numbers | `TextGlow` (uses GlowSprite) | Covered by B12 |
| B17 | `FxRenderer.js:182-216` drawPool motes | Particle motes for bossKill, finaleWon, tierUp, elem* presets (`FxPresets.js:78-107`) | `MoteParticle` | Mote sprite set (round, star, flake, ember, venom drop) |
| B18 | `FxRenderer.js:217-260` drawStreaks | Speed streaks (`streakBurst`) | `StreakParticle` | Streak sprite, with an ink-outlined variant |
| B19 | `FxRenderer.js:264-290` drawPulses (ImpactSync) | Impact ring pulses | `ImpactPulse` | Ring sheet, 6 frames (can share B4) |
| B20 | `FxRenderer.js:294+` drawFlashes; `render.js:184-187` scene.flash | Full-screen white flash | `ScreenFlash`, `src/fx/ScreenFlash.js` | `flash_burst.png` (radial white). **Judgment:** a flat fill is not really art |
| B21 | `render.js:173-182` | Red radial vignette at low tower HP | `LowHpVignette`, `src/fx/LowHpVignette.js` | `vignette_red.png`, 9-slice or full-screen |
| B22 | `render.js:134-146` | Finale intro: the lawn dims | `FinaleDim`, `src/fx/FinaleDim.js` | Optional `vignette_dark.png`. **Judgment** |
| B23 | `text.js:22-52` FloatText kinds `coin` (spinning ellipse) and `crit` (starburst) | Coin icon next to "+N"; star behind crit numbers | `CoinPopText`, `CritPopText` (FloatText subclasses) | Coin spin, 6 frames; crit starburst, 1–2 frames. The number text stays text |
| B24 | `text.js:68-112` bossBanner | Yellow/ink hazard-stripe band, "BOSS" | `BossBanner`, `src/ui/canvas/BossBanner.js` | Banner band image (stripes) plus a slam-in, 4 frames. WAVE banner `text.js:54-65` is text only (**judgment**) |

Infrastructure only, not art: `src/fx/FxOverlay.js:15` is the menu FX canvas host.

### C. Enemies and bosses — 4 items
| # | Where | What | Owner | Art ask |
|---|---|---|---|---|
| C1 | `enemy-bodies.js:7-52` `vectorBody` | Vector fallback for basic, fast, tank and Big Red before sprites load | Delete. `EnemyView` draws nothing until loaded, like World 2 | none |
| C2 | `enemy-mole.js:7-119` `drawMole` | Vector King Mole fallback (mound, claws, crown, teeth) | Delete. `KingMoleView` sprite-only | none (sheets exist) |
| C3 | `primitives.js` outlined/eyes/star; `render.js:192+` `LST.draw` polygon/confetti/roundRect | Drawing helpers | Delete once nothing calls them | none |
| C4 | `enemy-parts.js:14-26` hpBar (also `enemyHud` for World 2) | Rounded HP bar with ink outline | `EnemyHpBar`, `src/ui/canvas/EnemyHpBar.js` | **Judgment:** keep as a bar, or a frame+fill 9-slice image |

The enemy views become `BasicView`, `FastView`, `TankView`, `BigRedView` and `KingMoleView` (`src/enemies/views/`). They replace the cartoon `enemy()`/`moleSprite` dispatch and the `e.type` frequency branches (`enemies.js:20-22`).

### D. Tower and projectiles — 3 items
| # | Where | What | Owner | Art ask |
|---|---|---|---|---|
| D1 | `themes/cartoon/tower.js:10-141` (shadow 24, cannon 28-37 with recoil, 8 bolts 41-46, body, highlight 51, face 57-130: eyes with look-follow, blink 74, `> <` squint 66, worried brows 95, cheeks 103, mouth O/wobble/smile 109, sweat drop 129) | The whole tower is vector art | `TowerView`, `src/tower/TowerView.js`, with `TowerFace` (`src/tower/TowerFace.js`) | **Tower sheet**, layered:<br>- base/body with bolts, cannon (separate layer, pivot at the joint, recoil 3 frames);<br>- face states: idle, blink (3 frames), fire "O", hurt squint, low-HP worried, sweat-drop loop (4 frames);<br>- pupil image;<br>- tier variants if tiers change the look;<br>- anchor at body centre; size about 2× R |
| D2 | `projectiles.js:10-31` | Yellow ball with speed lines | `ProjectileView`, `src/tower/ProjectileView.js` | Projectile sheet: normal (2-frame spin), crit, plus element variants ember/frost/spark/venom as separate art |
| D3 | `lawn.js:108-121` | Dashed range ring | `RangeRing`, `src/tower/RangeRing.js` | Ring image (dash pattern, scaled) or a tiled arc segment. **Judgment** |

### E. Backgrounds and map — 2 items
| # | Where | What | Owner | Art ask |
|---|---|---|---|---|
| E1 | `lawn.js:9-96` `buildGround` (offscreen procedural: mowed checker 19, tufts 30, pebbles 44, flowers 56, dirt patch, soft vignette) | Backyard lawn | `BackyardBackdrop`, `src/worlds/render/BackyardBackdrop.js` (mirrors BeachBackdrop) | `backyard_bg_a.png` at the beach_bg_a size and contract: cover-fit, centre dirt patch under the tower, 16 px overdraw margin |
| E2 | `src/themes/neon.js` (164 lines, 55 draw calls), `src/themes/pixel.js` (334 lines, 24), `FX_THEMES.neon/pixel` (`FxPresets.js:135-137`); reachable with `?style=` (`main.js:4-6`) | Two complete code-drawn alternate themes | **Pending Brian:** hidden behind a flag (off), out of the picker and `?style=` path, code kept | none while hidden |

### F. UI art (DOM) — about 75 items in 5 groups
| # | Where | What | Owner | Art ask |
|---|---|---|---|---|
| F1 | Inline SVG card icons: `upgrades.js:15-105` (12), `meta.js:16-30` (8), `traps.js:16-83` (8), element cards (5) | 33 card icons | `IconAtlas` plus `UiIcon` (`src/ui/IconAtlas.js`) | Icon sheet: 33 card icons at 96 px, `.q.png`. Recoloring through CSS `--accent` is a tint, so bake in the colors |
| F2 | `index.html` 19 SVGs (lines 31, 35, 36, 56, 63, 64, 68, 87, 91, 95, 109-112, 126, 134, 186, 191, 202); `ui.js:683-693` GEAR, ABILITY_ICON×3, EYE and LOCK; `CardFlip.js:71` | HUD and menu icons (heart, sound, music, settings, gear, speed, restart, abilities, eye, lock, trophy) | Same `IconAtlas` | UI icon sheet, about 16 icons at 64 px, plus on/off states for toggles |
| F3 | `style.css:61` | Coin icon (radial gradient) | `UiIcon("coin")` | Coin icon (can reuse the B23 frame 0) |
| F4 | `style.css` rarity and decoration gradients: 322-323, 551-552, 723-724 (rare/epic cards); 330, 576 (shimmer, sparkle); 514, 564, 732, 826, 857, 860, 1112 (stripes, locked, card back, codex unknown); 1150 (info back) | Card frames, shimmer, card backs | `CardFrame` CSS class backed by images (`assets/ui/`) | Card frame set: common, rare, epic, locked, back, codex-unknown, info-back; shimmer sweep strip; sparkle sprite |
| F5 | `style.css:533-534, 930, 978, 984` (unlock bar, conic ability cooldown, boss HP fill); 45 `box-shadow`s; about 20 keyframes | Bars and chunky button shadows | Stay CSS | **Judgment:** these are bars and button styling. The brief lets buttons stay CSS |

**Visual totals:** A 7, B 24, C 4, D 3, E 2, F 5 groups (about 75 icons or decorations). That is about 40 canvas visual objects plus the UI art.

---

## 2. Non-OO code inventory
| # | Where | Problem | Becomes (class, file) |
|---|---|---|---|
| N1 | `game.js` (843 lines), `Game extends World` | God class: run flow, shop, abilities, workshop, finale, results, boss events | Split up as below |
| N2 | `game.js:573-618` update, `620-650` step | String state machine (`this.state === "playing"` and so on) | `GameStateMachine` (`src/core/GameStateMachine.js`) plus `MenuState`, `PlayingState`, `CelebrateState`, `ShopState`, `VictoryState`, `GameOverState`, `PausedState` (`src/core/states/*.js`) |
| N3 | `game.js:189-216` useAbility | `if id === "shockwave" / "freeze" / "overdrive"` | `AbilitySystem` plus `Shockwave`, `Freeze`, `Overdrive` (`src/abilities/*.js`). The `ui.js:686-690` icon, name and description maps move onto these classes |
| N4 | `game.js` shop methods (open, price, take card, reroll, repair, mystery box, leave) | Mixed into Game | `ShopController` (`src/shop/ShopController.js`) |
| N5 | `game.js:699-715` onEnemyKilled | `e.type === "boss"`, plus the `{basic,fast,tank,boss}[e.type]` pitch map | `RewardRules` / `KillFeedback` (`src/core/KillFeedback.js`); pitch and bonus live on the enemy archetype |
| N6 | `game.js:720-838` onSlamWindup, onCharge, mole events, finale | Boss event handlers in Game | `BossEventRouter` (`src/bosses/BossEventRouter.js`) plus `FinaleController` |
| N7 | `game.js` results, best scores, workshop | Mixed in | `RunRecorder` (`src/core/RunRecorder.js`), `WorkshopController` |
| N8 | `world.js` (205), type branch at 70 | Spawning, damage, splash and FX spawning in one class | `EnemySpawner`, `DamageSystem` (`src/core/DamageSystem.js`), `FxSpawner` (`src/fx/FxSpawner.js`) |
| N9 | `entities.js` (519): `Enemy.updateBoss` 156-202, `type==="boss"` at 134, `isBoss` at 113 | Big Red is a type branch inside Enemy | `BigRed extends Enemy` (`src/bosses/BigRed.js`) |
| N10 | `entities.js` FloatText kinds 338, 345; Burst kinds; Particle, Confetti, Corpse, KingMole all in one file | One file for many entities, plus kind switches | One file each: `src/entities/*.js`, `src/bosses/KingMole.js`, FloatText and Burst subclasses (see B) |
| N11 | `Enemy.slowTimer` / `slowAmount` ad-hoc fields (`entities.js:116-127, 443`; `BossScript.js:27`) | Slow is not a StatusEffect, unlike frozen/burn/venom | `Chill` StatusEffect (`src/elements/Chill.js`). **Sim risk:** it must keep the exact tick order. Optional, and last |
| N12 | `render.js` Renderer | Theme dispatch, inline overdrive and finale, banner branches by state | `RenderPipeline` with ordered layer objects: `BackdropLayer`, `EnemyLayer`, `TowerLayer`, `FxLayer`, `HudCanvasLayer`, `OverlayLayer` |
| N13 | `themes/cartoon/*.js` via `LST.CartoonKit.methods` | Procedural object-literal theme assembly | Removed. Every visual is a view class (sections A–E) |
| N14 | `ui.js` (701): constructor 5-180 wires the DOM; inline `innerHTML` screens: start 202, results 277, workshop tabs 405-523, shop 587 | Screens built as strings inside one class | `Screen` base plus `StartScreen`, `ResultsScreen`, `ShopScreen`, `WorkshopScreen` (`CardsTab`, `UpgradesTab`, `DeckTab`, `CodexTab`), `PauseScreen`, `Hud`, `BossBar`, `Toast` (`src/ui/screens/*.js`) |
| N15 | `main.js:30-60` | Keyboard `switch` on `game.state` | `InputController` (`src/core/InputController.js`). Each state owns its key map |
| N16 | `meta.js:34-325` | IIFE singleton with closure state | `MetaStore` (`src/meta/MetaStore.js`) plus `SaveMigrations` |
| N17 | `audio.js:10-536`: module `let` state, SFX function table 123-396, music 409-500 | Procedural singleton | `AudioEngine`, `SfxLibrary` (one `Sfx` object per sound), `MusicSequencer` (`src/audio/*.js`) |
| N18 | `settings.js`, haptics | Singletons | `Settings`, `Haptics` classes |
| N19 | `upgrades.js` CARDS with `apply` closures plus `shopRules`; `traps.js`; `LST.cardById` | Data plus loose functions | `CardDefinition` / `CardRegistry`, `ShopRules`, `TrapCard` (`src/cards/*.js`) |
| N20 | `waves.js` | Object literal of curves | `WaveCurve` class |
| N21 | `config.js` LST.CONFIG, mutated at runtime by `CaptainCrabclaw.js:10,26` | Global mutable config | Frozen config plus per-archetype definitions in `EnemyRegistry`. No runtime writes |
| N22 | `WorldRenderers.js:24` sets static `LST.SheetRenderer.reduced` each frame; type-keyed maps | Static mutable flag | Pass a `RenderContext {reduced, low}`; `WorldRendererRegistry` class |
| N23 | `EnemyAnimationRules` keyed by type | Rules table outside the enemy views | Moved into each `EnemyView` |
| N24 | `FxRenderer` one class draws every FX kind | God renderer | Per-effect classes (section B). FxRenderer becomes a thin batcher |
| N25 | `pwa.js` | IIFE that builds an inline toast | `UpdateNotifier` using the `Toast` screen |
| N26 | `index.html` script-order loading on the global `LST` | Implicit dependencies | Keep the globals for now (no bundler). Order is documented per module. **Judgment** |

---

## 3. Conversion order (single PRs, after PR #5)
Each PR is shippable on its own. Each one: unit tests, the 4 sim hashes unchanged, design-review OO gate, PR Verifier PASS, Brian's yes to merge.

1. **PR 1: Status tints → looks, enemy overlays** (A1–A7).
   - Adds HitFlash (shared overlay), ChargeGlow, SlamTelegraph, DizzyStars, GroundShadow. (ChillFrost already ships in PR #5.)
   - Deletes SpriteTinter, TINT, spriteTint and the `tinted` rig flags.
   - Art: shared HitFlash overlay sheet (refBodyR 88, 2–3 frames, one-shot); ChargeGlow loop; telegraph ring, dash and "!"; dizzy stars loop; shadow PNG.
2. **PR 2: FX and particles** (B1–B24).
   - Adds the burst subclasses, ConfettiPiece, Spark/Mote/Streak particles, GlowSprite, TowerAuraView, ProjectileTrail, ChainBoltFx/ArcFlash, ImpactPulse, ScreenFlash, LowHpVignette, FinaleDim, CoinPop/CritPop text, BossBanner.
   - FxRenderer becomes a batcher.
   - Art: 8 burst one-shots, confetti sheet, spark/mote/streak sprites, glow PNGs, aura ×3 tiers, trail strips ×5, bolt and flash sheets, red vignette, flash, coin spin, crit star, boss banner band. (Biggest art ask; it could split into 2a bursts/particles and 2b glows/trails/screen.)
3. **PR 3: Enemies and bosses** (C1–C4, N9, N10 for enemies, N23).
   - Adds EnemyView subclasses, the BigRed and KingMole classes and EnemyHpBar.
   - Deletes vectorBody, drawMole and the primitives.
   - Art: none required. HP bar frame only if Brian wants bars as art.
4. **PR 4: Tower and projectiles** (D1–D3).
   - Adds TowerView/TowerFace, ProjectileView and RangeRing.
   - Art: layered tower sheet with face states, projectile sheet ×5 variants, range ring.
5. **PR 5: Backgrounds and map** (E1–E2).
   - Adds BackyardBackdrop.
   - Neon/pixel are already hidden behind `ThemeSelector.ALT_THEMES` (PR #5); their code stays until Brian decides (pending Brian). Removes the `themes/cartoon` leftovers and the `LST.draw` helpers.
   - Art: backyard_bg_a.
6. **PR 6: UI art** (F1–F4).
   - Adds IconAtlas/UiIcon and the CardFrame images.
   - Adds the `Bar` object (frame + fill images) for HP, boss HP, unlock and cooldown bars, late in this PR.
   - Art: 33 card icons, about 16 UI icons with toggle states, coin, card frame set, shimmer, sparkle, bar frames and fills.
7. **PR 7: Game flow** (N1, N2, N15). GameStateMachine plus State classes, InputController. Art: none.
8. **PR 8: Game systems** (N3–N8, N24, N12). AbilitySystem/abilities, ShopController, KillFeedback, BossEventRouter, FinaleController, RunRecorder, WorkshopController, EnemySpawner/DamageSystem/FxSpawner, RenderPipeline layers. Art: none.
9. **PR 9: UI screens** (N14, N25). Screen classes, Hud, BossBar, Toast, UpdateNotifier. Art: none.
10. **PR 10: Stores, services and data** (N16–N22, optionally N11). MetaStore, AudioEngine/SfxLibrary/MusicSequencer, Settings/Haptics, Card/Trap registries, WaveCurve, frozen config, RenderContext. Art: none.

The art PRs (1–6) are blocked on Game Art & Motion delivering. The logic PRs (7–10) need no art, so they can run while art is in production.

---

## 4. Main-only notes
- origin/main `70bff8c` still has the code-drawn LookKit looks (IceCrust 13 path calls, BurnFlames 2, SparkCrackle 3, VenomDrips 3, StatusLook 4) and `FxRenderer.drawStatusRings` (frozen disc, venom pips).
- PR #5 already deletes all of these and replaces them with image looks.
- No file exists only on main (diff main..PR #5: 102 deleted, 25 modified). Nothing is lost by basing on PR #5.

## 5. Other tower-defense repos under /workspace
None. The only TD code is clones of last-stand-tower:
- `oo-audit/last-stand-tower` (e7c2e4f);
- `art-audit/last-stand-tower` (e847cb8);
- `graphify-trial/last-stand-tower` (5e6b2c5).

`lst`, `lst2`–`lst4` are working folders, not repos. Other projects (bounce-arena, shardfall, blackhole_game, simple-pdf) are not TD. `awsumbtech/frontier-outpost` exists on GitHub (type unknown) and is not on the box.

## 6. Ambiguities / judgment calls (answered: see Decisions)
1. **Hit flash:** per-enemy hurt frames (more art, cleanest) or one shared HitFlash overlay sheet?
2. **Neon/pixel themes:** delete them, or commission two more full art sets?
3. **HP bars** (enemy, boss DOM bar, unlock bar, ability cooldown): keep as plain bars, or use image frames?
4. **Range ring:** image, or keep as a plain stroke because it is a UI indicator?
5. **Full-screen fills** (white screen flash, finale dim): plain alpha fills, or images?
6. **Text:** floating numbers and the WAVE banner are text (kept). Their ink outline and pop are text styling. Coin and crit decorations become art.
7. **CSS:** buttons' box-shadows and keyframes stay CSS. Card rarity gradients, stripes and shimmer become images (recommended).
8. **Particle colors:** particles are colored by `e.color`. Image art needs either a fixed palette of variants or neutral white art. Neutral white with a tint would break the no-tint rule, so use palette variants.
9. **Chill as a StatusEffect (N11):** cleaner, but touches sim tick order. It needs sim proof or should be skipped.
10. **Big Red charge:** is the existing `charge` sheet clip enough, or is a ChargeGlow overlay wanted?
