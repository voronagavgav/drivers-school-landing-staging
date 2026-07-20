#!/usr/bin/env python3
"""Merge per-page answer JSONs, aligning by SECTION LABEL (anchor) + continuation,
then cross-validate against questions.json: per-section count-match, per-question
answer-range, and image-cue detection. Emits answers_by_section.json + import_plan.json."""
import json, glob, re, os

qsections = json.load(open("questions.json", encoding="utf-8"))
q_image = json.load(open("q_image.json", encoding="utf-8"))  # "label#qnum" -> final single image path (verified; multi-panel stacked)
known = {s["label"] for s in qsections}
order = [s["label"] for s in qsections]

pages = [json.load(open(f, encoding="utf-8")) for f in sorted(glob.glob("ans_page_*.json"))]

# --- align answer rows to section labels ---
by_label = {}          # label -> {qnum: ans}
conflicts = 0
cur = None
for pg in pages:
    for row in pg.get("rows", []):
        lab = str(row.get("section") or "").strip()
        q = row.get("q") or []
        a = row.get("a") or []
        n = min(len(q), len(a)); q, a = q[:n], a[:n]
        if not q:
            continue
        # switch current section when the row carries a KNOWN label; else continue prior
        if lab in known:
            cur = lab
        # heuristic: a row starting at q==1 with a known different label is a real new section
        d = by_label.setdefault(cur, {})
        for qq, aa in zip(q, a):
            qq, aa = int(qq), int(aa)
            if qq in d and d[qq] != aa:
                conflicts += 1
            d[qq] = aa

print(f"aligned labels: {len(by_label)} | conflicts: {conflicts}")

# --- image detection: precise per-question flag from PyMuPDF (image_map.json) ---
# Cross-checked with a text cue; a question counts as image-bearing if EITHER says so.
# Unknown (qnum absent from PyMuPDF parse) defaults to True => conservatively excluded.
image_map = json.load(open("image_map.json", encoding="utf-8"))
IMG = re.compile(r"малюнк|зображен|наведен|ситуац|рисунк|схем|стрілк|на фото|світлофор|перехрест", re.I)
def needs_image(q, label):
    key = f"{label}#{q['qnum']}"
    pdf_flag = image_map.get(key)
    if pdf_flag is None:
        return True                     # unknown -> exclude (safe)
    blob = q["text"] + " " + " ".join(o["text"] for o in q["options"])
    return bool(pdf_flag) or bool(IMG.search(blob))

# --- validate + build import plan ---
answers_out = {}
plan = []          # importable questions
stats = {"sections_count_ok": 0, "q_total": 0, "q_importable": 0, "q_with_image": 0,
         "q_no_answer": 0, "q_range_bad": 0, "q_image_excluded": 0}
rep = []
for s in qsections:
    label = s["label"]; qs = s["questions"]; qcount = len(qs)
    seg = by_label.get(label, {})
    have_all = all(k in seg for k in range(1, qcount + 1))
    count_ok = (len(seg) == qcount and (max(seg) if seg else 0) == qcount and have_all)
    if count_ok:
        stats["sections_count_ok"] += 1
        answers_out[label] = {str(k): seg[k] for k in range(1, qcount + 1)}
    imp = 0; img = 0; noa = 0; rb = 0
    for q in qs:
        stats["q_total"] += 1
        a = seg.get(q["qnum"])
        if not count_ok:
            continue
        if a is None:
            noa += 1; stats["q_no_answer"] += 1; continue
        if not (1 <= a <= len(q["options"])):
            rb += 1; stats["q_range_bad"] += 1; continue
        entry = {"label": label, "section_title": s["title"], "qnum": q["qnum"],
                 "text": q["text"], "options": q["options"], "answer": a}
        img_path = q_image.get(f"{label}#{q['qnum']}")   # verified single (multi-panel pre-stacked)
        if img_path:
            entry["image"] = os.path.basename(img_path)
            entry["image_src"] = img_path
            plan.append(entry); imp += 1; stats["q_with_image"] += 1
        elif not needs_image(q, label):
            # genuinely text-only (PyMuPDF saw no image, no text cue)
            plan.append(entry); imp += 1
        else:
            # image expected but not resolvable (unverified multi / not extractable) -> skip
            img += 1; stats["q_image_excluded"] += 1
    stats["q_importable"] += imp
    rep.append((label, qcount, len(seg), count_ok, imp, img, noa, rb))

print(f"\n{'sec':>6} {'qN':>4} {'aN':>4} cnt_ok  import img noAns rngBad")
for (label, qc, sn, cok, imp, img, noa, rb) in rep:
    print(f"{label:>6} {qc:>4} {sn:>4}  {str(cok):>5}  {imp:>5} {img:>4} {noa:>4} {rb:>5}")

# --- §33 supplement: pick-the-sign (option-image) questions ---------------------
# §33 isn't count-matched, but its answers were cross-validated independently
# (s33_answers.json = >=2 reads agree + in range). Import ONLY the pick-the-sign
# ("Знак N" options) questions, whose strip image sits BELOW the text (reliably
# associated). Single-sign §33 questions are deferred (image may sit above the text).
REF = re.compile(r'^(Знак|Малюнок|Рисунок|Світлофор|Розмітк|Зображенн|Лінія|Жест|Сигнал)\s*№?\s*\d+\.?$', re.I)
try:
    s33_ans = {int(k): int(v) for k, v in json.load(open("s33_answers.json", encoding="utf-8")).items()}
except FileNotFoundError:
    s33_ans = {}
s33 = next((s for s in qsections if s["label"] == "33"), None)
s33_added = 0
if s33 and s33_ans:
    for q in s33["questions"]:
        a = s33_ans.get(q["qnum"])
        if a is None or not (1 <= a <= len(q["options"])):
            continue
        if not (len(q["options"]) >= 2 and all(REF.match(o["text"].strip()) for o in q["options"])):
            continue  # pick-the-sign only
        img = q_image.get(f"33#{q['qnum']}")
        if not img:
            continue
        plan.append({"label": "33", "section_title": s33["title"], "qnum": q["qnum"],
                     "text": q["text"], "options": q["options"], "answer": a,
                     "image": os.path.basename(img), "image_src": img})
        s33_added += 1
print(f"§33 pick-the-sign (option-image) added: {s33_added}")

print(f"\n=== {stats} ===")
json.dump(answers_out, open("answers_by_section.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(plan, open("import_plan.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"wrote answers_by_section.json ({len(answers_out)} aligned sections) + import_plan.json ({len(plan)} importable text-only Qs)")
