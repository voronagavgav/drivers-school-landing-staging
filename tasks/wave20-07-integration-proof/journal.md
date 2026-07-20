# Task: wave20-07-integration-proof

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** laptop

Prove the wired behavior through the REAL production path (spec Deliverable 6). Extend
`lib/server/grade-inference.integration.test.ts` (or add a sibling `lib/server/
slip-adjusted-lapse.integration.test.ts`) driving answers through the real `startSession` /
`submitAnswer` boundary against `createOfficialQuestion` fixtures — NOT the pure helper directly.

## Goal
PASS = ALL true (all via `submitAnswer`/`startSession`, the real action path):

1. **(i) wrong-on-strong** — seed a `ReviewState` with stability=50, difficulty=5, state="review",
   `lastReviewedAt` = now−10d (R≈0.973), reps≥1; answer that question WRONG through `submitAnswer`.
   Assert the persisted `ReviewState`: `stability ∈ [30,45]` (the log-blend band — NOT ≤3 crush, NOT
   ≥50 growth), `state === "relearning"`, `lapses === priorLapses+1`; the `ReviewLog` row has
   `grade === 1` and `engine === "fsrs6-bkt2"`.
2. **(ii) wrong-on-weak** — seed a `ReviewState` with small stability (e.g. 5) and an old
   `lastReviewedAt` so R≤0.55; answer WRONG. Assert persisted `stability ≤ 3` (crush preserved).
3. **(iii) option-count grade** — a 2-option question answered CORRECT at a fresh prior persists
   `ReviewState.lastGrade === 2` (Hard); a 5-option question answered CORRECT at a fresh prior persists
   `lastGrade === 3` (Good). Use `createOfficialQuestion` with an `options` override for the counts.
4. **(iv) invariant** — across every `ReviewLog` row written by the test, `correct ⟺ grade≥2` holds
   (every wrong row grade=1; every correct row grade≥2) — the calibration reader semantics are intact.
5. `npm run -s db:seed` then `npm run -s test:integration` (config already pinned) exits 0 with the new
   assertions collected (prove via `npx vitest list --config vitest.integration.config.ts` token-retry
   capture) and green.

## Constraints / decisions
- PRODUCTION-PATH: assertions must exercise `submitAnswer` (the fn the runner calls), not
  `recordReview`/`slipAdjustedLapse` directly — a direct-helper test would pass while the action path
  strips `optionCount`. Seed the prior `ReviewState` via `prisma.reviewState.create` (the wave11-06 /
  readiness-snapshot pattern), then drive the wrong/correct answer through `submitAnswer`.
- Fixtures via `createOfficialQuestion(prisma, { options: [...] })` for the 2-opt / 5-opt cases; mind
  `@@unique([testSessionId, questionId])` (re-answer in a fresh session for a second pick) and cleanup
  order: delete Users BEFORE Questions (session rows cascade off the user), and
  `analyticsEvent.deleteMany({ where: { userId } })` before `user.delete` if any events were written.
- Inject a fixed `now`/`reviewedAt` where the band assertion needs a deterministic elapsed (retrievability
  decays with wall clock — derive the reference time from the seeded `lastReviewedAt`, not `new Date()`).
- Integration file ops need `--config vitest.integration.config.ts` (the default config excludes
  `*.integration.test.ts`).
- The wrong-on-strong band [30,45] is the task-01 oracle's s=50/R=0.973 log-blend (≈38); do not widen it
  to hide a crush or a growth — those are the two failure modes this test exists to catch.

## Next
- [x] Add the four cases to the integration suite; seed ReviewState fixtures; drive via submitAnswer;
      db:seed + test:integration.
- Goal fully met — sibling suite `lib/server/slip-adjusted-lapse.integration.test.ts` added, 4 cases green,
  collected under the integration config, full integration suite (66 files / 279 tests) passes.

## Artifacts
- lib/server/slip-adjusted-lapse.integration.test.ts — the production-path proof (4 `it`s, driven via
  `startSession`/`submitAnswer` against `createOfficialQuestion` fixtures with seeded `ReviewState` priors).

## Log
- 2026-07-14 laptop: planned by the wave20 planner.
- 2026-07-14 ClPcs-Mac-mini: authored `slip-adjusted-lapse.integration.test.ts`. Pre-verified the band
  anchors via a throwaway tsx smoke against the REAL engine (slipAdjustedLapse+gradePosterior+retrievability):
  (i) s=50/D=5/review, reviewedAt = lastReviewedAt+10d ⇒ R≈0.9728, 4-opt π≈0.827, S'≈36.29 ∈ [30,45],
  state relearning, lapses 0→1, ReviewLog grade 1 / engine fsrs6-bkt2; (ii) s=5, reviewedAt = last+400d
  ⇒ R≈0.509, 4-opt S'≈2.70 ≤ 3 (used 4-opt because default 2-opt g=0.45 lands ≈3.05 > 3, per lib/server
  CLAUDE.md); (iii) fresh prior (neutral 0.5) 2-opt correct ⇒ lastGrade 2 (Hard), 5-opt correct ⇒
  lastGrade 3 (Good); (iv) correct⟺grade≥2 across every written ReviewLog row (joined back to TestAnswer).
  Injected `reviewedAt` (submitAnswer forwards it to recordReview as `now`) makes retrievability
  deterministic. typecheck 0; new suite 4/4 green; collected via `vitest list --config
  vitest.integration.config.ts`; db:seed + full test:integration 279/279 green. Status→done.

## Verify
**Last verify:** PASS (2026-07-13T23:24:33Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T23:27:32Z)
