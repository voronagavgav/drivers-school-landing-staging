# Task: wave19e-01-restore-anchor-live

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-13
**Last compute:** mac-mini

## Goal
Restore the Beta mock-exam anchor on the LIVE readiness dial in `recomputeReadiness`
(`lib/server/mastery-readiness.ts`) — wave19d-08 silently dropped it. The anchor blends recent
EXAM_SIMULATION evidence into the persisted dial exactly as pre-19d, applied to BOTH the release
model's `final` AND `independence` probabilities before rounding.

Numbered BOOLEAN acceptance criteria:

1. `recomputeReadiness` computes the anchor `anchored(P) = (k + S·P) / (m + S)` with `S =
   READINESS_ANCHOR_STRENGTH` (imported from `@/lib/readiness-model`, value 4) and applies it to BOTH
   `release.final` AND `release.independence` (the raw probabilities from `releaseDial`) BEFORE
   rounding, so:
   - `dialPercent = sufficientData ? Math.round(anchored(release.final) * 100) : 0`
   - `dialIndep   = sufficientData ? Math.round(anchored(release.independence) * 100) : 0`
   - `passProbability = anchored(release.final)` (persisted `ReadinessSnapshot.passProbability`).
   `k`/`m` are the existing mock counts (`m = mocks.length`, `k = PASSED count`, window
   `READINESS_MOCK_WINDOW` = 10, per-category), from the same `EXAM_SIMULATION`/`COMPLETED` query
   already present in the function.
2. When `m = 0` the anchor is the identity: `anchored(P) === clamp01(P)` (bit-for-bit — `(0 + S·P)/(0
   + S) = P`), so a user with no mocks sees exactly today's release-model dial. Verify: for `m=0`,
   the persisted `dialPercent` equals `release.finalDial` and `dialIndep` equals
   `release.independenceDial`.
3. The anchor is a monotone-increasing affine map applied IDENTICALLY (same `m`,`k`) to both sides, so
   `anchored(final) ≤ anchored(independence)` whenever `final ≤ independence` — i.e. `dialPercent ≤
   dialIndep` STILL holds by construction. (`releaseDial` guarantees `final ≤ independence`.) Do NOT
   add a `Math.min` to force it — the property must hold from the affine map alone.
4. `inputsJson` keeps the existing `mock: {m, k}` field UNCHANGED and ADDS `anchored: true`
   (append-only discipline — no existing key renamed/removed; every wave19d key kept: `model`,
   `sigma`, `nodeCount`, `blockStats`, `rho`, `rhoEst`, `tier`, `nEff`, `dialIndep`, etc.).
5. The module comment on the anchor block encodes the rationale (paraphrase, must mention all three):
   mock sims are direct real-performance evidence; the output-side Platt/calibration layer will
   eventually own residual model error but has ZERO real outcomes today, so the anchor is not
   removable until the calibration corpus exists (revisit then, via spec); applying the same affine
   map to both `final` and `independence` preserves the `final ≤ independence` honesty guarantee.
