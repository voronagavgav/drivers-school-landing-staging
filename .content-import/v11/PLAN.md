# v11 — finish ALL official questions (answers + images)  [resumable]

Goal (owner ask, 2026-06-25): import the remaining official ПДР questions so the app holds the FULL
official base (~2330 source Qs), each with its correct answer AND, where applicable, its image —
following the existing correctness rules + category mapping. No unvalidated answer ships; no
image-question ships without a vision-confirmed image.

## Starting point
- Source `questions.json`: 2330 Qs / 64 sections. Imported (`import_plan.json`): 1693. **Missing: 632.**
- Blockers (see `v11/missing.json`): 405 need answer-key validation (107 text + 242 image no-answer +
  56 out-of-range), 339 are image-bearing (need a vision pass), 130 text-only have an in-range answer
  but were held back on section count-mismatch (cheapest to clear via re-read confirm).

## Pipeline (orchestrate verify-gated; heavy fan-out → background Workflows; apply/gate in control thread)
1. **Answer key** (`Workflow v11-answerkey`): 11 rendered pages (`v11/akey/page-NN.png`) × 3 independent
   vision reads each → `v11/akey/read_pNN_{A,B,C}.json`. Then deterministic merge
   (`v11/merge_answers.py`): keep (sec,q) iff ≥2 of 3 agree AND in range (`v11/optcounts.json`) →
   `v11/answers_v11.json`; flag `v11/disagreements.json`. ALSO audit vs `v11/existing_answers.json`
   (do NOT auto-overwrite existing — quarantine conflicts for review per [[feedback-ground-truth-tiebreak]]).
2. **Apply text-only** answer-validated missing Qs (no image) → reseed + importer + green gate
   (typecheck/test/build + DB integrity) → commit. Big safe chunk first.
3. **Image vision** (`Workflow v11-images`, section batches): extract candidate image per missing
   image-Q from `polotno.pdf`, vision-confirm it depicts the question's scene → `v11/img/<key>.json`
   (keep + path, or reject). Keep iff confirmed.
4. **Apply image Qs** incrementally per batch → green gate → commit.
5. **Loop residue** (disagreement tiebreaks, image re-extracts) until converged. Report.

## Selection rule (enforced in `v11/v11_apply.py`, mirrors v6_apply.py)
Ship a missing Q iff `answerValidated` (≥2 agree + in range) AND (`has_image==false` OR a
vision-confirmed image exists in `v11/img/`). Category mapping unchanged (`categoriesFor` in
`scripts/import-official.ts`). Apply is idempotent (strip prior `_v11` rows) + layers over the v6 base.

## Image facts (from existing extraction; PyMuPDF/fitz NOT installed, but artifacts exist)
- 360 missing Qs are image-bearing. **256 already have an extracted candidate on disk** (via
  `image_assoc.json` → `images/`): §35:93, §48:36, §10:35, §45:24, §16.1:23, §18:8, §40:7, §16.2:6,
  §8.1:4, §14:4, §8.2:3, +scattered. 21 are multi-candidate (pick the right file).
- **104 have NO candidate** → residue track: §33:76 (single-sign, image-above-text — hardest,
  needs the v5_signs layout logic), §48:6, §56:4, §40:3, +scattered. Defer; ship the 256 first.

## Scripts built (ready)
- `v11/merge_answers.py` — cross-validate the 3 reads → `answers_v11.json` + `disagreements.json` +
  `audit_existing.json`. `v11/v11_apply.py` — idempotent overlay onto v6 base (strips `_v11`, re-runs
  v6_apply, layers by (label,qnum), stages images into `v11img/`). Importer (`scripts/import-official.ts`)
  copies `v11img/<f>` → `public/official-images/`; `categoriesFor` covers §1-63 (no silent drops).

## KEY CORRECTNESS FINDING (2026-06-25): a single fresh bulk read MISALIGNS on dense sections.
The v11 answer-key read agreed with the validated existing answers only 93.8% overall, with
systematic per-section misreads (§17 1/8, §9 70%, §16.2 77%). Confirmed via 3-way (existing == the
original v1 read; v11 was the outlier). FIX: **multi-source consensus** — ship a missing answer only
when >=2 INDEPENDENT reads agree (sources: v1 `answers_by_section`, v6 reads A/B/C, v5 newcats, s33,
v11). This holds the misaligned reads for tiebreak instead of shipping them. Do NOT overwrite existing
answers from the bulk read — the 104 conflicts in `audit_existing.json` are a SEPARATE careful audit.
Tiebreak method for single-source unknowns = **anchored re-read** (give the agent the section's known
answers as alignment anchors it must reproduce, then read the unknowns).

## Status log
- 2026-06-25 #1: scoped gap (632 of 2330), rendered 11 answer-key pages, built manifests + merge/apply.
- 2026-06-25 #2: `v11-answerkey` (33 reads) done → cross-validated → found the misalignment → switched
  to multi-source consensus (`v11/answers_consensus.json`, 405 resolved). `v11/need_verify.json` = 226.
- 2026-06-25 #3: **SHIPPED chunk 1** — 182 text-only resolved answers. `import_plan.json` 1693→1875;
  importer 1691→**1873 official**, 0 no-correct-option. Gate GREEN (typecheck, 292 unit, build, 65
  integration). Committed `e218471` + pushed.
