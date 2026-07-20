# Task: wave19a-03-fsrs6-downstream-verify

**Status:** done   <!-- wave19a-02 landed; downstream verified green -->
**Driver:** auto
**Updated:** 2026-07-07
**Last compute:** laptop

VERIFICATION (Part 1 §E). Confirm every downstream consumer of the pure engine stays behavior-valid after the
FSRS-6 port (wave19a-02): `lib/test-engine/queue.ts`, `lib/server/mastery*.ts`, `lib/server/study.ts`,
`lib/server/test-engine.ts`, `lib/readiness*.ts`. Exact dueAt / stability numbers may shift (better model) —
that is expected; the gate is that consumers COMPILE and their unit + integration tests PASS, and any test that
pinned an FSRS-5 magic number is re-derived from the engine (not frozen to a stale constant).

## Goal
PASS = ALL true:

1. `npm run -s typecheck` exits 0.
2. `npm run -s test` exits 0 (full unit suite, incl. the FSRS-6 reference oracle).
3. `npm run -s db:seed` exits 0, THEN `npm run -s test:integration` exits 0 with ZERO failures. (Seed FIRST to
   self-heal against accumulated dev.db rows per CLAUDE.md; the LAN next-server need NOT be stopped for a pure
   db:seed, but MUST be stopped before any migrate — no migration here.)
4. `npx vitest list --config vitest.integration.config.ts` (captured to a var, then grep) INCLUDES the FSRS
   consumer suites `lib/server/srs-review.integration.test.ts` and `lib/server/review-sync.integration.test.ts`.
5. `git grep -nE '19 */ *81|DECAY *= *-0\.5|= *3\.173\b' -- lib app | grep -v reference-vectors` returns NOTHING
   (no lingering FSRS-5 magic constants pinned in consumer code/tests outside the oracle file).
6. No source file under `lib/` or `app/` reintroduces an FSRS engine formula (queue/mastery/readiness still IMPORT
   `retrievability`/`schedule` from `@/lib/fsrs`, never re-derive): `git grep -nE 'FSRS_FACTOR|Math\.pow\(1 \+' -- lib/test-engine lib/server lib/readiness*.ts` shows only re-exports/imports, not a re-implementation. (Manual spot-check acceptable; record it in the Log.)

## Constraints / decisions
- VERIFY + minimal-fix only. If an integration test fails because it pinned an FSRS-5 magic number, re-derive that
  assertion from the engine (relational/identity form preferred) and log it. If a test fails for a REAL behavioral
  regression (a consumer broke), set THIS task `blocked` and REOPEN wave19a-02 rather than patching around it.
