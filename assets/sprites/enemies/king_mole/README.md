# Last Stand Tower: king_mole enemy sprites

## What to load
Per variant, three layer sheets drawn on top of each other with the same animation + frame index:

| order | layer | atlas (normal) | atlas (angry) | tinted by hit flash / frost | contents |
|---|---|---|---|---|---|
| 0 | hole | king_mole_hole.png/json | king_mole_hole (shared) | NO | mound, dark hole, its front lip; the underground_travel dirt mound |
| 1 | body | king_mole_body.png/json | king_mole_angry_body.png/json | YES | the mole: claws, body, belly, face, nose, crown on his head |
| 2 | front | king_mole_front.png/json | king_mole_front (shared) | NO | dirt clods thrown out of the hole, phase-change steam, the crown once knocked off in death |

- Each layer atlas has meta.layer = {name, of, order, rotates: false, tinted, sharedByVariants?, set, note}; meta.layer.set lists the three atlases for that variant with their order and tinted flag. Hole and front are identical for both variants, so they are built once and shared (the angry set points at king_mole_hole / king_mole_front).
- Hit flash and frost: tint ONLY the layer with tinted: true (body). The whole body layer is tinted, including its ink outline and the crown on his head (see qa/king_mole_tint_test.png).
- Layering is exact: hole + body + front composites to the combined sheet within 2/255 before quantizing (the body is clipped above the lip, so the lip can sit underneath).
- underground_travel: the mound is dirt, so it is on the hole layer; the body and front frames are empty (one shared 1x1 transparent rect). cartoon.js draws no flash or frost in "under" mode, and the code won't tint dirt.
- Frames fully down the hole (end of dig, phase_change_7, start of rise, late death) also have an empty body frame.
- frames[name].offset is {0, 0} in every frame (the mole has no walk bob).

## Packing (all King Mole sheets)
- TRIMMED and tightly shelf-packed, 2 px gutter, identical frames stored once (aliases share a rect). Every frame keeps sourceSize 352x352 with pivot (0.5, 0.5) = sourceSize centre = the hole centre's code origin; spriteSourceSize = where the trimmed rect sits in that 352x352 frame (TexturePacker JSON-hash style; see meta.packing). Draw: frame rect at entity position - (176, 176) + spriteSourceSize.{x, y}.
- meta.memory.decodedRGBA = w * h * 4.

| sheet | size | decoded RGBA | file |
|---|---|---|---|
| king_mole_hole | 306x729 | 0.89 MB | 13 KB |
| king_mole_body | 916x1577 | 5.78 MB | 79 KB |
| king_mole_front | 798x729 | 2.33 MB | 29 KB |
| king_mole_angry_body | 934x1551 | 5.79 MB | 81 KB |
| king_mole (combined, reference) | 1254x2407 | 12.07 MB | 146 KB |
| king_mole_angry (combined, reference) | 1244x2405 | 11.97 MB | 149 KB |

Before (one untrimmed grid per variant): 3538x2476 = 35.04 MB decoded each. One variant in game now = hole + body + front = 9.00 MB; both variants = 14.79 MB (hole and front shared).

- king_mole.png/json and king_mole_angry.png/json are the same frames merged into one sheet. They are kept as a reference and fallback for QA. Don't load them alongside the layers.

## Animations (same in every sheet)
  - idle: 4 frames @ 4 fps, loops
  - dig: 6 frames @ 12 fps, plays once (0.5 s)
  - rise: 6 frames @ 11 fps, plays once (0.55 s)
  - slam: 6 frames @ 12 fps, plays once
  - phase_change: 8 frames @ 9 fps, plays once (0.89 s, matching the code's 0.9 s phase-change dig). A shocked beat, he gets mad (brows, steam, claws up), then digs down into the hole throwing dirt, ending fully under (like the dig row, the sinking is in the frames).
  - death: 10 frames @ 10 fps, plays once: knocked out (X eyes), sinks as the crown flies off and lands on the mound, dirt flies, everything fades. No pow star or ring (the game draws its own kill burst).
  - underground_travel: 6 frames @ 12 fps, loops (cartoon.js's 'under' mound: half-dome #a1887f, stroke 4u, five #6d4c41 clods; bobs/squashes twice per 0.5 s loop, close to the code's ~0.21 s).

## Notes
- Hitbox r = 92 px (46u); body r = 110.4 px (x1.2), outline 10 px. Authored at 2 px per world unit (2x). Frame (sourceSize) is 352 px: the crown tops out ~166 px above the pivot.
- The code moves the mole with 'out' (rise / dig / phase-change dig) and 'lift' (slam rear-up). The dig, rise, slam and phase_change frames already contain that motion; if the code's translation also stays on, the motion doubles up. Tower Defense Games Dev's call.
- Angry variant: cartoon.js's phase 2+ angry brows and tilted crown; only the body differs.
- PNGs are 8-bit indexed (pngquant 3.0.3, quality 85-100, speed 1, light dither 0.5), alpha kept; meta.format = "indexed8 (pngquant)" and meta.quantize records tool, settings, bytes before/after, PSNR and max channel error. `node build.mjs <entity> --no-quantize` gives full RGBA.
- Nothing is baked in: no squash/stretch, hit flash, low-HP tint, rotation or ground shadow (the code still draws those).

## Files
- source/: one untrimmed SVG per frame per sheet (source/hole, source/body, source/front, source/angry, source/angry/body).
- qa/: contact sheets per animation (4x) and 1x overviews for the combined sheets and each layer sheet; a GIF per animation (layers composited); phone previews 390x844@2x and 360x740@2x beside today's procedural mole; 1:1 crops; compare blow-ups.
- qa/king_mole_tint_test.png (and _angry): white hit flash and frost on the body layer only vs the same flash on the whole sprite, on idle, dig, slam and rise frames; *_tint_test_390x844@2x.png: normal / flash / frost at true phone scale.

## Rebuild
cd ../generator && npm i && node build.mjs king_mole && python3 qa/qa.py king_mole && python3 qa/qa.py king_mole king_mole_angry
Inputs: generator/entities/king_mole.json (frame, pack: "trim", layers, variants, colors, strokes, eyes). See ../generator/README.md.
