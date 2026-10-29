# Last Stand Tower: tank enemy sprites

## tank.png / tank.json
- Sheet 778x388, 16 frames of 128x128, one row per animation, 2 px gutter, untrimmed, unrotated, pivot (0.5, 0.5) = frame centre, transparent.
- Authored at 2 px per world unit (2x). Hitbox r = 36 px (18u); body r = 48.6 px (x1.35), outline 8 px.
- Rows (in order):
  - walk: 6 frames @ 10 fps, loops
  - idle: 4 frames @ 4 fps, loops
  - death: 6 frames @ 12 fps, plays once

## Notes
- Rounded block roundRect(R, 0.45R) with the darker lid band, angry (cartoon.js) brows, eyes lowered 0.25R. Lid corner radius 0.4R is clamped to half the lid height (0.35R), the same as canvas does.
- Death burst scaled to 0.82 so the pow star fits the 128 frame (the square body fills more of it than Basic's circle).
- PNGs are 8-bit indexed (pngquant 3.0.3, quality 85-100, speed 1, light dither 0.5), alpha kept; meta.format = "indexed8 (pngquant)" and meta.quantize records tool, settings, bytes before/after, PSNR and max channel error. `node build.mjs <entity> --no-quantize` gives full RGBA.
- Nothing is baked in: no squash/stretch, hit flash, low-HP tint, rotation or ground shadow (the code still draws those).
- JSON is hash style: frames{name:{frame,rotated,trimmed,spriteSourceSize,sourceSize,pivot,duration}}, animations{name:{frames[],fps,loop}}, meta.frameTags (Aseprite style), meta.hitbox, meta.body, meta.palette, meta.format, meta.quantize.

## Files
- source/: one SVG per frame.
- qa/: contact sheet(s) (blue = hitbox, orange = drawn body, cross = pivot), a GIF per animation, phone previews 390x844@2x and 360x740@2x at true size beside today's procedural version (rendered by the game's own cartoon.js), 1:1 crops, and a side-by-side blow-up.

## Rebuild
cd ../generator && npm i && node build.mjs tank && python3 qa/qa.py tank
Inputs: generator/entities/tank.json (frame, pxPerUnit, hitboxRadius, drawScale, colors, strokes, eyes, feet). See ../generator/README.md.
