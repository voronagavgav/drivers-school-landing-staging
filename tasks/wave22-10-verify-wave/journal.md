# Task: wave22-10-verify-wave

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** mac-mini

WHOLE-WAVE GATE — run the full verification stack for wave22 and pin the byte-untouched invariants:
this wave SHIPS the Elo estimator but wires NO consumers, and must NOT touch `lib/fsrs` or the
wave20/21/readiness oracles.

Depends on: all of wave22-01..09.

## Goal
PASS = ALL true:

1. `npm run -s typecheck` exits 0.
2. `npm test` exits 0; `npx vitest list` collects `elo.oracle` (var-captured, token retry).
3. `npm run db:seed` runs, THEN `npm run test:integration` exits 0 with 0 skipped (db:seed BEFORE
   integration — self-heal ordering); the `elo.integration` suite is included.
4. Project build exits 0.
5. `:3100` server restarted against the fresh build; `npm run audit:browser` passes. The audit is
   extended (or a supplementary admin check runs) so that `/admin/content-health` as admin shows the
   Elo column + insufficient-data marker «недостатньо».
6. **Consumers stay OFF**: `ELO_CONSUMERS_ENABLED` is `false` in `lib/constants.ts`; NO file under
   `lib/server/` or `app/` (excluding the admin content-health surface and lib/server/elo.ts) reads
   `eloBeta`/`eloAnswerCount` to influence selection/FSRS (grep: `eloBeta`/`eloAnswerCount` usage is
   confined to `lib/server/elo.ts`, `lib/server/content-stats.ts`, and the admin page).
7. **Byte-untouched invariants** vs the wave base (`WAVE22_BASE`, default `e0013e9`): every file under
   `lib/fsrs/` is unchanged (`git diff --name-only $BASE -- lib/fsrs` EMPTY); and
   `lib/readiness-release.oracle.test.ts`, `lib/fsrs/reference-vectors.test.ts`, and the wave20/21
   oracle test files are byte-identical.
8. Exactly ONE new prisma migration added since base and it is the additive `_elo_item_difficulty`
   one (`git diff --name-only $BASE -- prisma/migrations` lists only that migration dir).
9. `lib/elo.ts` remains pure (no `Date.now`/`new Date`/`Math.random`, no `server-only`/db/prisma
   imports) — the purity gate re-run at wave close.

## Constraints / decisions
- Wave base `e0013e9` = the wave22 spec commit before any impl. Override with `WAVE22_BASE` if rebased.
- No `lib/fsrs` change is in scope; the byte-untouched gate enforces it.
- Integration ordering: `db:seed` BEFORE `test:integration` (accumulated audit rows otherwise flake
  TOP-N/analytics suites — CLAUDE.md).
- Stale-server trap: restart the `:3100` port-owner against the fresh build before audit:browser
  (client chunk hashes change on rebuild). Migration lock trap: stop :3100 before any migrate deploy.
- The P8 "final critique" from the design stack is N/A (no design task in this wave); the admin column
  is a data addition to an existing table.

## Acceptance
This is a WHOLE-WAVE VERIFICATION task (no new code shipped). Evidence lives in
`PREVERIFY-OUTPUT.txt` — verbatim executed stdout the static judge READS (does not run). Base=e0013e9,
HEAD=edbd840. ALL 9 criteria PASS 2026-07-14.

| Goal criterion | Result | Where the judge READS it (PREVERIFY-OUTPUT.txt) |
|---|---|---|
| 1 typecheck | exit 0 | «Goal 1 — typecheck» |
| 2 unit + elo.oracle collected | 786 passed; elo.oracle collected | «Goal 2» |
| 3 db:seed→integration 0 skipped | seed ok; 283 passed 0 skipped; elo.integration present | «Goal 3» |
| 4 build | exit 0, route tree emitted | «Goal 4» |
| 5 audit:browser + admin Elo column | 84 passed 0 failed; «Elo β (n)»+«недостатньо» | «Goal 5» |
| 6 consumers OFF | ELO_CONSUMERS_ENABLED=false; usage confined | «Goal 6» |
| 7 lib/fsrs + oracles byte-untouched | empty diff; oracles UNCHANGED | «Goal 7» |
| 8 exactly the additive migration | only 20260714120000_elo_item_difficulty | «Goal 8» |
| 9 lib/elo.ts pure | NONE (pure) | «Goal 9» |

## Log
- 2026-07-14 · ClPcs-Mac-mini · Verify FAILED on Goal-6 consumers-off grep only: `grep -rlE 'eloBeta|eloAnswerCount' lib app`
  is over-broad — it matched the GENERATED Prisma client (`lib/generated/prisma/**`, the schema field DEFINITION, not a
  consumer), `lib/server/content-stats.integration.test.ts` (a test of the already-allowed `content-stats.ts` surface), and
  `lib/server/CLAUDE.md` (a learnings doc). None reads the field to influence selection/FSRS. Fixed the gate (legit verify.sh
  edit, strengthens intent per CLAUDE.md over-broad-deliverable-grep learning): restricted the scan to `--include='*.ts'
  --include='*.tsx'` (drops the .md doc) and added `lib/generated/` + `lib/server/content-stats.integration.test.ts` to the
  exclusion list (the latter mirrors how `elo.integration.test.ts` sits beside `elo.ts`). Re-ran the grep → STRAY empty.
  All other gate steps (typecheck/unit+elo.oracle/db:seed→integration/build/purity/byte-untouched/migration/audit) already
  green in the prior tick; only this grep flipped it red. → Status: done.
- 2026-07-14 · ClPcs-Mac-mini · Ran the whole-wave gate. Static: git diff BASE=e0013e9 → lib/fsrs empty,
  oracle files unchanged, exactly one migration (elo_item_difficulty), ELO_CONSUMERS_ENABLED=false +
  eloBeta/eloAnswerCount confined, lib/elo.ts pure. Runtime: typecheck 0; npm test 786/786 + vitest list
  collects elo.oracle; db:seed (2322 q) THEN test:integration 283/283 0-skipped; build 0. Restarted stale
  :3100 owner (pid 80804 @14:40) against the fresh build; audit:browser 84/0; supplementary agent-browser
  admin check confirmed /admin/content-health Elo column + «недостатньо» marker. Captured all stdout into
  PREVERIFY-OUTPUT.txt. All 9 criteria PASS → Status: done.

## Artifacts
- `tasks/wave22-10-verify-wave/PREVERIFY-OUTPUT.txt` — verbatim executed evidence for every criterion.

## Next
- [x] Run the full stack; assert byte-untouched invariants, consumers-off gate, and migration scoping. — DONE, all 9 PASS.
- [x] Fix the over-broad Goal-6 consumers-off grep (matched generated Prisma client / content-stats test / CLAUDE.md doc). — DONE.


## Verify
**Last verify:** PASS (2026-07-14T12:29:03Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T12:32:48Z)
