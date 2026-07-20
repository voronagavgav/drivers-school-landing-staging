#!/usr/bin/env python3
"""v11 tiebreak merge (section-aware) — fold anchored re-reads into the consensus answer set.

Per-page anchor match can be <90% on dense pages while individual SECTIONS on that page are read
perfectly. So we gate alignment PER SECTION, not per page:
  a re-read pass is TRUSTED for section S iff
     (S has >=3 anchors on the page AND the pass reproduced >=90% of them)
     OR (S has <3 anchors AND the pass reproduced >=90% of the WHOLE page's anchors).
An unknown "S:q" is RESOLVED iff (in range) AND
     (>=2 section-trusted re-read passes agree on a value)
     OR (>=1 section-trusted re-read pass agrees with >=1 PRIOR independent source for that cell).
Prior sources come from need_verify.json (the v1/v6/v5nc/s33/v11 votes recorded at consensus time).
Adds resolved cells to answers_consensus.json; writes tiebreak_unresolved.json. Re-runnable.
"""
import json, os, glob
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def V(*a): return os.path.join(HERE, "v11", *a)

MATCH_MIN = 0.90
optc = json.load(open(V("optcounts.json"), encoding="utf-8"))
consensus = json.load(open(V("answers_consensus.json"), encoding="utf-8"))
unknowns_by_page = json.load(open(V("tiebreak", "unknowns_by_page.json"), encoding="utf-8"))
all_unknowns = {k for ks in unknowns_by_page.values() for k in ks}
# prior independent votes per unknown (from the consensus pass)
prior_votes = {nv["key"]: nv.get("votes", {}) for nv in json.load(open(V("need_verify.json"), encoding="utf-8"))}

def norm(d):
    out = {}
    for s, qm in d.items():
        if not isinstance(qm, dict): continue
        for q, a in qm.items():
            try: out[f"{s}:{int(q)}"] = int(a)
            except (TypeError, ValueError): pass
    return out

# gather, per unknown, the votes from section-trusted passes
reread_votes = defaultdict(list)
pages_seen = {}
for pg in sorted(unknowns_by_page, key=int):
    pad = f"{int(pg):02d}"
    af = V("tiebreak", f"anchors_p{pad}.json")
    if not os.path.exists(af): continue
    anchors = {k: v for k, v in json.load(open(af, encoding="utf-8")).items() if v is not None}
    # anchors grouped by section
    anc_by_sec = defaultdict(dict)
    for k, v in anchors.items():
        anc_by_sec[k.split(":")[0]][k] = v
    npass = 0
    for pass_ in "ABC":
        f = V("tiebreak", f"reread_p{pad}_{pass_}.json")
        if not os.path.exists(f): continue
        try: rd = norm(json.load(open(f, encoding="utf-8")))
        except Exception: continue
        npass += 1
        # whole-page match
        page_chk = [k for k in anchors if k in rd]
        page_rate = (sum(1 for k in page_chk if rd[k] == anchors[k]) / len(page_chk)) if page_chk else 0
        # per-section trust
        for k in unknowns_by_page[pg]:
            sec = k.split(":")[0]
            sec_anc = anc_by_sec.get(sec, {})
            chk = [a for a in sec_anc if a in rd]
            if len(chk) >= 3:
                rate = sum(1 for a in chk if rd[a] == sec_anc[a]) / len(chk)
                trusted = rate >= MATCH_MIN
            else:
                trusted = page_rate >= MATCH_MIN     # no/low section anchors -> use page alignment
            if trusted and k in rd:
                reread_votes[k].append(rd[k])
    pages_seen[pg] = npass

resolved_new, unresolved = {}, []
for k in sorted(all_unknowns):
    nopt = optc.get(k)
    rv = Counter(reread_votes.get(k, []))
    val = None
    if rv:
        top, n = rv.most_common(1)[0]
        if n >= 2 and (nopt is None or 1 <= top <= nopt):
            val = top
        else:
            # 1 trusted re-read agreeing with a prior independent source
            pv = {int(x): c for x, c in prior_votes.get(k, {}).items()}
            if top in pv and (nopt is None or 1 <= top <= nopt):
                val = top
    if val is not None:
        resolved_new[k] = val
    else:
        unresolved.append({"key": k, "reason": "no section-trusted agreement",
                           "reread_votes": dict(rv), "prior": prior_votes.get(k, {})})

added = 0
for k, v in resolved_new.items():
    if k not in consensus:
        consensus[k] = v; added += 1

json.dump(consensus, open(V("answers_consensus.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
json.dump(unresolved, open(V("tiebreak_unresolved.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print("passes per page:", {p: pages_seen[p] for p in sorted(pages_seen, key=int)})
print(f"tiebreak resolved: {len(resolved_new)}  added to consensus: {added}")
print(f"still unresolved:  {len(unresolved)}")
print("  unresolved by section: " + ", ".join(f"§{s}:{n}" for s, n in sorted(
    Counter(u['key'].split(':')[0] for u in unresolved).items(), key=lambda x:[int(p) for p in x[0].split('.')])))
print(f"answers_consensus.json now: {len(consensus)}")
