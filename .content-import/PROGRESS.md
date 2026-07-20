# Real ПДР content import — progress (resumable)

Goal: import REAL official HSC (ГСЦ МВС) ПДР question base (наказ 04.09.2025) into Drivers School as an
OFFICIAL ContentVersion, replacing/supplementing demo content. Keep legal positioning honest (based on the
official question base; still NOT the official exam, NO pass guarantee, NO live МВС integration).

## Source (Akamai-blocked on direct fetch; got via Wayback)
- Questions canvas: `polotno.pdf` (43.6 MB, 539 pp, LibreOffice text layer) ← web.archive.org/web/20260204200206id_/...POLOTNO-NAKAZ_04_09_2025 (1).pdf
- Answer key: `answers.pdf` (2 MB, 11 pp, IMAGE-ONLY JPEGs, no text) ← web.archive.org/web/20251222134730id_/...Numer_-vidpovidej-do-nakazu.pdf

## Done
- [x] Retrieved both PDFs past the Akamai IP block via Wayback.
- [x] `parse_questions.py` → `questions.json`: 64 sections, 2330 questions. 61/64 clean (contiguous, valid opts).
      Numbering RESTARTS per (sub)section; key = (label, qnum). Sub-section labels exist: 8.1/8.2, 16.1/16.2.

## DONE (v1 shipped 2026-06-17)
- [x] Answer key: 11 scanned pages transcribed by 11 parallel vision subagents → ans_page_*.json.
- [x] merge_answers.py: label-aligned, count-matched 50/64 sections, range-checked → answers_by_section.json.
- [x] Image detection via PyMuPDF block structure (image_map.json) — precise, not text-cue guessing.
- [x] import_plan.json = 589 text-only, count+range-validated questions.
- [x] scripts/import-official.ts → imported 474 official questions (38 topics) into A/B/C + common.
      OFFICIAL/isDemo=false; integrity: every Q has exactly one correct option. Idempotent.
- [x] Legal/UI copy updated (components/brand.tsx LegalDisclaimer) — official provenance + all disclaimers.
- [x] Verified: 14/14 browser audit green on fresh build; typecheck + 122 tests + build green.

## v2 DONE 2026-06-17 — IMAGES
- [x] extract_images.py: PyMuPDF get_text("dict") image blocks (bytes+bbox inline, ~2.5s), associate to the
      question whose text-span contains the image by y-position; md5 logo filter + min-size filter. 900 Qs
      w/ images, 852 single-image. Spot-verified 3/3 correct (intersection, signal, sign).
- [x] safeImageUrl extended to allow same-origin /official-images/... root-relative paths (+ tests; rejects
      // and /\ tricks). Images served from public/official-images/.
- [x] import-official.ts copies each single-image question's image to public/official-images/ + sets imageUrl.
      Re-import: 902 official Qs / 40 topics, 428 with images. Verified in-browser (exam Q rendered a loaded
      /official-images img, naturalWidth>0). 14/14 audit green, 124 tests, build green.
- Only SINGLE-image questions imported (multi-image "pick-the-sign" need an option-image UI — deferred).
- §33 road signs still mostly excluded (section not count-matched in answer key) — revisit alignment.

## v3 DONE 2026-06-17 — MULTI-IMAGE
- [x] The "multi-image" questions turned out NOT to be option-image ("pick-the-sign") questions — they're
      text-option questions where extraction bled in a NEIGHBOUR's image (page-boundary / adjacent). Only 20
      were in importable sections.
- [x] Vision-verified all 20 (4 subagents read each question's images vs its text, kept only the matching
      scene). 18 → correct single image (bleed dropped), 1 (§43 Q1 helmets) genuinely 2-panel → vertically
      STACKED into one composite (build_final_images.py + Pillow) so the single-imageUrl render path still
      works (no schema/UI change). Verification CAUGHT a case I'd have gotten wrong (§12 Q9: the white-car
      image 12_9_1, not the bled blue-car 12_9_0).
- [x] q_image.json = final per-question single image. Re-import: 921 official Qs / 40 topics, 447 with images.
      Verified in-browser (exam Q rendered a loaded official image, naturalWidth 740). 14/14 audit green.
- Pipeline: extract_images.py → image_assoc.json → (mi_verify_input → subagents → mi_verified_*.json →
  mi_verified.json) → build_final_images.py → q_image.json → merge_answers.py → import_plan.json → importer.

