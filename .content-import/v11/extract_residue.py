#!/usr/bin/env python3
"""Targeted residue image extraction for missing image-questions that have NO candidate.

The original extract_images.py assigns an image to the question whose text-span CONTAINS it
(by y). Single-sign §33 questions (and a few others) place the image ABOVE the question line,
so it got attached to the previous question -> no candidate. Here we collect, for each target
(label:qnum), every non-logo image block in a WINDOW that starts a bit ABOVE the question line
and runs to the next question line on the same page. Saves all candidates (vision picks later).

Inputs: polotno.pdf, v11/extract_targets.json (["label:qnum", ...]).
Outputs: v11/extra_img/<label>_<qnum>_<i>.<ext> + v11/extra_assoc.json {"label#qnum":[paths]}.
Read-only except its own output dir/file. Run with the venv python (fitz).
"""
import json, os, re, hashlib, fitz

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def P(*a): return os.path.join(HERE, *a)
def V(*a): return os.path.join(HERE, "v11", *a)

targets = set(json.load(open(V("extract_targets.json"))))
targets = {tuple(t.split(":")) for t in targets}            # {(label, qnum_str)}
OUT = V("extra_img"); os.makedirs(OUT, exist_ok=True)

doc = fitz.open(P("polotno.pdf"))
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
# logo detection (same as extract_images): bytes seen on >4 pages
freq = {}
for d in pages:
    seen = set()
    for b in d["blocks"]:
        if b.get("type") == 1 and b.get("image"):
            h = hashlib.md5(b["image"]).hexdigest()
            if h not in seen: seen.add(h); freq[h] = freq.get(h, 0) + 1
LOGO = {h for h, c in freq.items() if c > 4}

# per page: ordered list of question lines (y, label, q) and image blocks (y, block)
assoc = {}
def save(label, q, payload, idx):
    ext = payload.get("ext", "png")
    fn = V("extra_img", f"{label.replace('.', '_')}_{q}_{idx}.{ext}")
    with open(fn, "wb") as f: f.write(payload["image"])
    rel = os.path.relpath(fn, HERE)
    assoc.setdefault(f"{label}#{q}", []).append(rel)

cur_label = None
for d in pages:
    qlines = []   # (y, label, q)
    imgs = []     # (y, block)
    cl = cur_label
    for b in sorted(d["blocks"], key=lambda b: b["bbox"][1]):
        if b.get("type") == 0:
            for ln in b.get("lines", []):
                txt = "".join(sp["text"] for sp in ln.get("spans", [])).strip()
                if not txt: continue
                y = ln["bbox"][1]
                mh = hdr.match(txt)
                if mh and upper_headerish(mh.group(2)) and not opt.match(txt):
                    cl = mh.group(1); continue
                mq = q_start.match(txt) or q_start2.match(txt)
                if mq and not upper_headerish(mq.group(2)) and not opt.match(txt):
                    qlines.append((y, cl, int(mq.group(1))))
        elif b.get("type") == 1 and b.get("image"):
            w = b["bbox"][2]-b["bbox"][0]; h = b["bbox"][3]-b["bbox"][1]
            if w < 40 or h < 40 or hashlib.md5(b["image"]).hexdigest() in LOGO: continue
            imgs.append((b["bbox"][1], b))
    cur_label = cl
    qlines.sort();
    # for each target question on this page, grab images in window [q_y-220, next_q_y]
    for i, (qy, lbl, q) in enumerate(qlines):
        if (lbl, str(q)) not in targets: continue
        next_y = qlines[i+1][0] if i+1 < len(qlines) else 1e9
        lo, hi = qy - 230, next_y - 5
        cand = [(iy, b) for (iy, b) in imgs if lo <= iy <= hi]
        cand.sort()
        for idx, (_iy, b) in enumerate(cand):
            save(lbl, q, b, idx)

json.dump(assoc, open(V("extra_assoc.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
got = len(assoc); files = sum(len(v) for v in assoc.values())
print(f"targets: {len(targets)}  questions w/ >=1 extracted candidate: {got}  files: {files}")
from collections import Counter
miss = [f"{l}:{q}" for (l,q) in targets if f"{l}#{q}" not in assoc]
print(f"still NO candidate: {len(miss)}")
bysec = Counter(t[0] for t in targets if f'{t[0]}#{t[1]}' in assoc)
print("got by section:", ", ".join(f"§{s}:{n}" for s,n in sorted(bysec.items(), key=lambda x:[int(p) for p in x[0].split('.')])))
