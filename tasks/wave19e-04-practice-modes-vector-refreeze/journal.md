# Task: wave19e-04-practice-modes-vector-refreeze

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-13
**Last compute:** mac-mini

## Goal
Repair the DIAGNOSTIC blueprint-spread test (e) in `lib/server/practice-modes.integration.test.ts`.
Its `blueprintReady` guard and frozen per-block vector reference the RETIRED 6-block blueprint
(`structure`/`medicine`/`law`/`general`/`safety`/`pdr`, nominal {2,2,2,1,2,11}); the blueprint is now
4 strata (`structure`/`safety`/`medical`/`pdr`, wave19d-03), so the guard self-skips and the frozen
vector is stale. Update the guard keys and RE-FREEZE the Hamilton base-allocation vector against the
NEW blueprint, pre-verified via the production path.

Numbered BOOLEAN acceptance criteria:

1. The `blueprintReady` guard checks ONLY strata keys in the current `CATEGORY_B_BLUEPRINT` —
   `structure`, `safety`, `medical`, `pdr`. NO reference to `medicine`/`law`/`general` remains
   anywhere in the file. Minimums are satisfiable on the seeded corpus and high enough that no block
   caps the allocation, e.g. `structure >= 4 && safety >= 4 && medical >= 2 && pdr >= 10` and
   `catBPool.length >= DIAGNOSTIC_COUNT`.
2. On the seeded DB the test (e) RUNS (the `ctx.skip(!blueprintReady, ...)` does NOT fire).
3. The frozen per-block vector `c` is RE-FROZEN to the NEW blueprint's Hamilton base allocation at
   `DIAGNOSTIC_COUNT` (15), PRE-VERIFIED via the real production path (`startSession({ mode:
   "DIAGNOSTIC", categoryId: catBId })` + `groupCandidatesByBlock(CATEGORY_B_BLUEPRINT, pooled)`)
   BEFORE freezing. Expected (per lib/exam-blueprint.ts CATEGORY_B_BLUEPRINT nominal at count 20:
   structure 4 · safety 4 · medical 2 · pdr 10; scaled ×15/20 = 3 · 3 · 1.5 · 7.5; Hamilton floors
   {3,3,1,7}=14; the 1 remaining seat by largest fractional remainder, ties to the earlier block in
   `blueprint.blocks` per lib/test-engine/diagnostic.ts step (iii)) → **{ structure: 3, safety: 3,
   medical: 2, pdr: 7 }** (sums to 15). ⚠ This is the PLAN-time expectation; the implementer MUST
   confirm it against the pre-verify tsx run and, if the real composer yields a different vector
   (e.g. a tie breaks to structure → {4,3,1,7}), FREEZE THE PRODUCTION-PATH VECTOR and record the
   discrepancy + why in the Log — never hand-wave the assertion to match a guess.
4. The per-block assertions use the NEW keys only: `expect(c.structure)`, `expect(c.safety)`,
   `expect(c.medical)`, `expect(c.pdr)`, and the sum assert `c.structure + c.safety + c.medical +
   c.pdr === 15`. The "no block exceeds availability" invariant loop iterates the NEW non-remainder
   keys (`structure`, `safety`, `medical`).
5. `npx vitest list lib/server/practice-modes.integration.test.ts` LISTS test (e).
6. `npm run test:integration` runs this file GREEN on the seeded DB with 0 skipped tests in the file.
7. `npm run -s typecheck` exits 0.

## Constraints / decisions
- TEST-ONLY change; touches only the (e) fixture guard + frozen vector + invariant loop. Do NOT edit
  the composer (`lib/test-engine/diagnostic.ts`) or the blueprint — the blueprint DATA already changed
  in wave19d-03; this is re-freezing a real-data oracle to match the new (external) blueprint, which
  is NOT tampering (the reference is the deterministic Hamilton apportionment ALGORITHM applied to the
  new nominals — derive it, do not read it back from the composer to "make green").
