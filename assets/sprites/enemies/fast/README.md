# Last Stand Tower: fast enemy sprites

## fast.png / fast.json
- Sheet 538x268, 16 frames of 88x88, one row per animation, 2 px gutter, untrimmed, unrotated, pivot (0.5, 0.5) = frame centre, transparent.
- Authored at 2 px per world unit (2x). Hitbox r = 18 px (9u); body r = 24.3 px (x1.35), outline 6 px.
- Rows (in order):
  - walk: 6 frames @ 10 fps, loops
  - idle: 4 frames @ 4 fps, loops
  - death: 6 frames @ 12 fps, plays once

## Notes
- Dart drawn tip-DOWN (toward the tower when the enemy walks down the screen) with an upright face, like cartoon.js with look = straight down. The code rotates the whole dart toward the tower (look + PI/2); the face is baked into the body here, so rotating the whole sprite would also rotate the eyes. I can make split body/face layers if Tower Defense Games Dev wants them.
- Frame is 88 px, not the specified 64: the dart tip sits at 1.5R (~36 px) below the pivot plus outline and feet, so a centred pivot needs 88.
- At its real line weights (stroke 3u on a narrow dart) Fast reads ink-heavy, the same as today's procedural Fast. Hurt-eye strokes are thinner (2u) and the blink arc lighter so they don't merge.
- Nothing is baked in: no squash/stretch, hit flash, low-HP tint, rotation or ground shadow (the code still draws those).
- JSON is hash style: frames{name:{frame,rotated,trimmed,spriteSourceSize,sourceSize,pivot,duration}}, animations{name:{frames[],fps,loop}}, meta.frameTags (Aseprite style), meta.hitbox, meta.body, meta.palette.

## Files
- source/: one SVG per frame.
- qa/: contact sheet(s) (blue = hitbox, orange = drawn body, cross = pivot), a GIF per animation, phone previews 390x844@2x and 360x740@2x at true size beside today's procedural version (rendered by the game's own cartoon.js), 1:1 crops, and a side-by-side blow-up.

## Rebuild
cd ../generator && npm i && node build.mjs fast && python3 qa/qa.py fast
Inputs: generator/entities/fast.json (frame, pxPerUnit, hitboxRadius, drawScale, colors, strokes, eyes, feet). See ../generator/README.md.
