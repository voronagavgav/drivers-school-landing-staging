#!/usr/bin/env python3
"""v5 APPLY — select cross-validated v5 candidates and merge them into import_plan.json.

This is the SINGLE writer for the v5 content threads. It is IDEMPOTENT: it rebuilds the
v5 overlay from scratch each run and merges by (label, qnum), so re-running produces the
same import_plan.json and re-copies the same images (no duplicates).

Selection rule (per brief): a candidate ships iff
    answerValidated == True
    AND ( needsVision == False
          OR a vision verdict exists for (section, qnum) with keep == True )
When kept-with-vision, the vision verdict's correctImagePath is the display image.

CORRECTNESS GUARDS (exam tool — a wrong/broken question harms users):
  * Conflicting vision verdicts (same (section,qnum), disagreeing keep) -> DROP.
  * A no-display-image candidate whose question genuinely needs an image
    (image_map[label#qnum] == True) is DROPPED — never ship a "depicted sign"
    question with no image. (image_map==None/False with no PyMuPDF image block is
    trusted text-only, matching the per-thread build scripts' needsVision flag.)
  * recover §33: the recover thread validated ANSWERS but explicitly did NOT verify
    scene-image association (that is the signs thread's job). So a recover §33 candidate
    only ships if it needs no image at all; all its image-bearing questions are owned by
    the signs thread (or dropped if signs has no verified image). In practice recover
    therefore contributes 0 net rows — its validated answers flow through signs.

Inputs (READ-ONLY): import_plan.json (v1-v4 base), v5_*_candidates.json, v5_vision_b*.json,
                    image_map.json. Vision images copied into v5img/ under .content-import.
Output: import_plan.json (rebuilt: base minus overridden keys, plus v5 overlay).
"""
import json, glob, os, re, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
def P(*a): return os.path.join(HERE, *a)

image_map = json.load(open(P("image_map.json"), encoding="utf-8"))
IMG_DEST = P("v5img")  # importer copies from .content-import/<image_src>; image_src = "v5img/<name>"

# image-cue regex. For the strict text-only gate (recover, which owns no verified image)
# this must also catch demonstrative references to a depicted sign/marking that PyMuPDF
# may have failed to detect: "зазначеним/вказаним/позначеним/даним ... дорожнім знаком",
# "який із ... знаків", etc. Over-matching here only DROPS — safe for an exam tool.
IMG_RE = re.compile(
    r"малюнк|зображен|наведен|ситуац|рисунк|схем|стрілк|на фото|світлофор|перехрест"
    r"|зазначен|вказан|позначен|даним|даного|даної|цих\s+двох"
    r"|як(ий|ого|им|их|і)\s+(із|з|з\s+наведених|з\s+указаних)?\s*\S*\s*знак",
    re.I)

# ---- vision verdicts: keep map, dropping conflicting (section,qnum) ----
vraw = {}
for f in sorted(glob.glob(P("v5_vision_b*.json"))):
    for v in json.load(open(f, encoding="utf-8")):
        vraw.setdefault((str(v["section"]), int(v["qnum"])), []).append(v)
vision_keep = {}     # (section,qnum) -> correctImagePath   (only unanimous keep==True)
vision_conflict = []
for k, vs in vraw.items():
    keeps = {bool(x.get("keep")) for x in vs}
    if len(keeps) > 1:                 # disagree -> drop (correctness rule)
        vision_conflict.append(k)
        continue
    if keeps == {True}:
        img = next((x.get("correctImagePath") for x in vs if x.get("correctImagePath")), None)
        if img:
            vision_keep[k] = img

# ---- helpers ----
def ans_to_n(c):
    """Candidate proposedAnswer (letter or int) -> 1-based option index."""
    pa = c["proposedAnswer"]
    if pa is None:
        return None
    if isinstance(pa, int):
        return pa
    letters = [o["letter"] for o in c["options"]]
    return letters.index(pa) + 1 if pa in letters else None

def opts_to_plan(c):
    """Candidate options [{letter,text}] -> plan options [{n,text}] (n = 1-based position)."""
    return [{"n": i + 1, "text": o["text"]} for i, o in enumerate(c["options"])]

