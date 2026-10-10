# Last Stand Tower

A small "last stand" tower defense game for the browser, in a chunky cartoon style. Your tower (it has a face!) sits in the middle of a lawn and fires on its own at enemies closing in from every side. Survive each wave, collect coins, and spend them on upgrades before the next one.

**[Play it here](https://awsumbtech.github.io/last-stand-tower/)** (works on desktop and mobile, installable, plays offline)

**[Art style preview](https://awsumbtech.github.io/last-stand-tower/styles.html)**: the same scene in neon, pixel art, and cartoon styles (cartoon is the game's look).

![Gameplay screenshot](docs/screenshot.png)

## How to play

- Press **Start**. The tower aims and shoots by itself.
- Enemies that reach the tower damage it. If its HP hits zero, the run is over.
- Kills give coins. Between waves, buy upgrades: **Damage, Fire Rate, Range, Max HP, Repair, Multishot**. Each one costs more every time you buy it.
- Enemies: **pink blobs** (basic), **yellow teardrops** (fast), **orange helmets** (tanky), plus **Big Red**, a horned boss, every 5th wave.
- Your best wave is saved in the browser.

- Shots can **crit** for double damage (big orange numbers). Drop below 25% HP and time slows for a moment as a warning.

Controls: **Space / P / Esc** pause, **F** toggles 1x/2x speed, **M** toggles music, **Enter** starts or goes to the next wave. On mobile, tap the buttons.

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
| `src/upgrades.js` | Upgrade list (cost curve, effect, cap). Add an entry to add an upgrade |
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

The game object is on `window.game` for poking around in the browser console.

**Deploying changes:** bump `VERSION` in `sw.js` whenever you change files, so installed copies pick up
the new version (and add any new files to its `PRECACHE` list).

## Roadmap ideas

- More enemy types: ranged shooters, splitters, shielded enemies
- Tower abilities with cooldowns (shockwave, freeze, overcharge)
- Crits, piercing shots, chain lightning, and other upgrade branches
- Permanent meta-upgrades between runs (a "lab" bought with earned gems)
- Daily challenge seed and online leaderboard
- Juice: better particles, tower recoil, damage numbers
- Pick an art style in the game's settings
