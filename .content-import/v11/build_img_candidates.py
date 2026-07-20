#!/usr/bin/env python3
"""Rebuild v11/img_candidates.json = every resolved image-question that has a candidate image
on disk (from image_assoc OR the residue extract_assoc) and does NOT yet have a vision verdict.
Prints the key list for the image workflow. Read-only except img_candidates.json."""
import json, os
from collections import Counter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def P(*a): return os.path.join(HERE, *a)
def V(*a): return os.path.join(HERE, "v11", *a)

missing = {m['key']: m for m in json.load(open(V('missing.json')))}
resolved = json.load(open(V('answers_consensus.json')))
assoc = json.load(open(P('image_assoc.json')))
extra = json.load(open(V('extra_assoc.json'))) if os.path.exists(V('extra_assoc.json')) else {}
src = json.load(open(P('questions.json')))
srcq = {(str(s['label']), int(q['qnum'])): q for s in src for q in s['questions']}
have_verdict = set()
if os.path.isdir(V('img')):
    for fn in os.listdir(V('img')):
        if fn.endswith('.json'):
            try: have_verdict.add(json.load(open(V('img', fn)))['key'])
            except Exception: pass

cands = []
for key, ans in resolved.items():
    m = missing.get(key)
    if not m or not m['has_image'] or key in have_verdict: continue
    lbl, qn = key.split(':'); qn = int(qn)
    files = [f for f in (assoc.get(f"{lbl}#{qn}", []) + extra.get(f"{lbl}#{qn}", [])) if os.path.exists(P(f))]
    files = list(dict.fromkeys(files))  # dedup, keep order
    if not files: continue
    q = srcq.get((lbl, qn), {})
    cands.append({"key": key, "label": lbl, "qnum": qn, "answer": ans,
                  "text": q.get('text',''), "options": [o['text'] for o in q.get('options',[])],
                  "candidates": files})

json.dump(cands, open(V('img_candidates.json'), 'w'), ensure_ascii=False, indent=0)
print(f"image candidates needing verdict: {len(cands)}")
print("by section:", ", ".join(f"§{s}:{n}" for s,n in sorted(Counter(c['label'] for c in cands).items(), key=lambda x:[int(p) for p in x[0].split('.')])))
print("KEYS=" + json.dumps([c['key'] for c in cands]))