def imgmap_label(section):
    # newcats §52/§53 both live under questions.json label "52" (qnum restart split);
    # §53 carries no image by design, §52 image_map key is "52#qnum".
    return "52" if section in ("52", "53") else section

def needs_real_image(c):
    """True iff PyMuPDF saw an actual image block for this question (image_map==True)."""
    key = f"{imgmap_label(c['section'])}#{c['qnum']}"
    return image_map.get(key) is True

def is_text_only(c):
    """Conservative: a question is safely text-only iff PyMuPDF saw NO image block
    (image_map explicitly False) AND its text/options carry no image cue. Unknown
    (image_map None) with an image-referencing stem is treated as image-bearing."""
    key = f"{imgmap_label(c['section'])}#{c['qnum']}"
    if image_map.get(key) is True:
        return False
    blob = c["text"] + " " + " ".join(o["text"] for o in c["options"])
    if IMG_RE.search(blob):
        return False
    return True

SECTION_TITLE = {}  # (collected from candidates' canonical sections via questions.json)
qsections = json.load(open(P("questions.json"), encoding="utf-8"))
qtitle = {s["label"]: s["title"] for s in qsections}
# logical §52/§53 share questions.json title of label "52"; give §53 a distinct title.
S52_53_TITLES = {
    "52": qtitle.get("52", "ДОДАТКОВІ ПИТАННЯ ЩОДО КАТЕГОРІЙ D1, D"),
    "53": "ДОДАТКОВІ ПИТАННЯ ЩОДО КАТЕГОРІЙ D1, D (БУДОВА І ТЕРМІНИ)",
}
def section_title(section):
    if section in S52_53_TITLES:
        return S52_53_TITLES[section]
    return qtitle.get(section, f"Розділ {section}")

# ---- copy a vision image into v5img/ with a stable, collision-free name ----
def stage_image(src_abs, section, qnum):
    ext = os.path.splitext(src_abs)[1].lower() or ".png"
    name = f"v5_{section}_{qnum}{ext}"
    os.makedirs(IMG_DEST, exist_ok=True)
    shutil.copyfile(src_abs, os.path.join(IMG_DEST, name))
    return name  # basename; image_src = "v5img/<name>"

# ---- build the v5 overlay (keyed by (label,qnum)) ----
overlay = {}          # (label, qnum) -> plan entry
report = {"signs": {"kept": 0, "dropped": 0}, "newcats": {"kept": 0, "dropped": 0},
          "recover": {"kept": 0, "dropped": 0}}
drops = {"signs": [], "newcats": [], "recover": []}

def consider(thread, c, *, allow_vision, strict_text_only=False):
    """Apply the selection rule + guards; on keep, add to overlay. Returns True if kept."""
    section = str(c["section"]); qnum = int(c["qnum"])
    key = (section, qnum)
    if not c.get("answerValidated"):
        drops[thread].append((key, "not answerValidated")); return False
    n = ans_to_n(c)
    if n is None or not (1 <= n <= len(c["options"])):
        drops[thread].append((key, "answer out of option range")); return False

    image_basename = None
    if c.get("needsVision"):
        # requires a vision keep
        if not allow_vision or key not in vision_keep:
            drops[thread].append((key, "needsVision but no unanimous vision-keep")); return False
        src = vision_keep[key]
        if not os.path.exists(src):
            drops[thread].append((key, f"vision image missing on disk: {src}")); return False
        image_basename = stage_image(src, section, qnum)
    elif strict_text_only:
        # thread carries no verified display image (recover) -> ship only if provably text-only
        if not is_text_only(c):
            drops[thread].append((key, "image-bearing question with no verified display image (recover)")); return False
    else:
        # no vision required by the thread -> but never ship an image-bearing question w/o image
        if needs_real_image(c):
            drops[thread].append((key, "image_map==True but no verified display image")); return False

    entry = {
        "label": section,
        "section_title": section_title(section),
        "qnum": qnum,
        "text": c["text"],
        "options": opts_to_plan(c),
        "answer": n,
    }
    if image_basename:
        entry["image"] = image_basename
        entry["image_src"] = f"v5img/{image_basename}"
    overlay[key] = entry
    report[thread]["kept"] += 1
    return True

# --- signs: §33 single-sign, every image vision-verified ---
for c in json.load(open(P("v5_signs_candidates.json"), encoding="utf-8"))["candidates"]:
    consider("signs", c, allow_vision=True)

