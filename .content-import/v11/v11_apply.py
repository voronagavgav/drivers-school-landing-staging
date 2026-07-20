#!/usr/bin/env python3
"""v11 APPLY — single writer that layers the remaining official questions onto the v6 base.

IDEMPOTENT (mirrors v6_apply.py): each run
  1. strips any prior "_v11" rows from import_plan.json,
  2. re-runs v6_apply.py (which itself re-runs v5_apply.py) to rebuild the canonical base,
  3. layers the v11 overlay keyed by (label, qnum).

v11 fills the gap between the 1693-row base and the full official base (~2330). A missing
question's content (text + options) comes from the source parse questions.json; its ANSWER comes
from the cross-validated answer key (answers_v11.json, >=2 of 3 vision passes agree + in range);
its IMAGE (if image-bearing) comes from a vision verdict file v11/img/<key>.json.

Selection rule (correctness — a wrong/imageless exam question harms users): ship a missing Q iff
    it is NOT already in the base
    AND a validated answer exists in answers_v11.json that is within the option range
    AND ( the question is text-only (image_map != True)
          OR a vision verdict v11/img/<key>.json has keep==true AND its file exists on disk )
Text-only guard: a question flagged image-bearing (image_map==True) is NEVER shipped as text-only.

Inputs (READ-ONLY except import_plan.json): questions.json, answers_v11.json, image_map.json,
    v11/img/*.json. Images staged into v11img/ (image_src="v11img/<name>"; importer copies them
    into public/official-images/). Output: import_plan.json, v11/v11_apply_summary.json.
"""
import json, os, runpy, shutil
from collections import Counter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .content-import/
def P(*a): return os.path.join(HERE, *a)
def V(*a): return os.path.join(HERE, "v11", *a)

