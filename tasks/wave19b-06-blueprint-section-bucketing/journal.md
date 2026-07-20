# Task: wave19b-06-blueprint-section-bucketing

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-12
**Last compute:** laptop

LIB IMPLEMENTATION of the blueprint block-bucketing fix (Wave 19b deliverable #3). Root cause (confirmed
against live dev.db at plan time): `groupCandidatesByBlock` derives a topic's official section as
`displayOrder − 99`, but two наказ sections (§8, §16) were each imported as TWO topics, so `displayOrder`
drifts +1 after §8 and +2 after §16 — e.g. §31 (ТЕХНІЧНИЙ СТАН) sits at displayOrder **132** not 130, §33
(ДОРОЖНІ ЗНАКИ) at **134** not 132. Nearly every blueprint block then misses its questions and they collapse
into the `pdr` remainder. The FIX: bucket by the naказ section number derived EXPLICITLY from the stable
`questionKey` (`q_<section>_<qnum>`), not from displayOrder arithmetic.

## Goal
PASS = ALL true:

1. `lib/content-key.ts` gains a PURE export `sectionFromQuestionKey(key: string): number | null` returning the
   top-level наказ section (the first numeric group after `q_`); dotted subsections map to their PARENT section.
   Frozen oracles (unit tests in `lib/content-key.test.ts`): `q_31_5`→`31`, `q_1_79`→`1`, `q_8_1_2`→`8`
   (subsection §8.1 → parent 8), `q_33_10`→`33`, malformed (`""`, `abc`, `q__1`) → `null`.
2. `groupCandidatesByBlock` (`lib/exam-blueprint.ts`) is changed to take candidates carrying an EXPLICIT
   section: `{ id: string; section: number | null }` (no longer `displayOrder`). A candidate matches a
   non-remainder block when its `section` is in that block's `sections`; `null`/unclaimed → remainder. The
   `displayOrder − 99` derivation is REMOVED from the bucketing path.
3. Synthetic bucketing oracle (unit tests, `lib/exam-blueprint.test.ts` updated): with `CATEGORY_B_BLUEPRINT`,
   a candidate with `section:31` → `structure`; `section:37` → `medicine`; `section:33` → `pdr` (remainder,
   signs are unclaimed); `section:8` (a split section) → `pdr`; `section:null` → `pdr`. Assert the buggy old
   behaviour is gone: a §31 candidate is NOT in `pdr`.
4. Exact-value directional oracle (pure, `lib/exam-blueprint.test.ts` or `readiness-model.test.ts`) proving
   correct bucketing changes the number: `computeReadiness` over heterogeneous blocks
   `[{quota:2,meanProb:0.4},{quota:2,meanProb:0.95}]`, threshold 3-of-4, yields
   `passProbability ≈ 0.5928` (hand-computed exact PB tail), whereas the HOMOGENEOUS flat-pool fallback at the
   same pool mean `0.675` yields `≈ 0.6074050781` — i.e. concentrated weakness in a fixed-quota block gives a
   STRICTLY LOWER P(pass) than the pooled average (heterogeneous < homogeneous). Both literals frozen here.
5. The misleading `sectionDisplayOrder`/`SECTION_DISPLAY_ORDER_OFFSET` are NO LONGER used for bucketing (grep:
   `groupCandidatesByBlock` body contains no `SECTION_DISPLAY_ORDER_OFFSET` / `displayOrder`); the existing
   `lib/exam-blueprint.test.ts` PIN assertions that encode the FALSE `section+99` live mapping (e.g.
   `sectionDisplayOrder(31)===130`) are removed or rewritten to reflect that displayOrder is NOT the section
   source (document the live drift in a comment: §31→132, §33→134).
6. PURITY: `lib/content-key.ts` and `lib/exam-blueprint.ts` stay pure (no `server-only`/`@/lib/db`/
   `@prisma/client`/`lib/generated`/`Math.random`/`Date.now`/`new Date`). `npm run -s typecheck` exits 0;
   `npm run -s test` exits 0.
7. verify.sh cross-checks the fix against the LIVE dev.db: it confirms (via `sqlite3`) that the questionKey-
   derived section for the ДОРОЖНІ ЗНАКИ topic is 33 while its displayOrder is 134 (i.e. the +99 assumption is
   demonstrably wrong on the seed and the new derivation is right).