- 2026-06-25 #4: launched two background workflows: `v11-images` (task w5zgvc7w0, 127 image verifies →
  `v11/img/<key>.json`) and `v11-tiebreak` (task w5xx6arlc, 24 anchored re-reads → `v11/tiebreak/`).
  NEXT on their completion: merge tiebreak → re-run `v11_apply.py` → green gate → commit.
- 2026-06-25 #5: **SHIPPED chunk 2** — +61 vision-verified images → **1934 official** (gate green,
  commit `c2bdd6c`). Found `public/official-images/` IS git-tracked → committed the 61 served images
  (`ddc80ef`). Image workflow (task w5zgvc7w0) hit a transient server rate-limit: 63 verdicts landed
  (61 keep, 2 reject 35:39/35:51), **64 rate-limited → re-run pending**.
- 2026-06-25 #6: tiebreak workflow was STOPPED when the prior process exited (0 rereads) → **resumed**
  (task wlpx9ex9v). Built residue infra while it runs: `.content-import/.venv` (PyMuPDF+Pillow);
  `v11/extract_residue.py` recovered **37 of 104** no-candidate image candidates → `v11/extra_img/` +
  `extra_assoc.json` (still 67, mostly §33 single-sign). Ready scripts: `merge_tiebreak.py`,
  `build_img_candidates.py` (rebuilds the image manifest from both candidate sources, excludes
  already-verdicted).
  ON TIEBREAK COMPLETE: `merge_tiebreak.py` → `build_img_candidates.py` (get KEYS) → one image
  workflow (64 reruns + 37 new + any newly-resolved) → `v11_apply.py` → gate → commit chunk 3.
  THEN residue: 67 still-no-candidate (§33 single-sign), §10 q1-40 if tiebreak couldn't read them,
  the 104-conflict answer audit, explanation-gen for new Qs.
- 2026-06-25 #7: tiebreak resumed twice (session limits, then reset) → completed all 24 passes.
  Section-aware `merge_tiebreak.py` (trust a re-read for a section only if it reproduced that
  section's anchors >=90%) → consensus 405 → **503** (+98). **SHIPPED chunk 3a** → import_plan 1976,
  DB **1974 official**, gate green, commit `904f1c2` + pushed. Launched `v11-images-2` (task
  wgywr2bao, 158 image verdicts: 64 reruns + 37 extracted + tiebreak-resolved).
- **HARD RESIDUE (128 answers)** in dense pages 2-4 where the answer-key reads genuinely DIVERGE
  (not just misalign): §10:33, §16.1:33, §9:15, §14:10, §8.2:7, §16.2:7, §18:7, §51:4, §6:2, others.
  Only 2/128 have multi-read agreement. STRATEGY: (a) FOCUSED CROP-READ — locate each section's block
  on the answer-key page (vision), crop it, read isolated at high zoom (3 passes) → far more accurate
  than dense full-page; validate vs anchors. (b) for image Qs (§16.1, §10-img) also vision-determine
  the answer from the diagram and cross-check. (c) web ground-truth for the rest. Ship what resolves;
  document the irreducible tail. THEN: chunk 3b (all images), §33 single-sign tail, 104-conflict audit.
- 2026-06-25 #8: image-2 done (220 verdicts, 195 keep). 3 answer<->image-conflict flags
  (33:262, 30:7, 33:191) HELD. **SHIPPED chunk 3b** → import_plan 2104, DB **2102 official**, gate
  green, commits `da4f0e4` (+ images). Discovered the answer-key is an INTERLEAVED COLUMN-MAJOR GRID:
  a section's qnums are split across side-by-side column-groups (pairs step by 8: 41,49,57…), which is
  why bulk reads MISS whole ranges (§10 q1-40 were never read by v11/tiebreak; v6 did read them).
  Launched `v11-focused` (task w2p53myx9): 16 sections × 3 focused per-section re-reads WITH the grid
  hint → `v11/focused/<sec>_<pass>.json`. `merge_focused.py` ready (anchor-validate per section;
  resolve via >=2 aligned passes or focused+prior-source agreement).
  ON COMPLETE: merge_focused → apply → gate → commit chunk 4. Residue likely left: §16.1 (no anchor,
  image → needs vision answer-determination), §33 single-sign images (67 no-candidate), 3 held, the
  104-conflict audit. STATUS: 2102/2330 official.
- 2026-06-26 #9: focused merge (improved: resolve via aligned-anchors OR independent-prior-source
  v1/v6/v5nc OR image+v11) → consensus **590**. Image-3 verified §10/§16.1/§16.2 (65 kept). SHIPPED
  chunks 4a/4b → **2189 official** (commits `957bb4e`, `9c888c5`). Remaining 134: 42 no-answer (→ web
  ground-truth `v11-web` running, task wjdnfoozn; `merge_web.py` ready, accepts web answer iff it
  matches a read OR high-confidence) + 92 image-no-verdict.
- **§33 SIGN BREAKTHROUGH**: all 64 missing §33 single-sign Qs have a matching sign image already in
  `v5_signs_imgs/33_<qnum>_*.png` (naming maps by question number; spot-verified 33_55_0 = «Зупинка
  заборонена» for q55). Wired into `extra_assoc.json` → 50 §33 candidates queued for a vision pass
  (after the web workflow, to avoid stacking the token limit). This unblocks the §33 image tail.
  ON web COMPLETE: merge_web → §33 image workflow → apply → gate → commit. Then: 3 held + 104-audit.
