# Task: wave10f-07-readiness-unseen-prior-honesty

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Fix the dishonest flat unseen prior in `lib/readiness-model.ts` (C3): today a flat scalar prior can RAISE
readiness for a weak learner whose seen-mean is below the prior (adding unseen items should never help).
Interim honest rule (per-topic empirical-Bayes is Wave 11): when seen data exists,
`effectiveUnseenPrior = min(unseenPrior, seenMeanProb)` — adding unseen items can NEVER raise readiness.

Boolean acceptance criteria:
1. When `seen` is non-empty, the unseen items contribute at `effectiveUnseenPrior = min(unseenPrior,
   seenMeanProb)` (where `seenMeanProb` is the mean per-item pass prob of the seen set), not the raw
   `unseenPrior`. When `seen` is empty the raw `unseenPrior` still applies.
2. Monotone-honesty property, asserted BOTH sides of the prior:
   - weak learner (seenMean < unseenPrior): adding unseen items does NOT increase readiness vs the
     seen-only readiness (it stays ≤).
   - strong learner (seenMean > unseenPrior): the effective prior is `min(...) = unseenPrior`, so the
     conservative behaviour is unchanged from today.
3. A unit test encodes the monotone-honesty property on both sides; collected by `npx vitest list`.
4. `npm test` exits 0; `npm run typecheck` exits 0.
5. `lib/readiness-model.ts` stays pure; `poissonBinomialAtLeast` UNCHANGED.

## Constraints / decisions
- "adding unseen items can NEVER raise readiness" is the invariant under test — assert it against the
  actual `computeReadiness` output (compare readiness with unseenCount=0 vs unseenCount>0 for a weak
  learner: the latter must be ≤ the former).
- Composes with wave10f-06's block p-vector: `seenMeanProb` is the mean over the SEEN items' per-item
  pass probs; the effective prior feeds the unseen slots of the pool/vector.
- Non-Goal: per-topic empirical-Bayes (Wave 11 — explicitly out of scope). This is the documented stopgap.

## Plan
- [x] Compute `seenMeanProb` from the seen per-item probs; set `effectiveUnseenPrior = min(unseenPrior,
      seenMeanProb)` when seen exists.
- [x] Route unseen slots through the effective prior.
- [x] Add the two-sided monotone-honesty unit test.
- [x] `npm test` + `npm run typecheck` 0.

## Next
- [ ] (none — Goal met; driver re-runs verify.)

## Artifacts
- `lib/readiness-model.ts` — the `min(unseenPrior, seenMeanProb)` clamp in `computeReadiness`.
- `lib/readiness-model.test.ts` — `unseen-prior honesty` describe block (weak/strong/empty-seen cases).

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01 ClPcs-Mac-mini: Applied the honest-prior clamp in `computeReadiness` — added
  `seenMeanProb` (mean of seen per-item probs) and `prior = hasSeen ? min(rawPrior, seenMeanProb) : rawPrior`,
  routing unseen slots through it via `poolSum = seenSum + unseen*prior`. Empty-seen keeps the raw prior.
  Added the two-sided monotone-honesty test: weak learner (seenMean 0.4 < prior 0.6) → μ/readiness unchanged
  when unseen added (clamp pins unseen at seen mean; asserted ≤ within 1e-9 float noise + meanItemProb equal +
  naive-mean-would-be-higher contrast); strong learner (seenMean 0.9 > prior 0.55) → effective prior = raw
  0.55, μ = expected, still ≤ seen-only; empty-seen → μ = raw prior. `poissonBinomialAtLeast` UNCHANGED.
  `npm test` 339 passed, `npm run typecheck` 0, `npx vitest list` collects all 3 new cases.

## Verify
**Last verify:** PASS (2026-07-01T20:39:38Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:40:35Z)
