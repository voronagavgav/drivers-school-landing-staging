#!/usr/bin/env python3
"""v5 signs — re-extract §33 single-sign images that the original extractor DROPPED via its
w<40/h<40 min-size filter (road-sign glyphs are ~31-47px). Keeps the logo md5 filter.
Associates each non-logo image to the question whose text-region encloses it (image y0 between
that question's text-start y and the NEXT question's text-start y on the same page), and tags
whether the image sits BEFORE the question's first option (the canonical single-sign position).
Renders each candidate image at 3x to v5_signs_imgs/ and writes v5_signs_assoc.json:
  { "33#<q>": [ {file, y0,y1,w,h, before_first_opt:bool, page} , ... ] }
Read-only on PDF + questions.json. Writes only v5_* artifacts."""
import json, re, os, hashlib, fitz

BASE = "/Users/clpc/drivers-school/.content-import"
OUT_DIR = os.path.join(BASE, "v5_signs_imgs")
os.makedirs(OUT_DIR, exist_ok=True)
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

pages_dict = [page.get_text("dict") for page in doc]

# logo filter: same md5 on >4 pages
freq = {}
for d in pages_dict:
    seen = set()
    for b in d["blocks"]:
        if b.get("type") == 1 and b.get("image"):
            h = hashlib.md5(b["image"]).hexdigest()
            if h not in seen:
                seen.add(h); freq[h] = freq.get(h, 0) + 1
LOGO = {h for h, c in freq.items() if c > 4}

# Build per-page ordered events with full context, tracking label/qnum.
assoc = {}
def render(label, qn, idx, bbox, page):
    fn = f"v5_signs_imgs/{label}_{qn}_{idx}.png"
    rect = fitz.Rect(*bbox)
    pix = doc[page].get_pixmap(matrix=fitz.Matrix(3, 3), clip=rect)
    pix.save(os.path.join(BASE, fn))
    return fn

cur_label = cur_q = None
for pageno, d in enumerate(pages_dict):
    events = []
    for b in d["blocks"]:
        if b.get("type") == 0:
            for ln in b.get("lines", []):
                txt = "".join(sp["text"] for sp in ln.get("spans", []))
                if txt.strip():
                    events.append((ln["bbox"][1], "text", txt, None))
        elif b.get("type") == 1 and b.get("image"):
            w = b["bbox"][2] - b["bbox"][0]; h = b["bbox"][3] - b["bbox"][1]
            md5 = hashlib.md5(b["image"]).hexdigest()
            if md5 in LOGO:
                continue
            # keep small images (signs) but drop truly tiny noise (<14px either dim)
            if w < 14 or h < 14:
                continue
            events.append((b["bbox"][1], "img", b, md5))
    events.sort(key=lambda e: e[0])
    # First pass to know option boundaries per current question: track last option y seen.
    seen_opt_for_q = {}  # qnum -> True once an option line appeared (so img after = not before-opt)
    for (_y, kind, payload, md5) in events:
        if kind == "text":
            line = payload.strip()
            mh = hdr.match(line)
            if mh and upper_headerish(mh.group(2)) and not opt.match(line):
                cur_label, cur_q = mh.group(1), None; continue
            if opt.match(line) and cur_q is not None:
                seen_opt_for_q[cur_q] = True
                continue
            mq = q_start.match(line) or q_start2.match(line)
            if mq and not upper_headerish(mq.group(2)):
                cur_q = int(mq.group(1)); continue
        else:
            if cur_label == "33" and cur_q is not None:
                key = f"33#{cur_q}"
                idx = len(assoc.get(key, []))
                w = round(payload["bbox"][2] - payload["bbox"][0])
                h = round(payload["bbox"][3] - payload["bbox"][1])
                fn = render("33", cur_q, idx, payload["bbox"], pageno)
                assoc.setdefault(key, []).append({
                    "file": fn,
                    "abs": os.path.join(BASE, fn),
                    "page": pageno,
                    "y0": round(payload["bbox"][1], 1),
                    "y1": round(payload["bbox"][3], 1),
                    "w": w, "h": h,
                    "before_first_opt": cur_q not in seen_opt_for_q,
                    "md5": md5[:10],
                })

json.dump(assoc, open(os.path.join(BASE, "v5_signs_assoc.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
nkeys = len(assoc); nfiles = sum(len(v) for v in assoc.values())
before = sum(1 for v in assoc.values() for x in v if x["before_first_opt"])
print(f"§33 questions with image(s): {nkeys} | rendered files: {nfiles} | before-first-opt imgs: {before}")