6. `npm run -s typecheck` exits 0.
7. `npm test` exits 0 (pure unit suite — the pure anchor math in `lib/readiness-model` tests is
   UNCHANGED; do not edit `lib/readiness-model.ts`'s `computeReadiness` anchor or its tests).
8. `lib/readiness-release.oracle.test.ts` is byte-untouched (the anchor is a SERVER-side blend, not a
   change to the pure release model).
9. `READINESS_TOPIC_CORRELATION` in `lib/constants.ts` is byte-untouched (the neutralized draw-side
   constant stays `= 0`).
10. Pre-verify magnitudes BEFORE committing (house rule): via a throwaway `npx tsx
    --conditions=react-server` run driving the REAL `recomputeReadiness` on a seeded scenario user with
    (a) no mocks, (b) 3 failed mocks, (c) 3 passed mocks — confirm the persisted `dialPercent` is
    strictly inside (0,100) with no mocks, strictly BELOW that with failed mocks, strictly ABOVE with
    passed mocks, and `dialPercent ≤ dialIndep` in all three. Record the observed numbers in the Log.
    (Live-wiring pre-check, not the frozen oracle — that is task 02.)

## Constraints / decisions
- PRODUCTION CHANGE. Pure logic stays in `lib/` (`computeReadiness`/`releaseDial` UNCHANGED); the
  anchor APPLICATION lives server-side in `recomputeReadiness` exactly where it did pre-19d.
- Reference the pre-19d implementation: `git show 6189659^:lib/server/mastery-readiness.ts` (it called
  `computeReadiness({..., mockAttempts: m, mockPasses: k})`); the anchor formula lives at
  `lib/readiness-model.ts:236-240`. This task moves that same blend to wrap `releaseDial`'s outputs.
- `READINESS_ANCHOR_STRENGTH` ALREADY EXISTS and is exported from `lib/readiness-model.ts` (value 4) —
  import it; do NOT redeclare a constant.
- `clamp01` the anchored result (mirror pre-19d `computeReadiness`) so a degenerate input can't push
  the probability outside [0,1].
- `dialIndep` stays a PERCENT (0..100): `Math.round(anchored(indep)*100)`, same scale as `dialPercent`
  (see lib/server/CLAUDE.md "dialIndep IS A PERCENT" learning). Never compare it to a raw probability.
- Non-Goal: any Platt/calibration wiring, any change to mock window/strength, any new inputsJson key
  beyond `anchored: true`, any change to the pure release/mixture/PB modules.
- ORACLE NOTE: the pure anchor math is already golden-vector-oracle'd in `lib/readiness-model` tests
  (unchanged). The SERVER direction property (failed↓ / passed↑ / `dialPercent ≤ dialIndep`) is frozen
  as a separate task (wave19e-02) so the implementer here does not also author its grading test.

## Next
- [x] Wire the mock-exam anchor around `releaseDial`'s `final`/`independence` in `recomputeReadiness`;
      pre-verify magnitudes with a throwaway tsx harness. — DONE. Goal fully met; task complete.

## Log
- (planner) Scaffolded. Pre-19d anchor: `lib/readiness-model.ts:236-240`; live path dropped in
  wave19d-08 (commit 6189659). Restore server-side around `releaseDial`'s outputs.
- 2026-07-13 · ClPcs-Mac-mini · Wired the anchor. Imported `READINESS_ANCHOR_STRENGTH` (=4) from
  `@/lib/readiness-model`; added a module-scope `clamp01`; defined `anchored(p) = clamp01((k + S·clamp01(p))
  /(m + S))` inside `recomputeReadiness` after the mock query, applied to BOTH `release.final` and
  `release.independence`: `passProbability = anchored(final)`, `dialPercent = suff ? round(anchored(final)*100)
  : 0`, `dialIndep = suff ? round(anchored(independence)*100) : 0`. Added append-only `anchored: true` to
  inputsJson; encoded the 3-part rationale (direct real evidence / calibration layer has no outcomes yet /
  same affine map preserves final≤independence) in the block comment. `mock` field unchanged; no key
  renamed/removed. typecheck 0, `npm test` 727/727, oracle test + `lib/constants.ts` byte-untouched
  (`git diff --name-only` = only mastery-readiness.ts). Pre-verify (throwaway tsx `--conditions=react-server`,
  scenario user covering all 4 blueprint blocks, deleted after): no-mocks dial=99 (indep 100), 3-failed
  dial=57 (indep 57), 3-passed dial=100 (indep 100) → strictly inside (0,100) with no mocks, strictly below
  with failed, strictly above with passed, `dialPercent ≤ dialIndep` all three, `anchored:true` all three.
  Artifacts: lib/server/mastery-readiness.ts.

## Verify
**Last verify:** PASS (2026-07-13T15:39:04Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T15:42:46Z)