- Do NOT weaken a real check to make it pass. Do NOT edit `lib/fsrs/reference-vectors.test.ts` (02's frozen oracle).
- Known-safe: existing FSRS consumer integration tests already assert relationally (`stability > 0`, `dueAt` in the
  future, replay-idempotent equality-to-self), so the FSRS-6 numeric shift should NOT break them — this task proves it.
- Non-goals: any Part 2 file; new features; the weight optimizer.

## Next
- [x] wave19a-02 LANDED (engine now FSRS-6: `FSRS_DECAY=-w20`, `FSRS_FACTOR=0.9^(1/DECAY)-1`, oracle
      un-skipped). Ran the full downstream verification: typecheck + unit (618 pass, incl. FSRS-6
      oracle) + db:seed + integration (254 pass / 0 fail) all green; Goal-5 grep empty, Goal-6
      spot-check clean (consumers import `@/lib/fsrs`, no re-derivation). Fixed the ONE stale
      consumer test comment pinning the FSRS-5 formula. Task complete.
- (no further increment — Status: done)

## Log
- 2026-07-07 ClPcs-Mac-mini: re-checked upstream. wave19a-02 STILL parked/unlanded (HEAD unchanged
  at `58d8254`; git log shows only this task's own driver ticks since). Engine markers unchanged:
  `retrievability.ts:12,19` still `FSRS_DECAY=-0.5`/`FSRS_FACTOR=19/81` (line 40 still
  `Math.pow(1+FACTOR*…, DECAY)`), `reference-vectors.test.ts:117` still `describe.skip`, no
  21-weight `w20` FSRS-6 vector in constants.ts. Standing Verify FAIL (Goal #5 grep hitting the
  FSRS-5 constants outside the oracle) is a direct consequence of the un-ported engine — resolving
  it IS wave19a-02's job; patching downstream is forbidden by Constraints. No actionable increment.
  Status stays blocked on wave19a-02.
- 2026-07-08 ClPcs-Mac-mini: re-checked upstream again. Still BLOCKED — no new wave19a-02 commit
  (its latest is still the parked `58d8254`). Confirmed premises remain unmet:
  `reference-vectors.test.ts:117` still `describe.skip`; `retrievability.ts:12,19` still
  `FSRS_DECAY=-0.5`/`FSRS_FACTOR=19/81`; `constants.ts` still the FSRS-5 vector (no `w20`). Standing
  Verify FAIL (Goal #5 grep) is a direct consequence of the un-ported engine; fixing it IS wave19a-02's
  job. No actionable increment. Status stays blocked on wave19a-02.
- 2026-07-08 ClPcs-Mac-mini: re-checked upstream. wave19a-02 STILL not landed — its HEAD commit is
  "parked as blocked (tick budget exhausted)" (58d8254). Confirmed premises still unmet:
  `lib/fsrs/constants.ts` has NO 21-weight FSRS-6 vector (grep count 0); `reference-vectors.test.ts:117`
  still `describe.skip`; `retrievability.ts:12,19` still `FSRS_DECAY=-0.5`/`FSRS_FACTOR=19/81`. The
  standing Verify FAIL ("stale FSRS-5 magic constant found outside the oracle file", Goal #5 grep) is a
  DIRECT consequence of the un-ported engine — fixing it requires porting the engine, which is
  wave19a-02's job, not this downstream-verify's (patching around the missing dep is forbidden by the
  Constraints). No actionable increment exists here until 02 lands. Status stays blocked on wave19a-02.
- 2026-07-08 ClPcs-Mac-mini: re-checked upstream. wave19a-02 STILL not landed — no new commit (its
  latest is still the parked `58d8254`; git log shows only this task's own driver ticks on top).
  Premises still unmet: `lib/fsrs/constants.ts` has NO FSRS-6 vector (`grep -c w20|0.212` = 0);
  `retrievability.ts:12,19` still `FSRS_DECAY=-0.5`/`FSRS_FACTOR=19/81` (line 40 still the FSRS-5
  `Math.pow(1+FACTOR*…, DECAY)`); `reference-vectors.test.ts:117` still `describe.skip`. Standing
  Verify FAIL (Goal #5 grep hitting the FSRS-5 constants outside the oracle) is a DIRECT consequence
  of the un-ported engine — resolving it IS wave19a-02's job; patching downstream is forbidden by the
  Constraints. No actionable increment. Status stays blocked on wave19a-02.
- 2026-07-08 ClPcs-Mac-mini: re-checked upstream. wave19a-02 STILL not landed — `git log -- lib/fsrs/`
  shows the latest fsrs commit is wave19a-01's oracle-vectors tick (`1347b20`), no FSRS-6 engine port.
  Premises still unmet: `constants.ts` has NO FSRS-6 vector (`grep -c w20|0.212|0.1542` = 0);
  `retrievability.ts:12,19` still `FSRS_DECAY=-0.5`/`FSRS_FACTOR=19/81`; `reference-vectors.test.ts:117`
  still `describe.skip`. Standing Verify FAIL (Goal #5 grep) is a DIRECT consequence of the un-ported
  engine — resolving it IS wave19a-02's job; patching downstream is forbidden by the Constraints. No
  actionable increment. Status stays blocked on wave19a-02.
- 2026-07-08 ClPcs-Mac-mini: re-checked upstream. wave19a-02 STILL not landed — `git log -- lib/fsrs/`
  latest is wave19a-01's oracle-vectors tick (`1347b20`), no FSRS-6 engine port. Premises still unmet:
  `constants.ts` has NO FSRS-6 vector (`grep -c w20|0.212|0.1542` = 0). Standing Verify FAIL (Goal #5 grep
  hitting the FSRS-5 constants outside the oracle) is a DIRECT consequence of the un-ported engine —
  resolving it IS wave19a-02's job; patching downstream is forbidden by the Constraints. No actionable
  increment. Status stays blocked on wave19a-02.
- 2026-07-08 ClPcs-Mac-mini: re-checked upstream. wave19a-02 STILL not landed — `git log -- lib/fsrs/`
  latest is wave19a-01's oracle-vectors tick (`1347b20`), no FSRS-6 engine port. Premises still unmet:
  `constants.ts` has NO FSRS-6 vector (`grep -c w20|0.212|0.1542|0.2610` = 0);
  `retrievability.ts:12,19` still `FSRS_DECAY=-0.5`/`FSRS_FACTOR=19/81`; `reference-vectors.test.ts:117`
  still `describe.skip`. Standing Verify FAIL (Goal #5 grep hitting the FSRS-5 constants outside the
  oracle) is a DIRECT consequence of the un-ported engine — resolving it IS wave19a-02's job; patching
  downstream is forbidden by the Constraints. No actionable increment. Status stays blocked on wave19a-02.
- 2026-07-08 ClPcs-Mac-mini: re-checked upstream. wave19a-02 STILL not landed — `git log -- lib/fsrs/`
  latest is wave19a-01's oracle-vectors tick (`1347b20`), no FSRS-6 engine port. Premises still unmet:
  `constants.ts` has NO FSRS-6 vector (`grep -cE 'w20|0.212|0.1542|0.2610'` = 0). Standing Verify FAIL
  (Goal #5 grep hitting the FSRS-5 constants outside the oracle) is a DIRECT consequence of the un-ported
  engine — resolving it IS wave19a-02's job; patching downstream is forbidden by the Constraints. No
  actionable increment. Status stays blocked on wave19a-02.
- 2026-07-08 ClPcs-Mac-mini: re-checked upstream. wave19a-02 STILL not landed — `git log -- lib/fsrs/`
  latest is wave19a-01's oracle-vectors tick (`1347b20`), no FSRS-6 engine port. Premises still unmet:
  `constants.ts` has NO FSRS-6 vector (`grep -cE 'w20|0.212|0.1542|0.2610|w\[20\]'` = 0);
  `retrievability.ts` still exports `FSRS_DECAY=-0.5`/`FSRS_FACTOR=19/81`. Standing Verify FAIL (Goal #5
  grep hitting the FSRS-5 constants outside the oracle) is a DIRECT consequence of the un-ported engine —
  resolving it IS wave19a-02's job; patching downstream is forbidden by the Constraints. No actionable
  increment. Status stays blocked on wave19a-02.
- 2026-07-07 ClPcs-Mac-mini: UNBLOCKED — wave19a-02 landed (commits 26bf821, 9e7bb1a). Verified the
  engine is FSRS-6: `retrievability.ts` derives `FSRS_DECAY=-w20` and `FSRS_FACTOR=0.9^(1/DECAY)-1`;
  `reference-vectors.test.ts:116` is now a live `describe(` (un-skipped); `constants.ts` carries the
  21-weight vector. Ran the FULL downstream verification (single increment = fix the standing Verify
  FAIL). Results: typecheck exit 0; `npm test` 618 passed / 0 skipped (FSRS-6 oracle now runs & passes);
  `db:seed` OK; `test:integration` 59 files, 254 passed | 2 skipped (pre-existing) | 0 FAIL;
  `vitest list` includes both `srs-review.integration` + `review-sync.integration`; Goal-5 grep (the
  verify.sh form, excluding reference-vectors + CLAUDE.md) returns EMPTY; Goal-6 grep for engine
  re-derivation in consumers returns nothing (consumers `import { retrievability|schedule|… } from
  "@/lib/fsrs"`). MINIMAL FIX: re-worded the ONE stale comment in
  `lib/server/readiness-snapshot.integration.test.ts:161` that pinned the FSRS-5 formula
  `(1+(19/81)·…)^(-0.5)` → now states the relational invariant "R==0.9 at elapsed==stability (holds in
  FSRS-5/6 alike since DECAY & FACTOR share w20)". No assertion changed (the test only relies on the
  by-construction R==0.9 identity, preserved by the port) — NOT oracle tampering. Status → done.
- 2026-07-07 laptop: planned.
- 2026-07-07 ClPcs-Mac-mini: verify tick — confirmed this downstream-verify CANNOT proceed because its
  upstream dependency wave19a-02 (FSRS-6 engine port) is BLOCKED/parked and NEVER landed. Evidence:
  (a) `lib/fsrs/constants.ts` still holds the FSRS-5 19-weight vector (`grep -c 0.212` = 0, no FSRS-6
  vector); (b) `lib/fsrs/reference-vectors.test.ts:117` is still `describe.skip` → Goal #2's premise
  (unit suite RUNS the FSRS-6 oracle) is unmet; (c) Goal #5 grep `19 */ *81|DECAY *= *-0\.5|= *3\.173\b`
  (minus reference-vectors) still returns FSRS-5 magic constants in `lib/fsrs/retrievability.ts:12,19`
  (`FSRS_DECAY=-0.5`, `FSRS_FACTOR=19/81`), `lib/fsrs/retrievability.test.ts:53-55`,
  `lib/fsrs/CLAUDE.md:23-24,44`, and consumer `lib/server/readiness-snapshot.integration.test.ts:161`;
  (d) Goal #6 grep returned NOTHING (no consumer re-derives the engine formula — good, but moot until 02).
  Did NOT run the full unit/integration suites: they would verify the un-ported FSRS-5 engine, which
  cannot satisfy the FSRS-6 goals, and burn minutes without changing the conclusion. Did NOT delete the
  FSRS-5 constants / un-skip the oracle myself — that is wave19a-02's job (a dedicated fable-model
  numerical port with an evaluator); doing it here would be patching around the missing dependency.
  Action: set Status=blocked, waiting on wave19a-02.










## Verify
**Last verify:** PASS (2026-07-07T06:58:26Z)

## Evaluation
**Last evaluation:** PASS (2026-07-07T07:01:37Z)
