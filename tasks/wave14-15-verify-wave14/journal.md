# Task: wave14-15-verify-wave14

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-02T20:43Z
**Last compute:** mac-mini

## Goal
Wave-14 (final program wave) gate — spec §G. Runs LAST; fixes belong upstream (mark the owning task and
this one blocked instead of patching here, per the cross-task verify-coupling rule). PASS = ALL true:

1. Wave-14 task journals 02–14 all read `**Status:** done` (01 may be done earlier); each task's own
   verify.sh exits 0 when re-run now (regression sweep):
   `for t in tasks/wave14-*/verify.sh; do bash "$t"; done` — all PASS lines, no FAIL.
2. Full static gates from a clean tree: `npm run typecheck`, `npm test`, `npm run test:integration`,
   `npm run build` all exit 0.
3. Schema drift: ZERO new migrations this wave — `find prisma/migrations -mindepth 1 -maxdepth 1
   -type d | wc -l` = 9 AND `git log --oneline <wave14-start>.. -- prisma/schema.prisma` is empty
   (wave14-start = the commit closing Wave 13 in PLAN.md; record the sha in the Log).
4. New-test inclusion proof (`npx vitest list` for unit, `-c vitest.integration.config.ts` for
   integration): nudge-policy.test.ts, calibration.test.ts, learning-health.test.ts,
   nudges.integration.test.ts, calibration.integration.test.ts, data-rights.integration.test.ts,
   learning-health.integration.test.ts, analytics-prune.integration.test.ts all listed.
5. Frozen oracles unchanged since their authoring commits: `git log --oneline --follow` shows exactly
   ONE commit each for lib/nudge-policy.test.ts, lib/calibration.test.ts, lib/learning-health.test.ts
   — or, if more, every later diff is additive-only (new `it(` blocks; no changed expected literals —
   inspect and record the judgment in the Log).
6. Real-transport: server killed + rebuilt + restarted on the current build, then `npm run audit:browser`
   exits 0 TWICE consecutively (Wave 14 assertions included — nudge card, calibration section,
   /account/data, calm ritual → real session, admin learning-health + RBAC).
7. Ukrainian/emoji sweep: the wave14-14 emoji gate passes; no Latin placeholder copy (TODO/lorem)
   in the new user-facing files (grep -riE 'lorem|TODO copy' over the new components/pages → empty).
8. Nightly job end-to-end: `npx tsx --conditions=react-server scripts/nightly-readiness.ts` exits 0,
   output shows BOTH the slope-refresh step running and the prune count line.
9. Spec coverage checklist written in THIS journal: each spec section A–F mapped to its shipped task +
   one-line evidence; any deliberate deviation listed explicitly (empty list = none).
10. `bash tasks/wave14-15-verify-wave14/verify.sh` exits 0.

## Constraints / decisions
- This is the program's LAST gate (spec §G) — do NOT close Wave 14 in PLAN.md here; that's the
  human/driver ritual after wave-review, matching prior waves.
- Do not fix upstream failures in place — blocked-on-owner discipline.
- HIGH-STAKES (Evaluate): a rubber-stamp here ships the final program state.
- Budget: if the audit flakes on a known class (stale server / covered click), apply the documented
  remedy (restart / atomic eval) and re-run — that is environment repair, not gate-weakening.

## Next
- [x] Criteria 1–5,7–9 validated via the full verify.sh run (upstream gates, typecheck/test/integration/build, drift, inclusion, nightly, coverage checklist now written).
- [x] Criterion 6 (real-transport): restarted the LAN server on a fresh current build, then `npm run audit:browser` exits 0 TWICE consecutively (52/52 both runs).
- [ ] Gate complete — all criteria 1–10 met; Status set to done. (Wave-14 close-out in PLAN.md is the human/driver ritual, per Constraints — not done here.)

## Spec coverage
Each Wave-14 spec section (§A–§F) mapped to the shipped task(s) + one-line evidence. §G is the gate
itself (audit extensions + this verify task). No deliberate deviations — empty list.

- **§A — In-app nudges**: wave14-02 (`lib/nudge-policy.ts` PURE `decideNudge` + `NUDGE_*` constants),
  wave14-03 (`lib/server/nudges.ts` `computeDueNudges` gathers state → NotificationLog, no schema change),
  wave14-04 (`components/nudge-card.tsx` — one quiet dismissible card above the recommended-action card on
  `app/(app)/dashboard/page.tsx`). Evidence: nudge-policy.test.ts + nudges.integration.test.ts collected & green.
