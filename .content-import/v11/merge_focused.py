#!/usr/bin/env python3
"""v11 focused re-read merge — resolve the hard residue from per-section focused reads.

For each section we have up to 3 focused passes (focused/<sec>_{A,B,C}.json). A pass is ALIGNED
for the section iff it reproduced the section's anchors >= 90% (>=3 anchors required). Resolution
of an unresolved cell "sec:q":
  * anchored section: value if >=2 ALIGNED focused passes agree (in range). Anchor-validated.
  * no-anchor section (§8.2, §16.1): value if >=2 focused passes agree AND it matches a PRIOR
    independent source (v6 / v1 / v11 consensus) (in range). Otherwise left for vision/web.
Adds resolved cells to answers_consensus.json; rewrites focused_unresolved.json. Re-runnable.
"""
import json, os, glob
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def P(*a): return os.path.join(HERE, *a)
def V(*a): return os.path.join(HERE, "v11", *a)
MATCH_MIN = 0.90

optc = json.load(open(V("optcounts.json")))
consensus = json.load(open(V("answers_consensus.json")))
focus_secs = {f["section"]: f for f in json.load(open(V("focused_sections.json")))}

def norm_secmap(d):
    out = {}
    for s, qm in d.items():
        if s.startswith("_") or not isinstance(qm, dict): continue
        for q, a in qm.items():
            try: out[f"{s}:{int(q)}"] = int(a)
            except (TypeError, ValueError): pass
    return out

# prior sources, split: INDEPENDENT of v11 (v1/v6/v5nc/s33) vs v11 itself (the suspect bulk read)
indep = {}
indep["v1"] = norm_secmap(json.load(open(P("answers_by_section.json"))))
s33 = json.load(open(P("s33_answers.json"))); indep["s33"] = {f"33:{int(q)}": int(a) for q, a in s33.items() if str(a).lstrip('-').isdigit()}
v6 = {p: norm_secmap(json.load(open(P(f"v6_reads_{p}.json")))) for p in "ABC"}
v6c = {}
for k in set().union(*[set(v6[p]) for p in "ABC"]):
    c = Counter(v6[p][k] for p in "ABC" if k in v6[p]); t, n = c.most_common(1)[0]
    if n >= 2: v6c[k] = t
indep["v6"] = v6c
try:
    nc = json.load(open(P("v5_newcats_myreads.json"))); indep["v5nc"] = norm_secmap(nc)
except Exception: indep["v5nc"] = {}
votes11 = defaultdict(list)
for f in glob.glob(V("akey", "read_p*_*.json")):
    try: d = json.load(open(f))
    except Exception: continue
    for k, v in norm_secmap(d).items(): votes11[k].append(v)
v11 = {k: Counter(vs).most_common(1)[0][0] for k, vs in votes11.items() if Counter(vs).most_common(1)[0][1] >= 2}
has_image = {m["key"]: m["has_image"] for m in json.load(open(V("missing.json")))}

def indep_has(k, val):
    return any(src.get(k) == val for src in indep.values())

resolved_new, unresolved = {}, []
for sec, meta in focus_secs.items():
    anchors = {int(q): a for q, a in meta["anchors"].items()}
    unres = meta["unresolved"]
    # load all 3 passes; track which are well-aligned for this section
    all_reads, aligned_reads = [], []
    for pass_ in "ABC":
        f = V("focused", f"{sec.replace('.', '_')}_{pass_}.json")
        if not os.path.exists(f): continue
        try: rd = {int(q): int(a) for q, a in json.load(open(f)).items() if str(a).lstrip('-').isdigit()}
        except Exception: continue
        all_reads.append(rd)
        if len(anchors) >= 3:
            chk = [q for q in anchors if q in rd]
            rate = (sum(1 for q in chk if rd[q] == anchors[q]) / len(chk)) if chk else 0
            if rate >= MATCH_MIN: aligned_reads.append(rd)
    for q in unres:
        k = f"{sec}:{q}"
        if k in consensus: continue
        nopt = optc.get(k)
        allvals = [rd[q] for rd in all_reads if q in rd]
        if not allvals:
            unresolved.append({"key": k, "reason": "no focused read", "votes": {}}); continue
        c = Counter(allvals); top, n = c.most_common(1)[0]            # focused consensus
        ok_range = nopt is None or 1 <= top <= nopt
        aln = Counter([rd[q] for rd in aligned_reads if q in rd])
        aligned_ok = aln.get(top, 0) >= 2                            # (a) anchor-proven
        indep_ok = indep_has(k, top)                                  # (b) independent prior source
        image_v11_ok = has_image.get(k) and v11.get(k) == top        # (c) image + v11 (vision gates)
        if n >= 2 and ok_range and (aligned_ok or indep_ok or image_v11_ok):
            resolved_new[k] = top
        else:
            unresolved.append({"key": k, "reason": f"n={n} aligned={aligned_ok} indep={indep_ok} img_v11={bool(image_v11_ok)}",
                               "votes": dict(c)})

added = 0
for k, v in resolved_new.items():
    if k not in consensus: consensus[k] = v; added += 1
json.dump(consensus, open(V("answers_consensus.json"), "w"), ensure_ascii=False, indent=0)
json.dump(unresolved, open(V("focused_unresolved.json"), "w"), ensure_ascii=False, indent=1)

print(f"focused resolved: {len(resolved_new)}  added: {added}")
print(f"still unresolved:  {len(unresolved)}")
print("  by section: " + ", ".join(f"§{s}:{n}" for s, n in sorted(
    Counter(u['key'].split(':')[0] for u in unresolved).items(), key=lambda x:[int(p) for p in x[0].split('.')])))
print(f"consensus now: {len(consensus)}")
