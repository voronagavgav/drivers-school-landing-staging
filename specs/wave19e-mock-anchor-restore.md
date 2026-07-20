# SPEC — Wave 19e (fix wave): restore the mock anchor + repair the 3 silently-skipped suites

Wave19d follow-up. Post-run verification found: (1) wave19d-08 REMOVED the Beta mock anchor from the
live dial (mocks m/k now recorded in inputsJson only, never blended) — a unilateral modeling decision
the spec never authorized, suspended via `describe.skip` on the direction suite instead of surfaced;
(2) two other integration suites self-skip after the blueprint change (stale guards / stale frozen
vector). All three must be repaired. Integration-suite skip count must return to 0 (the only allowed
skips are content-absent environments, which the seeded CI/dev DB is not).

## Deliverable 1 — restore the mock anchor on the LIVE dial (production change)
- `recomputeReadiness` blends recent EXAM_SIMULATION evidence exactly as pre-19d:
  `anchored = (k + S·P) / (m + S)`, S = READINESS_ANCHOR_STRENGTH (4), window READINESS_MOCK_WINDOW
  (10), per-category — applied IDENTICALLY (same m, k) to BOTH the release-model final probability
  AND the independence probability BEFORE rounding to `dialPercent`/`dialIndep`.
- WHY both: the anchor is a monotone affine map; applying the same map to both sides PRESERVES
  `final ≤ independence` (the wave19c review proved this exact property) — so the standing honesty
  gates survive by construction.
- Rationale to encode in the module comment: mock sims are direct real-performance evidence; the
  output-side Platt layer will eventually own residual model error, but it has zero real outcomes
  today — the anchor is not removable until the calibration corpus exists (revisit then, via spec).
- inputsJson: keep `mock: {m,k}` and ADD `anchored: true` (append-only discipline).
- ORACLE: the pure anchor math is already frozen in readiness-model tests (unchanged); the SERVER
  property to pin: with seeded failed mocks (k=0, m>0) the persisted dial is STRICTLY below the
  no-mock dial; with all-passed mocks strictly above; and `dialPercent ≤ dialIndep` still holds in
  both cases. Pre-verify magnitudes via a throwaway tsx run BEFORE freezing (house rule).

## Deliverable 2 — un-suspend + rewrite the mock-anchor direction suite
`lib/server/readiness-snapshot.integration.test.ts` §4: remove `describe.skip`, adapt the reference
computation to the release model (reconstruct the no-mock dial via releaseDial on the persisted
blocks/audit fields, then apply the anchor formula as the relative oracle — the pre-19d pattern).
Both directions (failed↓ / passed↑) asserted strictly.

## Deliverable 3 — repair the stale-guard skips (test-only)
- `readiness-correlation.integration.test.ts`: guard still checks retired block keys
  (medicine/law/general). Update to the official strata keys (structure/safety/medical/pdr) with
  sensible minimums; suite must RUN and stay green (it pins the retired-19b audit fields — rho=0 —
  still valid append-only history).
- `practice-modes.integration.test.ts` (DIAGNOSTIC blueprint spread (e)): re-freeze the Hamilton
  base-allocation vector against the NEW 4-strata blueprint per its own loud instruction; pre-verify
  the real vector via the production path before freezing.

## Wave gate (task 4)
- Integration suite: 0 skipped on the seeded DB (grep the runner output; `| 0 skipped` or no skip
  marker), all green; typecheck/unit/build/browser audit green; wave19b honesty gate + neutralized
  draw-side constant byte-untouched (vs e206825); `lib/readiness-release.oracle.test.ts` untouched.

## House rules
Evaluator trigger (e) applies (direction oracles bind on stated populations). No fixture-dodging; a
failing direction = implementation wrong = block and surface. Pure logic stays in lib/; the anchor
application lives server-side where it always did.
