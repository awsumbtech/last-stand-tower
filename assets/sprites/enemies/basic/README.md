# Last Stand Tower: basic enemy sprites

## basic.png / basic.json
- Sheet 586x292, 16 frames of 96x96, one row per animation, 2 px gutter, untrimmed, unrotated, pivot (0.5, 0.5) = frame centre, transparent.
- Authored at 2 px per world unit (2x). Hitbox r = 24 px (12u); body r = 32.4 px (x1.35), outline 7 px.
- Rows (in order):
  - walk: 6 frames @ 10 fps, loops
  - idle: 4 frames @ 4 fps, loops
  - death: 6 frames @ 12 fps, plays once

## Notes
- Approved style reference (feet, shine, shade). Body = hitbox 12u x 1.35.
- Nothing is baked in: no squash/stretch, hit flash, low-HP tint, rotation or ground shadow (the code still draws those).
- JSON is hash style: frames{name:{frame,rotated,trimmed,spriteSourceSize,sourceSize,pivot,duration}}, animations{name:{frames[],fps,loop}}, meta.frameTags (Aseprite style), meta.hitbox, meta.body, meta.palette.

## Files
- source/: one SVG per frame.
- qa/: contact sheet(s) (blue = hitbox, orange = drawn body, cross = pivot), a GIF per animation, phone previews 390x844@2x and 360x740@2x at true size beside today's procedural version (rendered by the game's own cartoon.js), 1:1 crops, and a side-by-side blow-up.

## Rebuild
cd ../generator && npm i && node build.mjs basic && python3 qa/qa.py basic
Inputs: generator/entities/basic.json (frame, pxPerUnit, hitboxRadius, drawScale, colors, strokes, eyes, feet). See ../generator/README.md.