## v4 DONE 2026-06-18 — TRUE OPTION-IMAGE (pick-the-sign)
- [x] Pick-the-sign questions ("Який із зображених знаків…", options "Знак 1..N") turned out to use a SINGLE
      STRIP image with the N signs numbered ①②③④ — so they render with the existing single-imageUrl model +
      text options "Знак N" (NO schema/option-image UI needed). Verified strip association 3/3 (33_2, 33_24, 33_76).
- [x] Unblocked §33: re-transcribed its answer key with REDUNDANCY (the subagents kept misreading §32 as
      1–152; §32 is actually 5 Qs and §33 starts at 1). 4 reads (2/page) + the original 2 → assemble_s33.py
      keeps only answers where ≥2 reads AGREE + in range → s33_answers.json: 348/357 cross-validated, 9
      uncertain (the 217–224 page-boundary) EXCLUDED.
- [x] merge_answers.py §33 supplement: import pick-the-sign §33 Qs with a cross-validated answer + strip image
      (single-sign §33 deferred — their sign may sit ABOVE the text → association risk). 58 added.
- [x] Re-import: 979 official Qs / 41 topics. Verified in-browser: ДОРОЖНІ ЗНАКИ practice renders the strip
      image (loaded) + "Знак 1..N" options + correct/incorrect feedback. 14/14 audit green.

## Remaining (v4+ — documented, not blocking)
- Single-sign §33/§34 questions ("Зображений знак означає") + §35: image often sits ABOVE the question text
  → extractor assigns it to the previous question (shift). Needs per-question image verification before import.
- 9 §33 answers at the 217–224 boundary (reads disagree): re-read those specific cells to recover.
- D / T / BE,CE,DE categories (§52–63): add categories + onboarding options, then import.
- §52–63 (D / T / BE,CE,DE): no seeded category — add categories + onboarding options, then import.
- Count-mismatched sections (§10,16.1,18,31,32,33,35,37,40,45,48,49,52): re-transcribe / fix parser splits.
- 69 range-bad questions: re-check answer-key cell vs parsed option count.
- Consider retiring demo content once official coverage is broad (keep tests green — they reseed separately).

## Correctness rule
Never import a question whose answer wasn't validated (count-match + range). Exam tool → wrong answer = harm.

## v5 DONE 2026-06-18 — SIGNS + NEW CATEGORIES + RECOVER (autonomous workflow)
Background Workflow `drivers-content-v5` drove the 3 remaining threads off the control thread, each gated by
answer-validation (+vision for image questions) then a green gate (typecheck+test+build+integrity) before
the single-writer apply (`v5_apply.py`). Final apply/ship done from the control thread.

Selection rule (per thread, enforced in `v5_apply.py`): ship iff `answerValidated==true` AND
(`needsVision==false` OR a UNANIMOUS vision keep==true exists for (section,qnum) → use its correctImagePath).
Extra DROP-only correctness guards: conflicting vision verdicts dropped; an image-bearing question
(image_map==True) with no verified display image is dropped (never ship a "depicted sign" question with no
image); §52–63 are fully owned by newcats (old base rows there purged so no stale answer survives).

1. **signs** — single-sign §33 ("Зображений дорожній знак означає"), image-above-text. Every image
   vision-verified. Candidates 119 → **95 shipped** / 24 dropped (no unanimous vision keep).
2. **newcats** — categories D / Т / BE-CE-DE (§52–63). Categories added to seed (`prisma/seed.ts`),
   importer maps §52–55→D, §56–59→BE,CE,DE, §60–63→T (`categoriesFor`). Candidates 274 →
   **262 shipped** / 12 dropped (1 vision conflict §56 Q8 + 11 image-without-verified-image).
3. **recover** — §33 range-bad answers re-validated. 348 answers re-validated, but §33 image association is
   the signs thread's job: 95 flow through signs (answers agree), 232 image-questions correctly DROPPED
   (validated answer but no vision-verified image), only **4 text-only §33 questions shipped standalone**.

Apply result: `import_plan.json` base 1436 → 1436 (overrode 361 base rows, 123 vision images staged into
`.content-import/v5img/`). Green gate: typecheck ✓ · 124 unit tests ✓ · build ✓.
Importer (after reseed so D/Т/BE/CE/DE Category rows exist): **1436 official questions, 53 topics, 724 with
images, 0 with no correct option**. Category coverage now D=171, T=53, BE=CE=DE=38 (§52–63 live).
Content-integrity (DB): every Q exactly one correct option; every image Q's imageUrl resolves to a file
under public/official-images/; no question without a category. All green.

