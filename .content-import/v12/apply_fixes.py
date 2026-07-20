#!/usr/bin/env python3
"""v12 apply — write durable overrides for DOUBLE-confirmed answer fixes, and add §52:8.

A live answer is changed ONLY when BOTH passes agree it's wrong: the web audit (high-conf
current_wrong + v11 read agrees, text question) AND the adversarial skeptic (change_confirmed,
high, via the official EXAM BASE). The fix is written as .content-import/overrides/<qKey>.json
(options verbatim + corrected answer) — applied override-wins by the importer, survives any reimport.
§52:8 (a missing text question the audit resolved) is added to answers_consensus.json to ship.
Prints exactly what it changed. Re-runnable.
"""
import json, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def H(*a): return os.path.join(HERE, *a)
def V(*a): return os.path.join(HERE, "v12", *a)

def qkey(label, qnum): return f"q_{label.replace('.', '_')}_{qnum}"

cands = {c["key"]: c for c in json.load(open(V("skeptic_targets.json")))}
plan = json.load(open(H("import_plan.json")))
planq = {f"{p['label']}:{p['qnum']}": p for p in plan}
sdir = V("skeptic")

OV = H("overrides"); os.makedirs(OV, exist_ok=True)
applied, rejected = [], []
for fn in (os.listdir(sdir) if os.path.isdir(sdir) else []):
    if not fn.endswith(".json"): continue
    s = json.load(open(os.path.join(sdir, fn)))
    k = s.get("key"); c = cands.get(k)
    if not c: continue
    if s.get("change_confirmed") and (s.get("confidence") or "").lower() == "high":
        p = planq.get(k)
        if not p:
            rejected.append((k, "not in plan")); continue
        label, qnum = k.split(":")
        ov = {"options": [{"n": o["n"], "text": o["text"]} for o in p["options"]],
              "answer": c["official"],
              "_note": f"v12 audit+skeptic: corrected {c['current']}->{c['official']} ({(s.get('source') or '')[:80]})"}
        json.dump(ov, open(os.path.join(OV, f"{qkey(label, int(qnum))}.json"), "w"), ensure_ascii=False, indent=1)
        applied.append((k, c["current"], c["official"]))
    else:
        rejected.append((k, f"skeptic defended existing (confirmed={s.get('change_confirmed')}, conf={s.get('confidence')})"))

# §52:8 new answer -> consensus (was missing/unanswered)
new_ans = json.load(open(V("audit_new_answers.json")))
cons = json.load(open(H("v11", "answers_consensus.json")))
added = 0
for k, a in new_ans.items():
    if k not in cons:
        cons[k] = a; added += 1
json.dump(cons, open(H("v11", "answers_consensus.json"), "w"), ensure_ascii=False, indent=0)

print(f"=== answer fixes APPLIED as overrides (double-confirmed): {len(applied)} ===")
for k, cur, off in sorted(applied):
    print(f"  {k}: {cur} -> {off}")
print(f"\n=== candidates REJECTED (skeptic defended existing — NOT changed): {len(rejected)} ===")
for k, why in sorted(rejected):
    print(f"  {k}: {why}")
print(f"\n§52:8-style new answers added to consensus: {added} {new_ans}")