# --- newcats: §52..63 (D / T / BE-CE-DE) ---
for c in json.load(open(P("v5_newcats_candidates.json"), encoding="utf-8"))["candidates"]:
    consider("newcats", c, allow_vision=True)

# --- recover: §33 answers already flow through signs; standalone only if no image needed ---
for c in json.load(open(P("v5_recover_candidates.json"), encoding="utf-8"))["candidates"]:
    key = (str(c["section"]), int(c["qnum"]))
    if key in overlay:               # already shipped by signs/newcats (authoritative)
        drops["recover"].append((key, "already covered by signs/newcats")); continue
    # recover never carries a verified display image -> force strict text-only path
    cc = dict(c); cc["needsVision"] = False
    consider("recover", cc, allow_vision=False, strict_text_only=True)

# tally drops
for t in report:
    report[t]["dropped"] = len(drops[t])

# ---- merge overlay into import_plan.json (idempotent) ----
# Reset v5img to exactly the staged set each run (already rebuilt above by stage_image copies,
# but prune any stale files from a prior run that aren't referenced now).
referenced = {e["image"] for e in overlay.values() if e.get("image")}
if os.path.isdir(IMG_DEST):
    for fn in os.listdir(IMG_DEST):
        if fn not in referenced:
            os.remove(os.path.join(IMG_DEST, fn))

base = json.load(open(P("import_plan.json"), encoding="utf-8"))
override_keys = set(overlay.keys())
# Labels the newcats thread OWNS entirely (§52..63): the v5 re-read is authoritative for the
# whole section, so DROP every old base row for these labels (a base row newcats did not
# re-ship was dropped on purpose — keeping its old, possibly-wrong answer would be a hazard).
# §33 is NOT purged: its base rows are the v4-validated pick-the-sign questions; we only
# override the specific (33,qnum) keys the signs thread re-shipped.
NEWCATS_OWNED = {str(n) for n in range(52, 64)}
def is_purged(e):
    return e["label"].split(".")[0] in NEWCATS_OWNED
# keep base rows that v5 does NOT override and are NOT in a fully-owned label; then append overlay
merged = [e for e in base
          if (e["label"], e["qnum"]) not in override_keys and not is_purged(e)]
purged_base = sum(1 for e in base if is_purged(e) and (e["label"], e["qnum"]) not in override_keys)
def sortkey(e):
    lab = e["label"]; head = lab.split(".")[0]
    return (int(head) if head.isdigit() else 999, lab, e["qnum"])
merged_plus = merged + list(overlay.values())
merged_plus.sort(key=sortkey)

json.dump(merged_plus, open(P("import_plan.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

# ---- report ----
print("=== vision verdicts ===")
print(f"  unanimous keeps: {len(vision_keep)} | conflicting (dropped): {len(vision_conflict)} {vision_conflict}")
print("=== per-thread selection ===")
for t in ("signs", "newcats", "recover"):
    print(f"  {t:8} kept={report[t]['kept']:3}  dropped={report[t]['dropped']:3}")
from collections import Counter
ov_by_label = Counter(k[0] for k in overlay)
print("=== overlay rows by label ===")
print("  " + ", ".join(f"§{l}:{n}" for l, n in sorted(ov_by_label.items(), key=lambda x:(int(x[0].split('.')[0]),x[0]))))
_basekeys = {(e["label"], e["qnum"]) for e in base}
print(f"=== import_plan.json: base={len(base)} -> merged={len(merged_plus)} "
      f"(overrode {len(override_keys & _basekeys)} base rows, "
      f"added {len(override_keys - _basekeys)} new, "
      f"purged {purged_base} stale base rows in owned §52-63) ===")
print(f"=== staged images in v5img/: {len(referenced)} ===")

# emit a machine-readable summary for the apply step
json.dump({
    "vision_keeps": len(vision_keep),
    "vision_conflicts": vision_conflict,
    "kept": {t: report[t]["kept"] for t in report},
    "dropped": {t: report[t]["dropped"] for t in report},
    "overlay_by_label": dict(ov_by_label),
    "import_plan_rows": len(merged_plus),
    "staged_images": len(referenced),
}, open(P("v5_apply_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
