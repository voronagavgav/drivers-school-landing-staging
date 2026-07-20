#!/usr/bin/env python3
"""
Merge all .content-import/expl/gen_*.json generated explanations into
.content-import/explanations.json keyed by "<label>:<qnum>".

Each value = {short, detailed, legalRef, reviewedStatus}.

Default reviewedStatus = "UNREVIEWED".

For any chunk that ALSO has a .content-import/expl/ok_<i>.json (independent-verify
output), prefer the verified text:
  - items with ok==true  -> use the ok_ text, reviewedStatus="REVIEWED", ship.
  - items with ok==false -> collected into explanations_flagged.json, NOT shipped
    (skipped from explanations.json).

The ok_<i>.json files are keyed by chunk (same chunk number as gen_<i>.json), so a
verified item overrides its generated twin by (label,qnum).

Idempotent: rebuilds both output files from scratch each run.
"""
import json
import glob
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
EXPL_DIR = os.path.join(HERE, "expl")
OUT_PATH = os.path.join(HERE, "explanations.json")
FLAGGED_PATH = os.path.join(HERE, "explanations_flagged.json")


def key(item):
    return f"{item['label']}:{item['qnum']}"


def norm(v):
    """Empty/whitespace-only strings -> None (so the importer can NULL them)."""
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def main():
    # 1) Load every gen_*.json -> generated[key] = item, plus remember chunk number.
    generated = {}        # key -> item dict
    gen_chunk_of = {}     # key -> chunk number (for matching ok_ overrides)
    gen_count = 0
    for f in sorted(glob.glob(os.path.join(EXPL_DIR, "gen_*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        chunk = d.get("chunk")
        for it in d.get("items", []):
            k = key(it)
            generated[k] = it
            gen_chunk_of[k] = chunk
            gen_count += 1

    # 2) Load every ok_*.json -> verified overrides keyed by (label,qnum).
    #    ok==true  -> override + REVIEWED.
    #    ok==false -> flagged (skip from shipped output).
    verified_ok = {}      # key -> item (ok==true)
    flagged = {}          # key -> {short,detailed,legalRef,issue,chunk,section}
    ok_files = sorted(glob.glob(os.path.join(EXPL_DIR, "ok_*.json")))
    for f in ok_files:
        d = json.load(open(f, encoding="utf-8"))
        chunk = d.get("chunk")
        section = d.get("section")
        for it in d.get("items", []):
            k = key(it)
            if it.get("ok") is True:
                verified_ok[k] = it
            elif it.get("ok") is False:
                flagged[k] = {
                    "short": norm(it.get("short")),
                    "detailed": norm(it.get("detailed")),
                    "legalRef": norm(it.get("legalRef")),
                    "issue": norm(it.get("issue")),
                    "chunk": chunk,
                    "section": section,
                }

    # 3) Build the shipped map. Start from all generated items; apply verified
    #    overrides; drop flagged ones.
    out = {}
    reviewed = 0
    for k, it in generated.items():
        if k in flagged:
            continue  # ok==false: do NOT ship
        if k in verified_ok:
            v = verified_ok[k]
            out[k] = {
                "short": norm(v.get("short")),
                "detailed": norm(v.get("detailed")),
                "legalRef": norm(v.get("legalRef")),
                "reviewedStatus": "REVIEWED",
            }
            reviewed += 1
        else:
            out[k] = {
                "short": norm(it.get("short")),
                "detailed": norm(it.get("detailed")),
                "legalRef": norm(it.get("legalRef")),
                "reviewedStatus": "UNREVIEWED",
            }

    # A verified ok==true item should exist among generated (same chunk); if an ok_
    # item has no generated twin, still ship it (verified text is authoritative).
    for k, v in verified_ok.items():
        if k in flagged:
            continue
        if k not in out:
            out[k] = {
                "short": norm(v.get("short")),
                "detailed": norm(v.get("detailed")),
                "legalRef": norm(v.get("legalRef")),
                "reviewedStatus": "REVIEWED",
            }
            reviewed += 1

    # 4) Write outputs sorted by key for stable diffs.
    out_sorted = {k: out[k] for k in sorted(out.keys(), key=lambda x: (x.split(":")[0], int(x.split(":")[1])))}
    flagged_sorted = {k: flagged[k] for k in sorted(flagged.keys(), key=lambda x: (x.split(":")[0], int(x.split(":")[1])))}

    json.dump(out_sorted, open(OUT_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    json.dump(flagged_sorted, open(FLAGGED_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    unreviewed = sum(1 for v in out.values() if v["reviewedStatus"] == "UNREVIEWED")
    print(f"gen items read         : {gen_count}")
    print(f"ok_ files              : {len(ok_files)}")
    print(f"shipped (explanations) : {len(out)}  (reviewed={reviewed}, unreviewed={unreviewed})")
    print(f"flagged (ok==false)    : {len(flagged)}")
    print(f"wrote {OUT_PATH}")
    print(f"wrote {FLAGGED_PATH}")

    # Sanity: reviewed + unreviewed == shipped
    assert reviewed + unreviewed == len(out), "count mismatch"


if __name__ == "__main__":
    main()
