# Last Stand Tower

A small "last stand" tower defense game for the browser, in a chunky cartoon style. Your tower (it has a face!) sits in the middle of a lawn and fires on its own at enemies closing in from every side. Survive each wave, then pick an upgrade card before the next one.

**[Play it here](https://awsumbtech.github.io/last-stand-tower/)** (works on desktop and mobile, installable, plays offline)

**[Art style preview](https://awsumbtech.github.io/last-stand-tower/styles.html)**: the same scene in neon, pixel art, and cartoon styles (cartoon is the game's look).

![Gameplay screenshot](docs/screenshot.png)

## How to play

- Press **Start**. The tower aims and shoots by itself.
- Enemies that reach the tower damage it. If its HP hits zero, the run is over.
- Kills give coins. After every wave the **shop deals 3 cards**:
  - **Take one for free.** You have to pick one before the next wave starts.
  - **Want more?** Each extra card from the same deal costs coins, and the price doubles for every extra you buy in that shop. Prices also rise with the wave.
  - **Reroll** re-deals the cards you haven't taken (coins, doubling per reroll).
  - **Repair** heals 40% of max HP for coins (rising per repair).
  - Every deal has at least one attack card, and after a boss wave at least one card is Rare or better.

Your first run uses the four **starter cards** (Damage, Fire Rate, Range, Max HP). The other cards are unlocked
with **Gears** in the Workshop (see below), and the shop only deals cards you've unlocked.

| Card | Rarity | Effect (per level, max) | Unlock |
| --- | --- | --- | --- |
| Damage | Common | +30% of base damage (no cap; additive so it can't snowball) | starter |
| Fire Rate | Common | +10% shots per second (max 12) | starter |
| Range | Common | +20 range (max 6) | starter |
| Max HP | Common | +30 max HP and heals 30 (max 15) | starter |
| Multishot | Rare | +1 target per volley (max 4) | 15 Gears |
| Lucky Shot | Rare | +7% crit chance (max 5) | 35 Gears |
| Pierce | Rare | Shots pass through +1 enemy (max 2) | 100 Gears |
| Frost Shots | Rare | Hits slow enemies by 15% more, bosses half as much (max 3) | 75 Gears |
| Regen | Rare | +0.5% max HP per second during waves (max 4) | 50 Gears |
| Splash | Epic | Hits blast nearby enemies for 35%, then +15% and bigger radius (max 2) | 190 Gears |
| Vampire | Epic | Each kill heals 0.5% max HP (max 3) | 140 Gears |
| Overcharge | Epic | Crits deal +100% damage (max 1) | 250 Gears |

- Enemies: **pink blobs** (basic), **yellow teardrops** (fast), **orange helmets** (tanky), plus **Big Red**, a horned boss, every 5th wave.
- Your best wave is saved in the browser.

### Gears and the Workshop

When the tower falls, the **results screen** shows your wave, time, kills, coins, the cards you took, and the
**Gears** you earned. Gears last between runs:

`Gears = floor(2 × wave^1.3 + 3 × boss waves cleared)`, so wave 10 pays 42, wave 13 pays 62, and wave 20 pays 107.

Spend them in the **Workshop** (from the start screen or the results screen) to unlock cards. Locked cards show as
silhouettes with their effect, so you can plan. Prices: Multishot 15, Lucky Shot 35, Regen 50, Frost Shots 75,
Pierce 100, Vampire 140, Splash 190, Overcharge 250. A first run usually pays for Multishot and Lucky Shot.
Until Multishot is unlocked, enemy HP grows a little gentler over the first 10 waves (+20% per wave instead of
+25%), so a commons-only first run doesn't hit a wall.

Progress is saved in `localStorage` under `lst.meta.v1`; your best wave keeps its old key (`lst.bestWave`).
Players from before Gears existed get a one-time Gears payout for their best wave.

- Shots can **crit** for double damage (big orange numbers). Drop below 25% HP and time slows for a moment as a warning.
- A typical first run lasts about 5-6 minutes (wave 11-13). With Multishot unlocked, runs reach wave 15-18 in 7-8 minutes.

Controls: **Space / P / Esc** pause, **F** toggles 1x/2x speed, **M** toggles music, **Enter** starts or goes to the next wave, **W** opens the Workshop from the menu or results screen. In the shop, **1 / 2 / 3** take a card, **R** rerolls, and **H** repairs. On mobile, tap the buttons.

## Sound

Every sound effect and the background music are synthesized in code with the Web Audio API
(`src/audio.js`); there are no audio files. Audio starts on your first tap or key press (browsers
require that). The speaker and note buttons in the HUD mute sound effects and music separately,
and the pause menu has the same switches plus **Vibration** on phones that support it. Settings are
saved in the browser.

## Install it as an app

- **iPhone / iPad (Safari):** open the play link, tap **Share**, then **Add to Home Screen**.
- **Android (Chrome):** open the play link, tap **⋮**, then **Install app** (or **Add to Home screen**).
- **Desktop Chrome / Edge:** click the install icon in the address bar.

After the first visit the game works offline. When a new version is deployed you'll see a
"New version available" toast; tap **Refresh** to update.

## Art styles

The game uses the **Cartoon** style. `styles.html` shows one small animated scene in all three looks
(**Neon**, **Pixel**, **Cartoon**); tap the tabs or swipe the preview. To compare in the real game, add
`?style=neon` or `?style=pixel`, for example
[awsumbtech.github.io/last-stand-tower/?style=pixel](https://awsumbtech.github.io/last-stand-tower/?style=pixel).

## Run locally

No build step or dependencies. Clone the repo and serve the folder:

```bash
git clone https://github.com/awsumbtech/last-stand-tower.git
cd last-stand-tower
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly also works (without offline support, since service workers need http).

## Code layout

| File | What it does |
| --- | --- |
| `src/config.js` | All balance numbers: tower stats, enemy types, wave scaling |
| `src/upgrades.js` | Shop cards (rarity, effect, cap) and the shop rules (draw, prices). Add an entry to add a card |
| `src/meta.js` | Lasting progress: Gears formula, card unlocks, the versioned save (`lst.meta.v1`) |
| `src/waves.js` | Which enemies are in each wave and how they scale |
| `src/entities.js` | Tower, Enemy, Projectile, Particle, FloatText |
| `src/settings.js` | Saved settings (sound, music, vibration) and haptics |
| `src/audio.js` | Synthesized sound effects and looping music (Web Audio API) |
| `src/world.js` | Shared simulation: entity lists, targeting, edge spawning, effects |
| `src/game.js` | Game state, wave flow, coins and score (extends World) |
| `src/render.js` | Canvas setup, sizing, world transform, shake; delegates the look to a theme |
| `src/themes/*.js` | Art styles: `cartoon` (default), `neon`, `pixel`. Each draws background, tower, enemies, shots, effects |
| `src/demo.js` | Self-running scene used by `styles.html` |
| `src/pwa.js`, `sw.js` | Service worker registration, offline cache, update toast |
| `manifest.webmanifest`, `icons/` | App name, colors and icons (regenerate icons with `python3 tools/make_icons.py`) |
| `fonts/` | Bundled [Fredoka](https://github.com/hafontia/Fredoka-One) font (SIL Open Font License, see `fonts/OFL.txt`) |
| `src/ui.js` | HUD and menu screens (HTML overlays) |
| `src/main.js` | Startup, game loop, keyboard shortcuts |
| `tools/sim.js` | Headless balance simulator (see below) |

The game object is on `window.game` for poking around in the browser console.

## Balance simulator

`tools/sim.js` runs the real game code in Node, with no browser, and plays seeded runs using scripted shop strategies (`casual`, `skilled`, focus builds, `noRepair`):

```bash
node tools/sim.js --runs 50 --shop-seconds 6        # death wave + real minutes per strategy
node tools/sim.js --favor                            # dominance check: always take card X
node tools/sim.js --config tweaks.json               # try CONFIG overrides: { "config": { ... } }
node tools/waves-table.js sim-results.json skilled   # per-wave pressure / DPS / coins table
node tools/sim.js --unlocked starter                 # only the starter cards (first run); or --unlocked multishot,crit
node tools/sim.js --campaign --campaigns 40          # Gears + Workshop: runs and minutes to each unlock
node tools/sim.js --meta --prestige                  # older planning model (lasting stat upgrades + prestige)
```

**Deploying changes:** bump `VERSION` in `sw.js` whenever you change files, so installed copies pick up
the new version (and add any new files to its `PRECACHE` list).

## Roadmap ideas

- More enemy types: ranged shooters, splitters, shielded enemies
- Tower abilities with cooldowns (shockwave, freeze, overcharge)
- Chain lightning and more card types; boss fights where the boss stops and slams instead of crashing
- See [docs/ROADMAP.md](docs/ROADMAP.md): Workshop stat upgrades and Head Start, trap cards, worlds, Rebuild (prestige)
- Daily challenge seed and online leaderboard
- Pick an art style in the game's settings
