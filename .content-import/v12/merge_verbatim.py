#!/usr/bin/env python3
"""v12 verbatim merge — decide answer fixes from exam-base verbatim quotes, matched LOCALLY.

For each conflict, the agent quoted the marked correct-answer TEXT from the exam base. Here we
re-match that quote to our option texts ourselves (don't trust the agent's index), then:
  * APPLY a durable override iff local_match == audit_proposed AND local_match != current
    (the exam base independently confirms our stored answer is wrong and which is right).
  * KEEP existing iff local_match == current (exam base agrees with our answer).
  * else UNCERTAIN -> hold.
CONTROL: 23:10 must resolve to KEEP (local_match == current); printed prominently. Writes overrides
to .content-import/overrides/<qKey>.json. Re-runnable.
"""
import json, os, re, difflib
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def H(*a): return os.path.join(HERE, *a)
def V(*a): return os.path.join(HERE, "v12", *a)
def qkey(label, qnum): return f"q_{label.replace('.', '_')}_{qnum}"
def norm(s): return re.sub(r"\s+", " ", (s or "").strip().lower().replace("'", "'").rstrip("."))

tgt = {t["key"]: t for t in json.load(open(V("verbatim_targets.json")))}
plan = {f"{p['label']}:{p['qnum']}": p for p in json.load(open(H("import_plan.json")))}
fc = {c["key"]: c["official"] for c in json.load(open(V("audit_fix_candidates.json")))}
vdir = V("verbatim")

def local_match(correct_text, options):
    ct = norm(correct_text)
    if not ct: return None
    # exact / containment first
    for i, o in enumerate(options, 1):
        no = norm(o)
        if no and (no == ct or no in ct or ct in no): return i
    # fuzzy fallback
    best, bi = 0.0, None
    for i, o in enumerate(options, 1):
        r = difflib.SequenceMatcher(None, ct, norm(o)).ratio()
        if r > best: best, bi = r, i
    return bi if best >= 0.82 else None

OV = H("overrides"); os.makedirs(OV, exist_ok=True)
applied, kept, uncertain = [], [], []
for fn in (os.listdir(vdir) if os.path.isdir(vdir) else []):
    if not fn.endswith(".json"): continue
    d = json.load(open(os.path.join(vdir, fn)))
    k = d.get("key"); t = tgt.get(k);
    if not t: continue
    cur = t["current_answer"]; proposed = fc.get(k)
    mi = local_match(d.get("correct_text"), t["options"])
    if not d.get("question_matched") or mi is None:
        uncertain.append((k, f"no confident exam-base match (agent_idx={d.get('matched_our_index')})")); continue
    if mi == cur:
        kept.append((k, cur))
    elif mi == proposed and mi != cur:
        p = plan[k]; label, qnum = k.split(":")
        ov = {"options": [{"n": o["n"], "text": o["text"]} for o in p["options"]], "answer": mi,
              "_note": f"v12 verbatim exam-base: {cur}->{mi} ({(d.get('source') or '')[:80]})"}
        json.dump(ov, open(os.path.join(OV, f"{qkey(label, int(qnum))}.json"), "w"), ensure_ascii=False, indent=1)
        applied.append((k, cur, mi))
    else:
        uncertain.append((k, f"exam-base match={mi} != current({cur}) and != proposed({proposed})"))

ctrl = next((a for a in applied if a[0] == '23:10'), None) or next((k for k in kept if k[0] == '23:10'), None)
print("=== CONTROL 23:10:", "KEPT existing (method OK)" if any(k[0]=='23:10' for k in kept)
      else ("APPLIED change (METHOD SUSPECT!)" if any(a[0]=='23:10' for a in applied) else "uncertain"))
print(f"\nAPPLIED overrides (exam-base confirmed wrong): {len(applied)}")
for k, c, n in sorted(applied): print(f"  {k}: {c} -> {n}")
print(f"\nKEPT existing (exam-base agrees): {len(kept)}  {[k for k,_ in sorted(kept)]}")
print(f"UNCERTAIN (held): {len(uncertain)}")
for k, why in sorted(uncertain): print(f"  {k}: {why}")
