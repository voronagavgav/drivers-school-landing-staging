#!/usr/bin/env python3
"""v5 RECOVER thread candidate builder.

Scope (per thread brief):
  - 68 range-bad questions inside COUNT-MATCHED sections (answer-cell read disagrees
    with parsed option count -> either a misread answer OR a dropped/merged option).
  - count-mismatched HELD-OUT sections: §10,16.1,18,31,32,33,35,37,40,45,48,49,52.

For each held-out / range-bad question we:
  - re-attach the canonical parsed options (questions.json),
  - attach the relevant ANSWER-KEY page image(s) so a vision subagent can re-read the cell
    with redundancy, and (if the question has an extracted scene image) attach that too,
  - set answerValidated=true ONLY when an existing >=2-read-agree + in-range source backs it
    (today: §33 via s33_answers.json). Everything else answerValidated=false + needsVision=true
    so the orchestrator's vision subagents do the redundant re-read before apply.

CORRECTNESS RULE: a proposed answer letter ships only if cross-validated (>=2 reads agree AND
within the option count). Candidates with answerValidated=false are written too (they get
dropped at apply) so nothing is silently lost, but they will NOT import until validated.

Writes: .content-import/v5_recover_candidates.json
Read-only inputs: questions.json, answers_by_section.json, image_assoc.json, s33_answers.json,
                  ans_page_*.json, akey-*.jpg.
"""
import json, glob, os, re

BASE = "/Users/clpc/drivers-school/.content-import"
def P(*a): return os.path.join(BASE, *a)

qsections = json.load(open(P("questions.json"), encoding="utf-8"))
abs_ = json.load(open(P("answers_by_section.json"), encoding="utf-8"))   # count-matched sections
image_assoc = json.load(open(P("image_assoc.json"), encoding="utf-8"))
try:
    s33_ans = {str(k): int(v) for k, v in json.load(open(P("s33_answers.json"), encoding="utf-8")).items()}
except FileNotFoundError:
    s33_ans = {}

known = {s["label"] for s in qsections}
secmap = {s["label"]: s for s in qsections}
qmap = {}
for s in qsections:
    for q in s["questions"]:
        qmap[(s["label"], q["qnum"])] = q

# Sections whose parser produced DUPLICATE qnums (two distinct questions share a qnum) ->
# the (section,qnum) key is ambiguous; we must emit BOTH and flag a parse defect.
from collections import Counter
DUP_SECTIONS = {}
for s in qsections:
    nums = [q["qnum"] for q in s["questions"]]
    if len(nums) != len(set(nums)):
        DUP_SECTIONS[s["label"]] = {k for k, v in Counter(nums).items() if v > 1}

# ---- num -> answer letter ----
LETTERS = "ABCDEFG"
def letter(n):
    return LETTERS[n - 1] if isinstance(n, int) and 1 <= n <= len(LETTERS) else None

# ---- category codes a section maps to (mirrors scripts/import-official.ts categoriesFor) ----
def categories_for(label):
    n = int(label.split(".")[0])
    if 1 <= n <= 39: return ["A", "B", "C"]
    if 40 <= n <= 43: return ["A"]
    if 44 <= n <= 47: return ["B"]
    if 48 <= n <= 51: return ["C"]
    return []  # 52..63 -> D/T/BE: owned by the 'newcats' thread (no seeded category yet)

# ---- answer-key page (1-indexed) -> akey-{page-1:03d}.jpg ; from single-read coverage ----
# page -> ordered sections present (computed from ans_page_*.json)
page_sections = {}
for f in sorted(glob.glob(P("ans_page_*.json"))):
    d = json.load(open(f, encoding="utf-8"))
    pg = d.get("page")
    seen = []
    for r in d.get("rows", []):
        s = str(r.get("section"))
        if s not in seen:
            seen.append(s)
    page_sections[pg] = seen
# section -> list of akey image absolute paths (pages where the section appears)
section_akey = {}
for pg, secs in page_sections.items():
    img = P(f"akey-{pg-1:03d}.jpg")
    for s in secs:
        section_akey.setdefault(s, [])
        if img not in section_akey[s]:
            section_akey[s].append(img)

def akey_for(label):
    return list(section_akey.get(label, []))

def scene_images(label, qnum):
    rels = image_assoc.get(f"{label}#{qnum}") or []
    return [P(r) for r in rels]

# ---- re-align single answer reads to find range-bad inside count-matched sections ----
pages = [json.load(open(f, encoding="utf-8")) for f in sorted(glob.glob(P("ans_page_*.json")))]
by_label = {}
cur = None
for pg in pages:
    for row in pg.get("rows", []):
        lab = str(row.get("section") or "").strip()
        q = row.get("q") or []; a = row.get("a") or []
        n = min(len(q), len(a)); q, a = q[:n], a[:n]
        if not q:
            continue
        if lab in known:
            cur = lab
        d = by_label.setdefault(cur, {})
        for qq, aa in zip(q, a):
            d[int(qq)] = int(aa)

RANGE_BAD = []  # (label, qnum, single_read_answer, optcount)
for lab in abs_:                     # count-matched sections only
    seg = by_label.get(lab, {})
    sec = secmap.get(lab)
    if not sec:
        continue
    optc = {q["qnum"]: len(q["options"]) for q in sec["questions"]}
    for qnum, a in seg.items():
        oc = optc.get(qnum)
        if oc is None:
            continue
        if not (1 <= a <= oc):
            RANGE_BAD.append((lab, qnum, a, oc))

