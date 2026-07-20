#!/usr/bin/env python3
"""Associate each question with its embedded image(s) by vertical position.
Uses PyMuPDF get_text("dict") blocks — image blocks carry bytes+bbox inline (fast).
Saves images to images/ and writes image_assoc.json { "label#qnum": [files...] }.
Filters tiny decorative marks and repeating logos (same bytes on many pages)."""
import json, re, os, hashlib, fitz

doc = fitz.open("polotno.pdf")
os.makedirs("images", exist_ok=True)

CYR_UP = "АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ"
def upper_headerish(s):
    s = s.strip(); letters = [c for c in s if c.isalpha()]
    if len(letters) < 4: return False
    up = sum(1 for c in letters if c in CYR_UP or (c.isalpha() and c.upper() == c))
    return up / len(letters) > 0.85

hdr = re.compile(r"^\s*(\d+(?:\.\d+)*)\.\s+(.+)$")
q_start = re.compile(r"^\s*(\d+)\.\s*(\S.*)$")
q_start2 = re.compile(r"^\s*(\d+)\.(\S.*)$")
opt = re.compile(r"^\s*(\d+)\)\s*(.*)$")

pages = [page.get_text("dict") for page in doc]

# pass 1: hash image bytes, count page frequency -> logos repeat
freq = {}
for d in pages:
    seen = set()
    for b in d["blocks"]:
        if b.get("type") == 1 and b.get("image"):
            h = hashlib.md5(b["image"]).hexdigest()
            if h not in seen:
                seen.add(h); freq[h] = freq.get(h, 0) + 1
LOGO = {h for h, c in freq.items() if c > 4}

# pass 2: associate images to the question whose text span contains them (by y).
# Page-boundary fix: an image at the TOP of a page (before any question line on that
# page) belongs to the FIRST question that starts on that page, NOT the question
# carried over from the previous page — that bleed was producing false "multi-image".
assoc = {}
def save(label, qn, payload):
    key = f"{label}#{qn}"
    ext = payload.get("ext", "png")
    fn = f"images/{label.replace('.', '_')}_{qn}_{len(assoc.get(key, []))}.{ext}"
    with open(fn, "wb") as f:
        f.write(payload["image"])
    assoc.setdefault(key, []).append(fn)

cur_label = cur_q = None
for d in pages:
    events = []
    for b in d["blocks"]:
        if b.get("type") == 0:
            for ln in b.get("lines", []):
                txt = "".join(sp["text"] for sp in ln.get("spans", []))
                if txt.strip():
                    events.append((ln["bbox"][1], "text", txt))
        elif b.get("type") == 1 and b.get("image"):
            w = b["bbox"][2] - b["bbox"][0]; h = b["bbox"][3] - b["bbox"][1]
            if w < 40 or h < 40 or hashlib.md5(b["image"]).hexdigest() in LOGO:
                continue
            events.append((b["bbox"][1], "img", b))
    events.sort(key=lambda e: e[0])
    for (_y, kind, payload) in events:
        if kind == "text":
            line = payload.strip()
            mh = hdr.match(line)
            if mh and upper_headerish(mh.group(2)) and not opt.match(line):
                cur_label, cur_q = mh.group(1), None; continue
            mq = q_start.match(line) or q_start2.match(line)
            if mq and not upper_headerish(mq.group(2)) and not opt.match(line):
                cur_q = int(mq.group(1)); continue
        else:
            if cur_label and cur_q is not None:
                save(cur_label, cur_q, payload)

json.dump(assoc, open("image_assoc.json", "w", encoding="utf-8"), ensure_ascii=False)
single = sum(1 for v in assoc.values() if len(v) == 1)
multi = sum(1 for v in assoc.values() if len(v) > 1)
print(f"logos skipped (same bytes on >4 pages): {len(LOGO)}")
print(f"questions with image(s): {len(assoc)} | single: {single} | multi: {multi} | files: {sum(len(v) for v in assoc.values())}")
