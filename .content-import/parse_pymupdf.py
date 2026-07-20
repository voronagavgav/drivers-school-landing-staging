#!/usr/bin/env python3
"""Re-parse the canvas with PyMuPDF so we get EXACT per-question image association
(image blocks interleaved with text in reading order), not text-cue guessing.
Outputs questions.json (same shape as before) with a reliable has_image flag."""
import json, re, fitz

doc = fitz.open("polotno.pdf")

CYR_UP = "АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ"
def upper_headerish(s):
    s = s.strip()
    letters = [c for c in s if c.isalpha()]
    if len(letters) < 4: return False
    up = sum(1 for c in letters if c in CYR_UP or (c.isalpha() and c.upper() == c))
    return up / len(letters) > 0.85

hdr = re.compile(r"^\s*(\d+(?:\.\d+)*)\.\s+(.+)$")
q_start = re.compile(r"^\s*(\d+)\.\s*(\S.*)$")
q_start2 = re.compile(r"^\s*(\d+)\.(\S.*)$")
opt = re.compile(r"^\s*(\d+)\)\s*(.*)$")
pagenum = re.compile(r"^\s*\d{1,4}\s*$")

sections, cur, q = [], None, None
def flush():
    global q
    if q and q["options"]:
        q.pop("_last", None); sections[-1]["questions"].append(q) if cur else None
    q = None

def process_line(line):
    global cur, q
    line = line.strip()
    if not line or pagenum.match(line): return
    m = hdr.match(line)
    if m and upper_headerish(m.group(2)) and not opt.match(line):
        flush()
        cur = {"label": m.group(1), "no": int(m.group(1).split(".")[0]),
               "title": re.sub(r"\s+", " ", m.group(2).strip()), "questions": []}
        sections.append(cur); q = None; return
    if cur is None: return
    mo = opt.match(line)
    if mo and q is not None:
        q["options"].append({"n": int(mo.group(1)), "text": mo.group(2).strip()}); q["_last"]="opt"; return
    mq = q_start.match(line) or q_start2.match(line)
    if mq and not upper_headerish(mq.group(2)) and not mo:
        flush()
        q = {"section": cur["no"], "label": cur["label"], "qnum": int(mq.group(1)),
             "text": mq.group(2).strip(), "options": [], "has_image": False, "_last":"q"}
        return
    if q is not None:
        if q["_last"] == "opt" and q["options"]:
            q["options"][-1]["text"] += " " + line
        else:
            q["text"] += " " + line

# also absorb UPPERCASE continuation lines into the just-created section title
pending_title = False
for page in doc:
    blocks = page.get_text("dict")["blocks"]
    blocks.sort(key=lambda b: (round(b["bbox"][1] / 4), b["bbox"][0]))
    for b in blocks:
        if b.get("type") == 1:               # IMAGE block
            if q is not None:
                q["has_image"] = True
            continue
        for ln in b.get("lines", []):
            text = "".join(sp["text"] for sp in ln.get("spans", []))
            # title continuation: an all-caps line right after a header with no question yet
            if cur is not None and q is None and cur["questions"] == [] and text.strip() \
               and upper_headerish(text) and not opt.match(text) and not hdr.match(text):
                cur["title"] = re.sub(r"\s+", " ", cur["title"] + " " + text.strip()); continue
            process_line(text)
flush()

total = sum(len(s["questions"]) for s in sections)
img_q = sum(1 for s in sections for qq in s["questions"] if qq["has_image"])
print(f"sections: {len(sections)} | questions: {total} | with image: {img_q} | text-only: {total-img_q}")
print(f"{'sec':>6} {'n':>4} {'img':>4} {'txt':>4}  title")
for s in sections:
    n = len(s["questions"]); im = sum(1 for qq in s["questions"] if qq["has_image"])
    print(f"{s['label']:>6} {n:>4} {im:>4} {n-im:>4}  {s['title'][:42]}")
json.dump(sections, open("questions_pymupdf.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
# image map keyed "label#qnum" -> bool, consumed by merge_answers.py
imap = {f"{qq['label']}#{qq['qnum']}": qq["has_image"] for s in sections for qq in s["questions"]}
json.dump(imap, open("image_map.json","w",encoding="utf-8"), ensure_ascii=False)
print(f"wrote image_map.json ({len(imap)} entries) + questions_pymupdf.json")
