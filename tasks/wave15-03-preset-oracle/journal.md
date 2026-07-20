# Task: wave15-03-preset-oracle

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T12:00Z
**Last compute:** mac-mini

## Goal
ORACLE AUTHORING ONLY (anti self-grading): write the FROZEN reference tests for the three pure
selection presets BEFORE any implementation exists. wave15-04 implements against these tests and MAY
NOT edit them. PASS = ALL true:

1. `lib/test-engine/presets.ts` exists as a CONTRACT STUB ONLY — exactly these exports, each body
   `throw new Error("NOT_IMPLEMENTED_WAVE15_04")`, no selection logic:
   - `selectQuickQueue(candidates: QueueCandidate[], opts: { now: Date; rng?: () => number }): string[]`
   - `selectSignTrainerQueue(candidates: QueueCandidate[], opts: { now: Date; rng?: () => number }): string[]`
   - `selectMarathonPage(candidates: QueueCandidate[], excludeIds: ReadonlySet<string>, opts: { now: Date; rng?: () => number }): string[]`
   (`QueueCandidate` imported from `./queue`.)
2. `lib/test-engine/presets.test.ts` exists — the frozen oracle, house determinism style (seeded LCG
   `mkRng()` + fixed injected `NOW`, exactly like lib/test-engine/queue.test.ts), asserting AT MINIMUM
   these pinned contracts (values derive from spec §B + the mode-contract table via wave15-02 constants):
   - QUICK (= selectReviewQueue preset: size QUICK_COUNT=10, newItemShare QUICK_NEW_BUDGET/QUICK_COUNT=0.4,
     backfillWithNew: true):
     a. 8 due-seen + 8 unseen candidates → result length 10 AND unseen picks ≤ 4 (the new budget binds).
     b. 0 seen + 30 unseen → length 10 (backfill: a brand-new user gets a full QUICK).
     c. determinism: same seeded rng + inputs twice → identical arrays.
     d. due-first: fixture with one card overdue by 30 days and one seen card due in the future →
        the overdue card's id appears BEFORE the future-due card's id in the result.
   - SIGN_TRAINER (size SIGN_TRAINER_COUNT=20, newItemShare 8/20=0.4, backfillWithNew: true; the
     candidate list is ALREADY pool-filtered by the server — this module never filters by topic/image):
     e. 12 due-seen + 20 unseen → length 20 AND unseen ≤ 8. (Fixture MUST have ≥12 due seen so the
        cap binds and the assertion is non-vacuous — wave11-06 sizing trap.)
     f. 0 seen + 25 unseen → length 20 (works with zero ReviewState).
   - MARATHON page (drop excluded ids first, then size MARATHON_PAGE=20, newItemShare default
     DEFAULT_NEW_ITEM_SHARE=0.2, backfillWithNew: true):
     g. 30 candidates, 20 excluded → result ⊆ non-excluded, no duplicates, length 10.
     h. 100 candidates (≥16 due-seen + surplus unseen), none excluded → length 20 AND unseen ≤ 4
        (= round(20 × 0.2)).
     i. every candidate excluded → result is [].
     j. determinism: same seed twice → identical arrays.
3. `npx tsc --noEmit` exits 0 (stub satisfies the oracle's imports).
4. `npx vitest run lib/test-engine/presets.test.ts` exits NON-ZERO — the oracle is RED against the
   stub, proving the tests bind. (Do NOT skip/todo the tests to make them green.)
5. verify.sh has recorded `shasum -a 256` of presets.test.ts into
   `tasks/wave15-03-preset-oracle/oracle.sha256` (freeze marker; wave15-04/16 gates compare against it).
6. Purity of BOTH new files: no `server-only`, `@/lib/db`, `lib/generated`, `Math.random`, `Date.now`
   tokens anywhere in presets.ts (comments included — house purity gates grep whole files). The test
   file may construct fixed `new Date(...)` literals; presets.ts may not contain `new Date(` at all.

## Constraints / decisions
- THE ORACLE IS FROZEN: no later task may edit presets.test.ts. wave15-04 must go green without
  touching it; wave15-16 re-checks the sha.
- Expect the unit board (`npm test`) RED on this one file until wave15-04 lands — deliberate.
  Do not weaken tests to avoid it; the driver runs wave15-04 immediately next.
- Preset numbers come from `@/lib/constants` (wave15-02), not re-hardcoded — the oracle imports the
  constants and derives expectations (caps 4/8/4 are also written as literals in the asserts above so
  drift in constants fails loudly).
- Composition semantics (how selectReviewQueue splits seen/new, interleaves, backfills) are ALREADY
  pinned by lib/test-engine/queue.test.ts + queue-overrides.test.ts — this oracle pins the
  PARAMETERIZATIONS and their user-visible invariants, mirroring the queue-overrides.test.ts idiom.

## Next
- [x] Read lib/test-engine/queue.test.ts (mkRng/NOW idiom) + queue.ts, then write the stub and the
      oracle tests exactly as pinned above.
- Goal fully met: stub + frozen oracle written, verify.sh green (typecheck OK, oracle RED against stub,
  sha recorded). Nothing left — wave15-04 implements against this frozen file next.

## Artifacts
- lib/test-engine/presets.ts (stub) · lib/test-engine/presets.test.ts (frozen oracle)
- tasks/wave15-03-preset-oracle/oracle.sha256

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T13:20Z ClPcs-Mac-mini: wrote CONTRACT STUB lib/test-engine/presets.ts (3 exports
  selectQuickQueue/selectSignTrainerQueue/selectMarathonPage, each `throw new Error("NOT_IMPLEMENTED_WAVE15_04")`,
  no logic; PresetOptions{now,rng}) and the FROZEN oracle lib/test-engine/presets.test.ts mirroring
  queue.test.ts idiom (LCG mkRng + fixed NOW). Oracle imports wave15-02 constants (QUICK_COUNT/…,
  DEFAULT_NEW_ITEM_SHARE) and derives sizes; caps 4/8/4 pinned as literals; constant-contract block
  freezes 10/4/20/8/20/0.2. Covers QUICK a–d, SIGN_TRAINER e–f, MARATHON g–j. verify.sh GREEN:
  typecheck 0, oracle RED against stub (binds), sha recorded to oracle.sha256. Status→done.

## Verify
**Last verify:** PASS (2026-07-03T06:32:41Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T06:34:09Z)
