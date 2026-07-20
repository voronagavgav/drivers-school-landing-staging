#!/usr/bin/env python3
"""v12 merge explanations — fold generated explanations into explanations.json (as UNREVIEWED study
aids) and collect the answer-conflict flags for a separate ground-truth pass.
Does NOT overwrite an existing REVIEWED explanation. Re-runnable."""
import json, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def H(*a): return os.path.join(HERE, *a)
def V(*a): return os.path.join(HERE, "v12", *a)

expl = json.load(open(H("explanations.json"), encoding="utf-8"))
edir = V("expl")
added = 0; flagged = []; done = 0
for fn in (os.listdir(edir) if os.path.isdir(edir) else []):
    if not fn.endswith(".json"): continue
    try:
        d = json.load(open(os.path.join(edir, fn), encoding="utf-8"))
    except Exception:
        continue
    k = d.get("key")
    if not k:
        continue
    done += 1
    if d.get("answer_ok") is False and not d.get("image_dependent"):
        flagged.append({"key": k, "conflict_note": d.get("conflict_note", ""),
                        "suggested_answer": d.get("suggested_answer")})
    short = (d.get("short") or "").strip()
    if not short:
        continue
    cur = expl.get(k)
    if cur and (cur.get("reviewedStatus") == "REVIEWED"):
        continue  # never clobber a human/verified-REVIEWED explanation
    expl[k] = {"short": short, "detailed": (d.get("detailed") or "").strip() or None,
               "legalRef": (d.get("legalRef") or "").strip() or None, "reviewedStatus": "UNREVIEWED"}
    added += 1

json.dump(expl, open(H("explanations.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
json.dump(flagged, open(V("expl_flagged.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"processed expl files: {done}")
print(f"explanations merged (UNREVIEWED study aids): {added}; explanations.json now {len(expl)}")
print(f"answer-conflict flags (text Qs) -> ground-truth: {len(flagged)}")
for f in flagged:
    print(f"  {f['key']}: suggest {f['suggested_answer']} — {f['conflict_note'][:70]}")