Artifacts: `v5_<thread>_candidates.json`, `v5_vision_b*.json`, `v5_apply.py`, `v5_apply_summary.json`,
`v5img/`. Re-running is idempotent: `v5_apply.py` rebuilds import_plan + restages images; the importer
clears the prior OFFICIAL CV first. NOTE: the importer reads Category rows from the DB — if the dev DB
predates the D/Т/BE/CE/DE seed, reseed (`npm run db:seed`) BEFORE the importer or §52–63 silently skip.

## v6 DONE 2026-06-18 — MAPPING AUDIT + §33 BOUNDARY + RECOVER + DEMO RETIRE (autonomous workflow)
4 develop threads ran off the control thread; final apply/ship from the control thread via the
single writer `v6_apply.py` (re-runs `v5_apply.py` to rebuild the v1-v5 base, then layers the v6
overlay by (label,qnum); idempotent — strips prior `_v6` rows so re-runs are byte-identical / same
md5; the importer ignores the `_v6` marker key). Selection rule enforced in `v6_apply.py`: ship iff
`answerValidated==true` AND (`needsVision==false` OR the image is VISION-CONFIRMED IN THE CANDIDATE
FILE, i.e. a per-candidate `visionConfirmed/imageVerified/visionKeep/keep` flag — none present this batch).

1. **mapping audit** (verify-only — NO code change, no commit). Verdict: `categoriesFor` in
   `scripts/import-official.ts` matches the official §52-63 section TITLES exactly. Per-section
   title→codes (DB-verified over all 262 §52-63 questions, 0 violations):
     - §52-55 "…КАТЕГОРІЙ D1, D…" → **D**
     - §56-59 "…КАТЕГОРІЙ BE, C1E, CE, D1E, DE…" → **BE, CE, DE**
     - §60-63 "…КАТЕГОРІЇ T / Т…" → **T**
2. **§33 boundary** (`v6_s33boundary_candidates.json`, 9 candidates: §33 q217-222,224,297,340).
   IMPORTED 2026-06-18: 8 of the 9 were independently vision-confirmed (image clearly depicts the
   sign/scene the question asks about AND the cross-validated answer is correct given that image),
   marked `visionConfirmed:true` + verified image pinned in `imagePaths` in the candidate file, then
   layered by the SAME `v6_apply.py` selection rule (no code change — the flag flips them on; each
   confirmed image staged into `v6img/`, copied by the importer into `public/official-images/`).
   **8 shipped (q217,219,220,221,222,224,297,340) / 1 dropped (q218 — NOT vision-confirmed, held
   back)**. The correctness rule still holds: q218 ships only once its image is confirmed.
3. **recover** (`v6_recover_build.py` → `v6_recover_candidates.json`) — re-validate still-unimported
   count-mismatched/range-bad §10,18,31,32,35,37,40,45,48,49 questions via 3 redundant answer-key
   reads (A 300dpi, B 200dpi-gray, C high-zoom tiebreak: `v6_reads_{A,B,C}.json`); keep iff ≥2 of 3
   AGREE + in range + clean parse + text-only. **248 shipped / 0 dropped at apply**:
   §10:28 §18:3 §31:14 §32:5 §35:56 §37:46 §40:15 §45:6 §48:26 §49:49. (apply's text-only guard uses
   the SAME narrow IMG regex as the build — a broader pattern false-dropped 10 innocent text Qs.)
4. **demo-retire** (`lib/constants.ts` + `lib/server/test-engine.ts` + `components/brand.tsx` +
   `demo-retired.integration.test.ts` + 5 existing integration suites). Reversible flag name:
   **`SERVE_DEMO_QUESTIONS`** (`lib/constants.ts`, default `false`). With it off, demoWhere
   `{isDemo:false}` is threaded into `startSession` baseWhere + the mistake-mode requery + the
   saved-mode filter → every live pool serves only official Qs; demo rows stay SEEDED (retired, not
   deleted). 5 suites' throwaway Qs defaulted to isDemo=true → flipped to isDemo=false/OFFICIAL so
   they still enter the pool. Legal copy dropped the "demo marked separately" sentence.

Apply result: `import_plan.json` 1436 → **1684** (+248 recover; s33boundary +0). Green gate (this
order): typecheck ✓ · 124 unit tests ✓ · build ✓ (+ 21 integration tests ✓). Importer (after reseed):
**1684 official questions, 63 topics, 724 with images, 0 with no correct option**. Acceptance (DB):
every Q exactly one correct option (0/1700 bad); every image Q's imageUrl resolves under
public/official-images/ (724/724); all 262 §52-63 Qs mapped to their title's categories (0 bad); LIVE
pool (baseWhere) = 1684, **0 isDemo** (16 demo Qs still seeded). Browser audit NOT run (human runs it).
Commits: demoretire `bf6f0b8`, recover `abec0b4`, §33-boundary `afed0ae`; mapping audit = no commit.

