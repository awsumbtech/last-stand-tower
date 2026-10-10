// Prints median per-wave stats for one strategy from a sim results file.
//   node tools/waves-table.js sim-results.json greedy
const d = require(require("path").resolve(process.argv[2]));
const s = process.argv[3] || "greedy";
const med = (a) => { a = a.slice().sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
const rs = d.results.filter((r) => r.strategy === s);
console.log("wave alive count bosses enemyHP pressure towerDPS realDPS earned spent hpLost sec deaths");
for (let w = 1; w <= 200; w++) {
  const ws = rs.map((r) => r.waves.find((x) => x.wave === w)).filter(Boolean);
  if (!ws.length) break;
  const f = (k) => med(ws.map((x) => x[k] || 0));
  console.log([w, ws.length, f("count"), f("bosses"), Math.round(f("enemyHp")), Math.round(f("pressure")), Math.round(f("dps")), Math.round(f("realDps")),
    f("coinsEarned"), f("spent"), Math.round(f("hpLost")), f("seconds").toFixed(1), ws.filter((x) => x.died).length].join(" "));
}
