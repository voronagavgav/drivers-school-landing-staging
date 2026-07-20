# Task: wave19c-07-wire-recompute-readiness

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-12
**Last compute:** mac-mini

## Goal
Wire the tier-MEAN estimation correction into the LIVE dial via `recomputeReadiness`
(`lib/server/mastery-readiness.ts`). The draw-side path stays dead.

1. In `recomputeReadiness`, when building each blueprint block, capture the per-block SEEN count
   `n_t` (the count of seen items in that block — i.e. the existing per-block `probs.length`).
2. BEFORE calling `computeReadiness`, transform each block's `meanProb` through
   `correctBlockMeanProb(rawMeanProb, n_t, READINESS_TOPIC_CORRELATION_ESTIMATION, { tier: READINESS_ESTIMATION_TIER })`
   (from `@/lib/readiness-estimation` + `@/lib/constants`). The `blocks` array passed to `computeReadiness`
   carries the CORRECTED `meanProb`.
3. `computeReadiness` is still called with `topicCorrelation: 0` (NOT `READINESS_TOPIC_CORRELATION` renamed;
   pass a literal `0` or keep `READINESS_TOPIC_CORRELATION` which is 0 — the draw-side tail stays inert).
4. Unseen blocks (`n_t === 0`) are passed through `correctBlockMeanProb` too (n_eff=0 ⇒ Jeffreys a=b=½ ⇒
   posterior-mean ½ ⇒ `min(blockUnseenProb, ½) = blockUnseenProb`, so no NaN and no raise). Verify no
   `passProbability` becomes `NaN` for a freshly-reviewed (meanProb=1.0) block — the estimation side has no
   degenerate-p NaN (a or b = ½, never 0).
5. `npm run -s typecheck` exits 0.
6. `npm test` exits 0.
7. `npm run test:integration` exits 0 (existing readiness/exam-blueprint/calibration integration suites
   still green — they may need expected-value updates ONLY if they assert the live persisted dial; if so,
   re-derive expected from the corrected model, never loosen the assertion. Prefer: those suites assert
   inputsJson/blocks shape, not the exact corrected dial, so they stay green untouched).
8. `lib/readiness-honesty.regression.test.ts` unchanged and green (it exercises `computeReadiness`
   directly, not `recomputeReadiness`, so it is unaffected — do not edit it).

## Constraints / decisions
- The correction is applied in the SERVER layer on block `meanProb`s (spec §Server wiring), NOT inside
  `computeReadiness` — so the honesty regression gate stays green by construction and `computeReadiness`'s
  signature/behavior is unchanged.
- Per-block `n_t` = SEEN evidence items in the topic (the ReviewState join that already builds meanProb),
  NOT the exam quota. Do not confuse `quota` (exam slots) with `nSeen` (evidence count).
- `dialIndep` (the uncorrected independence dial) and the inputsJson audit fields are wave19c-08 — do NOT
  add them here (keep this task to the live-dial correction).
- If an existing integration test asserts the exact live dial and now fails, that means it was pinned to
  the UNcorrected value; re-derive the expected from the corrected model (legit) — but first check whether
  it actually asserts the dial vs the blocks/shape (the exam-blueprint test asserts a strict `<` inequality
  that stays true under a monotone shrink, so it should remain green).
- **Evaluate: yes** — this changes the number real users see; independent judge on the done-claim.

## Next
- [x] Thread `n_t` into the block build; apply `correctBlockMeanProb` before `computeReadiness`; keep
      `topicCorrelation: 0`; typecheck; unit + integration; confirm honesty regression untouched.
- (none — Goal fully met; wave19c-08 owns dialIndep + audit fields.)

## Log
- 2026-07-12 mac-mini: planned.
- 2026-07-12 ClPcs-Mac-mini: wired the estimation-side ρ correction into the LIVE dial.
  In `recomputeReadiness` (lib/server/mastery-readiness.ts) each blueprint block now captures
  `nSeen = probs.length` (SEEN evidence count, not quota), computes the raw block meanProb
  (seen mean or honesty-floored `blockUnseenProb`), then passes it through
  `correctBlockMeanProb(rawMeanProb, nSeen, READINESS_TOPIC_CORRELATION_ESTIMATION(0.3),
  { tier: READINESS_ESTIMATION_TIER("mean") })` before `computeReadiness`. Draw-side
  `topicCorrelation` stays `READINESS_TOPIC_CORRELATION`(=0), so the tail path is exact/inert
  and no degenerate-p NaN can arise (the Jeffreys ½ shrink also pulls a freshly-reviewed
  meanProb=1.0 strictly below 1). Imported `correctBlockMeanProb` + the two constants; refreshed
  the now-stale draw-side ρ comment. Unseen blocks (nSeen=0) pass through as a no-op
  (n_eff=0 ⇒ posterior-mean ½ ⇒ min(blockUnseenProb, ½)=blockUnseenProb). Did NOT touch
  `lib/readiness-honesty.regression.test.ts` (it exercises `computeReadiness` directly).
  Verified: `npm run -s typecheck` exit 0; `npm test` 694 passed; `npm run db:seed` + 
  `npm run test:integration` 267 passed (readiness-snapshot / exam-blueprint strict-`<` /
  calibration suites all green untouched).

## Artifacts
- lib/server/mastery-readiness.ts — estimation-side ρ correction (correctBlockMeanProb) wired into `recomputeReadiness` on each block meanProb.

## Verify
**Last verify:** PASS (2026-07-12T20:06:40Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T20:08:59Z)
