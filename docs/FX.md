# Effects (FX) pass

Effects are their own layer. The game only **emits events**; effects **listen**. Gameplay,
balance and the simulator are untouched (`tools/sim.js` loads the EventBus but no FX code;
seeded A/B sims are byte-identical to main).

## Parts (src/core, src/fx)

| Part | Job |
| --- | --- |
| `core/EventBus.js` | `LST.EventBus` + `LST.EVENTS` (RUN_START, WAVE_START/END, KILL, CRIT, BOSS_KILLED, BOSS_SLAM, FINALE_WON, CARD_TAKEN, WORKSHOP_UPGRADE, UNLOCK). `game.events` |
| `fx/FxDirector.js` | Subscribes to events, owns every part below, exposes `LST.fxDirector` |
| `fx/ParticlePool.js` | Fixed-capacity typed-array pool, hard cap, recycling, no per-frame allocation (world 240 + screen 60 = 300) |
| `fx/FxPresets.js` | Data only: emitter presets (`streakBurst`, `aura`, `trail`, `glow`), impacts, per-theme looks, quality caps |
| `fx/Emitter.js` | Burst (radial spokes) and rate stream |
| `fx/ImpactSync.js` | One call = bass thump + streak burst + ring/bloom + flash + shake, same frame; logs frames for QA |
| `fx/TowerAura.js` | Motes drifting up from the tower, scaled by run cards (rarity-weighted) + Workshop levels |
| `fx/FxRenderer.js` | Theme-aware drawing (cartoon: screen blend + ink; neon: additive; pixel: square motes) |
| `fx/FxCamera.js` | Shake + impact pulse slots |
| `fx/FxOverlay.js`, `fx/ScreenAnchors.js` | Click-through canvas above the shop / Workshop, bursts at the card or button |
| `fx/FxQuality.js` | Reduced motion (OS setting, `?motion=0`, or Settings > Shake & flashes) and the auto low-quality fallback (`?fx=low`) |
| `fx/FrameStats.js` | Frame and draw time log: `LST.fxDirector.report()` |

`?fx=off` runs the game with no effects (A/B checks).

## Event routes (`LST.FX_ROUTES`)

Which game events fire an impact is data in `src/fx/FxPresets.js`. Card picks
(all rarities), Workshop upgrades and unlocks are routed to `null`: no burst,
bass hit or flash (Brian, Nov 1 2026). Their original UI sounds in game.js are
unchanged. Kills, boss kills, projectile glow/streaks and the tower aura stay on.
Set a route back to a preset name in `FX_IMPACTS` to re-enable it.
