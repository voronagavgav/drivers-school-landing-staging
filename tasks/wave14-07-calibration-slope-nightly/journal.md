# Task: wave14-07-calibration-slope-nightly

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-03T00:31Z
**Last compute:** mac-mini

## Goal
Nightly `UserStudyProfile.calibrationSlope` refresh from the same calibration buckets (spec §B tail),
feeding the EXISTING readiness discount (`recomputeReadiness` already reads
`profile.calibrationSlope` — lib/server/mastery-readiness.ts:191-193; no readiness code change
expected). PASS = ALL true:

1. `lib/server/calibration.ts` (from wave14-06) additionally exports
   `refreshCalibrationSlope(userId: string, tx: Prisma.TransactionClient = prisma): Promise<number | null>`:
   computes the calibration result (same chunked read + `correct = grade >= 2` mapping) and
   - sufficient → writes `{ calibrationSlope: result.slope }` to the user's UserStudyProfile
     (get-or-create per house pattern) and returns the slope;
   - insufficient → leaves any EXISTING slope value untouched (never nulls out learned data on a
     quiet week) and returns null.
2. `scripts/nightly-readiness.ts` calls `refreshCalibrationSlope(user.id, prisma)` for each paged user
   BEFORE that user's `recomputeReadiness` call (so tonight's snapshot uses tonight's slope), reusing
   the script's existing standalone-client/CHUNK/paging structure — same launcher, no new flags.
3. Integration test (extend `lib/server/calibration.integration.test.ts`):
   a. User seeded with oracle-G2-shaped ReviewLogs (conf3 10 rows grade≥2 ×3 / grade1 ×7; conf4
      10 rows ×4 correct) → refreshCalibrationSlope returns 0.6 and the profile row stores 0.6
      (expected literal 0.6 — the plan-time clamp oracle).
   b. Re-run on unchanged data → same value, still one profile row (idempotent).
   c. User with 19 sampled rows and a pre-set calibrationSlope 0.8 → returns null AND the stored
      slope stays 0.8.
   d. PRODUCTION-PATH link: after (a), `recomputeReadiness(userId, categoryId, prisma, now)` writes a
      ReadinessSnapshot whose `calibrationSlope` field = 0.6 (proves the discount actually flows —
      the snapshot column mirrors the profile input).
4. `npx tsx --conditions=react-server scripts/nightly-readiness.ts` (or the script's documented dry
   flag if it has one, per wave14-01 finding 1i) exits 0 against the seeded dev DB.
5. `npm run test:integration` exits 0; `npm test` exits 0; `npm run typecheck` exits 0.
6. `lib/calibration.test.ts` UNCHANGED (frozen oracle). No schema/migration change.
7. `bash tasks/wave14-07-calibration-slope-nightly/verify.sh` exits 0.

## Constraints / decisions
- recomputeReadiness's parameterization already exists — this task ONLY populates the profile field.
  If wiring turns out missing (contra the plan-time reading), STOP and mark blocked rather than
  redesigning readiness here.
- Insufficient data preserves the existing slope (pinned) — a learner who pauses confidence sampling
  keeps their learned discount; document in a code comment.
- HIGH-STAKES (Evaluate): a slope bug silently skews every user's readiness dial — the honesty
  centerpiece.
- tx-param default follows the house `Prisma.TransactionClient = prisma` composition idiom.

## Next
- [x] Read wave14-06 result + finding 1i; add refreshCalibrationSlope; wire into the nightly script.
- Goal fully met; verify.sh PASS. Nothing outstanding.

## Artifacts
- lib/server/calibration.ts (slope refresh), scripts/nightly-readiness.ts (new step)

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-03T00:31Z ClPcs-Mac-mini driver: added `refreshCalibrationSlope(userId, tx=prisma)` to
  lib/server/calibration.ts (extracted a shared `loadCalibrationRows(userId, tx)` chunked scan reused
  by both `getCalibrationForUser` and the refresh; upserts `calibrationSlope` on sufficient data,
  no-op returning null on insufficient so existing slope is preserved). Wired the call into
  scripts/nightly-readiness.ts per-user loop BEFORE recomputeReadiness. Extended
  calibration.integration.test.ts with the G2 slope oracle (conf3 10/3, conf4 10/4 → raw 7/17 clamps
  to 0.6): write-to-profile (a), idempotent one-row (b), preserve-0.8-on-insufficient (c),
  ReadinessSnapshot.calibrationSlope=0.6 production-path (d). typecheck + npm test (548) +
  test:integration (136/2 skip) + nightly script exit 0 + verify.sh all PASS. Set Status: done.

## Verify
**Last verify:** PASS (2026-07-02T21:32:30Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T21:34:21Z)
