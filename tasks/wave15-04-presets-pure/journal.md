# Task: wave15-04-presets-pure

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T09:36Z
**Last compute:** mac-mini

## Goal
Implement `lib/test-engine/presets.ts` (replace the wave15-03 stub) so the FROZEN oracle goes green.
PASS = ALL true:

1. `npx vitest run lib/test-engine/presets.test.ts` exits 0.
2. Oracle untouched: `shasum -a 256 -c tasks/wave15-03-preset-oracle/oracle.sha256` passes
   (presets.test.ts byte-identical to when it was frozen).
3. presets.ts is a THIN parameterization: it imports `selectReviewQueue` from `./queue` (grep) and the
   preset constants (`QUICK_COUNT`, `QUICK_NEW_BUDGET`, `MARATHON_PAGE`, `SIGN_TRAINER_COUNT`,
   `SIGN_TRAINER_NEW_BUDGET`) from the constants module (grep) — no reimplemented scoring/interleave.
4. Purity: presets.ts contains NO `Math.random`, `Date.now`, `new Date(`, `server-only`, `@/lib/db`,
   `lib/generated` tokens anywhere (comments included). `rng`/`now` pass through to selectReviewQueue.
5. `npm test` exits 0 (whole unit board green again after the deliberate wave15-03 red).
6. `npx tsc --noEmit` exits 0.
7. `lib/test-engine/queue.ts` unchanged (`git diff --name-only` does not list it) — presets adapt to
   the picker, never the reverse.

## Constraints / decisions
- Do NOT edit presets.test.ts under any circumstance. If an assertion seems wrong, STOP and mark this
  task blocked with the analysis — the oracle owner (wave15-03) is the place to dispute it.
- Sizes/shares come from constants, not magic numbers (goal 3).
- `selectMarathonPage` filters `excludeIds` BEFORE calling selectReviewQueue (so backfill can never
  resurrect an excluded id).

## Next
- [x] Implement the three presets over selectReviewQueue; run the oracle file until green.
- Goal fully met — no further increment.

## Artifacts
- lib/test-engine/presets.ts

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T09:36Z ClPcs-Mac-mini: implemented the three presets as thin selectReviewQueue
  parameterizations. QUICK = size QUICK_COUNT, share QUICK_NEW_BUDGET/QUICK_COUNT, backfill;
  SIGN_TRAINER = size SIGN_TRAINER_COUNT, share SIGN_TRAINER_NEW_BUDGET/SIGN_TRAINER_COUNT, backfill;
  MARATHON = filter excludeIds first, size MARATHON_PAGE, default share, backfill. All PASS conditions
  green: oracle presets.test.ts 11/11, oracle.sha256 OK (untouched), purity clean, tsc 0, npm test
  565/565, queue.ts not in git diff. Constants imported from @/lib/constants, selectReviewQueue from ./queue.

## Verify
**Last verify:** PASS (2026-07-03T06:36:04Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T06:36:49Z)
