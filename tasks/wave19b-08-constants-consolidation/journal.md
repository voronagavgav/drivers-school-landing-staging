# Task: wave19b-08-constants-consolidation

**Status:** done
**Driver:** auto
**Updated:** 2026-07-12
**Last compute:** ClPcs-Mac-mini

CONSTANTS CLEANUP (Wave 19b deliverable #4, the small/safe half). Consolidate the
`READINESS_MIN_SEEN` / `READINESS_MIN_ANSWERS` redundancy (both `20`) to a SINGLE source with no dangling
references. Behavior must be byte-identical (both values are 20 today). Pure mechanical refactor + tests.

## Investigated at plan time (so the driver doesn't re-derive)
- `READINESS_MIN_SEEN` (20) is the FSRS readiness-path threshold — used by `lib/server/mastery-readiness.ts`
  (`sufficientData = seenCount >= READINESS_MIN_SEEN`) + several integration tests + the dial prop.
- `READINESS_MIN_ANSWERS` (20) is used ONLY by the LEGACY 3-band estimator `lib/progress.ts` (and
  `lib/server/progress-volume.integration.test.ts`). It is the redundant twin: same value, "unused in the
  [FSRS] readiness path".

## Goal
PASS = ALL true:

1. `lib/constants.ts` has a SINGLE numeric source of `20` for this threshold. Chosen approach: KEEP
   `READINESS_MIN_SEEN = 20` as the source; REMOVE the separate `export const READINESS_MIN_ANSWERS = 20;` and
   repoint its references to `READINESS_MIN_SEEN` (or, if a named legacy alias is preferred, export
   `READINESS_MIN_ANSWERS = READINESS_MIN_SEEN` — but do NOT keep two independent `= 20` literals). Document
   the decision in a comment.
2. `lib/progress.ts` and `lib/server/progress-volume.integration.test.ts` compile & pass against the
   consolidated constant (value unchanged → assertions unchanged).
3. GREP-VERIFIED no dangling references: after the change, `grep -rn "READINESS_MIN_ANSWERS" lib app components`
   returns either zero matches (removed) OR only the single-line alias definition in `lib/constants.ts` (aliased)
   — NOT two independent literals. verify.sh enforces this.
4. `npm run -s typecheck` exits 0; `npm run -s test` exits 0; `npm run -s test:integration` exits 0 (the
   progress-volume suite still green).

## Constraints / decisions
- Value stays 20 — this is a de-duplication, NOT a tuning change. Do not change the number.
- Do NOT touch inputsJson / engine-version tag here — that (plus ρ recording) is task 09, to keep a single
  owner of the `recomputeReadiness` inputsJson edit.
- Keep the diff minimal; no behavioral change; no UI.
- Non-goals: the dial disclaimer copy (task 10), correlation constant (added in task 02), anything server-side.

## Next
- [x] Consolidate the constant; repoint `lib/progress.ts` + its integration test; grep-verify no dangling
      independent literal; run typecheck + test + test:integration.
- (none — Goal fully met, Status: done)

## Artifacts
- lib/constants.ts (removed READINESS_MIN_ANSWERS; READINESS_MIN_SEEN is the single `= 20` source)
- lib/progress.ts (repointed to READINESS_MIN_SEEN)
- lib/server/progress-volume.integration.test.ts (repointed to READINESS_MIN_SEEN)

## Log
- 2026-07-12 laptop: planned. Confirmed READINESS_MIN_ANSWERS is only used by the legacy progress.ts path;
  READINESS_MIN_SEEN owns the FSRS readiness path.
- 2026-07-12 ClPcs-Mac-mini: REMOVED `export const READINESS_MIN_ANSWERS = 20;` from lib/constants.ts (chose
  full removal over aliasing so there is a single `= 20` source). Repointed all references to
  READINESS_MIN_SEEN: lib/progress.ts (import, doc comment, guard, user-facing копія) and
  lib/server/progress-volume.integration.test.ts (import + 2 comments + assertion). Value unchanged (20), so
  assertions unchanged — no oracle edit. IMPORTANT: reworded the constants.ts doc comment to NOT name the
  literal token `READINESS_MIN_ANSWERS` — verify.sh's STRAY grep flags ANY surviving mention (incl. comments)
  when the symbol is fully removed (no alias def present), so a comment naming it would false-FAIL the gate.
  Ran full verify.sh → PASS (typecheck 0, test 667 passed, test:integration 266 passed). Goal all-true.

## Verify
**Last verify:** PASS (2026-07-12T16:06:46Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T16:08:09Z)
