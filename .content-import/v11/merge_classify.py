#!/usr/bin/env python3
"""v11 classify merge — apply the final image-flagged classification.
  text_ok      -> add key to force_text.json (ship text-only despite image_map)
  candidate_ok -> write a keep verdict v11/img/<key>.json so apply ships it WITH the image
  needs_image  -> leave held (residue)
Re-runnable."""
import json, os
from collections import Counter
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def V(*a): return os.path.join(HERE, "v11", *a)

cdir = V("classify")
force_text = set(json.load(open(V("force_text.json")))) if os.path.exists(V("force_text.json")) else set()
by = Counter(); needs = []
for fn in (os.listdir(cdir) if os.path.isdir(cdir) else []):
    if not fn.endswith(".json"): continue
    d = json.load(open(os.path.join(cdir, fn)))
    k = d.get("key"); dec = d.get("decision")
    by[dec] += 1
    if dec == "text_ok":
        force_text.add(k)
    elif dec == "candidate_ok" and d.get("file"):
        vf = V("img", k.replace(":", "_").replace(".", "_") + ".json")
        json.dump({"key": k, "keep": True, "file": d["file"], "reason": "classify: candidate_ok", "answer_consistent": "yes"},
                  open(vf, "w"), ensure_ascii=False)
    else:
        needs.append(k)
json.dump(sorted(force_text), open(V("force_text.json"), "w"), ensure_ascii=False, indent=0)
print("decisions:", dict(by))
print("force_text (ship as text):", len(force_text))
print("needs_image (held residue):", len(needs), sorted(needs))
