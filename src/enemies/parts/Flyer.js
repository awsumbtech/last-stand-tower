// Flyer (Seagull): single job, it is in the air, so nothing that slows a walker can grab it.
// Frost Shots, Frostbite's chill and the Freeze ability all land through Enemy.applySlow, which
// a PartEnemy skips when any part blocksSlow. Frostbite only freezes an enemy that is already
// slowed (Frostbite.js), so a Flyer is never frozen either, and IceCrust (which follows the
// "frozen" status) never attaches to it. Fire, venom, sparks and Shockwave's stun still work.
LST.Flyer = class Flyer extends LST.EnemyPart {
  blocksSlow() { return true; }
};
