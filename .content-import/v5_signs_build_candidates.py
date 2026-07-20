#!/usr/bin/env python3
"""v5 signs — assemble the final candidate set for the 'signs' thread.
Scope: §33 single-sign road-sign questions ("Зображений (дорожній) знак ...") that are NOT
pick-the-sign ("Знак N" option lists, already imported in v4). §34 (markings) and §35
(safe-driving theory) contain NO single-sign questions (verified: 0 'Зображений знак' phrase
matches), so they yield no candidates for this thread.

Per question:
  proposedAnswer  : letter from s33_answers.json (>=2 cross-validated reads agree + in range)
  answerValidated : True iff that answer exists (so it is cross-validated) AND letter index in range
  categoryCodes   : ["A","B","C"]  (§33 -> common theory, per import-official.ts categoriesFor)
  imagePaths      : [ canonical before-first-opt sign render (primary), then alternates ]
                    alternates = other v5 renders for this q + original image_assoc direct/neighbour
                    files (the 'sign-above-text' shift hedge). ALL absolute.
  needsVision     : True for every candidate — the sign glyph must be vision-verified against the
                    question text + answer before it can ship (image-association is not trusted).
Writes v5_signs_candidates.json. Read-only on all inputs."""
import json, os, re

BASE = "/Users/clpc/drivers-school/.content-import"
def L(n): return os.path.join(BASE, n)

q = json.load(open(L("questions.json"), encoding="utf-8"))
s33 = next(x for x in q if x["label"] == "33")
s33_ans = {int(k): int(v) for k, v in json.load(open(L("s33_answers.json"), encoding="utf-8")).items()}
v5_assoc = json.load(open(L("v5_signs_assoc.json"), encoding="utf-8"))  # 33#q -> [ {file,abs,before_first_opt,...} ]
orig_assoc = json.load(open(L("image_assoc.json"), encoding="utf-8"))   # 33#q -> [ "images/..." ]

SIGN = re.compile(r"зображ\w*\s+(дорожн\w*\s+)?знак", re.I)
PICK = re.compile(r"^(Знак|Малюнок|Рисунок|Світлофор|Розмітк|Зображенн|Лінія|Жест|Сигнал)\s*№?\s*\d+\.?$", re.I)
def is_pick(opts):
    t = [o["text"].strip() for o in opts]
    return bool(t) and all(PICK.match(x) for x in t)

LETTERS = "ABCDEFG"
def to_letter(n):  # 1-based option index -> letter
    return LETTERS[n - 1] if 1 <= n <= len(LETTERS) else None

def abspath_orig(rel):  # image_assoc paths are repo-relative "images/..."
    return os.path.join(BASE, rel)

candidates = []
for item in s33["questions"]:
    if not SIGN.search(item["text"]):
        continue
    if is_pick(item["options"]):
        continue  # pick-the-sign already imported in v4
    qn = item["qnum"]
    nopts = len(item["options"])
    ans = s33_ans.get(qn)
    answer_validated = ans is not None and 1 <= ans <= nopts
    proposed = to_letter(ans) if answer_validated else None

    # --- build imagePaths: primary canonical sign, then alternates (dedup, keep order) ---
    img_paths = []
    def add(p):
        if p and os.path.exists(p) and p not in img_paths:
            img_paths.append(p)

    v5 = v5_assoc.get(f"33#{qn}", [])
    # primary: the before-first-opt render (canonical single-sign position)
    primary = [x for x in v5 if x.get("before_first_opt")]
    rest = [x for x in v5 if not x.get("before_first_opt")]
    for x in primary:
        add(x["abs"])
    for x in rest:
        add(x["abs"])
    # alternates: original direct association for this q
    for rel in orig_assoc.get(f"33#{qn}", []):
        add(abspath_orig(rel))
    # alternates: neighbour questions' images (sign-above-text shift hedge), v5 then orig
    for nb in (qn - 1, qn + 1):
        for x in v5_assoc.get(f"33#{nb}", []):
            add(x["abs"])
        for rel in orig_assoc.get(f"33#{nb}", []):
            add(abspath_orig(rel))

    candidates.append({
        "section": "33",
        "qnum": qn,
        "text": item["text"],
        "options": [{"letter": to_letter(o["n"]), "text": o["text"]} for o in item["options"]],
        "proposedAnswer": proposed,
        "answerValidated": bool(answer_validated),
        "categoryCodes": ["A", "B", "C"],
        "imagePaths": img_paths,
        "needsVision": True,
    })

out = {"candidates": candidates}
json.dump(out, open(L("v5_signs_candidates.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

total = len(candidates)
val = sum(1 for c in candidates if c["answerValidated"])
noimg = sum(1 for c in candidates if not c["imagePaths"])
print(f"candidates: {total} | answerValidated: {val} | dropped (no validated answer): {total - val}")
print(f"candidates with NO image path at all: {noimg}")
print(f"validated AND has >=1 image: {sum(1 for c in candidates if c['answerValidated'] and c['imagePaths'])}")
