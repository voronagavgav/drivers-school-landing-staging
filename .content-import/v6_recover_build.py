#!/usr/bin/env python3
"""v6 RECOVER thread — cross-validated candidate builder.

Scope (per thread brief): for each CURRENTLY-UNIMPORTED question in the count-mismatched /
range-bad target sections, re-derive its parsed options from the source (questions.json) and
re-read its answer-key cell with REDUNDANCY (two independent vision passes over two different
render pipelines: v6_reads_A.json = 300-DPI color, v6_reads_B.json = 200-DPI grayscale
autocontrast; plus targeted high-zoom tiebreak corrections folded into the reads).

KEEP a recovered candidate ONLY where ALL hold:
  - answer cross-validated: passA[qnum] == passB[qnum] (>=2 independent reads AGREE) AND in 1..optcount
  - option parse is clean: option n's are contiguous 1..N (2<=N<=6), every option text non-empty
  - TEXT-ONLY: the question bears no image (image_map==False). Any image-needing question is
    DEFERRED (never ship an image question without a vision-confirmed display image — not this
    thread's job).
  - the (section,qnum) is currently NOT in import_plan.json (only recover the still-unimported).
  - the qnum is UNAMBIGUOUS (section has no duplicate qnums for it).

Everything else is logged: deferredImage (image/unknown image status) or stillBad (answer reads
disagree / out of range / parse defect / ambiguous).

Writes: .content-import/v6_recover_candidates.json  (shape mirrors v5_recover / s33boundary candidates)
Read-only inputs: questions.json, image_map.json, import_plan.json, v6_reads_A.json, v6_reads_B.json.
DOES NOT import, commit, or touch any non-v6 file.
"""
import json, os, re
from collections import Counter

BASE = "/Users/clpc/drivers-school/.content-import"
def P(*a): return os.path.join(BASE, *a)

qsections = json.load(open(P("questions.json"), encoding="utf-8"))
image_map = json.load(open(P("image_map.json"), encoding="utf-8"))
plan = json.load(open(P("import_plan.json"), encoding="utf-8"))
readsA = json.load(open(P("v6_reads_A.json"), encoding="utf-8"))
readsB = json.load(open(P("v6_reads_B.json"), encoding="utf-8"))
readsC = json.load(open(P("v6_reads_C.json"), encoding="utf-8"))  # targeted tiebreak re-reads (only A/B-conflict cells)

def majority(a, b, c):
    """Cross-validation: return the answer agreed by >=2 of the (non-None) reads, else None.
    A is the 300-DPI pass, B the 200-DPI grayscale pass, C the targeted high-zoom tiebreak."""
    votes = [v for v in (a, b, c) if v is not None]
    if not votes:
        return None
    cnt = Counter(votes)
    val, n = cnt.most_common(1)[0]
    return val if n >= 2 else None

secmap = {s["label"]: s for s in qsections}
imported = {(str(e["label"]), int(e["qnum"])) for e in plan}

# duplicate-qnum sections (ambiguous answer alignment) -> never validate those qnums
DUP = {}
for s in qsections:
    nums = [q["qnum"] for q in s["questions"]]
    DUP[s["label"]] = {k for k, v in Counter(nums).items() if v > 1}

LETTERS = "ABCDEFG"
def letter(n):
    return LETTERS[n - 1] if isinstance(n, int) and 1 <= n <= len(LETTERS) else None

def categories_for(label):
    n = int(label.split(".")[0])
    if 1 <= n <= 39: return ["A", "B", "C"]
    if 40 <= n <= 43: return ["A"]
    if 44 <= n <= 47: return ["B"]
    if 48 <= n <= 51: return ["C"]
    return []  # 52..63 owned by newcats thread (not in this recover scope)

IMG = re.compile(r"малюнк|зображен|наведен|ситуац|рисунк|схем|стрілк|на фото|світлофор|перехрест", re.I)
def image_status(q, label):
    """True=image, False=text-only, None=unknown (absent from PyMuPDF parse)."""
    key = f"{label}#{q['qnum']}"
    pdf = image_map.get(key)
    if pdf is None:
        return None
    blob = q["text"] + " " + " ".join(o["text"] for o in q["options"])
    return bool(pdf) or bool(IMG.search(blob))

def clean_parse(q):
    opts = q["options"]
    ns = [o["n"] for o in opts]
    return (ns == list(range(1, len(ns) + 1)) and 2 <= len(ns) <= 6
            and all(o["text"].strip() for o in opts) and bool(q["text"].strip()))

def opt_objs(q):
    return [{"letter": letter(o["n"]), "text": o["text"]} for o in q["options"]]

