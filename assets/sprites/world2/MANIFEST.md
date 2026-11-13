# World 2 (Beach) art manifest

The game loads these files (src/worlds/render/World2Sheets.js). Until a sheet's JSON and every
strip PNG are present, the renderer that uses it draws **nothing** (no code-drawn fallback).

Format: the same "strips" JSON as the status looks (assets/sprites/looks, LookSheetLibrary /
SheetAnimation): one horizontal PNG per strip, frames packed left to right with **no gutter**.

```json
{ "anchor": { "x": 96, "y": 96 }, "refBodyR": 48,
  "strips": { "walk": { "image": "HermitCrab_walk.png", "frame": { "w": 192, "h": 192 }, "count": 6, "fps": 10, "loop": true } } }
```

- `anchor`: pixel in a frame that sits on the entity position (body centre unless noted).
- `refBodyR`: body radius in frame px. Drawn scale = bodyR / refBodyR, bodyR = enemy radius x 1.35.
- One-shots (`loop: false`) hold their last frame. Strips without `fps` are spread over a game timer.
- All World 2 art faces **right**; the game mirrors it on the right of the tower.

| Sheet (`<Sheet>/<Sheet>.json`) | Strips: frames @ fps (loop / once) | Anchor |
|---|---|---|
| BeachGround | main 1 (static, portrait) | the tower spot (image centre) |
| BeachSurf (optional) | main 4-6 @ 6 loop (shoreline foam) | top-centre of the ground image |
| HermitCrab | walk 6 @ 10 loop; bare 6 @ 12 loop; crack 4 @ 16 once; regrow 4 @ 12 once | body centre |
| Seagull | fly 6 @ 12 loop | body centre |
| CaptainCrabclaw | walk 6 @ 8 loop; idle 4 @ 6 loop; throw 6 (spread over the windup); walk_angry, idle_angry, throw_angry (phase 2 / frenzy) | body centre |
| EliteShell | on 4 @ 8 loop; crack 4 @ 16 once; regrow 4 @ 12 once (overlay on Big Red) | Big Red's body centre |
| Coconut | spin 4 @ 16 loop; splat 4 (spread over 0.35 s) | coconut centre |
| CoconutWarning | warn 6 (spread over the flight) | landing spot; refBodyR = danger radius in px (drawn at hitRadius 18) |

World cards: `cards/backyard_card.png`, `cards/beach_card.png` (wide, shown 54 px tall, cover-fit).

Body radii in world units: crab 13, gull 10, Crabclaw 44, coconut 9.
