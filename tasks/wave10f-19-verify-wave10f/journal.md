# Task: wave10f-19-verify-wave10f

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Wave-10f acceptance gate (verify-only, final — §I). Prove the whole wave landed: all fixes green, drift
zero, spikes recorded. Run LAST, after wave10f-01..18.

Boolean acceptance criteria:
1. `npm run typecheck` exits 0.
2. `npm test` exits 0 with `reference-vectors.test.ts` now part of the green gate (not skipped/excluded).
3. `npm run db:seed` exits 0 then `npm run test:integration` exits 0 (incl. the E5 extensions).
4. `npm run build` exits 0.
5. Drift zero: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema
   prisma/schema.prisma --script` emits an empty script (no CREATE/ALTER/DROP).
6. Static invariants all hold:
   - `schedule()` computes stability from PRIOR difficulty (the golden vectors prove it; the test is green).
   - `FSRS_FACTOR` is the literal `19 / 81` in `lib/fsrs/retrievability.ts`.
   - `submitAnswerSchema` contains `latencyMs` + `confidence` + `clientEventId`.
   - `STARTABLE_MODES` excludes `ADAPTIVE_REVIEW`.
   - `ReviewLog.question` and `ReviewState.question` FKs are `Restrict` in schema (and DB).
   - `docs/app-plan/SPIKES.md` records BOTH spike verdicts (Serwist + sharp).

## Constraints / decisions
- This task changes NO product code — it only runs the aggregate gate. If any check fails, the fix belongs
  to the OWNING upstream task (mark this blocked on it), not here.
- Depends on ALL of wave10f-01..18.

## Plan
- [x] Run typecheck / test / seed+integration / build.
- [x] Run the drift-diff gate; confirm empty.
- [x] Run the static-invariant greps.

## Next
- [x] Execute the full acceptance gate. (all green)

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01 21:30 UTC ClPcs-Mac-mini: Ran `bash tasks/wave10f-19-verify-wave10f/verify.sh` — full Wave-10f gate GREEN. typecheck/test/db:seed/test:integration/build all exit 0; `reference-vectors.test.ts` collected & green (4 passed); drift-diff empty; static invariants (FSRS_FACTOR=19/81, latencyMs/confidence/clientEventId in validation, STARTABLE_MODES, ReviewLog/ReviewState FKs Restrict, Serwist+sharp SPIKES verdicts) all hold. Ended "PASS wave10f-19 — Wave-10f acceptance gate green". No product code changed. Status→done.

## Verify
**Last verify:** PASS (2026-07-01T21:31:43Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T21:34:30Z)
