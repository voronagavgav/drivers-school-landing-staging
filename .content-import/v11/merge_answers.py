#!/usr/bin/env python3
"""v11 answer-key cross-validation merge.

Reads every per-pass transcription read_pNN_{A,B,C}.json under v11/akey/, collects the votes
for each (section, qnum), and keeps an answer iff:
  * a single value has >= 2 votes (majority across the 3 independent vision passes), AND
  * that value is within the question's option range (optcounts.json).

Outputs (all under v11/):
  answers_v11.json     {"<section>:<qnum>": <answer int>}  -- validated answers
  disagreements.json   [{key, votes, reason}]              -- unresolved / out-of-range
  audit_existing.json  [{key, v11, existing}]              -- v11 disagrees with an ALREADY
                                                              imported answer (review only;
                                                              never auto-overwrites existing)
Read-only except the three outputs. Safe to re-run.
"""
import json, os, glob
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.abspath(__file__))
def P(*a): return os.path.join(HERE, *a)

optcounts = json.load(open(P("optcounts.json"), encoding="utf-8"))      # "sec:qnum" -> n_options
existing  = json.load(open(P("existing_answers.json"), encoding="utf-8"))  # "sec:qnum" -> answer (imported)
missing   = {m["key"]: m for m in json.load(open(P("missing.json"), encoding="utf-8"))}

# collect votes
votes = defaultdict(list)   # "sec:qnum" -> [answers...]
read_files = sorted(glob.glob(P("akey", "read_p*_*.json")))
for f in read_files:
    try:
        d = json.load(open(f, encoding="utf-8"))
    except Exception as e:
        print(f"WARN: skip unreadable {os.path.basename(f)}: {e}")
        continue
    for sec, qmap in d.items():
        if not isinstance(qmap, dict): continue
        for qn, ans in qmap.items():
            try:
                ans = int(ans)
            except (TypeError, ValueError):
                continue
            votes[f"{sec}:{int(qn)}"].append(ans)

print(f"read {len(read_files)} pass files; {len(votes)} distinct (section,qnum) cells voted")

validated = {}
disagree = []
for key, vs in votes.items():
    c = Counter(vs)
    top, n = c.most_common(1)[0]
    if n < 2:
        disagree.append({"key": key, "votes": dict(c), "reason": "no majority (<2 agree)"})
        continue
    nopt = optcounts.get(key)
    if nopt is not None and not (1 <= top <= nopt):
        disagree.append({"key": key, "votes": dict(c), "reason": f"out of range (1..{nopt})"})
        continue
    validated[key] = top

# audit: where validated disagrees with an already-imported answer
audit = []
for key, v in validated.items():
    if key in existing and existing[key] is not None and existing[key] != v:
        audit.append({"key": key, "v11": v, "existing": existing[key]})

json.dump(validated, open(P("answers_v11.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
json.dump(disagree,  open(P("disagreements.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(audit,     open(P("audit_existing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# coverage report vs the missing set
miss_validated = [k for k in missing if k in validated]
miss_text = [k for k in miss_validated if not missing[k]["has_image"]]
miss_img  = [k for k in miss_validated if missing[k]["has_image"]]
miss_no_ans = [k for k in missing if k not in validated]

print(f"\nvalidated answers (>=2 agree + in range): {len(validated)}")
print(f"disagreements/unresolved cells:           {len(disagree)}")
print(f"audit conflicts vs existing imported:      {len(audit)}")
print(f"\n--- vs the {len(missing)} MISSING questions ---")
print(f"  missing now answer-validated:  {len(miss_validated)}")
print(f"    of which text-only (shippable now): {len(miss_text)}")
print(f"    of which image (await vision):      {len(miss_img)}")
print(f"  missing still WITHOUT a validated answer: {len(miss_no_ans)}")
# which sections still lack answers among missing
sec_gap = Counter(missing[k]["label"] for k in miss_no_ans)
if sec_gap:
    print("  no-answer missing by section: " + ", ".join(f"§{s}:{n}" for s,n in sorted(sec_gap.items(), key=lambda x:[int(p) for p in x[0].split('.')])))
