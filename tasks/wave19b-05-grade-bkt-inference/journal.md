# Task: wave19b-05-grade-bkt-inference

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-12
**Last compute:** ClPcs-Mac-mini
**Artifacts:** lib/fsrs/constants.ts, lib/fsrs/grade.ts, lib/fsrs/grade.test.ts, lib/server/study.ts,
lib/server/grade-inference.integration.test.ts, lib/server/srs-review.integration.test.ts

LIB + SERVER-WIRING IMPLEMENTATION of the Bayesian guessing-corrected grade inference (Wave 19b deliverable
#2). Replace `lib/fsrs/grade.ts`'s primary latency-band axis with the BKT guess/slip posterior pinned in task
04, keep the confidence-probe veto (Wave 12b) and the FSRS 1..4 output domain, thread the prior into the one
production caller, and keep everything deterministic + the FSRS-6 reference vectors green.

## Goal
PASS = ALL true:

1. `lib/fsrs/constants.ts` adds `FSRS_GUESS_DEFAULT = 0.25` and `FSRS_SLIP = 0.10` (documented: 4-option MCQ
   guess floor / slip). `lib/fsrs/grade.ts` exports a PURE `gradePosterior({ correct, priorKnow, optionCount? })`
   → the BKT posterior `π` using the EXACT formula pinned in task 04 (`g = 1/optionCount` default 4 → 0.25;
   `s = FSRS_SLIP`). Task 04's `lib/fsrs/grade-posterior.test.ts` is UN-SKIPPED and green (frozen literals
   unchanged).
2. `deriveGrade` gains an optional `priorKnow?: number` (and optional `optionCount?: number`) on
   `DeriveGradeInput`. New mapping (documented in the module header):
   - wrong → `1` (Again), unconditionally (preserves `correct = grade ≥ 2` — `lib/server/calibration.ts`
     depends on it).
   - correct → base band from `π = gradePosterior(...)`: `π ≥ 0.93` → Easy(4); `π ≥ 0.75` → Good(3); else
     Hard(2). Thresholds are named constants (`FSRS_KNOW_EASY`, `FSRS_KNOW_GOOD`).
   - SECONDARY latency/confidence: `verySlow` (≥ hardMs) caps the grade at Good(3); confidence ≤
     `FSRS_LOW_CONFIDENCE_MAX` (≤2) caps at Hard(2) (the preserved Wave-12b veto). Latency NO LONGER promotes
     to Easy on its own (posterior is the primary axis).
   - When `priorKnow` is absent (legacy/untimed callers), fall back to a NEUTRAL prior `0.5` so behaviour is
     defined (documented).
