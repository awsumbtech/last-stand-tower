# Last Stand Tower

A small "last stand" tower defense game for the browser. Your tower sits in the middle of the screen and fires on its own at enemies closing in from every side. Survive each wave, collect coins, and spend them on upgrades before the next one.

**[Play it here](https://awsumbtech.github.io/last-stand-tower/)** (works on desktop and mobile)

![Gameplay screenshot](docs/screenshot.png)

## How to play

- Press **Start**. The tower aims and shoots by itself.
- Enemies that reach the tower damage it. If its HP hits zero, the run is over.
- Kills give coins. Between waves, buy upgrades: **Damage, Fire Rate, Range, Max HP, Repair, Multishot**. Each one costs more every time you buy it.
- Enemies: **pink circles** (basic), **yellow triangles** (fast), **orange squares** (tanky), plus a **red hexagon boss** every 5th wave.
- Your best wave is saved in the browser.

Controls: **Space / P / Esc** pause, **F** toggles 1x/2x speed, **Enter** starts or goes to the next wave. On mobile, tap the buttons.

## Run locally

No build step or dependencies. Clone the repo and serve the folder:

```bash
git clone https://github.com/awsumbtech/last-stand-tower.git
cd last-stand-tower
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly also works.

## Code layout

| File | What it does |
| --- | --- |
| `src/config.js` | All balance numbers: tower stats, enemy types, wave scaling |
| `src/upgrades.js` | Upgrade list (cost curve, effect, cap). Add an entry to add an upgrade |
| `src/waves.js` | Which enemies are in each wave and how they scale |
| `src/entities.js` | Tower, Enemy, Projectile, Particle, FloatText |
| `src/game.js` | Game state, wave flow, spawning, coins and score |
| `src/render.js` | Canvas drawing |
| `src/ui.js` | HUD and menu screens (HTML overlays) |
| `src/main.js` | Startup, game loop, keyboard shortcuts |

The game object is on `window.game` for poking around in the browser console.

## Roadmap ideas

- Sound effects and music
- More enemy types: ranged shooters, splitters, shielded enemies
- Tower abilities with cooldowns (shockwave, freeze, overcharge)
- Crits, piercing shots, chain lightning, and other upgrade branches
- Permanent meta-upgrades between runs (a "lab" bought with earned gems)
- Daily challenge seed and online leaderboard
- Juice: better particles, tower recoil, damage numbers
- Installable PWA with offline play
