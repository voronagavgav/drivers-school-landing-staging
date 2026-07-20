#!/usr/bin/env python3
"""Resolve each image question to ONE final image file (q_image.json: key -> path).
- single-image questions: their one image.
- multi-image questions that were vision-verified: use the kept image(s); if >1 genuine
  panels, vertically STACK them into one composite (keeps the single-imageUrl render path).
- unverified multi-image (non-validated/non-mapped sections): skipped (not imported)."""
import json, os
from PIL import Image

assoc = json.load(open("image_assoc.json"))
verified = json.load(open("mi_verified.json"))   # key -> [kept basenames]

def p(name):
    return name if name.startswith("images/") else f"images/{name}"

def stack(paths, out):
    imgs = [Image.open(x).convert("RGB") for x in paths]
    w = max(i.width for i in imgs)
    gap = 8
    scaled = [i.resize((w, round(i.height * w / i.width))) for i in imgs]
    H = sum(i.height for i in scaled) + gap * (len(scaled) - 1)
    canvas = Image.new("RGB", (w, H), "white")
    y = 0
    for i in scaled:
        canvas.paste(i, (0, y)); y += i.height + gap
    canvas.save(out, "JPEG", quality=88)

final = {}
stacked = 0
for key, files in assoc.items():
    if key in verified:
        kept = [p(f) for f in verified[key]]
    elif len(files) == 1:
        kept = [p(files[0])]
    else:
        continue  # unverified multi -> not imported
    if len(kept) == 1:
        final[key] = kept[0]
    else:
        out = f"images/{key.replace('.', '_').replace('#', '_')}_combined.jpeg"
        stack(kept, out); final[key] = out; stacked += 1

json.dump(final, open("q_image.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"final image map: {len(final)} questions | composites stacked: {stacked}")
