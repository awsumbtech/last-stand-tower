# Last Stand Tower: fast enemy sprites

## fast.png / fast.json
- Sheet 538x268, 16 frames of 88x88, one row per animation, 2 px gutter, untrimmed, unrotated, pivot (0.5, 0.5) = frame centre, transparent.
- Authored at 2 px per world unit (2x). Hitbox r = 18 px (9u); body r = 24.3 px (x1.35), outline 6 px.
- Rows (in order):
  - walk: 6 frames @ 10 fps, loops
  - idle: 4 frames @ 4 fps, loops
  - death: 6 frames @ 12 fps, plays once

## Layers: fast_body.png/json + fast_face.png/json (+ fast_pupil.png)
- Same layout as fast.png (538x268, 16 frames of 88x88, same rows, fps and pivot). Frame names fast_body_<anim>_<i> / fast_face_<anim>_<i>; meta.layer = {name, of: "fast", order, rotates, note}.
- fast_body (order 0, rotates: true): the dart only (body, shine, shade, feet, death pow/shards). Drawn tip-DOWN, so rotate it by (look - PI/2) about the pivot, look = atan2(tower.y - e.y, tower.x - e.x). (Same as cartoon.js's rotate(look + PI/2) on its tip-up dart.)
- fast_face (order 1, rotates: false): eye whites, blink, hurt eyes and the death O mouth, always drawn upright on top.
- Pupils: like Basic, drawn by the code from fast_pupil.png using frames[name].eyes on fast_face (see meta.pupils): pupil centre = eye centre + (cos(look), sin(look)) * maxOffset; eyes = [] means none (blink, hurt, death).
- Walk bob: the layer sheets do NOT contain it. Each layer frame has offset {x: 0, y} (frame px, screen space); add it to the draw position of both layers (after rotating the body), and to the face's eye centres. Otherwise a rotated body would bob sideways and slide under the face.
- Composite per frame index: translate(e.x + offset.x, e.y + offset.y); draw fast_body rotated; draw fast_face upright; draw the two pupils.
- The rotated body never leaves the frame (all pixels within 41.6 px of the pivot; frame half-width 44).
- fast.png/json: the same art merged (empty eye whites, bob baked in), kept as a reference/fallback for an unrotated draw.

## Notes
- Dart drawn tip-DOWN (toward the tower when the enemy walks down the screen) with an upright face, like cartoon.js with look = straight down. Use the layer sheets above for rotation.
- Frame is 88 px, not the specified 64: the dart tip sits at 1.5R (~36 px) below the pivot plus outline and feet, so a centred pivot needs 88.
- At its real line weights (stroke 3u on a narrow dart) Fast reads ink-heavy, the same as today's procedural Fast. Hurt-eye strokes are thinner (2u) and the blink arc lighter so they don't merge.
- PNGs are 8-bit indexed (pngquant 3.0.3, quality 85-100, speed 1, light dither 0.5), alpha kept; meta.format = "indexed8 (pngquant)" and meta.quantize records tool, settings, bytes before/after, PSNR and max channel error. `node build.mjs <entity> --no-quantize` gives full RGBA.
- Shine and shade sit on the body layer, so they turn with it (the light direction rotates with the dart).
- Nothing is baked in: no squash/stretch, hit flash, low-HP tint, rotation or ground shadow (the code still draws those).
- JSON is hash style: frames{name:{frame,rotated,trimmed,spriteSourceSize,sourceSize,pivot,duration}}, animations{name:{frames[],fps,loop}}, meta.frameTags (Aseprite style), meta.hitbox, meta.body, meta.palette, frames[].eyes, frames[].offset (layers), meta.layer, meta.pupils, meta.format, meta.quantize.

## Files
- source/: one SVG per frame (source/body/, source/face/ for the layers; fast_pupil.svg).
- qa/fast_directions_390x844@2x.png: eight Fasts round the tower, body rotated and face level, pupils on the tower.
- qa/: contact sheet(s) (also fast_body_/fast_face_contact_sheet_4x.png) (blue = hitbox, orange = drawn body, cross = pivot), a GIF per animation, phone previews 390x844@2x and 360x740@2x at true size beside today's procedural version (rendered by the game's own cartoon.js), 1:1 crops, and a side-by-side blow-up.

## Rebuild
cd ../generator && npm i && node build.mjs fast && python3 qa/qa.py fast
Inputs: generator/entities/fast.json (frame, pxPerUnit, hitboxRadius, drawScale, colors, strokes, eyes, feet). See ../generator/README.md.
