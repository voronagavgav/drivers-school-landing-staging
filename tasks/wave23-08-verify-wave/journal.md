# Task: wave23-08-verify-wave

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** mac-mini

WHOLE-WAVE GATE (spec Deliverable 5) — run the full verification stack for wave23 and pin the
byte-untouched invariants. This wave is a MEASUREMENT SPIKE: it ships the pure allocator + sim + report
and wires NO product surface, NO UI, NO DB. It must NOT touch `lib/fsrs`, the readiness modules, or the
wave20/21/22 oracle tests.

Depends on: all of wave23-01..07.

## Goal
PASS = ALL true:

1. `npm run -s typecheck` exits 0.
2. `npm test` exits 0; `npx vitest list` collects `exam-allocator.oracle` AND
   `exam-allocator-sim.determinism` (var-captured, herestring token-retry per CLAUDE.md).
3. `npm run -s test:integration` exits 0 with 0 skipped and is UNTOUCHED-green (no integration test
   file changed this wave — spike ships no server/DB code). Run `npm run -s db:seed` BEFORE integration
   (self-heal ordering, CLAUDE.md).
4. `npm run -s build` exits 0.
5. NO browser audit (spec: zero UI). verify.sh explicitly SKIPS `audit:browser` and records why.
6. **No product wiring**: `git diff --name-only $BASE` shows NO change under `app/`, `lib/server/`,
   `prisma/`, or `components/`; the only shipped code lives in `lib/exam-allocator.ts`,
   `lib/exam-allocator-sim.ts`, their `*.test.ts`, `scripts/oracles/gen-wave23-oracles.py`,
   `scripts/spikes/exam-allocator-sim.ts`, `docs/research/…`, and `tasks/`.
7. **Byte-untouched invariants** vs the wave base (`WAVE23_BASE`, default `ced6b85`): every file under
   `lib/fsrs/` is unchanged (`git diff --name-only $BASE -- lib/fsrs` EMPTY); `lib/readiness-release.ts`,
   `lib/readiness-seen-unseen.ts`, `lib/readiness-model.ts`, `lib/readiness-factor-mixture.ts`, and the
   wave19d/20/21/22 oracle test files (`lib/readiness-release.oracle.test.ts`,
   `lib/fsrs/reference-vectors.test.ts`, `lib/elo.oracle.test.ts`, and the wave20/21 oracle files) are
   byte-identical to base.
8. NO new prisma migration is added since base (`git diff --name-only $BASE -- prisma/migrations` EMPTY)
   — the spike needs no DB.
9. `lib/exam-allocator.ts` and `lib/exam-allocator-sim.ts` remain pure (no `Date.now`/`new Date()`
   wall-clock, no `Math.random`, no `server-only`/db/prisma imports — the simulated-clock
   `new Date(<explicit-ms>)` construction is exempt) — the purity gate re-run at wave close.
10. The report `docs/research/EXAM-ALLOCATOR-SPIKE-2026-07-14.md` exists and contains a GO/NO-GO
    verdict (the wave's deliverable exists, whatever the measured direction).

## Constraints / decisions
- Wave base `ced6b85` = the PLAN commit before any wave23 impl. Override with `WAVE23_BASE` if rebased.
- No `lib/fsrs` / readiness / oracle change is in scope; the byte-untouched gate enforces it.
- No browser audit (zero UI); no migrate/deploy (no DB) — so the stale-server / migration-lock traps do
  not apply this wave.
- The design-stack (P1–P8) is N/A — this wave ships NO user-facing surface (a `docs/research` report +
  pure libs + a tsx spike). No screenshots, no direction/critique tasks.

## Acceptance
This is a WHOLE-WAVE VERIFICATION task (no new product code). Evidence lives in `PREVERIFY-OUTPUT.txt`
— verbatim executed stdout the static judge READS (does not run). All 10 criteria PASS:

| # | Criterion | Evidence in PREVERIFY-OUTPUT.txt |
|---|-----------|----------------------------------|
| 1 | typecheck exits 0 | `TYPECHECK_EXIT=0` (§1) |
| 2 | unit exits 0 + oracle/determinism collected | `Tests 799 passed`, `UNIT_EXIT=0`, `COLLECTED exam-allocator.oracle`/`…-sim.determinism` (§2) |
| 3 | integration exits 0, 0 skipped, after db:seed | `SEED_EXIT=0`, `Tests 284 passed (0 skipped)`, `INTEG_EXIT=0` (§3) |
| 4 | build exits 0 | `BUILD_EXIT=0` (§4) |
| 5 | no browser audit (zero UI) | verify.sh prints the skip banner (§5) |
| 6 | no product wiring | `git diff … -- app lib/server prisma components` empty (§6) |
| 7 | byte-untouched fsrs/readiness/oracles | `lib/fsrs` diff empty; all readiness+oracle files `unchanged` (§7) |
| 8 | no new prisma migration | `git diff … -- prisma/migrations` empty (§8) |
| 9 | shipped libs pure | both libs: no Date.now/Math.random, no server/db import (§9) |
| 10 | report exists with GO/NO-GO verdict | report present, `**VERDICT: NO-GO**` line 51 (§10) |

No self-referential-oracle trap: this task authors NO product code — it only RUNS the wave's existing
tests + git-diff scope/byte checks. exp=spec (the 10 Goal criteria), got=pre-existing wave23-01..07 code.

## Next
- (none — task complete; the driver re-runs verify.sh to confirm)

## Log
- 2026-07-14 mac-mini: planned.
- 2026-07-14 ClPcs-Mac-mini: ran full stack — typecheck 0, unit 799✓ (+collection of both allocator suites), db:seed→integration 284✓/0-skipped, build 0. Scope/byte gates: product-wiring diff empty, lib/fsrs empty, all readiness+wave19d/20/21/22 oracle files byte-unchanged, no new migration. Both shipped libs pure. Report present with NO-GO verdict. Captured PREVERIFY-OUTPUT.txt, wrote Acceptance table, Status:done. All 10 criteria pass.

## Verify
**Last verify:** PASS (2026-07-14T14:51:14Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T14:56:51Z)
