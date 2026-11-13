#!/usr/bin/env python3
"""Build assets/sprites/{world2,looks}/PROVENANCE.json from the Game Art & Motion delivery.

  python3 tools/art-provenance.py --world2 /path/to/lst-art/world2-beach --looks /path/to/lst-art/element-looks

Needs the delivery folders (they are not in the repo). Steps, all mechanical:
  1. Every image (.png / .q.png) in the repo folder must be byte-identical to its delivery file;
     the script stops if one isn't. Images are never edited.
  2. Each sprite JSON is re-derived from its delivery JSON with only these reference fixes, so
     every file name a JSON points at exists in the repo:
       * world2 sheets: meta.image -> the shipped .q.png (meta.sha256 = its hash); the RGBA master
         the delivery called meta.image moves to meta.originalImage {name, sha256, inRepo: false};
         meta.shadow.image -> seagull_a_shadow.q.png; meta.layerSet names -> .q.png + .json;
       * `_src/...` references (raw generations, prompt log, style reference, usesCellsOf) and the
         cards' hiRes / raw entries are dropped from the JSON and kept here instead;
       * meta.provenance / provenance gets "see": "../PROVENANCE.json" (world2) or "../PROVENANCE.json" (looks).
     Nothing else in a JSON changes (frames, pivots, radii, timings stay as delivered).
  3. PROVENANCE.json lists every repo file: sha256, bytes, the delivery path + sha256 it came from,
     for .q.png copies the quantized-from original (name, sha256, bytes, not in repo), and for JSON
     the dropped references. tools/world-test.js checks the repo files against it (fails on a
     missing file, an unlisted file or a hash change).
Originals are NOT committed: the World 2 RGBA masters add 5.0 MB (v0.1.3) (over the ~3 MB budget); only
their hashes are recorded. Element looks v0.1.1 ship their pngquant .q.png copies the same way (strips.*.image ->
the .q.png, the RGBA master -> strips.*.originalImage, not in the repo).
One metadata edit, recorded in the manifest: crabclaw_b_angry.json meta.qa.frames was stale (pre-v0.1.2-rescale
edge margins, idle[]/throw[] keys for the angry idle_angry/throw_angry rows, a hurt[1] that does not exist); it is
re-measured from the shipped sheet (see fix_angry_qa). meta.qa.motion was re-checked and is current, so it stays.
"""
import argparse, hashlib, json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
W2 = os.path.join(ROOT, "assets/sprites/world2")
LOOKS = os.path.join(ROOT, "assets/sprites/looks")
OURS = {"MANIFEST.md", "PROVENANCE.json"}  # written in this repo, not part of the delivery

def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()

def w2_src(rel):
    top, name = rel.split("/", 1)
    return f"{top}/{name}" if top in ("coconut", "cards") else f"{top}/recommended/{name}"

def drop_src_refs(obj, path, dropped):
    """Remove string values that point into the delivery's _src/ folder (recorded in `dropped`)."""
    if isinstance(obj, dict):
        for k in list(obj):
            v = obj[k]
            if isinstance(v, str) and ("_src/" in v or v.startswith("see _src")):
                dropped[f"{path}.{k}"] = v; del obj[k]
            else:
                drop_src_refs(v, f"{path}.{k}", dropped)
    elif isinstance(obj, list):
        for i, v in enumerate(obj): drop_src_refs(v, f"{path}[{i}]", dropped)

def fix_angry_qa(data, srcdir):
    """crabclaw_b_angry.json: replace the stale meta.qa.frames with one entry per real frame id, measured on the
    shipped .q.png cell (alpha > 0): edgeMarginPx = min distance to the cell edge, clippedFraction = share of opaque
    pixels on the 1 px cell border. Returns (old block sha256, note)."""
    import numpy as np
    from PIL import Image
    m = data["meta"]; qa = m.get("qa") or {}
    old = json.dumps(qa.get("frames"), sort_keys=True).encode()
    im = np.asarray(Image.open(os.path.join(srcdir, m["quantizedCopy"]["image"])).convert("RGBA"))
    frames = {}
    for fid, f in data["frames"].items():
        r = f["frame"]; a = im[r["y"]:r["y"] + r["h"], r["x"]:r["x"] + r["w"], 3] > 0
        ys, xs = np.nonzero(a); border = a.copy(); border[1:-1, 1:-1] = False
        frames[fid] = {"edgeMarginPx": int(min(ys.min(), xs.min(), r["h"] - 1 - ys.max(), r["w"] - 1 - xs.max())),
                       "clippedFraction": round(float(border.sum()) / float(a.sum()), 4), "opaquePx": int(a.sum())}
    qa["frames"] = frames
    qa["remeasured"] = ("meta.qa.frames re-measured by tools/art-provenance.py on the shipped " + m["quantizedCopy"]["image"] +
                        " (the delivered block predated the v0.1.2 rescale and used idle[]/throw[]/hurt[1] keys); keyFringe / rim / xcorr fields dropped (master-only metrics). meta.qa.motion re-checked on the same sheet: current, unchanged.")
    m["qa"] = qa
    return hashlib.sha256(old).hexdigest()

