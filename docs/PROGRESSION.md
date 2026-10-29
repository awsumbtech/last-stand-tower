# Last Stand Tower: Progression Plan

One design to approve before Sprint 5. Nothing here is built yet. The goals are **longer, more fun levels** and progress that feels **earned**.

**Baseline** (chunked sim, Oct 29, `tools/out/baseline-*`; 120 fresh runs plus 16 four-hour campaigns): Big Red's kill rate is **100%** at every boss wave (830+ fights, 0 enrages, ~25–39 s waves). The **King Mole fight lasts 3.5–4 min** (median 207–225 s, max 317 s), and only 13% of attempts win. Campaign **runs take a median of 5–6 min**. Runs that reach the finale take 7.1–7.2 min, but **13–18% go past 10 min** (max 16.5). The first clear comes at about run 15, around 1.5 h.

## 1. Levels: one world = one 20-wave level in 4 acts
**Target:** a full run to the finale takes **9–10 min** (p90 ≤ 10, hard cap 12). Normal waves take about 25 s.

| Act | Waves | Beat |
|---|---|---|
| Build-up | 1–4 | Learn the world's enemy mix. Cards come fast. |
| Gate I | 5 | **Big Red**, then a **Supply wave** (6: half count, a chest with a rare+ card) |
| Rising | 7–9 | The new archetype enters (Sprint 5 enemies slot in here) |
| Gate II | 10 | Big Red + escorts, then Supply wave 11 |
| Siege | 12–14 | Denser waves, the screen-edge danger tint grows |
| Gate III | 15 | **Elite Big Red** (shield phase), then Supply wave 16 |
| Last stand | 17–19 | Peak pressure, with a "the ground is shaking…" foreshadow |
| Finale | 20 | **King Mole**, 3 phases, **2–3 min** |

- **Big Red becomes a real test.** Target kill rates are 85% at wave 5, 75% at wave 10 and 65% at wave 15. Enrage drops from 35 s to 25 s, the charge hits hard (~35% max HP), and boss HP exponent goes from 0.8 to 0.9. A kill drops a **Boss Chest**. An escape drops nothing.
- **King Mole stays under 10 min per run.** Cut his HP about 20% and add a **Frenzy at 150 s** (faster slams, no more burrowing), so every fight ends by ~3 min, win or lose.

## 2. Upgrades: two layers, each with a "moment"
- **In-run cards (this run's build).** Taking the same card 3 times **evolves** it: Multishot III adds a visible second barrel, Frost III gives an icy aura. The tower's look moves up 5 **visible tiers** based on build power, so a strong run *looks* strong.
- **Workshop (lasting).** Every 10 levels of an upgrade is a **tier milestone** with a named perk and a cosmetic (Power 10: glowing shots). Cards earn **Mastery stars** (★1–3) from wins that use them. Each star gives +2% to that card and a gold frame.
- Every unlock gets a **ceremony screen** (card flip + fanfare). No silent number bumps.

## 3. How each is earned
**Gears sources:** waves (2·w^1.3), boss waves cleared (+3), Big Red kills (scaled up to 5/8/12 for waves 5/10/15), world clear (250 first / 75 again), and one-time **Milestones** (first Big Red kill 20, first time reaching wave 15 30, first finale reached 40, no-repair clear 25, 10 cards mastered 100). Milestones live in a **Trophy shelf** next to the Codex.

| Ladder step | Target |
|---|---|
| First unlock (Multishot, 15 G) | end of run 1, ~6 min (today: 5–6 min ✓) |
| First Big Red kill + milestone | run 1–2 |
| All 8 cards | ~1.5 h (today: 84–89 min ✓) |
| King Mole first clear | ~10 runs, ~1.5 h (today: ~15 runs; better pacing, same time) |
| Beach (World 2) unlocks | on first clear |

## 4. Architecture: one owner per system
| Part | Owns |
|---|---|
| `EventBus` | Typed game events (kill, waveEnd, bossSlam, finaleWon). Parts listen. None call each other directly. |
| `LevelDirector` | Runs a world's `LevelPlan` (acts, beats, supply waves) and tells the scheduler what the next wave is |
| `WaveScheduler` | Builds spawn queues from a beat + `DifficultyCurve` + `EnemyRegistry` (today: `waves.js`) |
| `EnemyRegistry` | Archetypes made from behavior parts (Mover, Melee, Ranged, Shield, SplitOnDeath). **Sprint 5 enemies are new entries, not new code paths.** |
| `BossController` | `BossScript` subclasses (`BigRed`, `KingMole`): phases, enrage/frenzy timers, telegraphs (moved out of `game.js`/`entities.js`) |
| `RewardService` | The single source for every coin/Gear payout and chest (today spread across `game.js`/`meta.js`) |
| `ProgressionLedger` | Save state, Gears balance, lifetime stats and migrations (today: `meta.js` storage) |
| `UnlockTree` | Cards, abilities, worlds, tier milestones: costs and prerequisites |
| `MilestoneTracker` | Listens on the bus, awards one-time milestones through `RewardService` |
| `TowerEvolution` | Card evolutions and visible tiers. Themes render from it. |

The sim (`tools/sim.js` + `tools/simChunks.js`) drives the same parts. Every tuning step is checked against the baseline above.

## 5. Sprint 5 readiness (in order, once approved)
1. Extract `EventBus`, `RewardService` and `ProgressionLedger` with **no behavior change**. Proof: the chunked sim matches the baseline.
2. `LevelDirector` + Backyard `LevelPlan` (acts, Supply waves, chests). Check that runs hit 9–10 min.
3. `BossController`: tune Big Red to 85/75/65% and add the King Mole Frenzy. Check the fight stays ≤ 3 min and p90 run ≤ 10.
4. `MilestoneTracker` + Trophy shelf, `TowerEvolution` tiers, Workshop tier perks, Mastery stars.
5. `EnemyRegistry`, then Sprint 5: spitter, splitter, shielded, introduced in the Rising act.
