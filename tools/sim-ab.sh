#!/bin/bash
# Seeded A/B check: run the same sims on two checkouts and compare the JSON byte for byte.
#   tools/sim-ab.sh /path/to/main-checkout [/path/to/this-checkout]
# Every run is seeded (game RNG per run seed, strategy dice via StrategyRandom in tools/sim.js).
# A checkout whose sim.js predates StrategyRandom gets the equivalent seeded Math.random
# preloaded (tools/sim-seed-preload.js), so old and new code draw the same numbers.
set -e
A=$1; B=${2:-$(cd "$(dirname "$0")/.." && pwd)}; OUT=${OUT:-/tmp/sim-ab}; mkdir -p $OUT
PRE="$(cd "$(dirname "$0")" && pwd)/sim-seed-preload.js"
run() { local pre=""; grep -q StrategyRandom $1/tools/sim.js || pre="-r $PRE"; (cd $1 && timeout 300 node $pre tools/sim.js $2 --out $3 > /dev/null 2>&1); }
for spec in "default|--runs 20" "phone|--runs 12 --phone --strategies casual,skilled" "starter|--runs 10 --unlocked starter --strategies casual,skilled" "campaign|--campaign --hours 1 --runs 3 --strategies casual"; do
  name=${spec%%|*}; args=${spec#*|}
  run $A "$args" $OUT/a_$name.json; run $B "$args" $OUT/b_$name.json
  if cmp -s $OUT/a_$name.json $OUT/b_$name.json; then echo "IDENTICAL $name $(md5sum < $OUT/b_$name.json | cut -c1-12)"; else echo "DIFF $name"; fi
done
