# Task: wave19b-11-verify-wave19b

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-12
**Last compute:** ClPcs-Mac-mini

WHOLE-WAVE VERIFY GATE for Wave 19b (readiness dial honesty + grade-inference redesign). Runs LAST, after
tasks 01–10 are done. Confirms all four deliverables landed together, the full suite + build are green, the
FSRS-6 regression held, and the dial is measurably more honest. Does NOT implement features — it only verifies
and records the wave summary.

## Goal
PASS = ALL true:

1. `npm run -s typecheck` exits 0.
2. `npm run -s test` exits 0 AND these unit oracle suites are collected (retry-until-token `npx vitest list`,
   herestring grep): `readiness-correlation`, `grade-posterior`, `readiness-model`, `reference-vectors`,
   `exam-blueprint` (unit), `content-key`.
3. `npm run -s db:seed` then `npm run -s test:integration` exits 0 with the blueprint + readiness-snapshot
   suites RUNNING (not skipped) — `exam-blueprint.integration` collected via
   `npx vitest list -c vitest.integration.config.ts`.
4. `npm run -s build` exits 0.
5. DELIVERABLE #1 (beta-binomial): `lib/readiness-correlation.ts` exists + exported; `READINESS_TOPIC_CORRELATION`
   in constants; `recomputeReadiness` passes `topicCorrelation`; snapshot `inputsJson` records `rho` + engine
   tag `fsrs6` (grep the server file).
6. DELIVERABLE #2 (grade BKT): `gradePosterior` exported from `lib/fsrs/grade.ts`; `deriveGrade` takes
   `priorKnow`; `lib/server/study.ts` passes `priorKnow`; `FSRS_GUESS_DEFAULT`/`FSRS_SLIP` in fsrs constants;
   grade.ts header documents forward-only (no retro-rewrite). FSRS-6 `reference-vectors` green (part of #2).
7. DELIVERABLE #3 (bucketing): `sectionFromQuestionKey` exported from `lib/content-key.ts`;
   `groupCandidatesByBlock` body contains no `displayOrder`/`SECTION_DISPLAY_ORDER_OFFSET`; both server callers
   (`mastery-readiness.ts`, `test-engine.ts`) use `sectionFromQuestionKey`.
8. DELIVERABLE #4 (constants + copy): no independent second `= 20` literal for the readiness-min threshold;
   `components/readiness-dial.tsx` contains «не гарантія» on a single line with «не ».
9. BROWSER (via `"$DRIVER_BROWSER_CMD"` against the LAN audit origin, per CLAUDE.md): `npm run -s audit:browser`
   exits 0 (login persists, start-test, auth-guard, RBAC, admin reachable) — the wave's server/UI changes did
   not regress the real transport. (Restart the stale LAN `next start` against the fresh build first if a new
   route/page 404s — legit env setup, see CLAUDE.md stale-server trap.)
10. `CLAUDE.md` Learnings updated with any Wave-19b hard-won lessons (beta-binomial ρ=0 anchor, BKT posterior
    mapping, questionKey-section bucketing drift) — at most the agent-learnings cap; prune if over.

## Constraints / decisions
- This task fixes NOTHING in feature code. If a criterion fails, mark the OWNING task (01–10) blocked/reopened
  and stop — do not patch across task boundaries here (cross-task verify coupling rule, CLAUDE.md).
- Integration ordering: `db:seed` BEFORE `test:integration` (self-heal against accumulated audit rows).
- Stale-server: the LAN audit hits a long-lived `next start` that does NOT hot-reload — rebuild + restart it
  before the browser audit if any route changed; diagnose 404-vs-307 with curl.
- **Evaluate: yes** — this is the wave's honesty gate; an independent evaluator should confirm the done-claim.

## Next
- [x] Run typecheck + test + (db:seed → test:integration) + build; grep the per-deliverable landing checks;
      run audit:browser; update CLAUDE.md learnings; record the wave summary.
- Wave 19b verified GREEN — nothing outstanding. (If a future re-run reopens: re-run verify.sh; restart the
  stale LAN `next start` against the fresh build before audit:browser.)

## Wave 19b summary (all green 2026-07-12)
- typecheck 0 · unit test 61 files / 668 tests 0 · integration 63 files / 267 tests 0 · build 0 · audit:browser
  82 passed / 0 failed.
- Deliverable #1 beta-binomial: `lib/readiness-correlation.ts` + `READINESS_TOPIC_CORRELATION=0.35`;
  `recomputeReadiness` wires `topicCorrelation`, snapshot `inputsJson` records `rho` + `fsrs6` engine tag.
- Deliverable #2 grade BKT: `gradePosterior` exported; `deriveGrade`/`study.ts` thread `priorKnow`;
  `FSRS_GUESS_DEFAULT`/`FSRS_SLIP`; grade.ts documents forward-only (no retro-rewrite). `reference-vectors` green.
- Deliverable #3 bucketing: `sectionFromQuestionKey` exported from `lib/content-key.ts`;
  `groupCandidatesByBlock` body free of `displayOrder`; both server callers route through the section helper.
  `exam-blueprint.integration` collected + RUNNING (not skipped).
- Deliverable #4 constants+copy: no redundant `= 20` literal; readiness-dial «не гарантія» disclaimer present.
- Unit oracle suites collected: readiness-correlation, grade-posterior, readiness-model, reference-vectors,
  exam-blueprint, content-key.

## Log
- 2026-07-12 laptop: planned. Depends on tasks 01–10. FSRS-6 reference-vector regression + blueprint
  integration un-skip + dial-lowered direction are the load-bearing whole-wave checks.
- 2026-07-12 ClPcs-Mac-mini: ran the full gate. All per-deliverable greps pass (#1–#4). typecheck 0; unit
  test 0 (61 files/668) + all 6 oracle suites collected; db:seed 0 (2322 official Qs) → test:integration 0
  (63 files/267) with exam-blueprint.integration collected+running; build 0. Restarted the stale LAN
  next-server (booted 17:03 vs build 19:30) against the fresh build, then audit:browser 82/0. Extended the
  wave19a-05 numerics learning with the beta-binomial ρ=0 anchor + BKT grade-posterior lessons (kept bullet
  count flat). Set Status: done.

## Verify
**Last verify:** PASS (2026-07-12T16:41:50Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T16:50:18Z)
