# Task: wave20-09-verify-wave

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** laptop

Whole-wave gate (spec Deliverable 8). Prove the wave lands green end-to-end and that the frozen
invariants are byte-untouched. Runs LAST, after tasks 01–08.

## Goal
PASS = ALL true:

1. `npm run -s typecheck` exits 0.
2. `npm run -s test` (pure unit set) exits 0, and includes the wave20 oracle/direction/veto files
   un-skipped — `lapse-adjust.oracle`, `guess-floor-direction`, and the confidence-veto census —
   proven via a `npx vitest list` token-retry capture (var capture + herestring grep; the full unit
   list is >64KB so grep via `<<<`, never `echo | grep -q`).
3. `npm run -s db:seed` THEN `npm run -s test:integration` exits 0 (seed BEFORE integration, per the
   self-heal ordering rule) — including `srs-review.integration.test.ts` (pin now `"fsrs6-bkt2"`) and
   the wave20 integration proof suite (0 tests left skipped by wave20 changes).
4. `npm run -s build` exits 0 (this project builds with `next build --webpack`).
5. If the LAN server (`:3100`) predates this wave's build, RESTART it (kill the `next-server`/`npm run
   start` tree on port 3100, relaunch `npm run start -- -H 0.0.0.0 -p 3100`) before auditing — the
   stale-server trap. Then `npm run -s audit:browser` (`"$DRIVER_BROWSER_CMD"`-driven) passes against
   the served app — no UI copy changed this wave, so the existing 14 assertions stand.
6. INVARIANTS BYTE-UNTOUCHED (asserted in verify.sh via `git diff --quiet <wave-base> -- <file>`):
   `lib/fsrs/reference-vectors.test.ts` (FSRS-6 golden vectors), `lib/readiness-release.oracle.test.ts`,
   and `lib/readiness-honesty.regression.test.ts` are UNCHANGED across the wave; `lib/fsrs/schedule.ts`,
   `lib/fsrs/retrievability.ts`, and the `FSRS_DEFAULT_WEIGHTS` vector in `lib/fsrs/constants.ts` are
   unchanged (the layer composes OUTSIDE `schedule()`).
7. `grep -Fq '"fsrs6-bkt2"'` in `lib/fsrs/constants.ts` AND `lib/server/srs-review.integration.test.ts`;
   no remaining `"fsrs6-bkt1"` in either. No `describe.skip`/`it.skip`/`.skip(` remains in
   `lib/fsrs/lapse-adjust.oracle.test.ts`.
8. NO migration was added this wave (`git diff --name-only <wave-base>` shows no new
   `prisma/migrations/*` dir) and `correct ⟺ grade≥2` readers (`lib/server/calibration.ts`,
   `lib/server/learning-health.ts`) are unchanged — the log-true-grade design needs no migration.

## Constraints / decisions
- `<wave-base>` = the commit before wave20 task 01 landed (resolve at run time, e.g. the tip of the
  `git log` line before the first `wave20` commit, or `git merge-base`); the diff gates compare against it.
- Do NOT fix failures from other tasks in place — if a wave20 task's deliverable is red, mark THIS task
  blocked on that owner and surface it; the verify task confirms, it does not implement.
- Integration ordering: `db:seed` BEFORE `test:integration` so accumulated rows from earlier browser
  audits can't flake the analytics/readiness suites (self-heal rule).
- Build is `next build --webpack` here (package.json), NOT the Turbopack default.

## Next
- [x] Run typecheck → unit (with collection checks) → db:seed → integration → build → restart :3100 →
      audit:browser; assert the byte-untouched invariants + engine-tag + no-migration gates.
- (none — whole-wave gate green; task done.)

## Log
- 2026-07-14 laptop: planned by the wave20 planner.
- 2026-07-14 ClPcs-Mac-mini: ran the whole-wave gate against base fbd6a52. typecheck exit 0;
  `npm run -s test` 71 files/759 tests pass; `npx vitest list` token-retry capture collects
  `lapse-adjust.oracle` + `guess-floor-direction` (+ confidence-veto census). `npm run -s db:seed`
  (2322 official Q) THEN `npm run -s test:integration` 66 files/279 tests pass. `npm run -s build`
  (webpack) exit 0. Fast gates: engine tag `"fsrs6-bkt2"` present in constants.ts + srs-review
  integration test, no `"fsrs6-bkt1"`, no skip in lapse-adjust.oracle.test.ts; byte-untouched
  invariants (reference-vectors.test, readiness-release.oracle, readiness-honesty.regression,
  schedule.ts, retrievability.ts, FSRS_DEFAULT_WEIGHTS) all unchanged; 0 new migrations;
  calibration.ts + learning-health.ts readers unchanged. :3100 LAN server was stale (boot 02:33
  < build 06:14 UTC) → killed pid 80692/80708, relaunched `npm run start -- -H 0.0.0.0 -p 3100`
  (Ready in 88ms, 200 on http://100.110.64.90:3100). `npm run -s audit:browser` = 82 passed, 0
  failed. Whole wave green → Status: done.

## Verify
**Last verify:** PASS (2026-07-14T06:25:12Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T06:29:08Z)
