"""Charts for the balance report. Needs matplotlib.
   python tools/charts.py <data-dir> <out-dir>
Expects baseline6.json, proposal.json, meta-*.json from tools/sim.js in data-dir."""
import json, sys, os, statistics as st
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

data, out = sys.argv[1], sys.argv[2]
load = lambda f: json.load(open(os.path.join(data, f)))
base, prop = load("baseline6.json"), load("proposal.json")
STRATS = ["cheapest", "damage", "fireRate", "multishot", "greedy", "noRepair"]
plt.rcParams.update({"font.size": 10, "axes.spines.top": False, "axes.spines.right": False})

# 1. Death wave + run length by strategy
fig, axes = plt.subplots(1, 2, figsize=(12, 4.6))
for ax, key, label in [(axes[0], "deathWave", "Death wave"), (axes[1], "realMinutes", "Run length (real minutes)")]:
    pos = range(len(STRATS))
    b = [[r[key] for r in base["results"] if r["strategy"] == s] for s in STRATS]
    p = [[r[key] for r in prop["results"] if r["strategy"] == s] for s in STRATS]
    bp1 = ax.boxplot(b, positions=[x - 0.2 for x in pos], widths=0.35, patch_artist=True)
    bp2 = ax.boxplot(p, positions=[x + 0.2 for x in pos], widths=0.35, patch_artist=True)
    for patch in bp1["boxes"]: patch.set_facecolor("#9ab8d8")
    for patch in bp2["boxes"]: patch.set_facecolor("#ffb347")
    ax.set_xticks(list(pos)); ax.set_xticklabels(STRATS, rotation=15)
    ax.set_title(label); ax.grid(axis="y", alpha=0.3)
    if key == "realMinutes":
        ax.axhspan(5, 10, color="#86cc5f", alpha=0.2, label="target 5-10 min")
    else:
        for w in range(5, 35, 5): ax.axhline(w, color="#c44", alpha=0.15, lw=1)
axes[0].legend([bp1["boxes"][0], bp2["boxes"][0]], ["current", "proposal"], loc="upper left")
axes[1].legend(loc="upper left")
fig.suptitle("Death wave and run length by strategy (50 seeded runs each, 6 s per shop)")
fig.tight_layout(); fig.savefig(os.path.join(out, "balance-death-wave.png"), dpi=130); plt.close(fig)

# 2. Enemy pressure vs tower DPS per wave (medians)
def series(d, s, key):
    rs = [r for r in d["results"] if r["strategy"] == s]
    xs, ys = [], []
    for w in range(1, 61):
        vals = [x[key] for r in rs for x in r["waves"] if x["wave"] == w]
        if len(vals) < max(3, len(rs) // 5): break
        xs.append(w); ys.append(st.median(vals))
    return xs, ys
fig, axes = plt.subplots(1, 2, figsize=(12, 4.6), sharey=True)
for ax, d, title in [(axes[0], base, "Current balance"), (axes[1], prop, "Proposal")]:
    for s, c in [("greedy", "#2a7"), ("cheapest", "#37c")]:
        x, y = series(d, s, "pressure"); ax.plot(x, y, color="#d33", ls="-" if s == "greedy" else ":", label=f"enemy HP/s arriving ({s})")
        x, y = series(d, s, "dps"); ax.plot(x, y, color=c, lw=2, label=f"tower paper DPS ({s})")
        x, y = series(d, s, "realDps"); ax.plot(x, y, color=c, lw=1, ls="--", label=f"tower actual DPS ({s})")
    for w in range(5, 31, 5): ax.axvline(w, color="#999", alpha=0.2, lw=1)
    ax.set_yscale("log"); ax.set_xlabel("wave"); ax.set_title(title); ax.grid(alpha=0.25); ax.set_xlim(0, 32)
axes[0].set_ylabel("per second (log)"); axes[1].legend(fontsize=8, loc="lower right")
fig.suptitle("Enemy pressure vs tower DPS (median of runs alive at that wave; grey lines = boss waves)")
fig.tight_layout(); fig.savefig(os.path.join(out, "balance-pressure-vs-dps.png"), dpi=130); plt.close(fig)

# 3. Meta progression: best wave vs cumulative play time
fig, ax = plt.subplots(figsize=(9, 4.8))
for f, color, label in [("meta-greedy.json", "#2a7", "skilled, no prestige"), ("meta-greedy-prestige.json", "#0a5", "skilled + prestige"),
                        ("meta-cheapest.json", "#37c", "casual, no prestige"), ("meta-cheapest-prestige.json", "#14a", "casual + prestige")]:
    m = load(f)
    for i, c in enumerate(m["campaigns"]):
        best, xs, ys = 0, [], []
        for h in c["history"]:
            best = max(best, h["wave"]) if not h.get("prestige") else best
            xs.append(h["totalMinutes"] / 60); ys.append(max(best, h["wave"]))
        ax.plot(xs, ys, color=color, alpha=0.75, lw=1.4, ls="-" if "prestige" in f else "--", label=label if i == 0 else None)
for w in (20, 40, 60): ax.axhline(w, color="#c44", alpha=0.25)
ax.set_xlabel("cumulative play time (hours)"); ax.set_ylabel("best wave reached"); ax.grid(alpha=0.25)
ax.set_title("Meta-progression model: best wave over time (5 campaigns per line style)")
ax.legend(); fig.tight_layout(); fig.savefig(os.path.join(out, "balance-meta-progress.png"), dpi=130); plt.close(fig)
print("ok")
