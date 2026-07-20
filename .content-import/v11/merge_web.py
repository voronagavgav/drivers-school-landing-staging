#!/usr/bin/env python3
"""v11 web ground-truth merge — resolve the last unresolved answers from web verdicts.

A web verdict (v11/web/<key>.json: web_answer, confidence, source) RESOLVES a cell iff
web_answer is in range AND:
  * it matches one of our independent reads (focused consensus / v11 / v6 / v1) — web + a read
    agreeing is the ground-truth tiebreak our rules require; OR
  * confidence == "high" (the agent found a text-matching official source on its own).
Cells where the web answer CONTRADICTS every read AND is only medium/low confidence are HELD
(written to web_conflicts.json) — never guessed. Adds resolved to answers_consensus.json. Re-runnable.
"""
import json, os
from collections import Counter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def V(*a): return os.path.join(HERE, "v11", *a)

optc = json.load(open(V("optcounts.json")))
consensus = json.load(open(V("answers_consensus.json")))
targets = {t["key"]: t for t in json.load(open(V("web_targets.json")))}

resolved_new, conflicts, lowconf = {}, [], []
wdir = V("web")
for fn in (os.listdir(wdir) if os.path.isdir(wdir) else []):
    if not fn.endswith(".json"):
        continue
    try:
        w = json.load(open(os.path.join(wdir, fn)))
    except Exception:
        continue
    k = w.get("key"); wa = w.get("web_answer"); conf = (w.get("confidence") or "").lower()
    if k in consensus or wa is None:
        continue
    nopt = optc.get(k)
    if not (isinstance(wa, int) and (nopt is None or 1 <= wa <= nopt)):
        continue
    t = targets.get(k, {}); reads = t.get("reads", {})
    read_vals = set()
    if reads.get("v11") is not None: read_vals.add(reads["v11"])
    if reads.get("v1") is not None: read_vals.add(reads["v1"])
    if reads.get("v6") is not None: read_vals.add(reads["v6"])
    fc = reads.get("focused") or {}
    if fc:
        top = Counter({int(kk): vv for kk, vv in fc.items()}).most_common(1)[0][0]
        read_vals.add(top)
    if wa in read_vals or conf == "high":
        resolved_new[k] = wa
    elif read_vals and wa not in read_vals:
        conflicts.append({"key": k, "web": wa, "confidence": conf, "reads": sorted(read_vals), "source": w.get("source")})
    else:
        lowconf.append({"key": k, "web": wa, "confidence": conf})

added = 0
for k, v in resolved_new.items():
    if k not in consensus:
        consensus[k] = v; added += 1
json.dump(consensus, open(V("answers_consensus.json"), "w"), ensure_ascii=False, indent=0)
json.dump(conflicts, open(V("web_conflicts.json"), "w"), ensure_ascii=False, indent=1)

print(f"web resolved (matches a read OR high-confidence): {len(resolved_new)}  added: {added}")
print(f"web CONFLICTS held (contradicts reads, not high-conf): {len(conflicts)}")
print(f"web low-confidence / no read: {len(lowconf)}")
print(f"consensus now: {len(consensus)}")
if conflicts:
    for c in conflicts[:15]:
        print(f"  CONFLICT {c['key']}: web={c['web']} ({c['confidence']}) vs reads {c['reads']}")
