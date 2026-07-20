# Task: wave11-09-readiness-snapshot-integration-test

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop
**Evaluate:** yes

## Goal
Author `lib/server/readiness-snapshot.integration.test.ts` proving the recompute (wave11-08) is correct
and honest. Depends wave11-08. DONE when (verify.sh exits 0):

1. Self-provisions OFFICIAL fixtures (`createOfficialQuestion`, UNIQUE keys/category per run, FK-safe
   cleanup) — noise-proof.
2. END-TO-END (production path): driving a real session to completion via `finishSession` (the actual
   finish entry) creates `TopicMastery` rows for the session's topics with `meanR ∈ [0,1]` and
   `coverage ∈ [0,1]` and a band ∈ {weak,learning,strong}, AND a `ReadinessSnapshot` row for the
   session's category.
3. INSUFFICIENT DATA: a user with `< READINESS_MIN_SEEN` (20) seen items → the latest snapshot
   (`getLatestReadiness`) has `sufficientData === false` and `dialPercent === 0` (no hard number).
4. MOCK-ANCHOR DIRECTION (both directions — the Beta shrinkage oracle). With ≥20 seen items whose
   ReviewStates yield a model dial strictly in (0,100):
   - after inserting `>0` COMPLETED `EXAM_SIMULATION` sessions all with result `FAILED`, recompute →
     `snapshot.dialPercent` is STRICTLY LESS THAN the pure-model dial (recompute
     `computeReadiness` in-test with `mockAttempts:0` over the SAME inputs read from `inputsJson`);
   - after replacing those with all `PASSED` mocks, recompute → `snapshot.dialPercent` is STRICTLY
     GREATER THAN the pure-model dial.
   Assert BOTH strict inequalities (`<` and `>`), not just "changes".
5. File is in the integration list (capture-to-var) and runs GREEN in isolation.

## Constraints / decisions
- PRODUCTION-PATH: §2 uses the real `finishSession`. §4's mock-direction assertions may call
   `recomputeReadiness` directly — it is the shared recompute entry (finishSession + nightly both call
   it), and manipulating mock rows then re-running it is the honest way to isolate the Beta direction.
- The direction oracle is a RELATIVE inequality vs the pure `computeReadiness` (which is already
   golden-vector oracle'd in wave10) — this catches a mis-wired mock anchor without re-pinning the
   Poisson-binomial math.
- Test-only: NO product edits (bug → mark blocked on wave11-08).
- Verify runs ONLY this file (shared dev-DB state).

## Plan
- [x] Provision fixture; drive finishSession; assert TopicMastery + snapshot.
- [x] Insufficient-data user; assert sufficientData:false + dial 0.
- [x] Failed-mocks-down then passed-mocks-up strict inequalities vs pure model.

## Next
- [ ] (none — Goal met, verify.sh exits 0)

## Artifacts
- lib/server/readiness-snapshot.integration.test.ts (new; 3 describe/it cases, all green)

## Log
- 2026-07-02 planner: task authored; direction oracle pinned as strict inequalities.
- 2026-07-02T02:23Z ClPcs-Mac-mini: Authored the full suite in one increment —
  §2 production path (startSession→submitAnswer×3→finishSession) asserts TopicMastery
  (itemsSeen=3, meanR/coverage∈[0,1], band∈{weak,learning,strong}) + a ReadinessSnapshot;
  §3 reuses the same <20-seen fixture → getLatestReadiness sufficientData:false, dial 0;
  §4 separate 22-question fixture with directly-seeded ReviewStates (elapsed==stability ⇒
  R=0.9 exactly, unseenCount==0 so meanR reproduces the model's constant p-vector),
  FAILED mocks → dial STRICTLY < pure computeReadiness(mockAttempts:0), PASSED → STRICTLY >.
  Pure-model reference reconstructed from snapshot.inputsJson (honest relative oracle; no
  re-pinning of the Poisson-binomial math). Deletes snapshots+mocks between the two
  directions so the "latest" snapshot is unambiguous. verify.sh exits 0 (3 passed); tsc clean.

## Verify
**Last verify:** PASS (2026-07-01T23:24:27Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T23:26:22Z)
