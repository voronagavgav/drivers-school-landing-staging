#!/usr/bin/env python3
"""Build v5_newcats_candidates.json for the 'newcats' thread (license categories
D, T, BE/CE/DE — official sections 52..63).

KEY STRUCTURAL FACT: the parser put official §52 (q1..66) AND official §53 (q1..45)
under ONE label "52" in questions.json (qnum restarts at the boundary). We split it
back into logical sections 52 and 53.

Answers: from v5_newcats_myreads.json — my OWN vision reads of answers.pdf pages 10/11,
where each shipped cell had >=2 crisp independent reads AGREE (RAW renders authoritative;
binarized renders distorted some digits and were discarded). Cells marked "DROP_*" or
out of option-count range -> answerValidated=False (parent drops them at apply).

Category codes (intended NEW codes to TAG; a separate Code agent adds the categories):
  52,53,54,55 -> ["D"]            (D1, D buses)
  56,57,58,59 -> ["BE","CE","DE"] (combined trailers BE/C1E/CE/D1E/DE)
  60,61,62,63 -> ["T"]            (tractor T)

needsVision: True ONLY when the question has a genuine associated scene/sign image
(PyMuPDF image block or a resolved q_image path) AND the image file exists for that
exact (logical-section, qnum). The §53 portion is brake/pneumatics TEXT questions and
shares the colliding "52#N" image keys with §52 -> we attach NO image to §53 (avoids a
wrong-image association) and they are text-only anyway.
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
def p(name): return os.path.join(HERE, name)

qsections   = json.load(open(p("questions.json"), encoding="utf-8"))
myreads     = json.load(open(p("v5_newcats_myreads.json"), encoding="utf-8"))
image_map   = json.load(open(p("image_map.json"), encoding="utf-8"))
q_image     = json.load(open(p("q_image.json"), encoding="utf-8"))

CAT = {
    "52": ["D"], "53": ["D"], "54": ["D"], "55": ["D"],
    "56": ["BE", "CE", "DE"], "57": ["BE", "CE", "DE"],
    "58": ["BE", "CE", "DE"], "59": ["BE", "CE", "DE"],
    "60": ["T"], "61": ["T"], "62": ["T"], "63": ["T"],
}

by_label = {s["label"]: s for s in qsections}

def split_52(qs):
    """Return (official_52_questions, official_53_questions) by detecting the qnum restart."""
    s52, s53 = [], []
    seen_restart = False
    prev = 0
    for x in qs:
        if x["qnum"] <= prev:   # restart -> entering official §53
            seen_restart = True
        if seen_restart:
            s53.append(x)
        else:
            s52.append(x)
        prev = x["qnum"]
    return s52, s53

# build logical sections: 52, 53 from label "52"; 54..63 direct
logical = {}
s52q, s53q = split_52(by_label["52"]["questions"])
logical["52"] = s52q
logical["53"] = s53q
for lab in ["54", "55", "56", "57", "58", "59", "60", "61", "62", "63"]:
    logical[lab] = by_label[lab]["questions"]

def image_for(section_label, qnum, is_s53):
    """Resolve genuine image paths for (logical section, qnum). §53 gets none (key collision)."""
    if is_s53:
        return []   # §53 brake/pneumatics text questions; image keys collide with §52
    key = f"{section_label}#{qnum}"
    paths = []
    # prefer the verified single image from q_image (multi-panel pre-stacked)
    qi = q_image.get(key)
    if qi:
        ap = os.path.join(HERE, qi)
        if os.path.exists(ap):
            paths.append(ap)
    # also include any raw extracted panels images/<sec>_<q>_*.jpeg that exist
    if not paths and image_map.get(key):
        # gather images/<sec>_<q>_N.jpeg
        idir = os.path.join(HERE, "images")
        if os.path.isdir(idir):
            pref = f"{section_label}_{qnum}_"
            for fn in sorted(os.listdir(idir)):
                if fn.startswith(pref) and fn.lower().endswith((".jpeg", ".jpg", ".png")):
                    paths.append(os.path.join(idir, fn))
    return paths

candidates = []
stats = {"total": 0, "validated": 0, "dropped_drop": 0, "dropped_range": 0, "needs_vision": 0}

# §52 uses label-"52" qnums 1..66; §53 uses its own restarted qnums 1..45
for lab in ["52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63"]:
    qs = logical[lab]
    ans = myreads.get(lab, {})
    is_s53 = (lab == "53")
    # source label used for image lookup is always "52" for both 52 and 53 logical sections
    img_label = "52" if lab in ("52", "53") else lab
    for x in qs:
        qn = x["qnum"]
        stats["total"] += 1
        raw_ans = ans.get(str(qn))
        nopts = len(x["options"])
        proposed = None
        validated = False
        if isinstance(raw_ans, int):
            if 1 <= raw_ans <= nopts:
                proposed = str(raw_ans)
                validated = True
                stats["validated"] += 1
            else:
                stats["dropped_range"] += 1
        elif isinstance(raw_ans, str) and raw_ans.startswith("DROP"):
            stats["dropped_drop"] += 1
        # imagePaths (none for §53)
        imgs = image_for(img_label, qn, is_s53)
        needs_vision = bool(imgs)
        if needs_vision:
            stats["needs_vision"] += 1
        candidates.append({
            "section": lab,
            "qnum": qn,
            "text": x["text"],
            "options": [{"letter": str(o["n"]), "text": o["text"]} for o in x["options"]],
            "proposedAnswer": proposed,        # may be None if dropped
            "answerValidated": validated,
            "categoryCodes": CAT[lab],
            "imagePaths": imgs,
            "needsVision": needs_vision,
        })

out = {"candidates": candidates}
json.dump(out, open(p("v5_newcats_candidates.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("wrote v5_newcats_candidates.json")
print("stats:", json.dumps(stats, ensure_ascii=False))
# per-section summary
from collections import Counter
secc = Counter(c["section"] for c in candidates)
vsec = Counter(c["section"] for c in candidates if c["answerValidated"])
nv   = Counter(c["section"] for c in candidates if c["needsVision"])
print(f"{'sec':>4} {'total':>5} {'valid':>5} {'vision':>6} cats")
for lab in ["52","53","54","55","56","57","58","59","60","61","62","63"]:
    print(f"{lab:>4} {secc[lab]:>5} {vsec[lab]:>5} {nv[lab]:>6} {CAT[lab]}")
