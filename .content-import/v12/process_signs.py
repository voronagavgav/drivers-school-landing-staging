#!/usr/bin/env python3
"""v12 process sourced signs — write keep verdicts for VERIFIED sign images so v11_apply ships them.
Only signs whose independent verification (signs_verdict/<key>.json correct==true) passed get a verdict.
Rejected ones stay residue. Re-runnable."""
import json, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def V(*a): return os.path.join(HERE, "v12", *a)
def IMG(*a): return os.path.join(HERE, "v11", "img", *a)

files = {m["key"]: m["file"] for m in json.load(open(V("verify_signs.json")))}
vdir = V("signs_verdict")
kept, rejected = [], []
for fn in (os.listdir(vdir) if os.path.isdir(vdir) else []):
    if not fn.endswith(".json"): continue
    d = json.load(open(os.path.join(vdir, fn)))
    k = d.get("key"); f = files.get(k)
    if d.get("correct") and f and os.path.exists(os.path.join(HERE, f)):
        rel = os.path.relpath(os.path.join(HERE, f), HERE)
        json.dump({"key": k, "keep": True, "file": rel, "reason": "v12 sourced+verified official sign", "answer_consistent": "yes"},
                  open(IMG(k.replace(":", "_").replace(".", "_") + ".json"), "w"), ensure_ascii=False)
        kept.append(k)
    else:
        rejected.append((k, d.get("reason", "")[:60]))
print(f"verified signs -> keep verdicts written: {len(kept)} {sorted(kept)}")
print(f"rejected (residue): {len(rejected)}")
for k, r in sorted(rejected): print(f"  {k}: {r}")