## Constraints / decisions
- The naказ section lives in `questionKey`, a STABLE content key (`lib/content-key.ts`) that already survives
  re-import — this is the "section number stored/derived explicitly" the spec asks for, and it is immune to the
  displayOrder drift. Do NOT add a schema column (spec: expect no schema changes).
- Changing `groupCandidatesByBlock`'s signature ripples to its two SERVER callers (`recomputeReadiness` block
  builder + the `test-engine.ts` exam composer) and the integration test — those are wired in task 07, NOT
  here. This task keeps the pure lib + its unit tests green; the server callers may transiently not typecheck
  until task 07 — so this task ALSO updates both call sites minimally to pass `section:
  sectionFromQuestionKey(q.questionKey)` (selecting `questionKey`) so typecheck stays 0. (If that is too large,
  split, but prefer keeping the tree compiling.)
- Exact-value literals (0.5928, 0.6074050781) are frozen at plan time — do not re-fit them.
- Non-goals: un-skipping the integration test / real-seed directional oracle (task 07), correlation (tasks
  1-3), any UI.

## Next
- [x] Add `sectionFromQuestionKey` + its oracle; rewrite `groupCandidatesByBlock` to bucket by explicit
      section; update `lib/exam-blueprint.test.ts` (synthetic bucketing + drift comment + exact P(pass)
      literals); update the two server call sites to pass `section`; run typecheck + test + the live-db check.
- (task 07) Un-skip + rewrite the blueprint integration test to assert correct real-seed bucketing; the
  integration test call sites here were only made to COMPILE (now pass `section` from questionKey), not
  yet re-frozen against the corrected real-data vectors.

## Artifacts
- lib/content-key.ts (`sectionFromQuestionKey`), lib/content-key.test.ts (oracle)
- lib/exam-blueprint.ts (`groupCandidatesByBlock` rewrite + header), lib/exam-blueprint.test.ts (drift PIN + bucketing oracle)
- lib/readiness-model.test.ts (exact directional P(pass) oracle)
- lib/test-engine/diagnostic.ts (DiagnosticCandidate.section), lib/test-engine/diagnostic.test.ts (pools)
- lib/server/mastery-readiness.ts, lib/server/test-engine.ts, lib/server/study.ts (call sites)
- lib/server/exam-blueprint.integration.test.ts, lib/server/practice-modes.integration.test.ts (compile-only)

## Log
- 2026-07-12 laptop: planned. Live dev.db confirmed at plan time: §8 & §16 each split into 2 topics → +101
  drift by the signs section; questionKey (q_<sec>_<qnum>) carries the true naказ section. Exact P(pass)
  literals hand-computed from the Poisson-binomial tail.
- 2026-07-12 ClPcs-Mac-mini: implemented the fix. Added pure `sectionFromQuestionKey(key)` to
  lib/content-key.ts (`/^q_(\d+)_/` → parent section; null on malformed) + its oracle in content-key.test.ts.
  Rewrote `groupCandidatesByBlock` to take `{id, section: number|null}` (removed the displayOrder−99
  derivation) + updated the file header. Rewrote lib/exam-blueprint.test.ts: replaced the FALSE +99
  live-mapping PIN (now labels sectionDisplayOrder pure arithmetic, documents §31→132/§33→134 drift) + added
  a synthetic bucketing oracle (§31→structure, §33/§8/null→pdr, §31 NOT in pdr). Added the exact directional
  P(pass) oracle to readiness-model.test.ts (het [0.4,0.4,0.95,0.95] 3-of-4 = 0.5928 < homogeneous μ=0.675
  = 0.6074050781; both verified by hand). Wired ALL call sites to pass `section` from questionKey (nullable →
  `?? ""`): server callers mastery-readiness.ts + test-engine.ts; also the pure diagnostic path
  (DiagnosticCandidate.displayOrder→section, study.ts loadDiagnosticCandidates + diagnostic.test.ts pools,
  membership-preserving) and the two integration test pooled-helpers (compile-only, task 07 re-freezes).
  typecheck 0, `npm test` 667 passed, verify.sh green incl. live-db cross-check (signs displayOrder=134,
  questionKey section=33). Status → done.

## Verify
**Last verify:** PASS (2026-07-12T15:31:53Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T15:33:16Z)
