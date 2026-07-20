#!/usr/bin/env python3
"""Assemble §33 answers from multiple independent reads + the original transcription,
keeping ONLY answers where >=2 reads agree (cross-validated). Range-check vs the parsed
§33 options and intersect with available images. Emits s33_answers.json (confident only)."""
import json
from collections import Counter

def load(path):
    try: return {int(k): int(v) for k, v in json.load(open(path)).items() if v not in (None, 0)}
    except FileNotFoundError: return {}

reads = [load(f"ans_s33_p6_a.json"), load("ans_s33_p6_b.json"),
         load("ans_s33_p7_a.json"), load("ans_s33_p7_b.json")]

# original per-page transcription: §33 rows (page6 label '33', page7 '33' + '?cont')
def from_page(path, labels):
    d = {}
    for r in json.load(open(path)).get("rows", []):
        if str(r["section"]) in labels:
            for q, a in zip(r["q"], r["a"]):
                d[int(q)] = int(a)
    return d
reads.append(from_page("ans_page_06.json", {"33"}))
reads.append(from_page("ans_page_07.json", {"33", "?cont"}))

# §33 questions (canvas) for range-check
s33 = next(s for s in json.load(open("questions.json")) if s["label"] == "33")
nopts = {q["qnum"]: len(q["options"]) for q in s33["questions"]}

confident = {}; uncertain = []
for qn in range(1, 358):
    votes = Counter(r[qn] for r in reads if qn in r)
    if not votes:
        uncertain.append((qn, "no-read")); continue
    val, cnt = votes.most_common(1)[0]
    agree = cnt >= 2
    in_range = qn in nopts and 1 <= val <= nopts[qn]
    if agree and in_range and len(votes) == 1:        # all agree, in range
        confident[qn] = val
    elif agree and in_range:                          # majority agrees despite a stray
        confident[qn] = val
    else:
        uncertain.append((qn, f"votes={dict(votes)} nopts={nopts.get(qn)}"))

json.dump({str(k): v for k, v in confident.items()}, open("s33_answers.json", "w"), ensure_ascii=False)
print(f"§33 questions (canvas): {len(s33['questions'])}")
print(f"cross-validated (>=2 reads agree, in range): {len(confident)}")
print(f"uncertain/excluded: {len(uncertain)}")
print("sample uncertain:", uncertain[:8])
# how many confident also have an image?
assoc = json.load(open("image_assoc.json"))
with_img = sum(1 for qn in confident if f"33#{qn}" in assoc)
print(f"confident AND has image: {with_img}")
