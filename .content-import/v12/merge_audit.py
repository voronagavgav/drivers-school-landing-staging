#!/usr/bin/env python3
"""v12 audit triage — classify the 104-conflict + §52:8 web verdicts.
Does NOT change any answer (changing a LIVE answer needs a skeptic pass first). Outputs:
  v12/audit_fix_candidates.json  — current_wrong @ high confidence (-> skeptic, then override)
  v12/audit_new_answers.json     — {key: official_answer} for the no-answer §52:8-style cells
  prints the tally so we see how many conflicts were just v11 misreads vs real errors.
"""
import json, os
from collections import Counter
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def V(*a): return os.path.join(HERE, "v12", *a)

optc = json.load(open(os.path.join(HERE, "v11", "optcounts.json")))
targets = {t["key"]: t for t in json.load(open(V("audit_targets.json")))}
image_map = json.load(open(os.path.join(HERE, "image_map.json")))
def is_image(key):
    l, q = key.split(":")
    return bool(image_map.get(f"{l}#{q}") or image_map.get(f"{l.split('.')[0]}#{q}"))
adir = V("audit")
tally = Counter(); fix_cands = []; new_ans = {}; uncertain = []; other_wrong = []
for fn in (os.listdir(adir) if os.path.isdir(adir) else []):
    if not fn.endswith(".json"): continue
    d = json.load(open(os.path.join(adir, fn)))
    k = d.get("key"); v = d.get("verdict"); conf = (d.get("confidence") or "").lower()
    oa = d.get("official_answer"); t = targets.get(k, {})
    tally[f"{v}/{conf}"] += 1
    nopt = optc.get(k)
    inrange = isinstance(oa, int) and (nopt is None or 1 <= oa <= nopt)
    if t.get("current_answer") is None:   # no-answer cell (§52:8) — needs an answer, not a fix
        if inrange and conf in ("high", "medium"):
            new_ans[k] = oa
        else:
            uncertain.append(k)
        continue
    # STRICT bar (v8/v9): only a real candidate if web high-conf wrong AND v11's independent read
    # AGREES with web's answer AND the question is TEXT (image answers can't be web-verified — option
    # texts repeat across diagrams). Skeptic pass still required before any override is written.
    if (v == "current_wrong" and conf == "high" and inrange and oa != t.get("current_answer")
            and oa == t.get("alt_read") and not is_image(k)):
        fix_cands.append({"key": k, "current": t["current_answer"], "official": oa,
                          "options": t["options"], "source": d.get("source"), "note": d.get("note")})
    elif v == "current_wrong" and conf == "high" and inrange and oa != t.get("current_answer"):
        other_wrong.append({"key": k, "official": oa, "current": t.get("current_answer"),
                            "v11_agrees": oa == t.get("alt_read"), "image": is_image(k)})

json.dump(fix_cands, open(V("audit_fix_candidates.json"), "w"), ensure_ascii=False, indent=1)
json.dump(new_ans, open(V("audit_new_answers.json"), "w"), ensure_ascii=False, indent=1)
print("verdict tally:", dict(tally))
print(f"\ncurrent_wrong @ high (FIX CANDIDATES -> need skeptic): {len(fix_cands)}")
for c in fix_cands:
    print(f"  {c['key']}: current={c['current']} -> official={c['official']}  ({c['note'][:60] if c['note'] else ''})")
print(f"\nother current_wrong @ high NOT meeting the strict bar (HELD — existing retained): {len(other_wrong)}")
img_n = sum(1 for o in other_wrong if o["image"]); v11n = sum(1 for o in other_wrong if o["v11_agrees"])
print(f"  of those: {img_n} image-question (web unreliable), {v11n} where v11 agrees (text+v11 but caught elsewhere)")
json.dump(other_wrong, open(V("audit_other_wrong.json"), "w"), ensure_ascii=False, indent=1)
print(f"\nno-answer resolved by web (e.g. §52:8): {len(new_ans)} {new_ans}")
print(f"uncertain: {len(uncertain)} {uncertain}")
