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
Originals are NOT committed: the World 2 RGBA masters add 6.8 MB (over the ~3 MB budget); only
their hashes are recorded. The looks have no quantized copies; their delivered PNGs are the repo files.
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
    if isinstance(m.get("provenance"), dict): m["provenance"]["see"] = "../PROVENANCE.json"
    else: m["provenance"] = {"see": "../PROVENANCE.json"}
    return data, dropped

def normalize_look(rel, data, srcdir):
    dropped = {}
    drop_src_refs(data, "", dropped)
    data.setdefault("provenance", {})["see"] = "../PROVENANCE.json"
    return data, dropped

def build(repo_dir, src_root, src_of, normalize, source, delivery_prov=None):
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
    out = {"source": source, "originalsCommitted": False, "files": files}
    open(os.path.join(repo_dir, "PROVENANCE.json"), "w").write(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"{os.path.relpath(repo_dir, ROOT)}/PROVENANCE.json: {len(files)} files")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--world2", required=True); ap.add_argument("--looks", required=True); a = ap.parse_args()
    dp = json.load(open(os.path.join(a.world2, "PROVENANCE.json")))
    build(W2, a.world2, w2_src, normalize_w2, {
        "delivery": "Game Art & Motion: last-stand-tower world2-beach", "version": "0.1.1", "date": "2026-11-12",
        "picks": "FINAL-PICKS.md + CHANGELOG-v0.1.1.md (independent checker picks: background a, hermit crab a, seagull a, Crabclaw b, Elite shell c)",
        "license": "Original art generated for Brian Awsumb's Last Stand Tower via Grok Bot GenerateImage; no third-party assets.",
        "originals": "RGBA masters total 6.8 MB, over the ~3 MB repo budget: not committed, hashes below (quantizedFrom / originalImage)."}, dp)
    build(LOOKS, a.looks, lambda rel: rel.split("/", 1)[0] + "/recommended/" + rel.split("/", 1)[1], normalize_look, {
        "delivery": "Game Art & Motion: last-stand-tower element-looks", "version": "0.1.0", "date": "2026-11-12",
        "picks": "FINAL-PICKS.md (independent checker, confidence 0.84): BurnFlames a, IceCrust a, VenomDrips a, SparkCrackle c",
        "license": "Original generated art made for Brian Awsumb's Last Stand Tower; no third-party packs or licensed sheets.",
        "originals": "no quantized copies: the delivered PNGs are the repo files (byte-identical). Raw generations stay in the delivery's _src/ (hashes in its _src/raw/SHA256SUMS)."})

if __name__ == "__main__":
    main()
