// Effect tuning as data. Parts read these; nothing here runs code.
//
//   LST.FX_PRESETS  emitter presets: streakBurst, aura, trail, glow (+ ring, used by impacts)
//   LST.FX_IMPACTS  one entry per "big moment": which burst, how hard the bass thump, flash, shake
//   LST.FX_THEMES   per art style: blend mode, glow strength, ink outlines (keeps cartoon chunky, not neon)
//   LST.FX_QUALITY  particle caps and the frame-time thresholds for the low-quality fallback

LST.FX_PRESETS = {
  // Radial burst; fast particles stretch along their velocity (reads as motion blur).
  streakBurst: {
    shape: "streak",
    count: 48,
    speed: [240, 640],     // world units / s
    life: [0.32, 0.7],
    width: [2.6, 4.6],     // stroke width (world units)
    drag: 3.4,             // velocity decay per second (exponential)
    gravity: 0,
    stretch: 0.05,         // streak length = speed x stretch (seconds of travel)
    minLength: 4,
    jitter: 0.12,          // random angle wobble (radians) around evenly spaced spokes
    colors: ["#ffffff", "#fff3a0", "#ffd23f"],
  },
  // Soft motes drifting up from the tower; rate and size scale with tower power (0..1).
  aura: {
    shape: "soft",
    rate: [3, 26],          // particles / s at power 0 and 1
    speed: [8, 24],
    rise: [22, 46],         // upward drift speed
    life: [1.2, 2.2],
    size: [5, 11],          // glow radius at power 0 -> grows up to x1.6 at power 1
    drag: 0.4,
    gravity: -10,           // keeps accelerating upward a little
    spawnRadius: [0.6, 1.25], // x tower radius
    colorsByTier: [
      ["#fff8d6", "#fff3a0"],
      ["#fff3a0", "#ffe14d"],
      ["#ffe14d", "#ffd23f", "#fff8d6"],
      ["#ffd23f", "#ffb347", "#fff8d6"],
      ["#ffd23f", "#ff9fd0", "#9fe7ff", "#fff8d6"],
    ],
    groundGlow: [0.0, 0.42], // alpha of the soft glow under the tower at power 0 and 1
    tierPower: [1, 5, 11, 18], // power needed for tiers 1..4 (power = weighted cards this run + Workshop)
    maxPower: 24,
  },
  // Projectile comet tail + additive glow.
  trail: {
    stretch: 0.03,   // tail length in seconds of travel
    maxLength: 30,
    width: 7,        // soft outer stroke
    core: 3,         // bright inner stroke
    glowRadius: 15,
    glowAlpha: 0.5,
    critGlowRadius: 24,
    color: "#fff3a0",
    critColor: "#ffb347",
  },
  // One-shot soft glows (crits) and glows behind bright pickups (coin popups, crit numbers).
  glow: {
    shape: "glow",
    critRadius: 30,
    critLife: 0.22,
    critColor: "#ffd23f",
    coinRadius: 22,
    coinAlpha: 0.32,
    critTextRadius: 30,
    critTextAlpha: 0.38,
  },
  // Expanding ring + soft bloom that goes with every impact.
  ring: { life: 0.42, width: 7 },
};

LST.FX_IMPACTS = {
  // Big Red down
  bossKill: { space: "world", burst: { count: 64, speedMul: 1.0 }, colors: ["#ffffff", "#fff3a0", "#ffd23f", "#ff6b6b"],
              ring: 190, bloom: 0.55, flash: 0.35, shake: 0.55, thump: 1.0, hold: 0.06 },
  // King Mole down (the finale)
  finaleWon: { space: "world", burst: { count: 96, speedMul: 1.25 }, colors: ["#ffffff", "#fff3a0", "#ffd23f", "#ff9fd0", "#9fe7ff"],
               ring: 300, bloom: 0.7, flash: 0.45, shake: 0.8, thump: 1.25, hold: 0.1 },
  // Card picked in the shop (drawn above the shop panel, at the card)
  cardPick: { space: "screen", burst: { count: 34, speedMul: 0.75 }, colors: ["#ffffff", "#fff3a0"],
              ring: 110, bloom: 0.35, flash: 0, shake: 0, thump: 0.45, throttle: 0.05 },
  cardPickEpic: { space: "screen", burst: { count: 52, speedMul: 0.95 }, colors: ["#ffffff", "#fff3a0", "#ff9fd0", "#9fe7ff"],
                  ring: 150, bloom: 0.5, flash: 0.12, shake: 0, thump: 0.7, throttle: 0.05 },
  // Workshop purchase / unlock (screen space, at the button)
  workshop: { space: "screen", burst: { count: 22, speedMul: 0.6 }, colors: ["#ffffff", "#ffd23f"],
              ring: 80, bloom: 0.3, flash: 0, shake: 0, thump: 0.35, throttle: 0.08 },
  unlock: { space: "screen", burst: { count: 40, speedMul: 0.85 }, colors: ["#ffffff", "#fff3a0", "#ffd23f"],
            ring: 130, bloom: 0.45, flash: 0.1, shake: 0, thump: 0.65, throttle: 0.08 },
  // The tower's aura reaches a new tier (fires as the next wave starts, on the lawn)
  tierUp: { space: "world", burst: { count: 44, speedMul: 0.8 }, colors: ["#ffffff", "#fff3a0", "#ffd23f"],
            ring: 140, bloom: 0.45, flash: 0.15, shake: 0.25, thump: 0.7, hold: 0 },
};

LST.FX_THEMES = {
  // Lawn: "screen" blending glows without blowing the grass out to white; ink outlines on streaks.
  cartoon: { blend: "screen", glow: 1, ink: "#2b1d3a", inkStreaks: true, trailAlpha: 0.75, bloomBlend: "screen" },
  // Dark grid: classic additive neon.
  neon: { blend: "lighter", glow: 1.15, ink: null, inkStreaks: false, trailAlpha: 0.9, bloomBlend: "lighter" },
  // Pixel art: square motes, light glow, no outlines (the low-res pass does the chunkiness).
  pixel: { blend: "screen", glow: 0.6, ink: "#1a1026", inkStreaks: false, trailAlpha: 0.7, square: true, bloomBlend: "screen" },
};

LST.FX_QUALITY = {
  capWorld: 240,     // hard cap, lawn particles
  capScreen: 60,     // hard cap, screen-space (above menus) particles  -> 300 total
  lowScale: 0.45,    // low quality: fraction of the cap and of every emitter count
  reducedScale: 0.35, // reduced motion: fewer particles (and no shake / flash)
  slowFrameMs: 21,   // frame-time EMA above this for slowHoldS seconds -> low quality
  slowHoldS: 1.0,
  okFrameMs: 17.5,   // ...back to high after okHoldS seconds under this
  okHoldS: 4.0,
};
