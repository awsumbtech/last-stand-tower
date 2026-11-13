// World 2 (Beach) art manifest: sheet id -> JSON under assets/sprites/world2/<Sheet>/.
// Same "strips" JSON as the status looks (LookSheetLibrary / SheetAnimation, Game Art & Motion):
//   { strips: { <id>: { image, frame: { w, h }, count, fps, loop } }, anchor: { x, y }, refBodyR }
// A sheet is handed out only once every one of its strip images has loaded; until then (or if a
// file is missing) the renderer that uses it draws NOTHING. There is no drawn fallback anywhere.
// Loaded only when the Beach is picked (WorldDefinition.preloadArt), never for Backyard runs.
//
//   sheet            strips (frames @ fps, loop/once)                       anchor = drawn on
//   BeachGround      main (1, static)                                       tower spot (image centre)
//   BeachSurf        main (4-6 @ 6, loop)  optional shoreline foam          top-centre of the ground
//   HermitCrab       walk (6 @ 10 loop) bare (6 @ 12 loop)                  body centre (e.x, e.y)
//                    crack (4 @ 16 once) regrow (4 @ 12 once)
//   Seagull          fly (6 @ 12 loop), art faces RIGHT                     body centre
//   CaptainCrabclaw  walk, idle, throw + walk_angry, idle_angry, throw_angry body centre
//                    (walk 6 @ 8 loop, idle 4 @ 6 loop, throw 6 frames spread over the windup)
//   EliteShell       on (4 @ 8 loop) crack (4 @ 16 once) regrow (4 @ 12 once)  Big Red's body centre
//   Coconut          spin (4 @ 16 loop) splat (4 frames over 0.35 s, once)   coconut centre
//   CoconutWarning   warn (6 frames spread over the flight, once)            landing spot
LST.WORLD2_SHEETS = {
  BeachGround: "assets/sprites/world2/BeachGround/BeachGround.json",
  BeachSurf: "assets/sprites/world2/BeachSurf/BeachSurf.json",
  HermitCrab: "assets/sprites/world2/HermitCrab/HermitCrab.json",
  Seagull: "assets/sprites/world2/Seagull/Seagull.json",
  CaptainCrabclaw: "assets/sprites/world2/CaptainCrabclaw/CaptainCrabclaw.json",
  EliteShell: "assets/sprites/world2/EliteShell/EliteShell.json",
  Coconut: "assets/sprites/world2/Coconut/Coconut.json",
  CoconutWarning: "assets/sprites/world2/CoconutWarning/CoconutWarning.json",
};
LST.world2Sheets = new LST.LookSheetLibrary(LST.WORLD2_SHEETS);