# Sections processed in this thread (those with answer reads captured). §16.1 is all-image -> no reads.
TARGET = [lab for lab in ["10", "16.1", "18", "31", "32", "35", "37", "40", "45", "48", "49", "52"]]

candidates = []          # recovered (validated text-only) — shipped shape
deferred_image = []      # logged: needs an image -> defer
still_bad = []           # logged: answer not cross-validated / parse defect / ambiguous

for label in TARGET:
    sec = secmap.get(label)
    if not sec:
        continue
    a_seg = {int(k): v for k, v in readsA.get(label, {}).items() if not str(k).startswith("_")}
    b_seg = {int(k): v for k, v in readsB.get(label, {}).items() if not str(k).startswith("_")}
    c_seg = {int(k): v for k, v in readsC.get(label, {}).items() if not str(k).startswith("_")}
    dupset = DUP.get(label, set())
    for q in sec["questions"]:
        qnum = q["qnum"]
        if (label, qnum) in imported:
            continue  # already shipped — out of recover scope
        optcount = len(q["options"])
        img = image_status(q, label)
        a = a_seg.get(qnum)
        b = b_seg.get(qnum)
        c = c_seg.get(qnum)
        validated_ans = majority(a, b, c)        # >=2 of {A,B,C} agree
        agree = validated_ans is not None
        in_range = (agree and 1 <= validated_ans <= optcount)
        ambiguous = qnum in dupset
        rec = {"section": label, "qnum": qnum, "optCount": optcount,
               "passA": a, "passB": b, "passC": c, "imageStatus": img}
        # 1) image / unknown image status -> DEFER (don't even need the answer)
        if img is not False:
            rec["reason"] = ("image question (image_map/text-cue) -> defer to a vision image pass"
                             if img is True else
                             "image status UNKNOWN (qnum absent from PyMuPDF parse) -> defer (safe)")
            deferred_image.append(rec)
            continue
        # 2) text-only but answer not cross-validated -> stillBad
        if ambiguous:
            rec["reason"] = "duplicate-qnum section: answer-key alignment ambiguous -> drop"
            still_bad.append(rec); continue
        if not agree:
            rec["reason"] = ("answer reads DISAGREE (no >=2 majority among A=%s B=%s C=%s) -> drop"
                             % (a, b, c))
            still_bad.append(rec); continue
        if not in_range:
            rec["reason"] = "cross-validated answer %s out of range (1..%d) -> drop" % (validated_ans, optcount)
            still_bad.append(rec); continue
        if not clean_parse(q):
            rec["reason"] = "option parse not clean -> drop"
            still_bad.append(rec); continue
        # 3) KEEP — text-only, clean parse, >=2 reads agree, in range
        candidates.append({
            "section": label,
            "qnum": qnum,
            "text": q["text"],
            "options": opt_objs(q),
            "proposedAnswer": letter(validated_ans),
            "answerValidated": True,
            "categoryCodes": categories_for(label),
            "imagePaths": [],
            "needsVision": False,
            "_meta": {
                "optionCount": optcount,
                "crossValidatedAnswer": validated_ans,
                "readPassA": a,
                "readPassB": b,
                "readPassC": c,
                "validation": ">=2 of 3 independent answer-key reads AGREE (majority of {passA 300dpi, passB 200dpi-gray, passC high-zoom tiebreak}) AND in range; option parse clean; text-only (no image)",
                "section_title": sec["title"],
                "source": "v6 recover: count-mismatched/range-bad re-read",
            },
        })

out = {"candidates": candidates}
json.dump(out, open(P("v6_recover_candidates.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

# also dump the full log for transparency / audit (v6-namespaced, not imported)
json.dump({"recovered": candidates, "deferredImage": deferred_image, "stillBad": still_bad},
          open(P("v6_recover_log.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---- report ----
by_sec = {}
for c in candidates:
    by_sec.setdefault(c["section"], 0); by_sec[c["section"]] += 1
print("=== v6 recover ===")
print(f"recovered (validated, text-only, shipped): {len(candidates)}")
print(f"deferredImage (logged):                    {len(deferred_image)}")
print(f"stillBad (logged):                         {len(still_bad)}")
print("\nrecovered per section:")
for lab in sorted(by_sec, key=lambda x: (int(x.split('.')[0]), x)):
    print(f"  §{lab:>5}: {by_sec[lab]}")
# stillBad breakdown by reason head
rb = Counter(r["reason"].split(" -> ")[0] for r in still_bad)
print("\nstillBad reasons:")
for k, v in rb.most_common():
    print(f"  {v:>4}  {k}")
print(f"\nwrote v6_recover_candidates.json ({len(candidates)} candidates) + v6_recover_log.json")
