#!/usr/bin/env python3
"""v5 signs thread — build precise §33 layout to map each single-sign question to the
image that sits IMMEDIATELY ABOVE its question text line (the 'sign-above-text' shift).
Re-extracts §33 image blocks with their PDF page + y, re-derives question-start y per page,
and for each single-sign question proposes candidate image(s):
  - the image whose y is just ABOVE the question's text-start (primary guess), and
  - the direct image_assoc[33#q] (if any) and neighbours as ALTERNATES.
Writes v5_signs_layout.json. Read-only on all inputs; renders nothing yet."""
import json, re, os, hashlib, fitz

BASE = "/Users/clpc/drivers-school/.content-import"
doc = fitz.open(os.path.join(BASE, "polotno.pdf"))

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

# logo filter (same as extract_images.py)
freq = {}
pages_dict = [page.get_text("dict") for page in doc]
for d in pages_dict:
    seen = set()
    for b in d["blocks"]:
        if b.get("type") == 1 and b.get("image"):
            h = hashlib.md5(b["image"]).hexdigest()
            if h not in seen:
                seen.add(h); freq[h] = freq.get(h, 0) + 1
LOGO = {h for h, c in freq.items() if c > 4}

# Walk pages, track current label/qnum, record per-page ordered events for §33.
# For each §33 image block, also record an existing extracted filename if present.
cur_label = cur_q = None
# Build a reverse index: which extracted file corresponds to a given (page,bbox)?
# extract_images.py named them images/33_<q>_<idx>.jpeg in association order; we instead
# match by md5 of bytes to the files on disk.
disk_md5 = {}
for fn in os.listdir(os.path.join(BASE, "images")):
    if fn.startswith("33_"):
        p = os.path.join(BASE, "images", fn)
        disk_md5[hashlib.md5(open(p, "rb").read()).hexdigest()] = "images/" + fn

layout = []  # per §33 image: {page, y0,y1, file, after_label, after_q}
qstarts = {}  # (page) -> list of (y, qnum) for §33 region
for pageno, d in enumerate(pages_dict):
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
                cur_q = int(mq.group(1))
                if cur_label == "33":
                    qstarts.setdefault(pageno, []).append((_y, cur_q))
                continue
        else:
            if cur_label == "33":
                md5 = hashlib.md5(payload["image"]).hexdigest()
                layout.append({
                    "page": pageno,
                    "y0": round(payload["bbox"][1], 1),
                    "y1": round(payload["bbox"][3], 1),
                    "x0": round(payload["bbox"][0], 1),
                    "file": disk_md5.get(md5),
                    "after_q": cur_q,  # the question whose text we'd already passed
                })

json.dump({"images": layout, "qstarts": {str(k): v for k, v in qstarts.items()}},
          open(os.path.join(BASE, "v5_signs_layout.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("§33 image blocks:", len(layout), "| files matched on disk:",
      sum(1 for x in layout if x["file"]))
print("§33 pages with question-starts:", len(qstarts))
