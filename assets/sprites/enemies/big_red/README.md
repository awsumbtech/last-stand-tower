# Last Stand Tower: big_red enemy sprites

## big_red.png / big_red.json
- Sheet 2446x1528, 28 frames of 304x304, one row per animation, 2 px gutter, untrimmed, unrotated, pivot (0.5, 0.5) = frame centre, transparent.
- Authored at 2 px per world unit (2x). Hitbox r = 60 px (30u); body r = 81 px (x1.35), outline 10 px.
- Rows (in order):
  - walk: 6 frames @ 10 fps, loops
  - slam_windup: 4 frames @ 5 fps, plays once
  - slam: 6 frames @ 12 fps, plays once
  - charge: 4 frames @ 12 fps, loops
  - death: 8 frames @ 12 fps, plays once

## Notes
- Frame is 304 px, not the specified 256: the horns reach 1.65R (~134 px) above the pivot, so a centred pivot needs 304.
- slam_windup = 4 frames @ 5 fps = exactly the code's 0.8 s windup; it does not loop. The code's telegraph ring / squash / charge flash are NOT baked in.
- charge loops @12 fps. death knocks the horns off sideways and fades them.
- PNGs are 8-bit indexed (pngquant 3.0.3, quality 85-100, speed 1, light dither 0.5), alpha kept; meta.format = "indexed8 (pngquant)" and meta.quantize records tool, settings, bytes before/after, PSNR and max channel error. `node build.mjs <entity> --no-quantize` gives full RGBA.
- Nothing is baked in: no squash/stretch, hit flash, low-HP tint, rotation or ground shadow (the code still draws those).
- JSON is hash style: frames{name:{frame,rotated,trimmed,spriteSourceSize,sourceSize,pivot,duration}}, animations{name:{frames[],fps,loop}}, meta.frameTags (Aseprite style), meta.hitbox, meta.body, meta.palette, meta.format, meta.quantize.

## Files
- source/: one SVG per frame.
- qa/: contact sheet(s) (blue = hitbox, orange = drawn body, cross = pivot), a GIF per animation, phone previews 390x844@2x and 360x740@2x at true size beside today's procedural version (rendered by the game's own cartoon.js), 1:1 crops, and a side-by-side blow-up.

## Rebuild
cd ../generator && npm i && node build.mjs big_red && python3 qa/qa.py big_red
Inputs: generator/entities/big_red.json (frame, pxPerUnit, hitboxRadius, drawScale, colors, strokes, eyes, feet). See ../generator/README.md.
