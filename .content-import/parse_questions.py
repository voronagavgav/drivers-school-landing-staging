#!/usr/bin/env python3
"""Parse the official HSC 'полотно' question canvas (pdftotext -layout output)
into structured questions: (section, qnum, text, options[], has_gap/image-hint).

Numbering RESTARTS per section, so the natural key is (section_no, qnum)."""
import json, re, sys

SRC = "polotno.txt"
lines = open(SRC, encoding="utf-8").read().split("\n")

CYR_UP = "АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ"
def is_upper_headerish(s):
    s = s.strip()
    letters = [c for c in s if c.isalpha()]
    if len(letters) < 4:
        return False
    up = sum(1 for c in letters if c in CYR_UP or (c.isalpha() and c.upper() == c))
    return up / len(letters) > 0.85

# header label may be "1." or "8.1." (sub-section); rest must be UPPERCASE title
hdr = re.compile(r"^\s*(\d+(?:\.\d+)*)\.\s+(.+)$")
q_start = re.compile(r"^\s*(\d+)\.\s*(\S.*)$")          # "79. Безпечною..."
q_start2 = re.compile(r"^\s*(\d+)\.(\S.*)$")            # "6.Що означає" (no space)
opt = re.compile(r"^\s*(\d+)\)\s*(.*)$")                # "1) Трамвайна колія."
pagenum = re.compile(r"^\s*\d{1,4}\s*$")               # centered page footer

sections = []           # list of {label, no, title, questions:[...]}
cur = None
q = None

def flush_q():
    global q
    if q and q["options"]:
        cur["questions"].append(q)
    q = None

i = 0
while i < len(lines):
    raw = lines[i]
    line = raw.strip()
    i += 1
    if not line:
        if q is not None:
            q["blank_runs"] += 1     # gap inside a question often = embedded image
        continue
    if pagenum.match(line):
        continue

    m = hdr.match(line)
    # A section header: a "N." / "N.M." label followed by an UPPERCASE title (not an option line).
    if m and is_upper_headerish(m.group(2)) and not opt.match(line):
        flush_q()
        label = m.group(1)
        title = m.group(2).strip()
        while i < len(lines) and lines[i].strip() and is_upper_headerish(lines[i]) and not opt.match(lines[i]) and not hdr.match(lines[i]):
            title += " " + lines[i].strip()
            i += 1
        cur = {"label": label, "no": int(label.split(".")[0]),
               "title": re.sub(r"\s+", " ", title), "questions": []}
        sections.append(cur)
        q = None
        continue

    if cur is None:
        continue  # preamble before section 1

    mo = opt.match(line)
    if mo and q is not None:
        q["options"].append({"n": int(mo.group(1)), "text": mo.group(2).strip()})
        q["_last"] = "opt"
        continue

    # question start: number followed by '.' then non-uppercase sentence text
    mq = q_start.match(line) or q_start2.match(line)
    if mq and not is_upper_headerish(mq.group(2)) and not mo:
        # only treat as new question if we're not mid-options-wrap of a multi-digit
        flush_q()
        q = {"section": cur["no"], "qnum": int(mq.group(1)),
             "text": mq.group(2).strip(), "options": [], "blank_runs": 0, "_last": "q"}
        continue

    # continuation text (wrapped question or option line)
    if q is not None:
        if q["_last"] == "opt" and q["options"]:
            q["options"][-1]["text"] += " " + line
        else:
            q["text"] += " " + line

flush_q()

# ---- report ----
total = sum(len(s["questions"]) for s in sections)
print(f"sections parsed: {len(sections)}  | total questions: {total}")
anomalies = 0
for s in sections:
    nums = [qq["qnum"] for qq in s["questions"]]
    contiguous = nums == list(range(1, len(nums) + 1))
    bad_opts = sum(1 for qq in s["questions"] if not (2 <= len(qq["options"]) <= 6))
    flag = "" if (contiguous and bad_opts == 0) else "  <-- CHECK"
    if flag: anomalies += 1
    print(f"  [{s['label']:>5}] n={len(nums):>3} maxq={max(nums) if nums else 0:>3} "
          f"contig={str(contiguous):>5} badopt={bad_opts}  {s['title'][:46]}{flag}")
print(f"anomalous sections: {anomalies}")

json.dump(sections, open("questions.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote questions.json")

# sample
print("\n--- sample §1 Q1 ---")
print(json.dumps(sections[0]["questions"][0], ensure_ascii=False, indent=1))