§33-boundary IMPORTED 2026-06-18 (see thread 2 above): `import_plan.json` 1684 → **1692** (+8). Green
gate: typecheck ✓ · 124 unit tests ✓ · build ✓. Importer (after reseed): **1692 official questions,
63 topics, 732 with images, 0 with no correct option**. Acceptance (DB): every Q exactly one correct
option (0/1708 bad); every image Q's imageUrl resolves under public/official-images/ (732/732); all 8
new §33 Qs present with images. (q218 imported later — see below.)

q218 RESOLVED + IMPORTED 2026-06-18 — the 9th boundary question. The independent re-verify had DROPPED it
on an apparent answer↔image conflict, but a ground-truth check overturned that drop: downloaded the official
ПДР pictograms (1.6 крутий підйом = `/` low-left→high-right; 1.7 крутий спуск = `\` high-left→low-right;
media.vodiy.ua) and classified q218's strip against them — Знак 1 = `/` ascent (distractor), **Знак 2 = `\`
descent**. q218 asks for the descent sign → **answer Знак 2 is CORRECT** (matches the answer key + the
original v6 read; the re-verifier had inverted the slope). Marked `visionConfirmed:true` on q218, re-ran
`v6_apply.py` (s33boundary 9/9), reseed + importer → **1693 official questions**. Green gate (typecheck ·
124 tests · build) ✓; DB: q218 present, correct option "Знак 2.", image `/official-images/v6_33_218.jpeg`
serves 200 over real HTTP. ALL 9 boundary questions now in.

## v7 DONE 2026-06-18 — GROUNDED EXPLANATIONS (study aids, UNREVIEWED + labeled)
Generated 1682 grounded orientational explanations for the official questions (per-question short +
detailed + ПДР legalRef), merged + shipped through the importer + UI.

- merge_explanations.py: merges ALL .content-import/expl/gen_*.json → explanations.json keyed
  "<label>:<qnum>" = {short, detailed, legalRef, reviewedStatus}. Default reviewedStatus="UNREVIEWED".
  Where a chunk has an independent-verify ok_<i>.json, prefer that text: ok==true → REVIEWED + shipped;
  ok==false → explanations_flagged.json, NOT shipped. This batch: 1682 shipped (66 REVIEWED from the 5
  ok_ files covering §1, 1616 UNREVIEWED), **0 flagged** (no ok==false items present). Empty/whitespace
  strings normalized to null. Idempotent (rebuilds both outputs from scratch, stable-sorted).
- scripts/import-official.ts wired: loads explanations.json; per question, if "<label>:<qnum>" exists,
  sets explanation.shortText=short, detailedText=detailed||null, legalReference=legalRef||OFFICIAL_REF,
  reviewedStatus=its status; else keeps the official-base reference only. Idempotent (importer reseeds CV).
- UI: new `<ExplanationNotice reviewedStatus={...}/>` (components/ui.tsx) renders, for any explanation
  whose reviewedStatus !== "REVIEWED", the orientational label "Пояснення згенеровано автоматично —
  орієнтовне, звіряйтеся з чинними ПДР." Wired at ALL 4 learner render points: test-runner.tsx (practice
  feedback), test/[id]/result/page.tsx (review screen), mistakes/page.tsx, saved/page.tsx. Legal
  positioning preserved — never claims official; REVIEWED items show no notice.

Reseed + reimport (`npx tsx prisma/seed.ts` && `npx tsx scripts/import-official.ts`): **1691 official
questions, 63 topics, 0 with no correct option**. Explanations applied (OFFICIAL-scoped DB): 1691 rows,
**66 REVIEWED**, **1625 UNREVIEWED**, 1666 with short text (25 official questions had no generated
explanation → official-base reference only; the 1682 generated minus 1680 importer-applied = 2 lost to
within-section identical-question dedup). Green gate: typecheck ✓ · 216 unit tests ✓ · build ✓.
Deferred: images already shipped (v2–v6); full per-question human verification of all 1616 UNREVIEWED
explanations deferred (they are labeled orientational study aids until reviewed). Browser audit: human runs.

## Remaining (post-v6 — documented, not blocking)
- §33 boundary: ALL 9 IMPORTED 2026-06-18 (q217,219,220,221,222,224,297,340 + q218 resolved via the
  official-pictogram ground-truth check above). Thread complete.
- §34/§35 single-sign questions (not in v5's signs candidates) — same image-above-text risk,
  needs a per-image vision pass to unblock.
- 232 §33 image questions with a validated answer but no vision-verified image — recover their image
  association (extend the signs vision pass) to ship them.
- Onboarding category picker: D/Т/BE/CE/DE Category rows exist + are tagged on questions; surface them in
  the onboarding UI if not already selectable.
- Demo content retired from live pools via `SERVE_DEMO_QUESTIONS=false` (done v6). Demo rows remain
  seeded; flip the flag to bring them back (e.g. for a future "practice on samples" mode).

## v8 DONE 2026-06-19 — EXPLANATION AUDIT → found + fixed 13 WRONG ANSWER KEYS
Resumed the v7 deferred follow-up (the **sampled audit** of the 1625 UNREVIEWED explanations — per the
budget-scope rule, ship UNREVIEWED, audit later). Ran as offloaded background Workflows (auditor + skeptic
agents). Artifacts: `.content-import/expl_audit/` (sample, candidates, full verification results WITH
official-source citations). Pipeline: sampled-audit → garbage-strip → quarantine → ground-truth verify →
apply → durable-reimport.

- **Sampled audit** (120 text-only UNREVIEWED, stratified across 52 topics; 8 auditor agents + per-flag
  skeptic): explanation accuracy estimate ≈ **99.2%** (114 correct / 5 minor / 1 wrong). The 1 wrong
  exposed pipeline garbage → corpus scan.
- **Garbage strip:** 11 shipped explanations had generator meta-text ("FLAGGED, no explanation shipped" /
  "ФЛАГ/DROP") leaked into `detailedText` (short=null), + 3 fully-empty. `merge_explanations.py`'s
  "0 flagged" only counted ok==false items — it missed generator-embedded flags. Deleted those 14 keys
  from `explanations.json` + nulled in DB (fall back to official-base ref). 0 FLAG-text remains.
- **Answer-key conflicts:** the leaked flags were the generator noticing the marked answer conflicts with
  ПДР. Scanned all gen files → **30 candidates**. Quarantined all 30 (unpublished, reversible), then
  ground-truth-verified each against the official ГСЦ МВС base (WebSearch/WebFetch: pdr.infotech.gov.ua
  ticket pages, green-way, vodiy, testpdr) + independent skeptic. Auto-apply bar: web-confirmed +
  skeptic-confirmed + proposed answer VERBATIM-matches an existing option.
- **Result: 13 wrong answer keys fixed** (OCR/transcription errors, corrected back to ПДР/official), e.g.
  9:32 police-stop "Стоянкові ліхтарі"→"Аварійну світлову сигналізацію" (п.9.9б); 20:9 crossing→"stop,
  forbidden" (п.20.5в); 9:21/9:22 signal distance→"50-100 м" (п.9.4); 38:13 wet-road braking→"Збільшується".
  All 13 have UNIQUE text (no other copies). Fixes are DURABLE: `import_plan.json` `answer` field updated
  (importer maps `o.n===answer`), verified 13/13 survive a full reimport.
- **17 republished** (flagged but verified actually-correct — false alarms).
- **111 explanations promoted** UNREVIEWED→REVIEWED (the 114 audited-correct minus 3 still-quarantined),
  durable in `explanations.json`. (Reimport reconciled REVIEWED to 175 — `explanations.json` is now the
  single source of truth; a prior session's 16 direct-DB REVIEWED edits that weren't in the file reverted
  to UNREVIEWED, which is the safe labeled default.)
- **Durable quarantine:** `import-official.ts` now reads `.content-import/quarantine.json` and imports
  listed keys UNPUBLISHED (a reseed can't silently re-serve a suspect answer). Final list = **3
  image-based questions** (15:9, 15:11, 15:38) — their answer needs a VISION pass (text+web can't read the
  diagram). Verified: reimport → 3 imported unpublished, total unpublished official = 3.
- Gate green post-reimport: typecheck · 216 unit tests · build. Workflow note: the first answer-key
  workflow had an index-confusion bug (agents read by array position → 10 keys read the wrong element);
  fixed by selecting candidates BY KEY in a re-verify pass. Worth keeping in mind for future file fan-outs.

### v8+ TODO  → ALL DONE in v9 below

## v9 DONE 2026-06-19 — closed the v8 TODOs; exhaustive verify found 8 MORE wrong keys
Three offloaded follow-up tracks (vision / regen / exhaustive verify), all via background Workflows.

- **Vision pass (3 image-based, 15:9/15:11/15:38):** agents read the diagram + web-confirmed vs the
  official ГСЦ МВС base. All 3 marked answers were CORRECT (false alarms) → republished; quarantine.json
  now empty (0 questions quarantined).
- **Regenerated explanations for the 13 v8-fixed questions:** generated from the verified answer + ПДР
  clause, independently verified, all 13 pass → marked REVIEWED.
- **EXHAUSTIVE per-item verify of all 718 text-only UNREVIEWED** (40 chunks × ~18; 10 chunks hit transient
  529 and were re-run): 701 correct → promoted REVIEWED; 7 minor (left); 8 wrong_key + 2 wrong_explanation
  flagged. Ground-truth-verified the flags (web + skeptic, verbatim-option bar):
  - **8 MORE wrong answer keys fixed** the generator never flagged — e.g. 6:12 bicycle age "10"→"14 років"
    (п.6.1); 12:35 young-driver limit "60"→"70 км/год" (п.12.6б); 6:11 bicycle equipment→"Відповіді 1,2,3";
    8.1:71 регулювальник→"Відповіді 1,2,3,4"; 12:26/12:37/19:15. Plus 9:17 (мис-classified as
    wrong_explanation) → "Покажчик повороту" (п.9.2а). All regenerated + REVIEWED.
  - **23:10 — a ground-truth-tiebreak SAVE:** a regen agent claimed the key was wrong (purist п.23.7 read
    → partial-loading only), but verify found the official ГСЦ exam base ITSELF marks our current answer
    correct across 4 sources. Since we transcribe FROM the exam key (which grades by it), we KEPT the
    answer (its contradictory explanation was nulled, needs a careful regen acknowledging the
    clause/key inconsistency). See [[feedback-ground-truth-tiebreak]] — the purist re-read was the wrong voice.

**Session totals: 21 wrong answer keys found + fixed** (13 v8 + 7 exhaustive + 1 reclassified), all durable
in `import_plan.json`, verified 21/21 survive a full reimport. 0 quarantined. **878 REVIEWED explanations**
(up from 66 at v7 start). Gate green: typecheck · 216 tests · build.

## v10 2026-06-19 — image tooling (scoping found NO missing-image gaps)
Scoping: 1691 official Qs = 733 with image + 958 text-only, but **~0 text-only Qs actually need a missing
image** (the import is image-complete). So image *generation* fills no hole; remaining image work is
optional/cosmetic on the 733 correct scans (advised against en-masse — redraw risk > reward). Built the
capability instead:
- **Authored-SVG diagram mechanism** (reusable): `.content-import/question-svgs/` (svg files + index.json
  key→file); `import-official.ts` copies them into `public/official-images/` + sets imageUrl. Plain `<img>`
  render + `safeImageUrl` allow `/official-images/*.svg`. Wired Q **13:12** (крутий підйом roz'їzd) — first
  authored diagram, renders in-app, survives reimport. Render/verify loop: author SVG → `sharp` → Read PNG.
- **Official sign-vector library**: `public/sign-vectors/` — **85 official Ukrainian sign SVGs** from
  Wikimedia Commons (`Ukraine road sign X.Y.svg`), `index.json` maps ПДР sign№→file, fetcher
  `.content-import/fetch_sign_vectors.mjs` (paced, UA, resumable). COVERAGE CAVEAT: warning group 1.x is
  complete (1.1–1.41) but 3.x/4.x (prohibitory/mandatory) are largely absent as SVG on Commons → a full
  258-question sign swap is NOT possible from this source (mainly warning-sign Qs coverable).
- **Demo/illustrative generation**: `.content-import/gen_demo_image.mjs` (FLUX 2, provider-flexible:
  BFL_API_KEY preferred / FAL_KEY) → `public/demo-images/`. BLOCKED: needs an image-gen API key (the one
  thing not self-provisionable). Use FLUX 2 (not 1.1); BFL direct cheapest (~$0.03/MP) + newest.

### v10+ / image TODO
- **Sign-scan→vector swap**: only partially coverable (warning-sign Qs) + per-image vision-match risk →
  do as a verified PILOT, not a blanket 258 swap. Needs a more complete sign-SVG source for 3.x/4.x.
- **Demo scenes**: add a key, then `gen_demo_image.mjs`.

### v9+ TODO
- **~798 image-based UNREVIEWED explanations** — the exhaustive verify covered TEXT-ONLY only. The
  image-based ones need a VISION verify pass (read diagram + check explanation/answer) before promoting.
- **23:10** — regenerate an explanation that justifies the EXAM-KEY answer (rigid-coupling-OR-partial),
  noting the known п.23.7 inconsistency; currently official-base ref only.
- **7 minor + a few cross-section-duplicate** keys remain UNREVIEWED+labeled (safe); refine opportunistically.

## v11 DONE 2026-06-26 — filled the official base 1691 -> 2293 of 2330 (98.7%)
FINAL RESULT: 2293 official questions (from 1691), 0 with no correct option, gate green (typecheck ·
292 unit · build · 63 integration) + **14/14 real-browser audit** + new images verified serving via
/api/q-image. Commits e218471, c2bdd6c, ddc80ef, 904f1c2, da4f0e4, 0e4829f, 957bb4e, 9c888c5, a2b66ef,
26b5c3f, 107a0c9, 2bfab27 (all pushed). 630/631 missing answers validated.
RESIDUE (30 unshipped, documented — not lost): 16 §33 MULTI-sign "pick-the-sign" questions (need the
numbered option-STRIP image, not a single sign — the single-sign file was correctly rejected by vision);
~11 scene-image questions with no correct candidate on disk (§48:4, §40:2, §8.1:2, §52:2, §35:1, §56:1,
§15:1, §30:1); 1 unreadable answer cell (§52:8, read out-of-range by all passes). To finish them: build
§33 option-strips from v5_signs_imgs composites; extract/author the scene images; ground-truth §52:8.
Also pending follow-ups: the 104 audit_existing.json conflicts (v11 read disagreed with already-validated
answers — a SEPARATE careful audit, existing answers NOT changed); explanation-gen for the ~600 new Qs.
KEY BUG CAUGHT BY THE BROWSER AUDIT (not static gates): a dot in a staged imageKey (v11_16.1_<q>) 404'd
the /api/q-image route while the static path served 200 — fixed by replace('.', '_') (commit 2bfab27).

## v11 (history) 2026-06-25 — FINISH the full official base (1691 -> ~2330)
Owner ask: fill ALL remaining official questions with answers + images. Full design + live status:
`.content-import/v11/PLAN.md` (read it to resume). Pushed off the control thread as background Workflows
(orchestrate); shipped incrementally behind the green gate.

Gap at start: 1693 imported of 2330 source -> 632 missing. Pipeline (all in `v11/`):
- **Answers** re-read all 11 answer-key pages x3 vision passes (`v11-answerkey` wf). CRITICAL FINDING: a
  single fresh bulk read MISALIGNS on the dense, INTERLEAVED COLUMN-MAJOR answer-key grid (a section's
  qnums are split across side-by-side column-groups, pairs stepping by 8) — agreed with validated existing
  answers only 93.8%. FIX: **multi-source consensus** — ship an answer only when >=2 INDEPENDENT reads
  agree (sources: v1 answers_by_section, v6 reads, v5 newcats, s33, v11). NEVER overwrite existing answers
  from a bulk read (104 conflicts -> `v11/audit_existing.json`, separate audit). Single-source unknowns
  resolved via ANCHORED re-reads (`v11-tiebreak`: agent must reproduce a page/section's known answers
  before its new reads count) + FOCUSED per-section re-reads with the grid hint (`v11-focused`, captures
  ranges bulk reads missed e.g. §10 q1-40).
- **Images**: vision-verify each resolved image-Q against its extracted candidate (`v11-images`/`-2`); pick
  the right file, confirm it depicts the question, flag answer<->image conflicts. Residue-extract for
  no-candidate Qs via `v11/extract_residue.py` (PyMuPDF in `.content-import/.venv`).
- **Apply**: `v11/v11_apply.py` (idempotent overlay onto the v6 base, keyed by (label,qnum); stages images
  into `v11img/`; ships iff answer multi-source-validated AND (text OR vision-confirmed image)).
- Scripts: `merge_answers.py`, `merge_tiebreak.py` (section-aware), `merge_focused.py`, `build_img_candidates.py`.

SHIPPED so far (each behind typecheck+unit+build+integration, committed+pushed): chunk1 +182 text (1873),
chunk2 +61 img (1934), chunk3a tiebreak answers (1974), chunk3b all images (**2102 official**, commit
`da4f0e4`). 3 answer<->image-conflict Qs HELD (33:262, 30:7, 33:191). consensus answers = 503+.

REMAINING (v11 TODO): ~128 hard residue answers (focused re-read in flight) incl §16.1 (no anchor + image
-> may need vision answer-determination), §9/§14/§16.2 dense; §33 single-sign image tail (67 no-candidate);
the 3 held Qs; the 104-conflict existing-answer audit; explanation-gen for the new questions.

## v12 FINAL 2026-06-27 — 100% coverage (2322 official) + 36 answer fixes + 645 explanations
- **100% question coverage**: every source question shipped (DB 2322 official; the 2330 source has within-section
  dup keys). 0 with no correct option. 14/14 browser audit green; gate green.
- **36 wrong LIVE answer keys fixed** (durable overrides): 32 from the conflict audit + 2 held-uncertain
  (15:67, 51:18) + 2 from the GENERATION-AS-DATA-AUDIT (12:39 житлова-зона 30→20; 14:39 обгін 50м-before).
  The gen-audit found errors the conflict audit structurally could NOT (v11 agreed with the wrong answer).
- **645 grounded study-aid explanations** generated for the new questions (explanations.json 2323; 2321/2322
  covered, UNREVIEWED+labeled). §52:8 answer + 28 images (signs/светлофор/scene) sourced+verified.
- **Discipline that held throughout**: web-audit AND skeptic AND gen-audit all OVER-CONFIRM answer changes
  (clause read != graded exam key — the v9 23:10 trap). NEVER auto-applied a flag. Every change ground-truthed
  on the official exam base (verbatim quote + local match + 23:10 control). Of ~10 gen-audit flags, only 2 real;
  4 false alarms (4:8, 23:10, 48:25, 48:41) correctly REJECTED — protecting correct answers from corruption.

## v12 DONE 2026-06-26 — fixed 32 live answer keys + sourced 27 images → 2321/2330 (99.96% of unique)
FINAL: DB **2321 official** (0 with no correct option); gate green (typecheck · 292 unit · build · 63
integration) + **14/14 real-browser audit**; new images verified serving via /api/q-image. Only **§35:101**
(a generic exam scene, unsourceable) remains unshipped; 2 conflict answers (15:67, 51:18) held uncertain
(kept with existing). Pushed (commits 38110c6, fe15d99, a8bf1b3, +). Did:
- **32 wrong LIVE answer keys fixed** via overrides (durable). Method: web-audit + skeptic BOTH over-confirmed
  (100% wrong / 0% defended — UNRELIABLE; would've re-broken v9-settled 23:10). Switched to VERBATIM-QUOTE the
  marked answer from the exam base + LOCAL match + 23:10 CONTROL (correctly kept). Spot-verified 14:36/6:4/etc.
- **§52:8** (was missing/unreadable) web-resolved → opt 1; **27 official images sourced+verified** (25 §33/§40/
  §48/§56 signs by sign-number from Wikimedia/catalog + the 2 §8.1 светлофор figures), each independently
  vision-verified + several spot-checked by me; held image-question conflicts (63) NOT changed (web can't verify).
- BUG fixed earlier (v11): dotted imageKey (v11_16.1_*) 404'd /api/q-image — sanitize dots; caught by browser audit.
Remaining TODO: explanation-gen for the ~630 new Qs (v8/v9 generation-as-data-audit) to shrink residual errors.

## v12 (history) 2026-06-26 — audit the 104 answer-key conflicts (live answers) + finish residue
The v11 bulk read disagreed with 104 already-shipped answers. Web audit (105) + adversarial skeptic
(34) BOTH systematically OVER-CONFIRMED changes (audit 100/105 "wrong"; skeptic 0/34 defended existing)
— UNRELIABLE as a bulk signal. Proven: the audit flagged 23:10 as wrong, but v9 already verified the
official EXAM BASE marks our 23:10 answer correct (clause read ≠ graded key). BUT the batch is genuinely
MIXED: ground-truthed 14:36 myself → existing IS wrong (ПДР 14.3, proposed correct). So: do NOT bulk-apply
(would re-break 23:10) and do NOT bulk-reject (would miss 14:36). RESOLUTION: a final VERBATIM-QUOTE
verification (`v12-verbatim`) — each agent QUOTES the marked answer from the exam base (testpdr/manualov/
infotech/vodiy), returns verbatim TEXT (no index, no clause reasoning); deterministically match to our
options; 23:10 included as a CONTROL (method must keep it). Apply override ONLY where quoted==proposed and
!=existing. §52:8 (missing) web-resolved to opt 1; image-question conflicts (63) HELD (web can't verify).
Artifacts in v12/. Residue still open: 25 §33/scene sign images.
