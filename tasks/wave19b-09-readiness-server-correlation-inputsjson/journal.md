# Task: wave19b-09-readiness-server-correlation-inputsjson

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-12
**Last compute:** ClPcs-Mac-mini

SERVER WIRING of the correlation correction into the live dial + audit trail (Wave 19b deliverable #1 server
half + #4 inputsJson version tag). Feed `READINESS_TOPIC_CORRELATION` (ρ) into `recomputeReadiness`, record ρ +
an engine/version tag in the snapshot `inputsJson`, and surface the empirical `measureTopicCorrelation` on the
existing admin calibration view (read-only). Depends on tasks 02 (ρ-aware `computeReadiness` + constant), 03
(`measureTopicCorrelation`), 07 (correct bucketing), 08 (constants).

## Goal
PASS = ALL true:

1. `lib/server/mastery-readiness.ts` `recomputeReadiness` passes `topicCorrelation: READINESS_TOPIC_CORRELATION`
   into `computeReadiness` (so the persisted `passProbability`/`dialPercent` are the correlation-corrected
   values when the category has blueprint blocks).
2. The snapshot `inputsJson` gains: `rho` (the ρ used, `= READINESS_TOPIC_CORRELATION`) and an engine/version
   tag `engine: "fsrs6"` plus `calibratorId` (null today — reserved for the wave19a calibrator). Existing
   inputsJson fields (`sufficientData`, `seenCount`, `meanR`, `priorUnseen`, `mock`, `blocks`) are preserved.
   `getLatestReadiness` continues to parse without throwing on old snapshots (missing `rho` → treated as 0 /
   absent, documented).
3. INTEGRATION (production path — drive `recomputeReadiness`, not `computeReadiness` directly): for a seeded
   user with a data-sufficient cat-B profile, the persisted snapshot's `inputsJson.rho ===
   READINESS_TOPIC_CORRELATION` and `inputsJson.engine === "fsrs6"`. AND a DIRECTION assertion: the persisted
   `passProbability` equals `computeReadiness(reconstructedInputs, { topicCorrelation:
   READINESS_TOPIC_CORRELATION })` and is `<=` the same call with `topicCorrelation: 0` — strictly `<` for a
   near-threshold heterogeneous student (reuse the strong-signs/weak-rest style fixture from task 07 so the
   inequality is strict). This proves the server actually applies ρ and that it LOWERS an over-stated dial.
4. ADMIN read-only surface: `app/admin/calibration/page.tsx` (wave19a-08) additionally computes + displays a
   within-topic correlation summary via `measureTopicCorrelation` over `ReviewLog` rows grouped by topic (per-
   user, per-topic outcome groups). It renders cleanly with sparse/zero data (an honest "not enough data" state,
   no `NaN`/division-by-zero), AGGREGATE-ONLY (no per-user PII), and stays RBAC-gated. The displayed value is
   informational (the live dial still uses the constant ρ) — label it as such.
5. `npm run -s typecheck` exits 0; `npm run -s test` exits 0; `npm run -s test:integration` exits 0. If the
   admin page render path changed materially, `npm run -s audit:browser` reaches `/admin/calibration` (200/
   RBAC-gated) — but a pure server-computation addition needs only an integration render-path assertion.

## Constraints / decisions
- ρ is the CONSTANT default (`READINESS_TOPIC_CORRELATION`, 0.35) — this task does NOT switch the live dial to
  the empirical `measureTopicCorrelation` (that is data-gated / a future wave). The admin ρ is display-only.
- inputsJson is append-only for back-compat: never rename/remove existing keys; readers must tolerate old rows
  lacking `rho`/`engine`.
- Keep `void recordEvent(...)` analytics (if any) OUTSIDE the recompute transaction (house rule).
- Integration hygiene (CLAUDE.md): `db:seed` before `test:integration`; delete throwaway user + its
  analyticsEvent rows before fixture questions; the `analyticsEvent.userId` is SetNull so delete those first.
- HIGH-STAKES (changes the live dial number materially) → **Evaluate: yes**.
- Non-goals: the dial disclaimer copy (task 10); switching the dial to empirical ρ; any per-user fit.

## Next
- [x] Thread ρ into `recomputeReadiness`; extend inputsJson (`rho`/`engine`/`calibratorId`); add the
      production-path integration test (rho recorded + dial-lowered direction); add the admin ρ read-only
      summary; run typecheck + test + test:integration.

Goal fully met — all five criteria pass. Task complete; task 11 re-runs the wave verify.

## Artifacts
- `lib/server/mastery-readiness.ts` — `recomputeReadiness` passes `topicCorrelation: READINESS_TOPIC_CORRELATION`
  into `computeReadiness`; `inputsJson` gains `rho`/`engine:"fsrs6"`/`calibratorId:null` (append-only);
  `getLatestReadiness` tolerates old rows (missing `rho`→0, `engine`→null) + exposes them.
- `lib/readiness-correlation.ts` — degenerate-p NaN guard in `correlatedBlockPmf` (see Log).
- `app/admin/calibration/page.tsx` — read-only empirical within-topic ρ̂ summary (aggregate-only, RBAC-gated,
  honest "not enough data" null state).
- `lib/server/readiness-correlation.integration.test.ts` — NEW production-path test (rho/engine/calibratorId
  recorded + persisted dial == ρ-corrected & strictly < ρ=0 for a near-threshold strong cat-B student).
- `lib/readiness-correlation.test.ts` — degenerate-p point-mass regression test.

## Log
- 2026-07-12 laptop: planned. Live dial uses constant ρ=0.35; admin shows empirical measureTopicCorrelation
  (display-only, data-gated). inputsJson version tag = engine:"fsrs6" + rho + calibratorId(null).
- 2026-07-12 ClPcs-Mac-mini: implemented all five Goal criteria. (1) Threaded
  `topicCorrelation: READINESS_TOPIC_CORRELATION` into `recomputeReadiness`'s `computeReadiness` call.
  (2) Extended `inputsJson` with `rho`/`engine:"fsrs6"`/`calibratorId:null` (append-only, existing fields
  preserved); `getLatestReadiness` documents + tolerates missing keys. (3) Added
  `readiness-correlation.integration.test.ts`. (4) Admin calibration page renders an aggregate-only empirical
  ρ̂ summary over ReviewLog (user,topic) testlets (`correct = grade≥2`), null→honest empty state; render-path
  already covered by the passing `admin-calibration.integration.test.ts`. DISCOVERED + FIXED a real
  production-reachable bug: the correlation path (`correlatedBlockPmf`) returns NaN when a block's
  `meanProb` is exactly 0 or 1 (β=0/α=0 → 0/0 in the beta-binomial ratio recurrence). A freshly-reviewed
  block reads `meanProb=1.0` (R=1 at elapsed 0), so threading ρ live would have persisted `passProbability=NaN`
  for real users. Guarded `correlatedBlockPmf` to fall back to the binomial point mass at p∈{0,1} (the correct
  Beta-binomial limit) + a regression test. DIRECTION NOTE: ρ LOWERS the dial only for a near/above-threshold
  student (the "over-stated dial"); a deeply-weak student sits in the upper tail where variance inflation
  RAISES P(pass) — so the fixture is deliberately strong across all blocks (R≈0.995), NOT the weak task-07
  fixture. Pre-verified all near-zero strict-`<` comparisons via throwaway `npx tsx --conditions=react-server`.
  Gates: `typecheck` 0, `test` 668 passed, `test:integration` 267 passed (63 files, after `db:seed`).

## Verify
**Last verify:** PASS (2026-07-12T16:20:28Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T16:23:15Z)