def normalize_w2(rel, data, srcdir):
    dropped = {}
    if rel == "cards/cards.json":
        for cid, c in data["cards"].items():
            for k in ("hiRes", "hiResSize", "raw", "rawSha256"):
                if k in c: dropped[f"cards.{cid}.{k}"] = c.pop(k)
            c["provenance"] = "see ../PROVENANCE.json"
        return data, dropped
    m = data["meta"]
    q = m.get("quantizedCopy")
    if q:
        orig = m["image"]
        osha = sha(os.path.join(srcdir, orig))
        if m.get("sha256") and m["sha256"] != osha: sys.exit(f"{rel}: meta.sha256 does not match delivery {orig}")
        m["image"] = q["image"]
        m["sha256"] = q["sha256"]
        m["originalImage"] = {"name": orig, "sha256": osha, "bytes": os.path.getsize(os.path.join(srcdir, orig)), "inRepo": False,
                              "note": "RGBA master from the delivery; the repo ships the pngquant copy above (see ../PROVENANCE.json)"}
        dropped["meta.image (delivery)"] = orig
    if isinstance(m.get("shadow"), dict) and m["shadow"].get("image", "").endswith(".png") and not m["shadow"]["image"].endswith(".q.png"):
        dropped["meta.shadow.image"] = m["shadow"]["image"]; m["shadow"]["image"] = m["shadow"]["image"][:-4] + ".q.png"
    if isinstance(m.get("layerSet"), dict):
        for k in ("normal", "angry"):
            v = m["layerSet"].get(k)
            if isinstance(v, str) and v.endswith(".png/json"):
                dropped[f"meta.layerSet.{k}"] = v; b = v[:-len(".png/json")]; m["layerSet"][k] = f"{b}.q.png + {b}.json"
    drop_src_refs(data, "", dropped)
    if rel == "crabclaw/crabclaw_b_angry.json":
        dropped["meta.qa.frames (stale, replaced; sha256 of delivered block)"] = fix_angry_qa(data, srcdir)
        dropped["metadataEdit"] = "meta.qa.frames re-measured on the shipped sheet (see meta.qa.remeasured); frames / pivots / radii / timings untouched"
    if isinstance(m.get("provenance"), dict): m["provenance"]["see"] = "../PROVENANCE.json"
    else: m["provenance"] = {"see": "../PROVENANCE.json"}
    return data, dropped

def normalize_look(rel, data, srcdir):
    dropped = {}
    for name, st in (data.get("strips") or {}).items():
        q = st.get("quantizedCopy")
        if not q: continue
        orig = st["image"]; osha = sha(os.path.join(srcdir, orig))
        if st.get("sha256") and st["sha256"] != osha: sys.exit(f"{rel}: strips.{name}.sha256 does not match delivery {orig}")
        if sha(os.path.join(srcdir, q["image"])) != q["sha256"]: sys.exit(f"{rel}: strips.{name}.quantizedCopy.sha256 does not match")
        st["image"] = q["image"]; st["sha256"] = q["sha256"]
        st["originalImage"] = {"name": orig, "sha256": osha, "bytes": os.path.getsize(os.path.join(srcdir, orig)), "inRepo": False,
                               "note": "RGBA master from the delivery; the repo ships the pngquant copy (same at real size, see ../PROVENANCE.json)"}
        dropped[f"strips.{name}.image (delivery)"] = orig
    drop_src_refs(data, "", dropped)
    data.setdefault("provenance", {})["see"] = "../PROVENANCE.json"
    return data, dropped