3. BEHAVIORAL ORACLE (the fix's whole point) as unit tests, tolerance-free integer grade assertions:
   - lucky weak guess: `deriveGrade({correct:true, latencyMs:1000, priorKnow:0.2})` → `2` (Hard), and in
     particular `!== 4`. (Old code returned Easy(4).)
   - genuine strong: `deriveGrade({correct:true, latencyMs:1000, priorKnow:0.9})` → `4` (Easy).
   - first-exposure: `deriveGrade({correct:true, latencyMs:1000, priorKnow:0.5})` → `3` (Good), `!== 4`.
   - confidence veto: `deriveGrade({correct:true, latencyMs:1000, priorKnow:0.9, confidence:1})` → `2` (Hard).
   - wrong is Again: `deriveGrade({correct:false, priorKnow:0.9})` → `1`.
4. PRODUCTION PATH wired: `lib/server/study.ts`'s `recordReview` computes `priorKnow` from the prior memory
   state — `retrievability(prior, now)` for a card with `lastReviewedAt`, else the neutral `0.5` for a fresh
   `new` card (NEVER the R=1 of an unreviewed card) — and passes it (plus `optionCount` if trivially available)
   into `deriveGrade`. An INTEGRATION test drives the REAL submit path (`submitAnswer`/`submitAnswerAction`, not
   `deriveGrade` directly): a FIRST-ever fast-correct answer on a throwaway question stores `ReviewState.lastGrade`
   `<= 3` (NOT 4), proving the guessing correction reaches production.
5. REGRESSION: `lib/fsrs/reference-vectors.test.ts` (FSRS-6 golden vectors, wave19a-01) stays green UNCHANGED —
   this task changes grade INPUTS, never the scheduler math. `npm run -s typecheck` exits 0; `npm run -s test`
   exits 0; `npm run -s test:integration` for the driven suite exits 0.
6. MIGRATION-HONESTY: `lib/fsrs/grade.ts` header documents that existing `ReviewState` rows built under the old
   latency heuristic are NOT retro-rewritten — the new inference applies FORWARD ONLY.
7. PURITY: `lib/fsrs/grade.ts` stays pure (no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`/
   `Math.random`/`Date.now`/`new Date`).

## Constraints / decisions
- Determinism preserved: no clock/rng in `grade.ts`; the server passes an injected `now` (existing house rule).
- The posterior is the PRIMARY axis; latency + confidence are SECONDARY (cap-only), per research Wave B. Do not
  reintroduce a latency→Easy promotion.
- `optionCount` derivation is best-effort: default 4 (→ g=0.25) is acceptable if option count is not already in
  scope at the call site — do NOT add a DB read just to fetch it (keep `recordReview` lean). Document the choice.
- Keep the existing `DeriveGradeOverrides` (easyMs/hardMs per-topic bands) working for the `verySlow` cap.
- HIGH-STAKES (upstream of the scheduler; a wrong mapping silently corrupts every future stability) → **Model:
  claude-opus-4-8**, **Evaluate: yes**.
- Non-goals: per-topic slip fitting, confidence as a full third axis, any dial/UI change, retro-rewriting states.

## Next
- [x] Add `FSRS_GUESS_DEFAULT`/`FSRS_SLIP`/`FSRS_KNOW_*`; implement `gradePosterior` + rewrite `deriveGrade`;
      un-skip task-04 oracle; wire `priorKnow` in `recordReview`; add the behavioral unit tests + the
      production-path integration test; run typecheck + test + the integration suite.
- Goal fully met; `verify.sh` PASSes. Nothing left — follow-on section-bucketing/readiness work is owned by
  tasks 06–10.

## Log
- 2026-07-12 laptop: planned. Depends on task 04 (frozen posterior oracle). Mapping bands (0.93/0.75) are
  product tuning; the anti-lucky-guess + confidence-veto behaviors are the hard acceptance criteria.
- 2026-07-12 ClPcs-Mac-mini: implemented full deliverable. constants.ts: `FSRS_GUESS_DEFAULT=0.25`,
  `FSRS_SLIP=0.1`, `FSRS_KNOW_EASY=0.93`, `FSRS_KNOW_GOOD=0.75`. grade.ts: exported pure
  `gradePosterior({correct,priorKnow,optionCount?})` (BKT closed form matching the frozen oracle) and
  rewrote `deriveGrade` — posterior is now the PRIMARY axis (π≥0.93→Easy, ≥0.75→Good, else Hard);
  latency/confidence are cap-only (verySlow caps Easy→Good; conf≤2 caps→Hard); absent `priorKnow`→neutral
  0.5; header documents forward-only migration honesty. Wired `recordReview` (study.ts) to compute
  `priorKnow = retrievability(prior,now)` for cards with history, else 0.5 for fresh `new` cards.
  Rewrote grade.test.ts to the new behavioral oracle (Goal #3 literals). Added
  grade-inference.integration.test.ts (first-ever fast-correct → lastGrade≤3, NOT 4). Fixed
  srs-review.integration.test.ts §4: an Easy(4) on a first exposure is no longer reachable, so drove q2
  into `review` via TWO corrects (new→learning→review) and bumped the log count 2→3. typecheck + `npm test`
  (662) + full `test:integration` (263 pass/2 skip) all green; verify.sh → PASS wave19b-05.

## Verify
**Last verify:** PASS (2026-07-12T15:20:10Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T15:22:31Z)
