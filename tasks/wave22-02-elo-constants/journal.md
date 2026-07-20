# Task: wave22-02-elo-constants

**Status:** done
**Driver:** auto
**Updated:** 2026-07-14
**Last compute:** mac-mini

DECLARATION-ONLY task: add the wave22 `ELO_*` constants to `lib/constants.ts`. No test authored, no
oracle, no fixture, no behavior change ⇒ structural traps (self-referential/weakened test,
fixture-population dodging) are inapplicable by construction. The evaluator confirms each criterion by
a direct READ of `lib/constants.ts`.

Depends on: wave22-01 (the pinned values are DECIDED in the oracle journal; this task copies them).

## Goal
PASS = ALL true:

1. `lib/constants.ts` exports each of these top-level `export const` bindings with EXACTLY these
   values:
   - `ELO_K_MAX = 0.4`
   - `ELO_K_HALFLIFE = 20`
   - `ELO_MIN_ITEM_ANSWERS = 200`
   - `ELO_CONSUMERS_ENABLED = false` typed as literal `false` (`export const ELO_CONSUMERS_ENABLED = false as const;` or annotated `: false`).
   - `ELO_INITIAL_BETA = 0`
   - `ELO_INITIAL_THETA = 0`
2. A doc comment above the block explains: estimator ships now, consumers stay gated OFF until
   `ELO_MIN_ITEM_ANSWERS` per-item answers accrue; and states the guess floor REUSES `FSRS_GUESS_MAX`
   (does NOT redeclare it).
3. `lib/constants.ts` does NOT declare `FSRS_GUESS_MAX` (grep: no `FSRS_GUESS_MAX\s*=` in the file).
4. `npm run -s typecheck` exits 0.
5. `npm test` exits 0.
6. This task's diff touches ONLY `lib/constants.ts` (lib/fsrs, readiness, wave20/21 oracle files
   byte-untouched).

## Constraints / decisions
- Values copied verbatim from wave22-01's frozen constants — keep the two in sync if a value is refined.
- `ELO_CONSUMERS_ENABLED` is the documented gate; NO consumer reads it this wave (spec Out-of-scope).
- Non-goal: no lib/elo.ts yet (task 04), no schema/migration (task 06).

## Next
- [x] Append the `ELO_*` block to lib/constants.ts with the doc comment; run typecheck + npm test.

## Acceptance
DECLARATION-ONLY task — no test, no oracle, no fixture, no behavior; structural traps inapplicable
by construction. Evaluator confirms each criterion by a direct READ of `lib/constants.ts`:
- (1) six `ELO_*` bindings — `lib/constants.ts` block after `ANON_SAVE_PROMPT_THRESHOLD`:
  `ELO_K_MAX = 0.4`, `ELO_K_HALFLIFE = 20`, `ELO_MIN_ITEM_ANSWERS = 200`,
  `ELO_CONSUMERS_ENABLED = false as const`, `ELO_INITIAL_BETA = 0`, `ELO_INITIAL_THETA = 0`.
- (2) doc comment above the block: estimator ships now / consumers gated OFF until
  `ELO_MIN_ITEM_ANSWERS` per-item answers / guess floor REUSES `FSRS_GUESS_MAX` (not redeclared).
- (3) no `FSRS_GUESS_MAX =` in the file — `grep -c 'FSRS_GUESS_MAX\s*='` → 0.
- (4) `npm run -s typecheck` → exit 0. (5) `npm test` → 778 passed. (6) diff = only lib/constants.ts.

## Log
- 2026-07-14 ClPcs-Mac-mini: Appended the `ELO_*` constants block (six bindings, values copied
  verbatim from wave22-01's frozen pins: K_MAX 0.4, K_HALFLIFE 20, MIN_ITEM_ANSWERS 200,
  CONSUMERS_ENABLED false-literal, INITIAL_BETA/THETA 0) + doc comment above it. Verified
  typecheck exit 0, `npm test` 778/778 pass, `FSRS_GUESS_MAX=` grep 0, git status shows only
  lib/constants.ts modified. Status → done.

## Artifacts
- lib/constants.ts (ELO_* block + doc comment)

## Verify
**Last verify:** PASS (2026-07-14T11:22:06Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T11:23:12Z)