- PRE-VERIFY the vector via the production path (`startSession` DIAGNOSTIC on seeded cat-B) under `npx
  tsx --conditions=react-server` or a scratch integration run BEFORE freezing; the plan-time
  {3,3,2,7} is a derivation, and the largest-remainder tie between `medical`(.5) and `pdr`(.5) must be
  confirmed against `diagnostic.ts`'s actual tie-break (earlier block in `blueprint.blocks`). Record
  the observed vector in the Log.
- Evaluator trigger (e) applies (spec House rules): the frozen spread vector binds. If the
  production-path vector disagrees with a re-derivation, the DERIVATION is what to fix — surface it;
  do not silently overwrite with whatever the code emits without understanding why.
- Reference CLAUDE.md: "New count-15 diagnostic apportionment = 3·3·2·7 (ample) / 4·3·1·7 (medical
  thin → seat cycles to structure)"; the seeded corpus is ample (medical ≈ 59) ⇒ the ample branch.
- Non-Goal: the (d) fallback test (throwaway no-blueprint category) and (a)-(c)/(f) are unchanged.

## Next
- [x] Update the guard keys, pre-verify DIAGNOSTIC on seeded cat-B, re-freeze vector + invariant loop.
      DONE — all 7 criteria met (guard already committed in the parked tick; this tick did the
      pre-verify + frozen-vector re-freeze + invariant-loop keys + last retired-key comment scrub).

## Log
- (planner) Scaffolded. Guard at lines 203-209 + frozen vector at lines 330-340 use retired 6-block
  keys. New blueprint (lib/exam-blueprint.ts, wave19d-03): structure 4 · safety 4 · medical 2 · pdr
  remainder 10. Plan-time expected count-15 vector {3,3,2,7} — CONFIRM via production path.
- 2026-07-13 ClPcs-Mac-mini: Re-grounded. Guard (lines ~199-210) already updated to the 4-strata keys
  (structure≥4/safety≥4/medical≥2/pdr≥10, catBPool≥DIAGNOSTIC_COUNT) in the earlier parked commit
  (af9addd) — no uncommitted diff. PRE-VERIFY: ran `preverify-wave19e04.ts` (replicates production
  `startDiagnostic`: loadDiagnosticCandidates(catB) → selectDiagnostic(CATEGORY_B_BLUEPRINT, …, count
  15)) under `npx tsx --conditions=react-server` ×4 on the seeded DB. Availability {structure:50,
  safety:177, medical:59, pdr:1471} (ample). VECTOR deterministic every run =
  **{ structure:3, safety:3, medical:2, pdr:7 }** (sum 15) — the ample branch, matching the plan-time
  derivation (nominal {4,4,2,10}×15/20={3,3,1.5,7.5}, floors {3,3,1,7}=14, +1 largest-remainder seat to
  medical(.5), earlier in blueprint.blocks than pdr(.5) → {3,3,2,7}). RE-FROZE the vector + comment;
  switched the invariant loop to non-remainder keys [structure,safety,medical] and the sum assert to the
  4 new keys; scrubbed the last retired-key mention ("general=0") from the availability comment (crit 1
  wants NO medicine/law/general anywhere). VERIFY: `grep -nE 'medicine|\blaw\b|general'` → NONE;
  typecheck exit 0; `vitest list --config vitest.integration.config.ts` LISTS (e); `vitest run` →
  7 passed, 0 skipped (guard did not skip). All 7 criteria met → Status: done.

## Artifacts
- lib/server/practice-modes.integration.test.ts — (e) frozen vector re-frozen to {3,3,2,7}, invariant
  loop + sum on the 4-strata keys, retired-key comment scrubbed (guard was done in af9addd).
- preverify-wave19e04.ts — production-path pre-verify scratch (replicates startDiagnostic composer);
  ran ×4, deterministic VECTOR {structure:3,safety:3,medical:2,pdr:7}.

## Verify
**Last verify:** PASS (2026-07-13T17:02:39Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T17:04:20Z)
