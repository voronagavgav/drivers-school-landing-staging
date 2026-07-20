#!/usr/bin/env python3
"""v6 APPLY — single writer that layers the v6 content threads onto the v5 import_plan.

IDEMPOTENT. Each run rebuilds the plan deterministically:
  1. Re-run the v5 apply (v5_apply.py) so import_plan.json is the canonical v5 base
     (v5 overlay + staged v5img/ images), regardless of prior partial v6 runs.
  2. Layer the v6 overlay on top, keyed by (label, qnum), merging by key so re-running
     produces the same import_plan.json and re-copies the same images (no duplicates).

v6 threads handled here (per the FINAL APPLY brief):
  * recover — count-mismatched / range-bad questions re-validated by >=2 of 3 independent
    answer-key reads. All are text-only (needsVision==False) and answerValidated==True.
  * s33boundary — the §33 217-224 page-boundary questions (plus 297/340) recovered by v6.
    Every one carries needsVision==True (it depicts a road sign) but the candidate file has
    NO in-file vision-confirmation marker and there is NO accompanying v6 vision-verdict file.

Selection rule (per brief): ship a candidate iff
    answerValidated == True
    AND ( needsVision == False
          OR its image was VISION-CONFIRMED IN THE CANDIDATE FILE )
"In-file vision-confirmation" = a per-candidate truthy flag among
    visionConfirmed / imageVerified / visionKeep / keep
(or a unanimous external v6 vision-verdict file, of which there are none). Because the
s33boundary candidates carry none of these, every s33boundary candidate is DROPPED and
LOGGED (correctness rule: never ship an image question whose image isn't vision-confirmed).

Extra correctness guards (exam tool — a wrong/broken question harms users):
  * answer must resolve to a 1-based index within the option count, else DROP.
  * a candidate whose (label,qnum) is already shipped by the v5 base / earlier v6 thread is
    skipped (the existing row is authoritative) — no duplicates.
  * for a text-only ship, the question must not look image-bearing (image_map==True or an
    image cue in the stem) — recover already filtered these, but we re-assert here.

Inputs (READ-ONLY except import_plan.json which it rewrites):
    import_plan.json (rebuilt by v5_apply.py first), v6_recover_candidates.json,
    v6_s33boundary_candidates.json, image_map.json, questions.json.
Images: recover ships none; if a future v6 image thread is added, its kept images are copied
    into v6img/ (image_src = "v6img/<name>"), which the importer reads from .content-import/.
Output: import_plan.json (v5 base + v6 overlay), v6_apply_summary.json.
"""
import json, os, re, runpy, shutil, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
def P(*a): return os.path.join(HERE, *a)