def build(repo_dir, src_root, src_of, normalize, source, delivery_prov=None, integration=None):
    files = {}
    for dp, _, fs in os.walk(repo_dir):
        for f in sorted(fs):
            rel = os.path.relpath(os.path.join(dp, f), repo_dir).replace(os.sep, "/")
            if rel in OURS: continue
            src_rel = src_of(rel); src = os.path.join(src_root, src_rel)
            if not os.path.exists(src): sys.exit(f"missing delivery file for {rel}: {src}")
            entry = {"source": src_rel, "sourceSha256": sha(src)}
            if rel.endswith(".json"):
                data, dropped = normalize(rel, json.load(open(src)), os.path.dirname(src))
                open(os.path.join(repo_dir, rel), "w").write(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
                entry["edit"] = "reference fixes only (tools/art-provenance.py); frames / pivots / radii / timings as delivered"
                if "metadataEdit" in dropped:
                    entry["edit"] = "reference fixes + METADATA EDIT: " + dropped.pop("metadataEdit")
                if dropped: entry["droppedReferences"] = dropped
            else:
                if sha(os.path.join(repo_dir, rel)) != entry["sourceSha256"]: sys.exit(f"{rel} is not byte-identical to {src_rel}")
                entry["edit"] = "none (byte-identical copy)"
                if rel.endswith(".q.png"):
                    o = src[:-len(".q.png")] + ".png"
                    entry["quantizedFrom"] = {"name": os.path.basename(o), "source": src_rel[:-len(".q.png")] + ".png", "sha256": sha(o), "bytes": os.path.getsize(o), "inRepo": False,
                                              "tool": "pngquant 3.0.3 --quality=85-100 --speed=1 --floyd=0.5 --strip"}
            if delivery_prov and src_rel in delivery_prov:
                srcs = delivery_prov[src_rel].get("sources") or []
                if srcs: entry["generatedFrom"] = [{k: s[k] for k in ("rawKey", "raw", "rawSha256", "tool", "time") if k in s} for s in srcs]
            p = os.path.join(repo_dir, rel)
            entry = {"sha256": sha(p), "bytes": os.path.getsize(p), **entry}
            files[rel] = entry
    out = {"source": source, "integration": integration, "originalsCommitted": False, "files": files}
    open(os.path.join(repo_dir, "PROVENANCE.json"), "w").write(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"{os.path.relpath(repo_dir, ROOT)}/PROVENANCE.json: {len(files)} files")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--world2", required=True); ap.add_argument("--looks", required=True); a = ap.parse_args()
    dp = json.load(open(os.path.join(a.world2, "PROVENANCE.json")))
    build(W2, a.world2, w2_src, normalize_w2, {
        "delivery": "Game Art & Motion: last-stand-tower world2-beach", "version": "0.1.3", "date": "2026-11-12",
        "picks": "FINAL-PICKS.md v0.1.3 + CHANGELOG-v0.1.3.md + _checker/CHECKER-SCORES-hermit_v013.md (hermit crab b walk pass c, blind) + _checker/INDEPENDENT-SCORES.md v0.1.2 re-check (independent checker picks: background a, hermit crab b, seagull a, Crabclaw b, Elite shell c; verdict PASS, confidence 0.80)",
        "license": "Original art generated for Brian Awsumb's Last Stand Tower via Grok Bot GenerateImage; no third-party assets.",
        "originals": "RGBA masters total 5.0 MB, over the ~3 MB repo budget: not committed, hashes below (quantizedFrom / originalImage)."}, dp,
        {"release": "Beach v0.1.3 (hermit crab walk pass)", "date": "2026-11-12", "metadataEdits": ["crabclaw/crabclaw_b_angry.json meta.qa.frames re-measured (PR #5 review P3-2)"]})
    build(LOOKS, a.looks, lambda rel: rel.split("/", 1)[0] + "/recommended/" + rel.split("/", 1)[1], normalize_look, {
        "delivery": "Game Art & Motion: last-stand-tower element-looks", "version": "0.1.1", "date": "2026-11-12",
        "picks": "FINAL-PICKS.md v0.1.1 + CHANGELOG-v0.1.1.md + _checker/v011/INDEPENDENT-SCORES.md (independent checker, PASS, confidence 0.85): BurnFlames a (1-pixel fix at (188,102)), SparkCrackle c (bolts in the corners), IceCrust a (round crust, snap last frame == hold), VenomDrips c (shipped as VenomDrips_a.*: bigger drips, cup-shaped goo). ChillFrost v0.1.0 (2026-11-13): ChillFrost/recommended/NOTES.md + _checker/chillfrost_v010/INDEPENDENT-SCORES.md (blind checker, 18/25, confidence 0.6): ChillFrost b (bead ring + sparkle flecks; loop-strip stray plum blob removed by drop_strays before promote)",
        "license": "Original generated art made for Brian Awsumb's Last Stand Tower; no third-party packs or licensed sheets.",
        "originals": "the repo ships the delivered pngquant .q.png copies (same at real size: in-browser A/B at every enemy radius, p99 <= 7/255 for r <= 18, <= 13/255 at boss r 44); RGBA masters are not committed, hashes below (quantizedFrom / strips.*.originalImage). Raw generations stay in the delivery's _src/."},
        None, {"release": "Element looks v0.1.1 + ChillFrost v0.1.0", "date": "2026-11-13"})

if __name__ == "__main__":
    main()
