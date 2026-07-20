# Task: wave19b-03-measure-topic-correlation

**Status:** done
**Driver:** auto
**Updated:** 2026-07-12
**Last compute:** ClPcs-Mac-mini

PURE FUNCTION + KNOWN-ORACLE. Add `measureTopicCorrelation` — a pure estimator of the within-topic intraclass
correlation ρ over ReviewLog-shaped rows (Wave 19b deliverable #1, "so ρ becomes empirical as data accrues").
It is READ-ONLY analytics: it does NOT change the live dial (the dial uses the constant default until wired
empirically). Frozen oracle = the pairwise intraclass-correlation identity (binary Pearson), hand-computed
below.

## Goal
PASS = ALL true:

1. `lib/readiness-correlation.ts` gains a PURE export
   `measureTopicCorrelation(groups: { outcomes: (0 | 1)[] }[]): number | null` where each `group` is one
   testlet/attempt's correct(1)/incorrect(0) responses to a topic's items. Returns the pairwise intraclass
   correlation; returns `null` when there are `< 1` usable pairs or the pooled variance is 0 (all-same overall
   → correlation undefined).
2. ESTIMATOR (documented in the code as the external definition, NOT derived by calling anything):
   `p̂ = (Σ over all responses of y) / (total responses)`;
   `ρ̂ = [ Σ_g Σ_{i<j} (y_gi − p̂)(y_gj − p̂) ] / [ (Σ_g C(n_g, 2)) · p̂·(1 − p̂) ]`
   (the mean within-group pairwise product, normalised by the Bernoulli variance — the standard binary
   intraclass correlation).
3. FROZEN ORACLE literals (hand-computed; verify.sh enforces to tolerance 1e-9), each a test:
   - Perfectly concordant: `[{outcomes:[1,1]}, {outcomes:[0,0]}]` → `p̂=0.5`, ρ̂ = `1.0`.
   - Perfectly discordant: `[{outcomes:[1,0]}, {outcomes:[0,1]}]` → `p̂=0.5`, ρ̂ = `-1.0`.
   - Zero (balanced mix): `[{outcomes:[1,1]}, {outcomes:[0,0]}, {outcomes:[1,0]}, {outcomes:[0,1]}]` →
     `p̂=0.5`, ρ̂ = `0.0`.
   - Degenerate: `[{outcomes:[1,1]},{outcomes:[1,1]}]` (all correct, p̂=1) → `null` (variance 0).
   - Singleton groups (no pairs): `[{outcomes:[1]},{outcomes:[0]}]` → `null` (no within-group pairs).
4. Unit tests for each oracle in `lib/readiness-correlation.test.ts` (or a sibling `*.test.ts`); `npm test`
   exits 0 and the file is collected (`npx vitest list` grep).
5. PURITY: `measureTopicCorrelation`'s file has none of `server-only`/`@/lib/db`/`@prisma/client`/
   `lib/generated`/`Math.random`/`Date.now`/`new Date`. `npm run -s typecheck` exits 0.

## Constraints / decisions
- The pairwise binary intraclass correlation IS the Pearson correlation between item pairs within a group — an
  EXTERNAL, closed-form definition (concordant→+1, discordant→−1, balanced→0), which is why the small-sample
  literals above are exact and NOT self-referential.
- Bounds: the estimator can legitimately return negative values (anti-correlation) and can exceed the beta-
  binomial-usable `[0,1)` on tiny samples — that is fine; this fn only MEASURES. Consumers (task 09 admin
  display) clamp/label as needed. Do NOT clamp inside the estimator (would corrupt the oracle).
- READ-ONLY: this task does NOT feed ρ into `computeReadiness`/`recomputeReadiness`. The dial default stays
  `READINESS_TOPIC_CORRELATION` until a future data-gated wave. The admin surface display is task 09.
- Non-goals: pulling ReviewLog rows from the DB (that is the server/admin layer), any per-user fit, any UI.

## Next
- [x] Add `measureTopicCorrelation` to `lib/readiness-correlation.ts` + the 5 frozen-oracle unit tests; run
      typecheck + test.
- Goal fully met; nothing outstanding. (Task 09 later wires the DB/admin display; not this task.)

## Log
- 2026-07-12 laptop: planned. Estimator = pairwise binary intraclass correlation; oracles hand-computed
  (concordant +1 / discordant −1 / balanced 0 / degenerate null).
- 2026-07-12 ClPcs-Mac-mini: added `measureTopicCorrelation` (pure, no clock/db/rng) to
  lib/readiness-correlation.ts and 5 frozen-oracle tests to lib/readiness-correlation.test.ts
  (concordant→1, discordant→−1, balanced→0, degenerate→null, singleton→null; tolerance 1e-9).
  Verified oracle math by hand before coding. typecheck 0, `npm test` 655 pass, vitest-list collection
  grep green — verify.sh prints "PASS wave19b-03". Status → done.

## Artifacts
- lib/readiness-correlation.ts — `measureTopicCorrelation` export (pairwise binary ICC estimator).
- lib/readiness-correlation.test.ts — 5 frozen-oracle unit tests + loadImpl type.

## Verify
**Last verify:** PASS (2026-07-12T15:05:42Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T15:06:46Z)
