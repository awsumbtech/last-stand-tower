# Last Stand Tower: sprint roadmap (planning only)

**Target:** quick runs (5-8 min) inside a long journey. Gears unlock cards and lasting upgrades, six worlds raise the stakes, and Rebuild (prestige) is how you break through walls.
**Status:** this is a plan only. The live game is unchanged. All numbers were sanity-checked with `tools/sim.js` plus a campaign model (`plan-meta.js`, kept in the box's `balance-data/` folder). The model plays real runs with locked card pools, trap cards, world modifiers and Rebuilds.

## Sprint overview

| # | Sprint | Ships | Depends on |
|---|---|---|---|
| 1 | Results screen, Gears and locked cards | Run summary, Gears saved, Workshop with card unlocks, starter pool | none |
| 2 | Workshop upgrades and Head Start | Lasting stat upgrades, Head Start, save/version migration | 1 |
| 3 | Trap cards, Codex and Appraisal | 8 trap cards, discovery Codex, Appraisal upgrade | 1 (2 for Appraisal) |
| 4 | Boss fights and the active ability | Bosses stop at range and attack; Shockwave ability | none (best after 2) |
| 5 | New enemy types | Spitter, Splitter, Shielded (reskinned per world later) | 4 (ranged attack code) |
| 6 | Worlds 1-3 | World select, Backyard / Beach / Snowy Peak, world bosses, Gear multipliers | 1, 4, 5 |
| 7 | Rebuild (Cogs) and worlds 4-6 | Prestige layer, Spooky Swamp / Lava Factory / Space | 6 |

Each sprint ends with: the sim re-run (death wave and minutes per strategy, campaign milestones), a full-run headless test with no console errors, the SW `VERSION` bump, the README updated, and phone screenshots.

---

## Sprint 1: Results screen, Gears and locked cards
**Goal:** every run pays out something that lasts, and the first unlock arrives after run 1.

**Features**
- **Results screen** replaces game over. It shows: wave reached, time, kills, cards taken (icons), coins earned, and a **Gears breakdown** (waves + bosses + world bonus), plus best wave and "next unlock: Lucky Shot, 25 Gears (you have 67)". Buttons: **Play again** and **Workshop**.
- **Gears (meta currency)**, saved in localStorage (`lst.meta.v1`). The formula:
  `Gears = floor((2 × wave^1.3 + 3 × bossWavesCleared) × worldMult × (1 + 0.1 × Cogs))`
  That's about 46 at wave 10, 76 at wave 15 and 110 at wave 20 in the Backyard.
- **Locked cards.** The starter pool is **Damage, Fire Rate, Range, Max HP + Multishot**. Multishot stays in the starter pool because without it every commons-only run hits a wall at wave 10 (about 4 min) and there's nothing to decide. The rare and epic cards are unlocked in the **Workshop** for Gears:

| Unlock | Lucky Shot | Regen | Frost Shots | Pierce | Vampire | Splash | Overcharge |
|---|---|---|---|---|---|---|---|
| Gears | 25 | 45 | 70 | 100 | 140 | 190 | 250 |

- **First-run balance (Backyard):** enemy HP growth goes from 0.25 to **0.26** to compensate for the smaller pool. Everything else stays as live.
- Locked cards appear in the Workshop as silhouettes with their effect shown, so players can plan.

**Acceptance criteria**
- Sim with the starter pool and 20% traps: casual players reach **wave 14 in about 5.9 min** and skilled players **wave 15 in about 6.3 min**.
- The first unlock is affordable after run 1 in ≥ 90% of sim campaigns. Measured: 100%, run 1.
- Results screen fits a 390×844 phone with no scrolling; Gears count up with a coin-pop animation and sound.

---

## Sprint 2: Workshop upgrades and Head Start
**Goal:** a steady sense of growth between card unlocks.

**Lasting stat upgrades** (cost = round(base × growth^level)):

| Upgrade | Effect / level | Base | Growth | Max |
|---|---|---|---|---|
| Power | +5% damage | 12 | 1.15 | 60 |
| Rapid | +3% fire rate | 12 | 1.17 | 30 |
| Armor | +6% max HP | 10 | 1.15 | 60 |
| Bank | +15 starting coins | 15 | 1.30 | 15 |
| Greed | +4% kill coins | 20 | 1.22 | 25 |
| Sharp Eye | +1% crit chance | 25 | 1.25 | 15 |
| Head Start | start 5 waves later per level (capped at 50% of your best in that world), with the coins and free picks of the skipped waves | 60 | 1.5 | 8 |

- A small "Deck" panel in the Workshop lists the unlocked cards and lets you **bench up to 2** of them (see risk 1).
- Save-data versioning and migration, plus a "reset progress" option in settings.

**Acceptance criteria:** the campaign sim shows all 7 card unlocks by **about 1.3 h** (run 14-16), and no run in the first 10 h takes more than 10 min (Head Start keeps late runs at 6-9 min).

---

## Sprint 3: Trap cards, Codex and Appraisal
**Goal:** reading cards becomes a skill. Traps are fair, funny and learnable.

**Rules**
- **When they appear:** from wave 4 onward. In each deal, a **20%** chance that one slot becomes a trap. Never more than one per deal, and a trap never replaces the guaranteed attack card or the boss-wave Rare slot.
- **Cost:** traps cost the same as any card. They can be your free pick (which is the trap) or bought as an extra. They are dealt at Common/Rare/Epic rarity like normal cards. The only tell is the wording plus a tiny fine-print line in grey.
- **Discovery:** the first time you take a trap, it flips over at the end of the next wave with a "Gotcha!" sting and gets a stamp in the **Codex**, the card collection in the Workshop that shows every card you've seen. Once a trap is in the Codex, future copies show a small **eye icon**.
- **Appraisal** (Workshop):
  - **L1, 40 Gears:** cursed cards get a purple wobble.
  - **L2, 120 Gears:** fine print is shown in full.
  - **L3, 300 Gears:** you can **return** a trap within one wave for a full refund (a free pick returns as a free reroll).

**Sim check:** traps modeled as duds in 20% of deals cost about 1 median wave (casual 16 → 15, skilled 16 → 15). Part of that is simply one fewer real option per deal. The casual bot takes traps at random; the skilled bot never does. The real traps are designed to widen that gap: knowledge, not luck.

**The 8 trap cards**

| Card | Shown as | Type | Exact effect | Why it's a trap / what it teaches |
|---|---|---|---|---|
| **Glass Cannon** | Epic | Cursed | +60% damage; max HP ×0.6 (current HP scaled too) | Real upside for runs with Regen or Vampire, deadly otherwise. Teaches you to weigh survival. |
| **Big Bertha** | Rare | Cursed | +80% damage per shot, −45% fire rate, shot speed −30% | 1.8 × 0.55 = 0.99, so no DPS gain and more overkill on small enemies. Teaches DPS = damage × rate. Good with Splash. |
| **Long Shot** | Common | Context dud | +90 range, −15% damage | Enemies spawn within 520 units, so past about 400 range it does nothing (less on phones). Teaches you to look at the screen. |
| **Thorns** | Rare | Pure dud (for now) | Enemies touching the tower take 300% of their HP | Enemies already die when they crash, so it does nothing. It becomes real once bosses melee-slam in Sprint 4 (reflects 25% of slam damage), which rewards remembering it. |
| **Overclock** | Rare | Delayed cost | +40% fire rate for 3 waves, then −20% fire rate for the rest of the run (fine print: "overheats") | Great for getting through a boss wave, a trap if you take it early. Teaches timing. |
| **Hot Streak** | Common | Build-dependent | Crits deal +50% damage | Worth about +5% at the base 10% crit; good with Lucky Shot ×3+. Teaches synergy. |
| **Piggy Bank** | Rare | Cursed / meta | −15% damage for the run; +40% Gears at the end | A true choice: a weaker run for faster meta progress. Bad when you're chasing a world unlock. |
| **Mystery Box** | Epic | Gamble | Becomes a random card: 55% Common, 30% Rare/Epic, 15% another trap | Fun; the odds are printed once it's in the Codex. |

**Acceptance criteria:** each trap has a Codex entry and a one-line "lesson" tip. The sim's `--favor` check with each trap shows only Piggy Bank and Glass Cannon above a −2 wave penalty (they are cursed, not useless). The rest cost 1-4 waves.

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

The campaign model plays real seeded runs with the starter pool, unlocks, 20% trap duds, world modifiers, Head Start and Rebuild. It assumes 6 s per shop and medians of 4 campaigns.

| Milestone | Skilled | Casual | Skilled, no Rebuild |
|---|---|---|---|
| Gears per run, runs 1-3 | 51-88 | 62-76 | 67-76 |
| First unlock (Lucky Shot, 25) | run 1 (6 min) | run 1 | run 1 |
| 3 unlocks | run 2 (0.2 h) | run 2 | run 2 |
| All 7 base cards | run 14 (1.3 h) | run 17 (1.4 h)* | run 16 (1.3 h) |
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
2. **Pure dud traps** (Thorns, Long Shot) are the most likely to feel cheap. Should traps be **cursed-only** (always some upside), or keep 2-3 pure duds as "read carefully" lessons?
3. **Monetization direction:** rewarded ads ("double Gears" on the results screen, or one revive per run) or a one-time premium unlock? This changes how generous the Gears formula should be, so it's best decided before Sprint 1.
