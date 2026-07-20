# Task: wave21-08-verify-wave

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** ClPcs-Mac-mini

WHOLE-WAVE GATE — run the full verification stack for wave21 and pin the byte-untouched invariants
(this wave touches NO `lib/fsrs` code; wave20 + readiness oracles must be unchanged).

## Goal
PASS = ALL true:

1. `npm run -s typecheck` exits 0.
2. `npm test` exits 0; `npx vitest list` collects `study-plan.oracle`, `study-plan.simulation`, and
   `study-plan` (the re-frozen unit suite).
3. `npm run db:seed` runs, THEN `npm run test:integration` exits 0 with 0 skipped
   (db:seed BEFORE integration — CLAUDE.md self-heal ordering).
4. Project build exits 0.
5. `:3100` server restarted against the fresh build; `npm run audit:browser` passes (incl. the
   wave21-07 plan-card negative assertion «Не встигнете за» absent).
6. **Byte-untouched invariants** vs the wave base `e0c120b` (override `WAVE21_BASE`): every file under
   `lib/fsrs/` is unchanged; `lib/readiness-release.oracle.test.ts`,
   `lib/readiness-honesty.regression.test.ts`, and `lib/fsrs/reference-vectors.test.ts` are
   byte-identical. `git diff --name-only e0c120b -- lib/fsrs` is EMPTY.
7. No new prisma migration added (wave21 is code-only; `reviewLoad` is computed, not stored):
   `git diff --name-only e0c120b -- prisma/migrations` is EMPTY.
8. The old multi-day one-shot threat string «Не встигнете за» does NOT appear in `lib/study-plan.ts`
   (removed from the PRIORITIZE branch; the exam-today «не встигнете все опрацювати» copy legitimately
   remains — assert THAT specific exam-today string is still present so the branch wasn't gutted).

## Constraints / decisions
- Wave base `e0c120b` = the spec commit before any wave21 impl. Override with `WAVE21_BASE` if rebased.
- No `lib/fsrs` change is in scope (grade model stays as shipped in wave20). The byte-untouched gate
  enforces this.
- Integration ordering: `db:seed` must precede `test:integration` in this gate (accumulated audit
  rows otherwise flake TOP-N/analytics suites — CLAUDE.md).
- Stale-server trap: restart the `:3100` port-owner against the fresh build before audit:browser
  (client chunk hashes change on rebuild; the booted server references deleted chunks otherwise).

## Acceptance
| Goal criterion | Where confirmed |
|---|---|
| 1 typecheck | `npm run -s typecheck` |
| 2 unit + collection | `npm test` + `npx vitest list` |
| 3 db:seed→integration 0 skipped | `npm run db:seed` + `npm run test:integration` |
| 4 build | project build |
| 5 audit:browser green | `npm run audit:browser` |
| 6 lib/fsrs + oracles byte-untouched | `git diff --name-only e0c120b -- lib/fsrs` empty |
| 7 no migration | `git diff --name-only e0c120b -- prisma/migrations` empty |
| 8 threat copy scoping | grep `lib/study-plan.ts` |

## Next
- [x] Run typecheck → unit (+collection) → db:seed → integration → build → restart :3100 →
      audit:browser; assert byte-untouched invariants + no migration + copy scoping.
- All 8 Goal criteria green — nothing left.

## Log
- 2026-07-14 planner: task scaffolded from spec Deliverable 6.
- 2026-07-14T11:53Z ClPcs-Mac-mini: ran the full wave21 verification stack, ALL GREEN.
  (1) typecheck exit 0. (2) `npm test` 778 passed; `npx vitest list` collects study-plan.oracle,
  study-plan.simulation, study-plan. (3) `npm run db:seed` (2322 official Qs) THEN
  `npm run test:integration` 282 passed / 0 skipped. (4) build exit 0 (rm -rf .next/types first).
  (5) killed :3100 owner pid 87055, relaunched `npm run start -- -H 0.0.0.0 -p 3100` on fresh build
  (no EADDRINUSE), `npm run audit:browser` 84 passed / 0 failed — incl. line-49 PASS «plan card drops
  the removed multi-day threat copy («Не встигнете за»)». (6) `git diff --name-only e0c120b -- lib/fsrs`
  EMPTY; readiness-release.oracle / readiness-honesty.regression / fsrs reference-vectors byte-identical.
  (7) `git diff --name-only e0c120b -- prisma/migrations` EMPTY. (8) «Не встигнете за» ABSENT from
  lib/study-plan.ts; exam-today «не встигнете все опрацювати» PRESENT (line 67). Status → done.

## Verify
**Last verify:** PASS (2026-07-14T09:02:01Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T09:09:37Z)
