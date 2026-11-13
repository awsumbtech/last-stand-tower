# World 2 review evidence (PR #5)

Taken Nov 12 2026 (04, 07, 08, 14-18 retaken on Beach art v0.1.2; 04 + 16 again on the v0.1.3 crab walk; 09, 10, 19-24 on element looks v0.1.1) from the `world-2-beach` branch, served on 127.0.0.1 in Chrome at DPR 2, then saved at real CSS size
(390x844 unless the name says otherwise) as 256-colour PNGs to keep the set small. The game art itself is not changed.

| Shot | Shows |
|---|---|
| 01 / 02 / 03 | Start screen, fresh save: Beach locked with `card_locked_overlay.png` only (no filter, no opacity) at 390x844, 375x667 (compact badge), 360x740 |
| 04 | Beach v0.1.3: `hermit_crab_b` crabs (walk pass c), shell on (top-left, bottom-left) and broken/bare (right) |
| 05 / 06 | Gulls + shadows; Elite Big Red shell (taken on v0.1.1 art, unchanged in v0.1.2) |
| 07 | Crabclaw coconut aimed straight at the tower: v0.1.2 300 px warning decal, inner ring = dangerR (44), chevron band out to ~1.83x, clear of the tower body |
| 08 | Crabclaw phase 2 angry art (two coconuts in the air, so two decals overlap) |
| 14 | Crabclaw phase 1 walking in |
| 15 | Beach surf (ping-pong 0,1,2,3,2,1 @6 fps) behind a WAVE CLEAR banner; still frame, the loop is checked in the PR text |
| 16 | Hermit crab v0.1.3 walk cells 0-3 at real game size (DPR 2), shelled row then bare row |
| 17 | Crabclaw walk cells (JSON sequence 0,1,2,1) then angry walk, real game size (DPR 2) |
| 18 | 4x crop of shot 07's decal around the tower |
| 09 / 10 | Backyard enemies + King Mole frozen / poisoned: element looks v0.1.1 (round IceCrust, cup VenomDrips) alone, no code rings |
| 12 | Results after a local dev-door Beach run: "(test run, not saved)"; the save is restored byte-for-byte |
| 13 | The same `?debug=1&unlock=beach` URL on a non-local host: ignored, Beach stays locked |
| 19 / 20 | Beach crabs, gulls, Elite Big Red and Captain Crabclaw frozen / poisoned (looks v0.1.1) |
| 21 / 22 | Backyard / Beach burning (BurnFlames v0.1.1) |
| 23 / 24 | Backyard / Beach sparked, SparkCrackle v0.1.1 peak frame alone (look flashed directly, no chain-bolt lines) |
| 27 | One shelled crab walking in game, 16 grabs ~50 ms apart, DPR 2 |

Look shots 09, 10 and 19-24 are 256-colour octree PNGs without dithering, so the sand and grass show some flat banding; the looks themselves are faithful (p99 colour error ≤22/255).
