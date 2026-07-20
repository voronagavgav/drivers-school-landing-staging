# Task: wave24-10-verify-wave

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-15
**Last compute:** ClPcs-Mac-mini

WHOLE-WAVE GATE (spec Deliverable 5). Run the full verification stack for wave24 and pin the
byte-untouched invariants. Wave 24 BUILDS an offline FSRS-6 weight-fit harness (export → fit → evaluate →
synthetic validation → report) but APPLIES NOTHING to live scheduling. It must NOT touch `lib/fsrs`, the
readiness modules, or any product wiring. Nothing may import fitted weights.

Depends on: all of wave24-01..09. Artifacts: `tasks/wave24-10-verify-wave/PREVERIFY-OUTPUT.txt`.

## Acceptance
Whole-wave gate GREEN (`bash tasks/wave24-10-verify-wave/verify.sh` → EXIT 0, prints `PASS wave24-10`).
Static evidence for the runnable criteria is captured verbatim in `PREVERIFY-OUTPUT.txt` (read, don't run).
No structural traps: this is a VERIFY-ONLY gate — no new test/oracle/fixture authored, no product code touched;
exp = spec Deliverable 5, got = pre-existing wave24 artifacts + captured stdout.

| # | Criterion | Evidence the judge READS |
|---|-----------|--------------------------|
| 1 | typecheck 0 | PREVERIFY-OUTPUT.txt `TYPECHECK_EXIT=0` |
| 2 | unit 0 + oracle/synthetic collected | PREVERIFY-OUTPUT.txt `Tests 809 passed`; verify.sh `vitest_list` token-retry gate on `param-engine.oracle`,`gen-synthetic.determinism` |
| 3 | seed→integration 0, fsrs-export collected | PREVERIFY-OUTPUT.txt `Tests 285 passed`; verify.sh `fsrs-export` collection gate |
| 4 | build 0 | PREVERIFY-OUTPUT.txt `== build ==` route table emitted |
| 5 | no browser audit | PREVERIFY-OUTPUT.txt `SKIP audit:browser — wave24 ships no UI` |
| 6 | FSRS defaults byte-untouched | verify.sh greps `0.212,`/`1.8722,`/`0.1542,` in lib/fsrs/constants.ts + `git diff --name-only $BASE -- lib/fsrs` EMPTY |
| 7 | no product wiring | verify.sh allowlist over `git diff --name-only $BASE` (all paths under scripts/fsrs-fit, the export test, the report, tasks/, .gitignore) |
| 8 | nothing imports the fitter | verify.sh `grep -rlE 'scripts/fsrs-fit|VALIDATION-RESULTS' app lib components` (minus own export test) EMPTY |
| 9 | no new prisma migration | verify.sh `git diff --name-only $BASE -- prisma/migrations` EMPTY |
| 10 | report exists | `docs/research/WEIGHTFIT-HARNESS-2026-07-14.md` on disk |

## Goal
PASS = ALL true:

1. `npm run -s typecheck` exits 0.
2. `npm test` exits 0; `npx vitest list` collects `param-engine.oracle` AND `gen-synthetic.determinism`
   (var-captured, herestring token-retry per CLAUDE.md).
3. `npm run -s db:seed` (run BEFORE integration, self-heal ordering) then `npm run -s test:integration`
   exits 0 with 0 unexpected skips; `fsrs-export` integration test is collected.
4. `npm run -s build` exits 0.
5. NO browser audit (spec ships ZERO UI). verify.sh explicitly SKIPS `audit:browser` and records why.
6. **FSRS defaults byte-untouched**: `lib/fsrs/constants.ts` still contains the exact
   `FSRS_DEFAULT_WEIGHTS` vector (`0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722,
   0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542`), and
   `git diff --name-only $WAVE24_BASE -- lib/fsrs` is EMPTY (no file under lib/fsrs changed this wave).
7. **No product wiring**: every path in `git diff --name-only $WAVE24_BASE` matches the allowlist
   `^scripts/fsrs-fit/`, `^lib/server/fsrs-export\.integration\.test\.ts$`,
   `^docs/research/WEIGHTFIT-HARNESS-2026-07-14\.md$`, `^tasks/`, `^\.gitignore$` — NOTHING under `app/`,
   `components/`, `prisma/`, or elsewhere in `lib/` changed.
8. **Nothing imports fitted weights / the fitter**: no file under `app/`, `components/`, or `lib/`
   (excluding the wave's own `lib/server/fsrs-export.integration.test.ts`) imports from
   `scripts/fsrs-fit/` or references `VALIDATION-RESULTS`/`fit.py` output as a scheduling input
   (grep-gate over app/lib/components).
9. **No new prisma migration**: `git diff --name-only $WAVE24_BASE -- prisma/migrations` is EMPTY.
10. `docs/research/WEIGHTFIT-HARNESS-2026-07-14.md` exists (the wave's report deliverable).

## Constraints / decisions
- `WAVE24_BASE` = the PLAN commit before any wave24 impl (default `d928eab`; override if rebased).
- No `lib/fsrs` / readiness / oracle change is in scope; the byte-untouched gate enforces it.
- No browser audit (zero UI); no migrate/deploy (no DB schema change) — the stale-server / migration-lock
  traps do not apply this wave. The export reads existing ReviewLog columns (no schema change).
- The python venv (`scripts/fsrs-fit/.venv`) is git-ignored, so it never appears in the diff allowlist.
- Design-stack (P1–P8) is N/A — this wave ships NO user-facing surface (scripts + a docs report). No
  screenshots, no direction/critique tasks.
- Materialize `PREVERIFY-OUTPUT.txt` (verbatim executed stdout) + an `## Acceptance` table so the static
  judge READS produced files for the runnable criteria (exp = spec Deliverable 5, got = captured output).

## Next
- [x] Run the full stack, capture stdout, assert the byte-untouched + no-wiring invariants.
- Goal fully met; whole-wave gate GREEN. Nothing left.

## Artifacts
- `tasks/wave24-10-verify-wave/verify.sh` — whole-wave gate (Deliverable 5).
- `tasks/wave24-10-verify-wave/PREVERIFY-OUTPUT.txt` — captured verbatim stdout (typecheck/unit/integration/build).

## Log
- 2026-07-14 planner: task created.
- 2026-07-15 ClPcs-Mac-mini: ran the full gate → EXIT 0, `PASS wave24-10`. typecheck 0; unit 809/809 (param-engine.oracle + gen-synthetic.determinism collected); db:seed then integration 285/285 (fsrs-export collected); build 0; no browser audit (zero UI). Byte-untouched: FSRS_DEFAULT_WEIGHTS vector intact, `git diff $BASE -- lib/fsrs` EMPTY. Allowlist clean (only scripts/fsrs-fit, the export test, the report, tasks/, .gitignore changed); no product code imports the fitter; no new prisma migration; report deliverable present. Captured to PREVERIFY-OUTPUT.txt + Acceptance table. Status→done.

## Verify
**Last verify:** PASS (2026-07-15T06:56:34Z)

## Evaluation
**Last evaluation:** PASS (2026-07-15T06:59:23Z)
