// Immutable Game Art & Motion v0.1.3 recommended picks; AtlasSheetAdapter owns atlas/slot mapping.
// Each JSON and quantized PNG is copied byte-for-byte from Game Art & Motion.
LST.WORLD2_SHEETS = {
  BeachGround: "assets/sprites/world2/background/beach_bg_a.json",
  BeachSurf: "assets/sprites/world2/background/beach_surf.json",
  HermitCrab: [{ url: "assets/sprites/world2/hermit_crab/hermit_crab_b.json", aliases: { walk_broken: "bare", hit_crack: "crack" } }],
  Seagull: "assets/sprites/world2/seagull/seagull_a.json",
  SeagullShadow: "assets/sprites/world2/seagull/seagull_a_shadow.json",
  CaptainCrabclaw: [
    { url: "assets/sprites/world2/crabclaw/crabclaw_b.json" },
    { url: "assets/sprites/world2/crabclaw/crabclaw_b_angry.json", aliases: { walk: "walk_angry", hurt: "hurt_angry" } },
  ],
  EliteShell: "assets/sprites/world2/elite_shell/elite_shell_c.json",
  Coconut: ["assets/sprites/world2/coconut/coconut_spin.json", "assets/sprites/world2/coconut/coconut_splat.json"],
  CoconutWarning: "assets/sprites/world2/coconut/coconut_warning_decal.json",
};
LST.world2Sheets = new LST.AtlasSheetAdapter(LST.WORLD2_SHEETS);