# ---- 0) strip any prior v6 overlay so v5_apply sees a clean v1-v5 base -----------------
# v5_apply.py reads import_plan.json AS ITS OWN base and only rebuilds the v1-v5 overlay — it
# does NOT remove rows this v6 apply appended (the v6 recover rows live in §10-49, outside the
# §52-63 v5 purges). Without this strip, a re-run would feed those rows back into v5_apply's
# base, inflating its count. Remove every "_v6"-tagged row first → full-pipeline idempotency.
_pre = P("import_plan.json")
if os.path.exists(_pre):
    _plan = json.load(open(_pre, encoding="utf-8"))
    _clean = [e for e in _plan if not e.get("_v6")]
    if len(_clean) != len(_plan):
        json.dump(_clean, open(_pre, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"=== [v6] stripped {len(_plan) - len(_clean)} prior v6 rows before v5_apply ===")

# ---- 1) rebuild the v5-canonical base first (idempotent) ------------------------------
# Run v5_apply.py in its own module namespace so its prints/summary still emit. This resets
# import_plan.json to the v5 state and restages v5img/ — so v6 always layers on a clean base.
print("=== [v6] re-running v5_apply.py to rebuild the v5 base ===")
runpy.run_path(P("v5_apply.py"), run_name="__v5_apply__")
print("=== [v6] v5 base rebuilt; layering v6 overlay ===\n")

# ---- shared inputs --------------------------------------------------------------------
image_map = json.load(open(P("image_map.json"), encoding="utf-8"))
qsections = json.load(open(P("questions.json"), encoding="utf-8"))
qtitle = {s["label"]: s["title"] for s in qsections}

IMG_DEST = P("v6img")  # importer copies from .content-import/<image_src>; image_src = "v6img/<name>"

# Image-cue regex. MUST match the recover thread's own build-time image filter
# (v6_recover_build.py `IMG`) exactly, so a candidate the recover build validated as
# text-only is not second-guessed by a broader pattern. image_map==True (the PyMuPDF
# image-block signal) is the authoritative image marker; the text cue only catches the
# image_map==None/unknown case. A broader regex here would false-positive on innocent
# substrings ("вказівник", inflected "позначен…") and wrongly DROP validated text-only
# questions — so we deliberately use the SAME narrow pattern the candidates were built with.
IMG_RE = re.compile(
    r"малюнк|зображен|наведен|ситуац|рисунк|схем|стрілк|на фото|світлофор|перехрест",
    re.I)

LETTERS = "ABCDEFG"
VISION_OK_FLAGS = ("visionConfirmed", "imageVerified", "visionKeep", "keep")

def ans_to_n(c):
    pa = c.get("proposedAnswer")
    if pa is None:
        return None
    if isinstance(pa, int):
        return pa
    return LETTERS.index(pa) + 1 if pa in LETTERS else None

def opts_to_plan(c):
    return [{"n": i + 1, "text": o["text"]} for i, o in enumerate(c["options"])]

def section_title(section):
    return qtitle.get(section, f"Розділ {section}")

def in_file_vision_confirmed(c):
    """True iff the candidate file itself marks this image as vision-confirmed."""
    return any(bool(c.get(f)) for f in VISION_OK_FLAGS)

def looks_image_bearing(c):
    """Mirror v6_recover_build.image_status: image_map==True -> image; image_map==False ->
    trust as text-only (PyMuPDF saw no image block); image_map missing (None) -> fall back
    to the narrow text cue. A candidate the recover build shipped (image_map==False) is thus
    never re-flagged here."""
    key = f"{c['section']}#{c['qnum']}"
    pdf = image_map.get(key)
    if pdf is True:
        return True
    if pdf is False:
        return False
    blob = c["text"] + " " + " ".join(o["text"] for o in c["options"])
    return bool(IMG_RE.search(blob))

def stage_image(src_abs, section, qnum):
    ext = os.path.splitext(src_abs)[1].lower() or ".png"
    name = f"v6_{section}_{qnum}{ext}"
    os.makedirs(IMG_DEST, exist_ok=True)
    shutil.copyfile(src_abs, os.path.join(IMG_DEST, name))
    return name

# ---- load the v5-rebuilt base ----------------------------------------------------------
# IDEMPOTENCY: v5_apply.py rebuilds only the v1-v5 plan; it does NOT remove rows this v6 apply
# previously appended. So strip every prior v6 overlay row (tagged "_v6") before re-layering —
# otherwise a second run would see them as "base" and silently keep stale/false-positive picks.
plan_in = json.load(open(P("import_plan.json"), encoding="utf-8"))
base = [e for e in plan_in if not e.get("_v6")]
base_keys = {(e["label"], e["qnum"]) for e in base}

overlay = {}
report = {"recover": {"kept": 0, "dropped": 0}, "s33boundary": {"kept": 0, "dropped": 0}}
drops = {"recover": [], "s33boundary": []}

def consider(thread, c):
    section = str(c["section"]); qnum = int(c["qnum"])
    key = (section, qnum)
    if key in base_keys or key in overlay:
        drops[thread].append((key, "already shipped (v5 base / earlier v6 thread)")); return
    if not c.get("answerValidated"):
        drops[thread].append((key, "not answerValidated")); return
    n = ans_to_n(c)
    if n is None or not (1 <= n <= len(c["options"])):
        drops[thread].append((key, "answer out of option range")); return

    image_basename = None
    if c.get("needsVision"):
        # image question -> ship only if vision-confirmed IN THE CANDIDATE FILE
        if not in_file_vision_confirmed(c):
            drops[thread].append((key, "needsVision but image NOT vision-confirmed in candidate file")); return
        # vision-confirmed: stage the confirmed image (first existing imagePath)
        src = next((p for p in c.get("imagePaths", []) if os.path.exists(p)), None)
        if not src:
            drops[thread].append((key, "vision-confirmed but no image file on disk")); return
        image_basename = stage_image(src, section, qnum)
    else:
        # text-only thread -> never ship an image-bearing question without a confirmed image
        if looks_image_bearing(c):
            drops[thread].append((key, "image-bearing question shipped as text-only -> drop")); return

    entry = {
        "label": section,
        "section_title": section_title(section),
        "qnum": qnum,
        "text": c["text"],
        "options": opts_to_plan(c),
        "answer": n,
        "_v6": True,  # idempotency marker: stripped + re-layered each run (importer ignores it)
    }
    if image_basename:
        entry["image"] = image_basename
        entry["image_src"] = f"v6img/{image_basename}"
    overlay[key] = entry
    report[thread]["kept"] += 1

# --- recover: text-only, cross-validated count-mismatch/range-bad questions ---
for c in json.load(open(P("v6_recover_candidates.json"), encoding="utf-8"))["candidates"]:
    consider("recover", c)

# --- s33boundary: §33 217-224/297/340 — image questions, must be vision-confirmed in-file ---
for c in json.load(open(P("v6_s33boundary_candidates.json"), encoding="utf-8"))["candidates"]:
    consider("s33boundary", c)

for t in report:
    report[t]["dropped"] = len(drops[t])

# ---- prune v6img/ to exactly the referenced set (idempotent) ----
referenced = {e["image"] for e in overlay.values() if e.get("image")}
if os.path.isdir(IMG_DEST):
    for fn in os.listdir(IMG_DEST):
        if fn not in referenced:
            os.remove(os.path.join(IMG_DEST, fn))
elif referenced:
    os.makedirs(IMG_DEST, exist_ok=True)

# ---- merge overlay into the plan (append + stable sort; v6 never overrides existing keys) ----
def sortkey(e):
    head = e["label"].split(".")[0]
    return (int(head) if head.isdigit() else 999, e["label"], e["qnum"])

merged = base + list(overlay.values())
merged.sort(key=sortkey)
json.dump(merged, open(P("import_plan.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

# ---- report ----
print("\n=== v6 per-thread selection ===")
for t in ("recover", "s33boundary"):
    print(f"  {t:12} kept={report[t]['kept']:3}  dropped={report[t]['dropped']:3}")
if drops["s33boundary"]:
    reasons = Counter(r for _, r in drops["s33boundary"])
    print("  s33boundary drop reasons:")
    for r, n in reasons.most_common():
        print(f"    {n:3}  {r}")
ov_by_label = Counter(k[0] for k in overlay)
print("=== v6 overlay rows by label ===")
print("  " + ", ".join(f"§{l}:{n}" for l, n in sorted(ov_by_label.items(), key=lambda x: (int(x[0].split('.')[0]), x[0]))) or "  (none)")
print(f"=== import_plan.json: v5 base={len(base)} -> {len(merged)} (added {len(overlay)} v6 rows) ===")
print(f"=== staged v6 images in v6img/: {len(referenced)} ===")

json.dump({
    "kept": {t: report[t]["kept"] for t in report},
    "dropped": {t: report[t]["dropped"] for t in report},
    "overlay_by_label": dict(ov_by_label),
    "v5_base_rows": len(base),
    "import_plan_rows": len(merged),
    "staged_v6_images": len(referenced),
    "s33boundary_drop_reasons": dict(Counter(r for _, r in drops["s33boundary"])),
}, open(P("v6_apply_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
