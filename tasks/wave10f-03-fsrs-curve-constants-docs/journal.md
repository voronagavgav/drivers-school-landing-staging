# Task: wave10f-03-fsrs-curve-constants-docs

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Decouple the FIXED FSRS-5 curve constants from the free `FSRS_TARGET_RETENTION` parameter (B2), and fix
the docs that wrongly imply the short-term w17/w18 terms fire (B4).

Boolean acceptance criteria:
1. `lib/fsrs/retrievability.ts` defines `FSRS_FACTOR` as the literal `19 / 81` (NOT
   `Math.pow(FSRS_TARGET_RETENTION, 1/FSRS_DECAY) - 1`) and `FSRS_DECAY` as the literal `-0.5`. These are
   fixed model constants the weights were fitted against, independent of target retention.
2. `FSRS_TARGET_RETENTION` remains a free parameter of `intervalDays` ONLY (the interval-inversion still
   reads it); the forgetting curve no longer derives its factor from it.
3. A unit test asserts the identity `R(elapsed=S, S) ≈ 0.9` STILL holds even when
   `FSRS_TARGET_RETENTION !== 0.9` (i.e. the curve is now decoupled from the target). Test file exists
   under `lib/fsrs/` and is listed by `npx vitest list`.
4. Docs honesty (B4): `lib/fsrs/constants.ts` and `lib/fsrs/CLAUDE.md` comments no longer imply w17/w18
   are active — they state we ship the published `enable_short_term=false` long-term variant and w17/w18
   are deliberately unused. `grep -q "enable_short_term" lib/fsrs/constants.ts` is true.
5. `npm test` exits 0; `npm run typecheck` exits 0.
6. `lib/fsrs/` purity gate still holds (no banned tokens introduced, comments included).

## Constraints / decisions
- `19 / 81` is the exact rational for `0.9^(1/-0.5) - 1`; keep it as `19 / 81` with a comment giving the
  provenance so the decoupling is legible. The value must be numerically identical so existing curve
  behaviour at target 0.9 is unchanged.
- Fold B4 (docs nit) here because it also edits `constants.ts`. Non-Goal: prior-difficulty (wave10f-02),
  grade logic (wave10f-04).
- Purity greps match comments — do not write banned literal tokens in the corrected doc comments.

## Plan
- [x] Replace the derived `FSRS_FACTOR`/`FSRS_DECAY` in `retrievability.ts` with the fixed literals + note.
- [x] Add the decoupling test (R(S,S)≈0.9 with target≠0.9).
- [x] Correct the w17/w18 comments in `constants.ts` + `CLAUDE.md`.
- [x] `npm test` + `npm run typecheck` 0.

## Next
- (none — Goal met; verify.sh PASSes)

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01T00:00Z ClPcs-Mac-mini: Hardcoded `FSRS_FACTOR = 19 / 81` (was `Math.pow(FSRS_TARGET_RETENTION, 1/FSRS_DECAY) - 1`) and confirmed `FSRS_DECAY = -0.5` literal in `retrievability.ts`; added provenance comments decoupling the fixed curve constants from the free target-retention knob. Dropped the now-unused `FSRS_TARGET_RETENTION` import (interval-inversion still reads it in `schedule.ts`, satisfying B2/criterion 2). `npm run typecheck` exits 0.
- 2026-07-01T23:25Z ClPcs-Mac-mini: Fixed the failed docs-honesty gate — `constants.ts` w17/w18 comment now states they are DELIBERATELY UNUSED under the published `enable_short_term=false` long-term variant (kept only for 19-slot index alignment); `grep -q enable_short_term` now true. Added the decoupling test block to `retrievability.test.ts`: asserts `FSRS_FACTOR === 19/81` / `FSRS_DECAY === -0.5` (fixed, not derived), computes the factor a hypothetical target 0.85 WOULD produce and shows it differs, then proves `R(elapsed=S, S) ≈ 0.9` for S∈{1,5,10,42} regardless — i.e. curve decoupled from `FSRS_TARGET_RETENTION`. Full verify.sh PASS (330 tests, typecheck 0).

## Artifacts
- `lib/fsrs/retrievability.ts` — fixed `FSRS_FACTOR = 19/81` / `FSRS_DECAY = -0.5` literals + provenance.
- `lib/fsrs/constants.ts` — w17/w18 honesty comment (`enable_short_term=false`, deliberately unused).
- `lib/fsrs/retrievability.test.ts` — decoupling test block (R(S,S)≈0.9 independent of target).


## Verify
**Last verify:** PASS (2026-07-01T20:26:26Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:27:30Z)