# ---- 0) strip prior v11 overlay so the base rebuild is clean ----
pre = P("import_plan.json")
if os.path.exists(pre):
    plan = json.load(open(pre, encoding="utf-8"))
    clean = [e for e in plan if not e.get("_v11")]
    if len(clean) != len(plan):
        json.dump(clean, open(pre, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"=== [v11] stripped {len(plan)-len(clean)} prior v11 rows ===")

# ---- 1) rebuild the v6-canonical base (idempotent; re-runs v5 then v6) ----
print("=== [v11] re-running v6_apply.py to rebuild the base ===")
runpy.run_path(P("v6_apply.py"), run_name="__v6_apply__")
print("=== [v11] base rebuilt; layering v11 overlay ===\n")

# ---- shared inputs ----
image_map = json.load(open(P("image_map.json"), encoding="utf-8"))
qsections = json.load(open(P("questions.json"), encoding="utf-8"))
qtitle = {str(s["label"]): s["title"] for s in qsections}
# (label,qnum) -> source question (text + options)
srcq = {}
for s in qsections:
    lbl = str(s["label"])
    for q in s["questions"]:
        srcq[(lbl, int(q["qnum"]))] = q

answers = json.load(open(V("answers_consensus.json"), encoding="utf-8"))  # "sec:qnum" -> answer (>=2 independent sources agree)
# keys an LLM classified as self-contained (decorative/generic image) -> ship as text-only despite image_map
force_text = set(json.load(open(V("force_text.json"), encoding="utf-8"))) if os.path.exists(V("force_text.json")) else set()

# image verdicts (optional; may be empty before the image workflow runs)
verdicts = {}
imgdir = V("img")
if os.path.isdir(imgdir):
    for fn in os.listdir(imgdir):
        if fn.endswith(".json"):
            try:
                d = json.load(open(os.path.join(imgdir, fn), encoding="utf-8"))
                verdicts[d["key"]] = d
            except Exception:
                pass

IMG_DEST = V("..", "v11img")
IMG_DEST = os.path.normpath(P("v11img"))

def has_image(lbl, qn):
    for k in (f"{lbl}#{qn}", f"{lbl.split('.')[0]}#{qn}"):
        if image_map.get(k): return True
    return False

def stage_image(src_abs, lbl, qn):
    ext = os.path.splitext(src_abs)[1].lower() or ".jpeg"
    # sanitize dots in the section label (e.g. 16.1) — a dot in the imageKey breaks the
    # /api/q-image/<key> route (matches the original extract_images label.replace('.', '_')).
    name = f"v11_{lbl.replace('.', '_')}_{qn}{ext}"
    os.makedirs(IMG_DEST, exist_ok=True)
    shutil.copyfile(src_abs, os.path.join(IMG_DEST, name))
    return name

# ---- load rebuilt base ----
plan_in = json.load(open(pre, encoding="utf-8"))
base = [e for e in plan_in if not e.get("_v11")]
base_keys = {(str(e["label"]), int(e["qnum"])) for e in base}

overlay = {}
drops = []
kept_text = kept_img = 0

for key_s, ans in answers.items():
    lbl, qn = key_s.split(":"); qn = int(qn)
    key = (lbl, qn)
    if key in base_keys:
        continue  # already shipped (this is an audit cross-check target, handled separately)
    q = srcq.get(key)
    if not q:
        drops.append((key_s, "not in source parse")); continue
    opts = q.get("options", [])
    if not (isinstance(ans, int) and 1 <= ans <= len(opts)):
        drops.append((key_s, f"answer {ans} out of range 1..{len(opts)}")); continue

    image_basename = None
    if has_image(lbl, qn) and key_s not in force_text:
        v = verdicts.get(key_s)
        if not (v and v.get("keep") and v.get("file")):
            drops.append((key_s, "image question without a kept vision verdict")); continue
        src = v["file"]
        if not os.path.isabs(src):
            src = P(src)
        if not os.path.exists(src):
            drops.append((key_s, f"verdict file missing on disk: {v.get('file')}")); continue
        image_basename = stage_image(src, lbl, qn)

    entry = {
        "label": lbl,
        "section_title": qtitle.get(lbl, f"Розділ {lbl}"),
        "qnum": qn,
        "text": q["text"],
        "options": [{"n": i + 1, "text": o["text"]} for i, o in enumerate(opts)],
        "answer": ans,
        "_v11": True,
    }
    if image_basename:
        entry["image"] = image_basename
        entry["image_src"] = f"v11img/{image_basename}"
        kept_img += 1
    else:
        kept_text += 1
    overlay[key] = entry

# ---- prune v11img/ to referenced set ----
referenced = {e["image"] for e in overlay.values() if e.get("image")}
if os.path.isdir(IMG_DEST):
    for fn in os.listdir(IMG_DEST):
        if fn not in referenced:
            os.remove(os.path.join(IMG_DEST, fn))
elif referenced:
    os.makedirs(IMG_DEST, exist_ok=True)

# ---- merge + stable sort ----
def sortkey(e):
    head = str(e["label"]).split(".")[0]
    return (int(head) if head.isdigit() else 999, str(e["label"]), int(e["qnum"]))

merged = base + list(overlay.values())
merged.sort(key=sortkey)
json.dump(merged, open(pre, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

by_label = Counter(k[0] for k in overlay)
print("\n=== v11 overlay ===")
print(f"  kept text-only: {kept_text}   kept image: {kept_img}   dropped: {len(drops)}")
print("  by section: " + ", ".join(f"§{l}:{n}" for l, n in sorted(by_label.items(), key=lambda x:(int(x[0].split('.')[0]), x[0]))))
print(f"=== import_plan.json: base={len(base)} -> {len(merged)} (added {len(overlay)} v11 rows) ===")
drop_reasons = Counter(r for _, r in drops)
if drop_reasons:
    print("  drop reasons:")
    for r, n in drop_reasons.most_common():
        print(f"    {n:4}  {r}")

json.dump({
    "kept_text": kept_text, "kept_image": kept_img, "dropped": len(drops),
    "overlay_by_label": dict(by_label),
    "base_rows": len(base), "import_plan_rows": len(merged),
    "drop_reasons": dict(drop_reasons),
}, open(V("v11_apply_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