HELD_OUT_SECTIONS = ["10", "16.1", "18", "31", "32", "33", "35", "37", "40", "45", "48", "49", "52"]

candidates = []
seen_keys = set()

def opt_objs(q):
    return [{"letter": letter(o["n"]), "text": o["text"]} for o in q["options"]]

def add(label, q, *, occ=0, ndup=1, proposed, validated, note_vision_reason):
    qnum = q["qnum"]
    # disambiguating key: include occurrence index for sections with duplicate qnums
    key = (label, qnum, occ)
    if key in seen_keys:
        return
    seen_keys.add(key)
    sec = secmap[label]
    scenes = scene_images(label, qnum)
    akeys = akey_for(label)
    img_paths = akeys + scenes              # answer-key page(s) first, then scene image(s)
    cats = categories_for(label)
    parse_ambiguous = ndup > 1              # two distinct questions share this qnum -> parse defect
    reason = note_vision_reason
    if parse_ambiguous:
        reason = (f"PARSE DEFECT: §{label} qnum {qnum} has {ndup} distinct questions sharing this "
                  f"number (occurrence {occ+1}/{ndup}); section was mis-split (likely D/Т sub-sections "
                  f"merged). Answer-key alignment is ambiguous. " + reason)
    candidates.append({
        "section": label,
        "qnum": qnum,
        "text": q["text"],
        "options": opt_objs(q),
        "proposedAnswer": letter(proposed) if proposed else None,
        "answerValidated": bool(validated and not parse_ambiguous),  # never validate an ambiguous parse
        "categoryCodes": cats,
        "imagePaths": img_paths,
        # needsVision (this thread's lens) = the recover thread still owes a redundant ANSWER-CELL
        # re-read (+ option re-parse). When the answer is already cross-validated (s33), the only
        # remaining work is scene-image association, which belongs to the SIGNS thread, not here.
        "needsVision": not (validated and not parse_ambiguous),
        "_meta": {
            "optionCount": len(q["options"]),
            "singleReadAnswer": by_label.get(label, {}).get(qnum),
            "hasSceneImage": bool(scenes),
            "parseAmbiguous": parse_ambiguous,
            "dupOccurrence": (occ + 1) if parse_ambiguous else None,
            "dupTotal": ndup if parse_ambiguous else None,
            "visionReason": reason,
            "section_title": sec["title"],
        },
    })

# --- 1) range-bad questions in count-matched sections ---
for lab, qnum, a, oc in RANGE_BAD:
    q = qmap.get((lab, qnum))
    if not q:
        continue
    add(lab, q, proposed=None, validated=False,
        note_vision_reason=f"range-bad: single read said {a} but only {oc} parsed options; re-read cell + re-derive options")

# --- 2) held-out count-mismatched sections ---
for lab in HELD_OUT_SECTIONS:
    sec = secmap.get(lab)
    if not sec:
        continue
    dupset = DUP_SECTIONS.get(lab, set())
    occ_counter = {}                    # qnum -> next occurrence index
    # precompute how many entries share each qnum (for dup flagging)
    total_per_qnum = Counter(q["qnum"] for q in sec["questions"])
    for q in sec["questions"]:
        qnum = q["qnum"]
        occ = occ_counter.get(qnum, 0)
        occ_counter[qnum] = occ + 1
        ndup = total_per_qnum[qnum]
        proposed = None
        validated = False
        reason = "section not count-matched in answer key; re-read cell with redundancy"
        # s33 cross-validated answers only apply when the qnum is UNAMBIGUOUS (no dup)
        if lab == "33" and ndup == 1:
            a = s33_ans.get(str(qnum))
            if a is not None and 1 <= a <= len(q["options"]):
                proposed = a
                validated = True       # s33_answers.json = >=2 reads agree + in range (v4 work)
                reason = "answer cross-validated via s33_answers (>=2 agree, in range); vision still needed to verify scene-image association (sign-above-text risk)"
        add(lab, q, occ=occ, ndup=ndup, proposed=proposed, validated=validated,
            note_vision_reason=reason)

out = {"candidates": candidates}
json.dump(out, open(P("v5_recover_candidates.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

# ---- report ----
nval = sum(1 for c in candidates if c["answerValidated"])
nvis = sum(1 for c in candidates if c["needsVision"])
by_sec = {}
for c in candidates:
    by_sec.setdefault(c["section"], [0, 0])
    by_sec[c["section"]][0] += 1
    if c["answerValidated"]:
        by_sec[c["section"]][1] += 1
withscene = sum(1 for c in candidates if c["_meta"]["hasSceneImage"])
print(f"total candidates: {len(candidates)}")
print(f"answerValidated: {nval}")
print(f"needsVision (answer re-read owed): {nvis}")
print(f"with scene image attached: {withscene}")
print(f"range-bad included: {len(RANGE_BAD)}")
print("\nper-section (total / validated):")
for lab in sorted(by_sec, key=lambda x: (int(x.split('.')[0]), x)):
    print(f"  §{lab:>5}: {by_sec[lab][0]:>4} / {by_sec[lab][1]}")
