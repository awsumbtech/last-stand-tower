# Last Stand Tower: basic enemy sprites

## basic.png / basic.json
- Sheet 586x292, 16 frames of 96x96, one row per animation, 2 px gutter, untrimmed, unrotated, pivot (0.5, 0.5) = frame centre, transparent.
- Authored at 2 px per world unit (2x). Hitbox r = 24 px (12u); body r = 32.4 px (x1.35), outline 7 px.
- Rows (in order):
  - walk: 6 frames @ 10 fps, loops
  - idle: 4 frames @ 4 fps, loops
  - death: 6 frames @ 12 fps, plays once (squint, X eyes + swell, then the body's own shards fly out and fade; no pow star, ring or sparks: the game draws its own kill burst)

## Pupils (basic_pupil.png): drawn by the code
- The sheet's eyes have EMPTY whites. Draw the pupils yourself, like cartoon.js eyes(): pupil centre = eye centre + (cos(look), sin(look)) * maxOffset, look = angle from the enemy to the tower.
- basic_pupil.png: one pupil disc (ink colour), pivot at its centre; meta.pupils = {image, size, pivot, r, maxOffset, units: "frame px", perFrame, howTo}. Scale it by pupilR / r if a frame's pupilR differs.
- Every frame has frames[name].eyes = [left, right], each {x, y, whiteR, pupilR, maxOffset, authoredLook}: x/y = eye centre in frame px relative to the pivot (the walk bob is already included), maxOffset = 0.35 x eye size (cartoon.js's offset), authoredLook = the direction the frame was drawn for (idle glances), usable as a fallback.
- eyes = [] where pupils must not be drawn (blink, hurt, death burst).
- If the sprite is drawn scaled, scale x, y, maxOffset and the pupil sprite by the same factor.

## Notes
- Approved style reference (feet, shine, shade). Body = hitbox 12u x 1.35.
- PNGs are 8-bit indexed (pngquant 3.0.3, quality 85-100, speed 1, light dither 0.5), alpha kept; meta.format = "indexed8 (pngquant)" and meta.quantize records tool, settings, bytes before/after, PSNR and max channel error. `node build.mjs <entity> --no-quantize` gives full RGBA.
- Removing "pupils" from generator/entities/basic.json rebuilds the old baked-pupil sheet.
- Nothing is baked in: no squash/stretch, hit flash, low-HP tint, rotation or ground shadow (the code still draws those).
- JSON is hash style: frames{name:{frame,rotated,trimmed,spriteSourceSize,sourceSize,pivot,duration}}, animations{name:{frames[],fps,loop}}, meta.frameTags (Aseprite style), meta.hitbox, meta.body, meta.palette, frames[].eyes, meta.pupils, meta.format, meta.quantize.

## Files
- source/: one SVG per frame.
- qa/: contact sheet(s) (blue = hitbox, orange = drawn body, cross = pivot), a GIF per animation, phone previews 390x844@2x and 360x740@2x at true size beside today's procedural version (rendered by the game's own cartoon.js), 1:1 crops, and a side-by-side blow-up.

## Rebuild
cd ../generator && npm i && node build.mjs basic && python3 qa/qa.py basic
Inputs: generator/entities/basic.json (frame, pxPerUnit, hitboxRadius, drawScale, colors, strokes, eyes, feet). See ../generator/README.md.
