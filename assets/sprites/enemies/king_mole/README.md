# Last Stand Tower: king_mole enemy sprites

## king_mole.png / king_mole.json
- Sheet 3538x2476, 42 frames of 352x352, one row per animation, 2 px gutter, untrimmed, unrotated, pivot (0.5, 0.5) = frame centre, transparent.
- Authored at 2 px per world unit (2x). Hitbox r = 92 px (46u); body r = 110.4 px (x1.2), outline 10 px.
- Rows (in order):
  - idle: 4 frames @ 4 fps, loops
  - dig: 6 frames @ 12 fps, plays once
  - rise: 6 frames @ 11 fps, plays once
  - slam: 6 frames @ 12 fps, plays once
  - phase_change: 4 frames @ 8 fps, plays once
  - death: 10 frames @ 10 fps, plays once
  - underground_travel: 6 frames @ 12 fps, loops (frames 36-41)

## king_mole_angry.png / king_mole_angry.json
- Sheet 3538x2476, 42 frames of 352x352, one row per animation, 2 px gutter, untrimmed, unrotated, pivot (0.5, 0.5) = frame centre, transparent.
- Authored at 2 px per world unit (2x). Hitbox r = 92 px (46u); body r = 110.4 px (x1.2), outline 10 px.
- Rows (in order):
  - idle: 4 frames @ 4 fps, loops
  - dig: 6 frames @ 12 fps, plays once
  - rise: 6 frames @ 11 fps, plays once
  - slam: 6 frames @ 12 fps, plays once
  - phase_change: 4 frames @ 8 fps, plays once
  - death: 10 frames @ 10 fps, plays once
  - underground_travel: 6 frames @ 12 fps, loops (frames 36-41)

## Notes
- Frame is 352 px, not the specified 320: with the pivot at the frame centre the crown tops out ~166 px above it.
- Body = hitbox 46u x 1.2. Pivot = the hole centre's code origin (the mound is part of the sprite, at +0.55R).
- The code moves the mole with 'out' (0.55 s rise / 0.5 s dig) and 'lift' (slam rear-up). The dig/rise/slam frames already contain that motion, so if the code's out/lift translation also stays on, the motion would double up. That is Tower Defense Games Dev's call. 
- underground_travel: the travelling dirt mound from cartoon.js's 'under' mode (same half-dome #a1887f, stroke 4u, five #6d4c41 clods). 0.5 s loop; the mound bobs and squashes twice per loop (0.25 s, close to the code's sin(t*30) ~0.21 s) and the clods churn. Same pivot as the other rows (the code's origin). Identical in the angry sheet (no face shows).
- king_mole_angry.png/json: same layout, cartoon.js's phase 2+ angry brows and tilted crown. Optional; the code's phase tint still works on the base sheet.
- dig 6 @12 = 0.5 s, rise 6 @11 = 0.55 s; phase_change 4 @8 = 0.5 s (the code's phase-change dig is 0.9 s, so these 0.5 s frames run shorter than that; flagged for Tower Defense Games Dev).
- PNGs are 8-bit indexed (pngquant 3.0.3, quality 85-100, speed 1, light dither 0.5), alpha kept; meta.format = "indexed8 (pngquant)" and meta.quantize records tool, settings, bytes before/after, PSNR and max channel error. `node build.mjs <entity> --no-quantize` gives full RGBA.
- Nothing is baked in: no squash/stretch, hit flash, low-HP tint, rotation or ground shadow (the code still draws those).
- JSON is hash style: frames{name:{frame,rotated,trimmed,spriteSourceSize,sourceSize,pivot,duration}}, animations{name:{frames[],fps,loop}}, meta.frameTags (Aseprite style), meta.hitbox, meta.body, meta.palette, meta.format, meta.quantize.

## Files
- source/: one SVG per frame (source/angry/ for the angry variant).
- qa/king_mole_underground_travel_1x.gif and king_mole_contact_sheet_4x_underground_travel.png (and angry versions).
- qa/: contact sheet(s) (blue = hitbox, orange = drawn body, cross = pivot), a GIF per animation, phone previews 390x844@2x and 360x740@2x at true size beside today's procedural version (rendered by the game's own cartoon.js), 1:1 crops, and a side-by-side blow-up.

## Rebuild
cd ../generator && npm i && node build.mjs king_mole && python3 qa/qa.py king_mole && python3 qa/qa.py king_mole king_mole_angry
Inputs: generator/entities/king_mole.json (frame, pxPerUnit, hitboxRadius, drawScale, colors, strokes, eyes, feet). See ../generator/README.md.
