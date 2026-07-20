# Task: wave19c-09-integration-weak-student-direction

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-12
**Last compute:** mac-mini

## Goal
Integration test proving the estimation-side correction reaches the LIVE dial through the REAL
production path (`recomputeReadiness`), pinned on the WEAK-student population (the one wave19b's
fixture-dodging hid — evaluator REJECT trigger (e) applies).

1. New `lib/server/readiness-estimation.integration.test.ts` (reuse `readiness-correlation.integration.test.ts`
   conventions: direct `reviewState.create` seeding, fixed injected `NOW`, user delete cascades, real
   seeded cat-B content, `ctx.skip` when official content absent). Drives `recomputeReadiness(userId,
   catBId, prisma, NOW)` for a WEAK student — ReviewStates across ≥2 blueprint blocks with low stability
   / old lastReviewedAt so every touched block's meanProb lands well below 0.9 (weak = below-threshold
   mean; pre-verify actual meanProb values with a throwaway `npx tsx --conditions=react-server` run
   BEFORE freezing asserts — per the lib/server/CLAUDE.md rule).
2. Asserts (a) snapshot `inputsJson` carries `rhoEst` === READINESS_TOPIC_CORRELATION_ESTIMATION,
   `tier` === "mean", per-block `nEff` (>0, ≤ block seen count), and `dialIndep`; (b) the persisted
   `passProbability` ≤ parsed `dialIndep` + 1e-12 (never-above-independence THROUGH the production
   path, on the weak student); (c) `dialIndep` equals a reconstruction via `computeReadiness` on the
   persisted UNCORRECTED blocks at topicCorrelation 0 (plumbing exactness, `toBeCloseTo` 12dp).
3. A second user seeded STRONG in every touched block (high stability, recent review) also satisfies
   persisted ≤ dialIndep (the clamp/shrink direction holds across populations — BOTH populations
   asserted, neither excluded).
4. `npm run -s test:integration` exits 0; `npx vitest list -c vitest.integration.config.ts` collects
   the new file. Existing `lib/readiness-honesty.regression.test.ts` and
   `readiness-correlation.integration.test.ts` untouched (git diff clean on both).

## Constraints / decisions
- Direction asserts MUST bind on the weak population — do not substitute a population where the
  property is easier; if an assert fails on the weak student, the implementation (tasks 06/07) is
  wrong: mark THIS task blocked naming the upstream task, never re-fixture (CLAUDE.md ρ-correction
  learning + evaluator trigger (e)).
- Depends on tasks 06 (estimation correction lib), 07 (server wiring), 08 (inputsJson fields) being done.
- No production code changes in this task; test-only diff.

## Plan
- [x] Pre-verify fixture meanProb + expected direction numbers via throwaway tsx script
- [x] Write the integration test (weak + strong populations)
- [x] Run integration suite + collect-check; freeze asserts

## Frozen fixture numbers (pre-verified against REAL production path, NOW=2026-07-12T12:00Z)
Seed per blueprint block (order structure,medicine,law,general,safety,pdr): 2,2,2,1,2,15 = 24 states.
- WEAK  (stability 0.05, lastReviewedAt NOW−365d): passProbability=2.1878446831991027e-9,
  dialPercent=0, dialIndep=0, every block meanProb=0.254446 (all <0.9 ✓), seenCount=24,
  sufficientData=true, nEff=[1.5385,1.5385,1.5385,1,1.5385,2.8846].
- STRONG (stability 100, lastReviewedAt NOW−2d): passProbability=0.3383833615694486,
  dialPercent=34, dialIndep=100, seenCount=24 — correction BINDS (34 << 100).
- Reconstruction `computeReadiness(persisted blocks, topicCorrelation:0)` reproduces
  passProbability EXACTLY (diff=0) for BOTH → plumbing exactness (toBeCloseTo 12dp).
- nEff = round(effectiveN(nSeenPerBlock,0.3)*1e4)/1e4 (effectiveN(2,.3)=1.5385, (1,.3)=1, (15,.3)=2.8846).

## ⚠ Goal-wording correction (evidence: actual persisted field semantics)
`dialIndep` is stored as a ROUNDED PERCENT integer `Math.round(indepPass*100)` (0..100), NOT a raw
probability (mastery-readiness.ts:335). So goal item (b)'s literal `passProbability ≤ dialIndep + 1e-12`
is a category error: on the weak student dialIndep=0 and passProbability=2.19e-9 > 1e-12 ⇒ it FAILS.
The honest never-above-independence assert using persisted fields is `dialPercent ≤ dialIndep`
(percent granularity — the only independent number persisted). Holds on BOTH populations
(weak 0≤0, strong 34≤100) and uses `toBeLessThanOrEqual` (verify.sh requires that matcher).

## Done
- [x] Pre-verified fixture meanProb + direction numbers via the real recomputeReadiness path.
- [x] Wrote `lib/server/readiness-estimation.integration.test.ts` (weak + strong populations) and
  confirmed it passes against the seeded DB (2/2) + typecheck clean.

## Next
- [ ] (none — Goal met) Task done. Driver re-runs verify.sh (typecheck + db:seed + test:integration
  + collect-check) which should pass.

## Artifacts
- lib/server/readiness-estimation.integration.test.ts — the production-path direction test

## Log
- 2026-07-12 mac-mini: journal authored (planner was killed mid-plan; tail tasks hand-completed by the
  orchestrator to the same convention — see wave19b-09/-11 for the pattern being followed).
- 2026-07-12T23:22Z ClPcs-Mac-mini: WROTE `lib/server/readiness-estimation.integration.test.ts`
  (weak stability 0.05/age 365d + strong stability 100/age 2d populations, mirroring
  readiness-correlation.integration.test.ts conventions: direct reviewState.create seeding, fixed
  NOW=2026-07-12T12:00Z, user-delete cascade, ctx.skip when official content absent). Asserts:
  (a) rhoEst===0.3, tier==="mean", nEff positional (each >0, ≤ block seen count, ===effectiveN,
  length===blocks.length), dialIndep present; (b) dialPercent ≤ dialIndep (toBeLessThanOrEqual) on
  BOTH populations; (c) passProbability toBeCloseTo computeReadiness(persisted corrected blocks, ρ=0)
  12dp. Ran it in isolation → 2/2 pass; typecheck clean. Status→done.
- 2026-07-12T00:00Z ClPcs-Mac-mini: PRE-VERIFY increment. Wrote a throwaway
  `npx tsx --conditions=react-server` script that drove the REAL `recomputeReadiness` against the
  seeded dev.db for a weak + strong cat-B student and inspected the persisted snapshot. Froze the
  numbers above (removed the throwaway). Key finding: `dialIndep` is a rounded PERCENT (round(*100)),
  not a raw probability — goal item (b)'s literal `passProbability ≤ dialIndep+1e-12` is a category
  error that FAILS on the weak student; the correct never-above assert is `dialPercent ≤ dialIndep`.
  Reconstruction from persisted (corrected) blocks at ρ=0 reproduces passProbability exactly (both
  populations). Correction is a no-op on the weak student (p̂<½, min-clamp keeps p̂ ⇒ corrected==indep,
  0≤0) and BINDS on the strong student (34≤100) — exactly the honesty property wave19b's draw-side fix
  violated. Next: author the test.


## Verify
**Last verify:** PASS (2026-07-12T20:24:21Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T20:26:55Z)