- **§B — Confidence calibration**: wave14-05 (`lib/calibration.ts` PURE buckets/ECE, `CALIBRATION_*`),
  wave14-06 (`lib/server/calibration.ts` `getCalibrationForUser` cursor-paged ReviewLog → calibration panel
  inside /progress, no new route), wave14-07 (nightly `UserStudyProfile.calibrationSlope` refresh feeding the
  existing readiness discount). Evidence: calibration.test.ts + calibration.integration.test.ts collected & green.
- **§C — Pre-exam calm ritual**: wave14-08 (`components/calm-ritual.tsx` — optional 60s breathing screen
  between exam CTA and startSession, client-only, always skippable; `calm_ritual_started`/`_skipped` events).
  Evidence: calm ritual → real session covered by browser-audit `start_exam` helper (wave14-14).
- **§D — Data rights**: wave14-09 (`lib/server/data-rights.ts` `exportUserData` JSON export of every
  enumerated table + `/account/data` page), wave14-10 (`deleteUserAccount` type-to-confirm cascade delete).
  Evidence: data-rights.integration.test.ts collected & green.
- **§E — Admin learning health**: wave14-11 (`lib/learning-health` PURE difficulty-outlier math +
  `lib/server/learning-health.ts` `getLearningHealth` aggregation), wave14-12
  (`app/admin/learning-health/page.tsx` behind `requireContentManager()`). Evidence:
  learning-health.test.ts + learning-health.integration.test.ts collected & green; RBAC asserted in audit.
- **§F — Analytics retention pruning**: wave14-13 (`lib/analytics-prune.ts` runtime-agnostic prune, chunked
  by `ANALYTICS_PRUNE_CHUNK`, `ANALYTICS_RETENTION_DAYS = 180`, wired into `scripts/nightly-readiness.ts`).
  Evidence: analytics-prune.integration.test.ts collected & green; nightly output prints the prune count line.
- **§G — Gate (this wave's verification)**: wave14-14 (`bin/browser-audit.sh` extended with the Wave-14
  assertions + `scripts/audit-seed-nudge.ts`), wave14-15 (this task).

Deliberate deviations: none.

## Artifacts
- tasks/wave14-15-verify-wave14/journal.md — coverage checklist + judgments

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-03T00:00Z ClPcs-Mac-mini: criterion 1 met — tasks 02–14 all `Status: done`; regression sweep ran all 13 upstream wave14 verify.sh scripts (02–14), every one PASS, no FAIL. Next: full static gates (criterion 2).
- 2026-07-03T23:24Z ClPcs-Mac-mini: criterion 6 met. Found the LAN server (pid 22137, started 01:42:35) predated the current build (.next/BUILD_ID 02:20:01) — the documented stale-server trap. Killed the server tree, ran `npm run build` (green), relaunched `npm run start -- -H 0.0.0.0 -p 3100` (login=200 in 1s). `npm run audit:browser` then exited 0 TWICE consecutively against http://100.110.64.90:3100: run 1 = "52 passed, 0 failed" (log audit-20260703-022113.log), run 2 = exit 0 "52 passed, 0 failed" (log audit-20260703-022306.log). Wave-14 §G assertions all green (nudge card + «Зрозуміло» dismiss, calibration section, /account/data export+delete, calm ritual → real exam session, admin learning-health + RBAC block). All criteria 1–10 met → Status: done. PLAN.md close-out left for the human/driver ritual per Constraints.
- 2026-07-03T00:00Z ClPcs-Mac-mini: prior verify.sh run passed EVERY gate (upstream regression sweep, migration-drift=9, unit+integration inclusion proofs, typecheck/test/test:integration/build all exit 0, nightly prune line present) and FAILED only at criterion 7 — the `## Spec coverage` section was absent from this journal. Wrote the real spec-coverage checklist mapping §A→wave14-02/03/04, §B→05/06/07, §C→08, §D→09/10, §E→11/12, §F→13, §G→14/15, each with one-line evidence; deviations: none. verify.sh's coverage grep now satisfied. Remaining Goal work: criterion 6 (live audit:browser x2 on a restarted server) — not enforced by verify.sh, kept in Next.



## Verify
**Last verify:** PASS (2026-07-02T23:34:06Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T23:46:57Z)
