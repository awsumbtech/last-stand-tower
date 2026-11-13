# World 2 (Beach) art: Game Art & Motion v0.1.1 recommended picks

Every image here is a byte-identical copy from the `lst-art/world2-beach` delivery (`<asset>/recommended/`, `coconut/`, `cards/`). The game ships the pngquant `.q.png` copies; at real size they look the same as the RGBA masters (premultiplied p99 difference 4.6/255 or less at 390x844 DPR2). The masters add 6.8 MB, so they are not committed: `PROVENANCE.json` records each file's sha256, its delivery source and, for every `.q.png`, the master's name and sha256. The sprite JSON is the delivery JSON with reference fixes only (`meta.image` = the shipped `.q.png`, master in `meta.originalImage`, `_src/` raw and prompt references moved to `PROVENANCE.json`); `tools/art-provenance.py` rebuilds both from the delivery and `tools/world-test.js` fails if a file is missing, unlisted or changed.

The images are never edited. `src/worlds/render/AtlasSheetAdapter.js` reads the TexturePacker grid JSON as-is (2 px gutter, `meta.pivot`, `meta.body.r`) and renames animations to the renderer slots. `src/worlds/render/World2Sheets.js` lists the files.

| Renderer sheet | Files | Slots (theirs -> ours) |
|---|---|---|
| BeachGround | background/beach_bg_a | main |
| BeachSurf | background/beach_surf | main, placed at `meta.placement.a` (row 275) |
| HermitCrab | hermit_crab/hermit_crab_a | walk; walk_broken -> bare; hit_crack -> crack; regrow |
| Seagull | seagull/seagull_a | fly (faces camera, not mirrored) |
| SeagullShadow | seagull/seagull_a_shadow | shadow (30 frame px below the gull) |
| CaptainCrabclaw | crabclaw/crabclaw_b + crabclaw_b_angry | walk, idle, throw (release frame 2); walk -> walk_angry, idle_angry, throw_angry (faces camera) |
| EliteShell | elite_shell/elite_shell_c | on, crack, regrow (overlay on Big Red) |
| Coconut | coconut/coconut_spin + coconut_splat | spin; splat (spread over 0.35 s) |
| CoconutWarning | coconut/coconut_warning_decal | warn (ring drawn at tower radius + hitRadius) |
| World cards | cards/card_backyard, card_beach, card_locked_overlay | `<img>` on the start screen |

Gameplay radii stay as tuned: crab 13, gull 10, Crabclaw 44, coconut 9. Drawn scale = radius x 1.35 / `meta.body.r`.
