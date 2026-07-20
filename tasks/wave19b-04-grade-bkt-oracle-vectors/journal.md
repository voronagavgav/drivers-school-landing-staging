# Task: wave19b-04-grade-bkt-oracle-vectors

**Status:** done
**Driver:** auto
**Updated:** 2026-07-12
**Last compute:** ClPcs-Mac-mini

ORACLE-AUTHORING (anti self-grading) for the Bayesian guessing-corrected grade inference (Wave 19b deliverable
#2). This task PINS the exact BKT guess/slip posterior update math and writes the FROZEN numeric posterior
vectors as a unit-test file — TESTS ONLY, no implementation. The posterior literals are hand-computed from
Bayes' theorem (external truth), frozen before task 05 implements `deriveGrade`, so the implementation cannot
be tuned to a self-consistent test.

## THE UPDATE MATH (pinned here — task 05 implements exactly this)
A single-correct MCQ answer is a BKT guess/slip observation of a latent "knows this item" variable.
- Prior `p0 = P(knows)` BEFORE this answer (sourced by the server in task 05: retrievability of the prior
  memory state for a card with history; a NEUTRAL `0.5` for a first-ever/`new` card — never the R=1 of an
  unreviewed card).
- Guess floor `g = 1/optionCount` (default `0.25` for 4-option ПДР items).
- Slip `s` = constant `FSRS_SLIP = 0.10`.
- Posterior after a CORRECT answer: `π = p0·(1−s) / ( p0·(1−s) + (1−p0)·g )`.
- Posterior after a WRONG answer: `π = p0·s / ( p0·s + (1−p0)·(1−g) )` (informational only — a wrong answer
  still grades Again(1); see task 05).

## Goal
PASS = ALL true:

1. A new `lib/fsrs/grade-posterior.test.ts` exists, is collected by `npm test` (`npx vitest list` grep), and is
   PURE (lib/fsrs purity: no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`/`Math.random`/`Date.now`/
   `new Date`, per `lib/fsrs/CLAUDE.md`).
2. It encodes ALL of these FROZEN posterior literals as `toBeCloseTo(literal, 10)`, each commented with its
   Bayes-theorem derivation. With `g=0.25, s=0.10`, CORRECT-answer posterior `π(p0)`:
   - p0=0.2 → `0.4736842105`  (= 0.18/0.38)
   - p0=0.5 → `0.7826086957`  (= 0.45/0.575)
   - p0=0.8 → `0.9350649351`  (= 0.72/0.77)
   - p0=0.9 → `0.9700598802`  (= 0.81/0.835)
   With `g=0.5` (2-option), CORRECT, p0=0.5 → `0.6428571429` (= 0.45/0.70).
   WRONG-answer posterior with `g=0.25, s=0.10`, p0=0.8 → `0.3478260870` (= 0.08/0.23).
3. It documents (comment) the two BEHAVIORAL properties task 05 must satisfy (the point of the whole fix):
   (a) a lucky FAST-CORRECT on a WEAK item (low p0) must NOT grade Easy(4) — the guessing correction pulls the
   posterior below the Easy band; (b) a genuine strong-item correct (high p0) still reaches Easy(4).
4. The frozen posterior values are asserted against a small pinned pure helper the test itself defines OR
   against the impl symbol behind an `it.skip`/`describe.skip` until task 05 exports it — document which. `npm
   run -s typecheck` exits 0; `npm run -s test` exits 0 with the suite green.

## Constraints / decisions
- The posterior formula is Bayes' theorem with a 2-outcome likelihood (`P(correct|knows)=1−s`,
  `P(correct|¬knows)=g`) — an EXTERNAL closed form; the literals are exact rationals, not fitted. Do not change
  them to fit an impl.
- Guess `g=1/optionCount` (0.25 default), slip `s=0.10` are the pinned constants; task 05 adds
  `FSRS_GUESS_DEFAULT`/`FSRS_SLIP` to `lib/fsrs/constants.ts`. This task only PINS them in the oracle.
- The posterior→grade THRESHOLDS (which band π maps to) are product tuning owned by task 05, NOT frozen here —
  this task freezes only the posterior probability (the mathematical core) plus the two behavioral intents.
- TESTS ONLY: do NOT edit `lib/fsrs/grade.ts` or its callers in this task.

## Next
- [x] Write `lib/fsrs/grade-posterior.test.ts` with the frozen Bayes literals + the two behavioral intents;
      run typecheck + `npx vitest list`.
- Goal fully met. Task 05 (wave19b-05) implements `gradePosterior`/`deriveGrade` against these frozen
  posteriors + adds `FSRS_GUESS_DEFAULT`/`FSRS_SLIP` to `lib/fsrs/constants.ts`.

## Log
- 2026-07-12 laptop: planned. Posterior literals hand-computed from Bayes (g=0.25, s=0.10); the anti-lucky-
  guess behavioral property is the real acceptance signal, pinned for task 05.
- 2026-07-12 ClPcs-Mac-mini: wrote `lib/fsrs/grade-posterior.test.ts` (TESTS ONLY). All six FROZEN
  posterior literals asserted with `toBeCloseTo(lit,10)` against a locally-defined PURE `bktPosterior`
  closed form (documented: helper is the EXTERNAL Bayes truth, non-skipped so the suite is green before
  task 05 exports the impl — grades the vectors, not the impl). Each literal commented with its
  Bayes-theorem rational derivation (CORRECT π at p0∈{.2,.5,.8,.9} g=.25; 2-option g=.5 p0=.5; WRONG
  p0=.8). Documented the two behavioral intents as real assertions: (a) weak-item correct π≈0.474 < 0.5
  (anti-lucky-guess), (b) strong-item correct π≈0.970 > 0.95 (Easy stays reachable), plus a monotone-in-
  prior check. verify.sh GREEN: purity + all 6 literal greps + typecheck + full `npm test` (661 pass) +
  `vitest list` collection. Status→done.

## Artifacts
- `lib/fsrs/grade-posterior.test.ts` — FROZEN BKT guess/slip posterior oracle (6 literals + 2 behavioral intents).

## Verify
**Last verify:** PASS (2026-07-12T15:09:26Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T15:10:23Z)
