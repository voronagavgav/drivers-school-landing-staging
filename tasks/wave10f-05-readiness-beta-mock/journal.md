# Task: wave10f-05-readiness-beta-mock

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Replace the fixed `0.65·model + 0.35·rate` mock blend in `lib/readiness-model.ts` (C1) with the specced
Beta shrinkage that accepts mock evidence as COUNTS `{ mockAttempts m, mockPasses k }` and anchors to the
model probability:
`readiness = (k + ANCHOR_STRENGTH·P_model) / (m + ANCHOR_STRENGTH)`, `READINESS_ANCHOR_STRENGTH = 4`.

Boolean acceptance criteria:
1. `computeReadiness` accepts mock evidence as counts `mockAttempts`/`mockPasses` (integers ≥0), not a
   `mockPassRate`. The old `MOCK_SHRINKAGE = 0.35` fixed-blend path is removed.
2. A `READINESS_ANCHOR_STRENGTH = 4` constant exists (in `lib/readiness-model.ts` or `lib/constants.ts`)
   and is used as the Beta anchor strength.
3. Behaviour: `m = 0` → readiness equals the pure model probability (`P_model`); mock evidence dominates
   as `m` grows via the Beta shrinkage formula above with `P_model` as the anchor.
4. Unit tests (in the readiness model's test file) assert: (a) model R high + `0/10` mocks → readiness
   `< 0.35`; (b) `10/10` mocks + weak model → readiness rises accordingly; (c) `m = 0` → readiness ==
   pure model. Tests are collected by `npx vitest list`.
5. `npm test` exits 0; `npm run typecheck` exits 0.
6. `lib/readiness-model.ts` stays pure (no DB/clock/RNG); `poissonBinomialAtLeast` is UNCHANGED.

## Constraints / decisions
- `P_model` is the pre-mock Poisson-binomial pass probability. The Beta formula treats `ANCHOR_STRENGTH`
  as pseudo-observations anchored at `P_model`, so mock counts move the estimate toward the empirical
  pass rate `k/m` and away from the model as `m` grows.
- This task changes the ReadinessInput shape (`mockPassRate` → `mockAttempts`/`mockPasses`). Update the
  type + any in-repo caller/test that referenced `mockPassRate` so typecheck stays 0. Prefer making the
  fields optional so callers that omit mocks get the pure-model path.
- Non-Goal: blueprint heterogeneity (wave10f-06), unseen-prior honesty (wave10f-07). Do not touch the DP.

## Plan
- [x] Add `READINESS_ANCHOR_STRENGTH = 4`; swap `mockPassRate` for `mockAttempts`/`mockPasses` in the input.
- [x] Implement the Beta shrinkage anchored at the model probability; delete the 0.65/0.35 blend.
- [x] Add the three unit tests; fix any caller referencing the old field.
- [x] `npm test` + `npm run typecheck` 0.

## Next
- [x] Introduce the counts-based Beta shrinkage in computeReadiness.

## Artifacts
- `lib/readiness-model.ts` — Beta shrinkage + `READINESS_ANCHOR_STRENGTH`, counts-based input.
- `lib/readiness-model.test.ts` — three mock-shrinkage unit tests.

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01 ClPcs-Mac-mini: Replaced the fixed `MOCK_SHRINKAGE = 0.35` blend with the counts-based Beta
  shrinkage in `lib/readiness-model.ts`. Added exported `READINESS_ANCHOR_STRENGTH = 4`; swapped
  `ReadinessInput.mockPassRate` → optional `mockAttempts`/`mockPasses` (integers, clamped `k≤m`, both ≥0).
  Formula: `(k + S·P_model)/(m + S)` with `P_model` the pre-mock Poisson-binomial pass prob; `m=0` ⇒ exactly
  `P_model`. `poissonBinomialAtLeast` unchanged; module stays pure. Added three unit tests (0/10 mocks on a
  strong model → <0.35; 10/10 on a weak model → >0.7 and > pure; `m=0` == pure model). No external callers
  referenced the old field (grep). `npm run typecheck` 0; `npm test` 335 passed; target file's 11 tests pass
  and are collected by vitest. Status → done.

## Verify
**Last verify:** PASS (2026-07-01T20:31:52Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:33:17Z)
