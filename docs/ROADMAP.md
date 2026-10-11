# Last Stand Tower: sprint roadmap (planning only)

**Target:** quick runs (5-8 min) inside a long journey. Gears unlock cards and lasting upgrades, six worlds raise the stakes, and Rebuild (prestige) is how you break through walls.
**Status:** Sprints 1, 2 and 3 are shipped (see below). The rest is a plan. All numbers were sanity-checked with `tools/sim.js` plus a campaign model (`plan-meta.js`, kept in the box's `balance-data/` folder). The model plays real runs with locked card pools, trap cards, world modifiers and Rebuilds.

## Sprint overview

| # | Sprint | Ships | Depends on |
|---|---|---|---|
| 1 ✅ | Results screen, Gears and locked cards | Run summary, Gears saved, Workshop with card unlocks, commons-only starter pool | none |
| 2 ✅ | Workshop upgrades and Head Start | Lasting stat upgrades, Head Start, save/version migration | 1 |
| 3 ✅ | Trap cards, Codex and Appraisal | 8 trap cards, discovery Codex, Appraisal upgrade | 1 (2 for Appraisal) |
| 4 | Boss fights and the active ability | Bosses stop at range and attack; Shockwave ability | none (best after 2) |
| 5 | New enemy types | Spitter, Splitter, Shielded (reskinned per world later) | 4 (ranged attack code) |
| 6 | Worlds 1-3 | World select, Backyard / Beach / Snowy Peak, world bosses, Gear multipliers | 1, 4, 5 |
| 7 | Rebuild (Cogs) and worlds 4-6 | Prestige layer, Spooky Swamp / Lava Factory / Space | 6 |

Each sprint ends with: the sim re-run (death wave and minutes per strategy, campaign milestones), a full-run headless test with no console errors, the SW `VERSION` bump, the README updated, and phone screenshots.

---

## Sprint 1: Results screen, Gears and locked cards (SHIPPED)
**Goal:** every run pays out something that lasts, and the first unlock arrives after run 1.

**Brian's decisions (Oct 10):** Multishot is locked too, as a very cheap first unlock. The starter pool is commons only (Damage, Fire Rate, Range, Max HP). The commons-only wall at wave 10 is fixed with a gentler early HP curve for the starter state. Keep 2-3 pure dud traps (Sprint 3). Monetization comes later, so Gears stay generous.

**Features**
- **Results screen** replaces game over. It shows: wave reached, best wave, time, kills, coins earned, score, cards taken (icon chips), and a **Gears breakdown** (waves + bosses) that counts up with a clink per step. It also shows the next unlock with a progress bar ("Next unlock: Lucky Shot, 35 Gears (you have 41)"). Buttons: **Workshop** (with a "!" badge when something is affordable) and **Play again**.
- **Gears (meta currency)**, saved in localStorage (`lst.meta.v1`, versioned). The formula:
  `Gears = floor((2 × wave^1.3 + 3 × bossWavesCleared) × worldMult × (1 + 0.1 × Cogs))` (worldMult = 1 and Cogs = 0 until Sprints 6-7)
  That's 42 at wave 10, 51 at wave 11, 62 at wave 13, 73 at wave 15 and 107 at wave 20.
- **Locked cards.** The starter pool is **Damage, Fire Rate, Range, Max HP** (commons only). Every rare and epic card is unlocked in the **Workshop**, in any order. They're listed cheapest first, and the cheapest is flagged as "next":

| Unlock order | Multishot | Lucky Shot | Regen | Frost Shots | Pierce | Vampire | Splash | Overcharge |
|---|---|---|---|---|---|---|---|---|
| Gears | **15** | 35 | 50 | 75 | 100 | 140 | 190 | 250 |

- **Starter assist (fixes the commons-only wall):** until Multishot is unlocked, enemy HP grows **+20% per wave instead of +25% for waves 1-10** (about 0.69× HP at wave 10). In practice this only affects the first run. Once Multishot is in, the normal curve applies.
- **Returning players:** an old save keeps its best wave (same `lst.bestWave` key). On the first load it also pays out a one-time Gears bonus for that best wave (for example, best wave 12 gives 62 Gears), so veterans can unlock Multishot straight away.
- Locked cards appear in the Workshop as dark silhouettes with a padlock, and their effect is shown so players can plan. Affordable cards glow. Unlocking plays a flip-and-sparkle reveal with a fanfare. The shop only deals unlocked cards.

**Acceptance criteria (re-tuned for the commons-only start) and measured results** (`node tools/sim.js --campaign`, 40 campaigns, 8 s per shop)
- First run (commons only + assist): casual **wave 11 in about 5 min**, skilled **wave 12-13 in about 5.5-5.8 min** (target 4-6 min). Before the assist it was a wall at wave 10 in about 4 min.
- The first unlock is affordable after run 1 in ≥ 90% of sim campaigns. **Measured: 100%** (even a wave-5 death pays 16).
- Run 1 usually pays for **Multishot and Lucky Shot** (51-62 Gears). Run 2 with Multishot reaches wave 15-16 (7-7.4 min).
- Results screen fits a 390×844 phone with no scrolling; Gears count up with a pop animation and sound.

| Unlock | Gears | Casual: after run (min played) | Skilled: after run (min played) |
|---|---|---|---|
| Multishot | 15 | 1 (5) | 1 (6) |
| Lucky Shot | 35 | 1 (6) | 1 (6) |
| Regen | 50 | 2 (12) | 2 (13) |
| Frost Shots | 75 | 3 (20) | 3 (21) |
| Pierce | 100 | 5 (30) | 4 (30) |
| Vampire | 140 | 7 (43) | 6 (42) |
| Splash | 190 | 10 (61) | 9 (61) |
| Overcharge | 250 | 14 (88) | 12 (85) |

(Sprint 1 only, so no Workshop stat upgrades or Head Start yet. Sprint 2 speeds up the back half.)

---

## Sprint 2: Workshop upgrades and Head Start (SHIPPED)
**Goal:** a steady sense of growth between card unlocks.

**Lasting stat upgrades** (level n+1 costs round(base × growth^n) Gears; all in `CONFIG.meta.upgrades`):

| Upgrade | Effect / level | Base | Growth | Max |
|---|---|---|---|---|
| Power | +5% damage (multiplies all damage, cards included) | 12 | 1.15 | 60 |
| Rapid | +3% fire rate | 12 | 1.17 | 30 |
| Armor | ~~+6% max HP~~ changed in Sprint 3: damage taken ×0.97 per level (see Sprint 3) | 14 | 1.2 | 35 |
| Bank | +15 starting coins | 15 | 1.30 | 15 |
| Greed | +4% kill coins | 20 | 1.22 | 25 |
| Sharp Eye | +1% crit chance | 25 | 1.25 | 15 |
| Head Start | start 5 waves later per level, capped at **70%** of your best wave (rounded down to a multiple of 5) | **30** | **1.4** | **10** |

- **Head Start, as built:** the skipped waves aren't free stats. Their shops are replayed as a quick **draft**: hand k pays wave k's coins (kills plus clear bonus, with Greed), deals a free pick, and sells extras at wave-k prices, exactly as if you had played it. **Auto-draft** finishes every hand but the last in one tap. Then you shop the last hand yourself and the run starts at wave N+1. Skipped boss waves count toward Gears. A chip on the start screen picks the start wave (tap to cycle: off, 5, 10 ... up to the max).
  - *Why not just hand over the coins and free picks?* In the sim that left Head Start towers much weaker than played ones, because extras get pricier every wave and they died 2-3 waves later.
  - *Why 70% and not 50%?* With a 50% cap each run still has to play half your best, so median runs drifted to 10-11 min after hour 4 (p90 11-12). At 70%, runs stay at 5-7.5 min.
- **Deck tab:** tap an unlocked card to **bench** it (max 2) so it stays out of the shop. You must keep at least one attack card and 3 cards in the deck.
- **Save versioning:** the save moved to `lst.meta` as `{ v: 2, ... }` with step-by-step migrations. The Sprint 1 save (`lst.meta.v1`) migrates automatically and is kept as a backup. Pre-Gears players still get their best-wave bonus, and `lst.bestWave` is unchanged.
- **Reset progress:** in Settings (a gear button on the start screen, or the pause menu). It needs a confirm and wipes Gears, unlocks, upgrades and best wave. Sound settings stay.
- **Workshop tabs** (Cards / Upgrades / Deck) fix the scrolling. Every tab fits 360×740, 375×667, 390×844, 844×390 and 1280×800 with no scrolling (667×375 landscape is within a few px).

**Acceptance criteria and measured results** (`node tools/sim.js --campaign --campaigns 8`; 10 h per campaign; 8 s per shop and 2 s per draft hand)

The model's spending policy: unlock the next card when affordable, then spend up to half of the rest on the cheapest upgrade (Head Start first whenever usable), saving the rest. Once every card is unlocked, everything goes to upgrades.

| | Casual | Skilled |
|---|---|---|
| All 8 cards unlocked | run 14, **1.2 h** | run 13, **1.17 h** |
| Wave 20 / 30 / 40 reached | 0.7 / 1.7 / 5.2 h | 0.5 / 1.5 / 5.0 h |
| Runs over 10 min in the first 10 h | 1 of 815 (10.3 min) | **0 of 768** (longest 9.9) |
| Median run length by hour 0-10 | 5.0-6.6 min | 5.4-7.4 min |
| Median start / death wave, hour 9-10 | wave 30 → 39 | wave 30 → 41 |

Target: all 8 cards by about 1.3 h (run 14-16), and no run in the first 10 h over 10 min. **Met** (one casual run at 10.3 min).

Note: in the Backyard alone, best waves level off around 40-45 by hour 10. That's where worlds (Sprint 6) and Rebuild (Sprint 7) take over.

---

## Sprint 3: Trap cards, Codex and Appraisal (SHIPPED)
**Goal:** reading cards becomes a skill. Traps are fair, funny and learnable.

**Armor change (Brian, Oct 10).** Armor is now damage reduction instead of +6% max HP:
`reduction = min(65%, 1 − 0.97^level)`, max level 35, cost `round(14 × 1.2^n)` Gears.
Level 5 → −14%, 10 → −26%, 15 → −37%, 20 → −46%, 25 → −53%, 30 → −60%, 35 → −65% (cap). The Workshop shows the
current and next %. **Migration (save v2 → v3):** Armor levels up to 35 are kept; Gears paid for levels above 35
(at the old `10 × 1.15^n` prices) are refunded, and the start screen explains the change once.

*Tuning (`node tools/sim.js --upgrade-check --gears N`: the whole budget on one upgrade, skilled bot, all cards, 30 runs, median death wave):*

| Budget | None | Power only | Armor only | Balanced | Balanced without Armor |
|---|---|---|---|---|---|
| 1,500 Gears | 14 | 26 (L21) | 21 (L17) | 31 | 30 |
| 4,000 Gears | 14 | 28 (L28) | 29 (L22) | 38 | 32 |

The first try (base 12, growth 1.17) made Armor-only reach wave 38 at 4,000 Gears versus 28 for Power, and pushed
late campaign runs to a 10 min median, so the price curve was raised. Now it's on par with Power: worth buying, not a must.

**Rules (as built)**
- **When they appear:** from the shop after wave 4 onward (`CONFIG.traps`). Each deal has a **20%** chance that one slot becomes a trap. Never more than one per deal, and a trap never replaces the guaranteed attack card or the boss-wave Rare slot. Each trap can be taken once per run. Traps are never locked or benched.
- **Cost:** the same as any card (free pick or paid extra), dealt at Common/Rare/Epic like normal cards. The tell is the wording plus a tiny grey italic line of fine print where normal cards show their stat line.
- **Discovery:** the first time you take a trap, it flips over at the end of the next wave ("Wait a minute…", card flip, **GOTCHA!** stamp, sad-trombone sting, haptic buzz) with its real effect and a lesson. It goes into the **Codex**. If the run ends first, the results screen lists it as "New in the Codex". After that, copies in the shop show an **eye icon** and their real effect in red. Mystery Box is discovered as soon as you open it.
- **Codex tab** (4th Workshop tab): all 12 cards you've been dealt plus the 8 traps (striped "???" until found, "GOTCHA" stamp once found). Tap one for its real effect and lesson tip. It fits 320×568 up to desktop and 667×375 / 844×390 landscape with no scrolling.
- **Appraisal** (Workshop upgrade, fixed prices):
  - **L1, 40 Gears:** cursed cards (Glass Cannon, Big Bertha, Piggy Bank, Overclock, Mystery Box) wobble with a purple glow. The duds don't, so you still have to read.
  - **L2, 120 Gears:** the fine print is shown in full on every trap.
  - **L3, 300 Gears:** a **Return** button in the shop gives back a trap taken this shop or the one before: coins refunded, or a free reroll if it was the free pick. The effect is undone.
- Head Start's Auto-draft skips traps you already know (unknown ones can fool it, like they fool you).

**The 8 trap cards (final effects)**

| Card | Shown as | Type | Card says | Fine print | Really does | Lesson |
|---|---|---|---|---|---|---|
| **Glass Cannon** | Epic | Cursed | +35% damage! | hull made of glass | +35% damage; max HP ×0.6 (current HP too) | Only worth it with Regen, Vampire or lots of Armor |
| **Big Bertha** | Rare | Cursed | +80% damage per shot | heavy shells, slow reload | +80% damage per shot, −45% fire rate, −30% shot speed | DPS = damage × rate; 1.8 × 0.55 ≈ 1 |
| **Long Shot** | Common | **Dud** | +90 range | -15% dmg | +90 range, −15% damage | More range only helps if enemies are out of reach |
| **Thorns** | Rare | **Dud** (for now) | Enemies touching the tower take 300% of their HP | on contact | nothing: enemies already pop on contact. Sprint 4: reflects 25% of boss slam damage | Ask what it changes |
| **Overclock** | Rare | Delayed cost | +40% fire rate | may overheat | +40% fire rate for 3 waves, then −20% for the rest of the run | Great for a boss wave, a trap early |
| **Hot Streak** | Common | Build-dependent | Crits hit x3! | cools your other shots | crits ×3 instead of ×2, every shot −15% damage (−7% DPS at 10% crit, a gain with Lucky Shot) | Crit bonuses need crit chance first |
| **Piggy Bank** | Rare | Cursed / meta | +40% Gears this run | savings come out of your shells | −3% damage; ×1.4 Gears at the end (own row on the results screen) | A weaker run for faster Workshop progress |
| **Mystery Box** | Epic | Gamble | Could be anything! | no refunds | becomes a random card: 50% Common, 25% Rare/Epic, 25% another trap | Usually worse than picking a good card |

The two pure duds are Long Shot and Thorns (Brian: 2-3 read-carefully lessons). Changes from the plan: Glass Cannon
+60% → +35% (it was +4 waves *better* than skilled play), Hot Streak got a real cost (it was free), Piggy Bank −15% →
−3% damage (the lost pick already costs a wave), Mystery Box odds 55/30/15 → 50/25/25.

**Acceptance criteria and measured results**

`node tools/sim.js --favor --traps-only --runs 150`: the skilled bot (which never takes traps) against the same bot
taking trap X, forced into the first deal from wave 4 (mean death wave over 150 seeded runs):

| | Mean wave | vs skilled |
|---|---|---|
| skilled (no traps taken) | 14.25 | |
| Glass Cannon | 14.55 | **+0.3** (cursed, not useless) |
| Piggy Bank | 12.29 | **−2.0** (plus 40% more Gears) |
| Mystery Box | 13.51 | −0.7 |
| Thorns | 13.06 | −1.2 |
| Long Shot | 12.26 | −2.0 |
| Hot Streak | 12.31 | −1.9 |
| Overclock | 11.47 | −2.8 |
| Big Bertha | 11.26 | −3.0 |

Glass Cannon is above −2 as planned. Piggy Bank sits right on −2.0, which is the price of a lost pick (Thorns, −1.2) plus a small damage cut,
paid back in Gears. The rest cost 1-3 waves, except Mystery Box at −0.7 (a coin flip, about one median wave).
The full `--favor` run (all 12 cards plus the 8 traps, 60 runs) is in the same range: cards from −5 to +1 against skilled.

*Cost to the run:* all cards unlocked, 150 runs, traps on vs off: casual 14.8 → 12.1 mean (7.1 → 5.1 min), skilled
15.8 → 14.3. On the first run (starter cards only): casual 11.0 → 10.3 (4.9 → 4.4 min), skilled 12.1 → 11.8. In the
campaign model the casual bot learns like a player: it skips traps already in its Codex, and all traps once it has Appraisal L2.

*Campaign* (`--campaign --campaigns 8`, 10 h, with Armor, traps, Codex learning and Appraisal; the bot buys Appraisal as a cheap upgrade):
| | Casual | Skilled |
|---|---|---|
| First run | wave 11, 5.1 min, 62 Gears | wave 12, 5.3 min, 56 Gears |
| All 8 cards unlocked | run 15, 1.23 h | run 14, 1.2 h |
| Wave 20 / 30 / 40 / 50 reached | 0.7 / 1.7 / 3.5 / 7.0 h | 0.6 / 1.6 / 3.7 / 9.4 h |
| Median run length by hour 0-10 | 4.8-7.8 min | 5.4-9.1 min |
| Runs over 10 min in the first 10 h | 20 of 742 (max 11.1) | 10 of 677 (max 10.9) |
| Median start / death wave, hour 9-10 | 35 → 49 | 35 → 49 |

Card unlock timing is unchanged from Sprint 2. Best waves by hour 10 are higher (49 vs 39-41), mostly from damage-reduction
Armor stacking with Regen and Vampire, so late runs are longer: skilled medians reach 8-9 min after hour 7 (Sprint 2: 5.4-7.4)
and 2-3% of runs go past 10 min. Still inside the 5-10 min target, but it's the number to watch. Sprint 4's boss slams
(which hit hard, so Armor matters there) are the natural place to re-check it, or raise the Head Start cap.

---

## Sprint 4: Boss fights and the active ability
**Goal:** bosses become events instead of a damage tax. Live sim today: bosses are killed only about 0.3 times per run.

- **Boss behavior:** the boss walks to **range 170** and stops. Every 3.0 s it does a telegraphed slam (a 0.8 s wind-up with a red ring) for 18 × wave damage multiplier, and it spawns 2 minions every 6 s. The tower **auto-targets the boss when no enemy is within 120 units**. Boss HP goes from 250 to **900** (× wave HP multiplier) to give it about 8-12 s of fight time. Killing it pays +3 Gears and +25 coins. Keep the boss intro banner and the hit-stop on kill.
- **Active ability: Shockwave** (starter, free). A big button by the HUD: it knocks enemies back 120 units and stuns them for 1.5 s, cooldown 25 s, and charges up during waves. Later Workshop unlocks (150 / 250 Gears): **Freeze** (slows everything 60% for 4 s) and **Overdrive** (2× fire rate for 5 s). You equip one at a time.

**Acceptance criteria:** the sim adds a boss-fight model plus a "uses the ability on cooldown" bot. Bosses get killed in at least 70% of boss waves the player survives, and median death waves stay within ±1 of Sprint 3. Works with one thumb on a phone.

---

## Sprint 5: New enemy types (spitter, splitter, shielded)
**Goal:** variety that rewards specific cards. Mixed in from wave 6 in the Backyard, then reskinned per world.

| Enemy | HP / speed (× basic) | Behavior | Counter card |
|---|---|---|---|
| **Spitter** | 1.2× / 0.8× | Stops at range 260 and shoots a goo blob every 2.5 s for 4 × wave damage multiplier | Range, Pierce |
| **Splitter** | 1.5× / 0.9× | Splits into 2 mini-splitters (35% HP each) on death | Splash, Multishot |
| **Shielded** | 1.0× / 0.8× | A shield of 50% HP blocks the first hits; −50% damage from crits until it breaks | Damage, Frost |

- Wave mix weights (from wave 6): basic 6, fast 4, tank 3, spitter 1.5, splitter 1.5, shielded 1.5 (each capped as now).
- With spitters chipping HP, Max HP, Regen and Repair matter even more.

**Acceptance criteria:** the sim shows no strategy losing more than 2 median waves compared with Sprint 4, and the `--favor` spread across cards stays within ±4 waves.

---

## Sprint 6: Worlds 1-3 and world select
**Goal:** the long-journey map. A run happens inside one world; worlds unlock in order.

- **World select** on the start screen: cartoon map cards with a palette preview, the best wave, the Gear multiplier and the lock condition.
- **Unlocking:** survive **wave 20** (the world boss wave) in the previous world. Each world scales enemy HP ×H and damage ×D, and pays Gears ×G.

| # | World | Palette | Signature enemies / mechanic | World boss (wave 20) | H / D / G |
|---|---|---|---|---|---|
| 1 | **Backyard** | Lawn greens, flowers | Basics, spitter/splitter/shielded as garden bugs | **King Mole** burrows and pops up closer | 1 / 1 / 1 |
| 2 | **Beach** | Sand, turquoise, coral | **Hermit Crab** (shielded, shell regrows once), **Seagull** (fast flyer, immune to slow) | **Captain Crabclaw** lobs coconuts from range | 2.5 / 1.2 / 1.6 |
| 3 | **Snowy Peak** | White, ice blue, pine | **Snowball** (splitter that grows while rolling), **Blizzard** waves (−20% range) | **Abominable Snowman**: snowball barrage slows fire rate | 6 / 1.4 / 2.5 |

**Acceptance criteria:** each world has its own background palette in the cartoon theme, the signature enemies, the boss, music key/tempo variants and the Gear multiplier on the results screen. Campaign sim: **World 2 at about 1.6 h (run ~16) and World 3 at about 4.8 h**.

---

## Sprint 7: Rebuild (Cogs) and worlds 4-6
**Goal:** the late-game loop.

- **Rebuild** unlocks once **World 3** is reached. Your Cog total is `floor((lifetime Gears / 300)^0.6)`, and Rebuilding raises your Cogs to that total (only offered when the gain is at least 1.5× your current Cogs, and at least 2).
  - **Each Cog:** +10% damage, +10% max HP, +10% Gears.
  - **Resets:** the Workshop stat levels, Head Start and banked Gears.
  - **Keeps:** card unlocks, worlds, best waves, the Codex, Appraisal and abilities.

| # | World | Palette | Signature | World boss | H / D / G |
|---|---|---|---|---|---|
| 4 | **Spooky Swamp** | Purple dusk, green glow | **Ghost** (phases out 1 s of every 3), **Spitter Frog** | **Bog Witch** summons and teleports | 15 / 1.6 / 3.8 |
| 5 | **Lava Factory** | Orange, dark metal | **Shield Drone** (shield regenerates), **Conveyor lanes** (+30% speed on belts) | **Furnace Golem**: armored phases, slam | 38 / 1.8 / 5.5 |
| 6 | **Space** | Navy, stars, pastel planets | **UFO** (steals 5 coins on contact), **Asteroid** splitter, low gravity knockback | **Mothership**: 3 phases | 100 / 2.0 / 8 |

**Acceptance criteria:** campaign sim (skilled, with Rebuild) reaches **World 4 at about 7.5 h, World 5 at about 9.5 h, World 6 at about 11.5 h, and beats Space at about 12.5 h**, using 4-5 Rebuilds. Without Rebuild the model stalls in World 4 (about 19 h), so Rebuild is required, not optional.

---

## Economy check (sim results)

(Planning numbers from before Sprint 1. The shipped Sprint 1 numbers are in the Sprint 1 section.)

The campaign model plays real seeded runs with the starter pool, unlocks, 20% trap duds, world modifiers, Head Start and Rebuild. It assumes 6 s per shop and medians of 4 campaigns.

| Milestone | Skilled | Casual | Skilled, no Rebuild |
|---|---|---|---|
| Gears per run, runs 1-3 | 51-88 | 62-76 | 67-76 |
| First unlock (Multishot, 15) | run 1 (6 min) | run 1 | run 1 |
| 3 unlocks | run 2 (0.2 h) | run 2 | run 2 |
| All 8 base cards | run 14 (1.3 h) | run 17 (1.4 h)* | run 16 (1.3 h) |
| World 2 Beach | run 16 (1.6 h) | run 22 (1.9 h)* | run 17 (1.6 h) |
| World 3 Snowy Peak | 4.8 h | 4.7 h* | 4.4 h |
| First Rebuild | 5.0 h | 5.1 h* | n/a |
| World 4 Swamp | 7.5 h | 12.2 h* | 19.4 h |
| World 5 Lava | 9.5 h | 19.6 h* | stalls |
| World 6 Space | 11.5 h | 22 h* | stalls |
| Beat Space | 12.5 h | 27 h* | stalls |

\* The casual column comes from the earlier, steeper Cog curve (sqrt, 2× gain to Rebuild). With the final curve, expect casual players at about 1.5-2× the skilled times.

## Risks and open questions for Brian

1. **Unlocking more cards can make runs weaker.** In the sim, the 5-card starter pool reaches the same wave as the full 12-card pool, because rare cards water down the Multishot and Damage draws. Sprint 2's "bench up to 2 cards", Workshop stat upgrades and world difficulty keep unlocks feeling like progress. Is benching OK, or would you rather new cards come in at a lower weight for a few runs?
2. ~~Pure dud traps~~ **Decided:** keep 2-3 pure duds (Thorns, Long Shot, plus at most one more) as "read carefully" lessons in Sprint 3; the rest are cursed cards with real upside.
3. ~~Monetization~~ **Decided:** later. Gears stay generous for now; a "double Gears" button could slot into the results screen later without changing the formula.
