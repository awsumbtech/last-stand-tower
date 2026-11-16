# PIPELINE: LST PR10a effects v1 (for Tower Defense Games Dev, assets/fx/fx.json)

Objects: one image-backed effect object per fx.manifest.json entry (24 sheets). Each colour is its own generated painting; nothing is tinted or recoloured. The game only fades opacity.

1. Generate (Grok Bot GenerateImage, 26 generations: 24 kept + 2 rerolls of tower_aura_t2). Prompts: `_src/prompts.json` (full text per file in PROVENANCE.json). Raws: `_src/raw/` (+ `rejected/`), hashes in `_src/raw/SHA256SUMS`. Inked effects (overdrive ring, bolts, arc flash, impact rings) were painted on a flat key colour with Brian's tank/basic sprites as the style reference (`_src/style_ref_enemies.png`). Soft glows and ground auras were painted on pure black, no outline.
2. Process (`python3 _tools/process.py`): key removal (`_tools/keying.py`, from world2-beach) or black un-mix for glows; frame cut by grid cell; bbox-centre registration; one uniform premultiplied LANCZOS downscale per asset; chain_bolt fade frames = opacity x1.0/0.6/0.25. Writes `<group>/<id>.png` + `<id>.json` and `_tools/process_report.json`.
3. Self-check (`python3 _tools/selfcheck.py` -> `_qa/selfcheck.json`, `_qa/selfcheck.txt`): frame size, non-empty, border alpha (clipping), near-white share, mean hue + saturation, loop seam, centre clear.
4. Previews (`python3 _tools/preview.py`): `preview_390x844.png` (+ `_qa/preview_390x844@2x.png`) and `contact_2x.png`. Ground, stand-in tower and labels are QA scaffolding only. `_tools/board.py` -> `_qa/board.png`.
5. Manifest + provenance (`python3 _tools/provenance.py`): `fx.manifest.json`, `PROVENANCE.json`.

Assumed in-game draw sizes used by the preview (CSS px, portrait 0.629 px/world unit, tower radius 26): overdrive_aura 72, tower_aura 90, chain_bolt 64 long x 12, chain_arc_flash 28, chain_node_glow 14, glow 20, impact_ring 48 (largest frame).
pngquant isn't installed in this folder's pipeline; PNGs are RGBA from Pillow (optimize). Shipped sheets total about 3.2 MB.

## v2 additions (2026-11-16): screen_burst, glow_pale, glow_yellow
- 3 GenerateImage calls, no rerolls, all painted on pure black with no outline (prompts in `_src/prompts.json`, full text in PROVENANCE.json).
- `python3 _tools/process_v2.py`: the same black un-mix, centroid window and uniform premultiplied LANCZOS downscale as the v1 glows. screen_burst uses a wider window (1.05 x the radius where mean alpha drops below 0.5%) so the ray tips stay in. JSONs say `"version": "v2"`. v1 files are byte-identical; checked against the sha256 list in `_qa/v1_png_sha_before.txt`.
- `python3 _tools/provenance.py` adds 3 v2 entries to fx.manifest.json and PROVENANCE.json; the v1 entries are unchanged, apart from an explicit `version: v1` key added to their PROVENANCE entries.
- `python3 _tools/selfcheck.py` now also reports maxHlsLightness, maxMinChannel and pureWhitePx.
- `python3 _tools/preview_v2.py` -> `preview_v2_390x844.png` (+ `_qa/preview_v2_390x844@2x.png`). v1 previews are untouched.

## v3 (2026-11-16): subtle redo after Brian's feedback ("too bold, need more subtlety")
- Redone: impact_ring_{gold,red,blue,green,purple}, chain_bolt, chain_arc_flash, overdrive_aura, tower_aura_t0..t4. Each one was repainted as a new GenerateImage on pure black, thin and soft, with no ink outline. Thinness is painted, not done with erosion or morphology. Kept as-is: all 12 glows (soft blooms with no edge) and screen_burst.
- 18 generations: 13 kept, 5 rerolls (blue ring, purple ring, chain_bolt, tower_aura_t4 x2). Rejected raws are in `_src/raw/v3/rejected/` and their prompts are in `_src/prompts.json` and PROVENANCE.json.
- `python3 _tools/process_v3.py`: black un-mix, grid-cell cut, bbox-centre registration, one uniform premultiplied LANCZOS downscale per asset. Bolt bands are scaled evenly to 256 wide with no vertical stretch, and fades are opacity x1.0/0.6/0.25. For the tower auras, the frame order was optimised for a smooth loop seam (order only; frame pixels are unchanged; see `frameOrderFromRawCells` in `_tools/process_v3_report.json`). Outputs: `<group>/v3/<id>.png/.json`, each with `"version": "v3"`. The v1 files these replace were removed from the game tree in 864aadb; their hashes stay in PROVENANCE.json for history.
- `python3 _tools/linewidth_v3.py` -> `_qa/linewidth_v3.{json,txt}`. Measures ring band FWHM from the radial alpha profile, and the stroke core (alpha>=0.5) and visible width (alpha>=0.15) as 2x the distance transform on the skeleton. This is measurement only.
- `python3 _tools/selfcheck.py` now also covers `*/v3/*.json`. `python3 _tools/provenance.py` swaps 13 fx.manifest.json paths to v3 and leaves the other 14 entries unchanged.
- `python3 _tools/preview_v3.py` -> `preview_v3_390x844.png` (+ `_qa/preview_v3_390x844@2x.png`): v1 vs v3 at in-game size, on dark-ground and grass scenes. Also writes `contact_v3_2x.png` (every v3 frame at 2x, shown on dark ground, grass and checker). The v1 and v2 previews are untouched.
- t4 swap (2026-11-16): `tower_aura/v3/tower_aura_t4.png` now comes from draft r1 (`_src/raw/v3/tower_aura_t4_r1.jpg`; `SRC` override in process_v3.py), because it has 0 near-white pixels. The earlier colour-wheel file is kept as `_src/raw/v3/rejected/tower_aura_t4_v3a.png` (from raw `rejected/tower_aura_t4_r2.jpg`). Candidate measurements: `python3 _tools/t4_candidates.py` -> `_qa/t4_candidates/measure.json`. No new generation and no pixel edits.
