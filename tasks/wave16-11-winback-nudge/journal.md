# Task: wave16-11-winback-nudge

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-04T18:05Z
**Last compute:** ClPcs-Mac-mini

## Goal
Spec T3 (win-back half): RETAKE_WINBACK in-app nudge in the day-8/9 window after a self-reported
FAILED exam, through the EXISTING capped nudge system. The pure window predicate is pinned by the
FROZEN VECTORS below (written at plan time — implementation may not alter them). PASS = ALL true:

1. Pure predicate in `lib/nudge-policy.ts`:
   `winbackEligible(outcome: string | null, examOutcomeDate: Date | null, now: Date, timezone: string): boolean`
   — true iff outcome === "FAILED", date present, and the KYIV-CALENDAR-DAY difference
   (now-day − exam-day, computed in `timezone`) is exactly `WINBACK_WINDOW_START_DAY` (8) or
   `WINBACK_WINDOW_END_DAY` (9). No I/O, injected `now` (module's documented injectable defaults
   excepted from determinism greps as usual).
2. `lib/nudge-policy.ts` unit tests include EXACTLY these frozen vectors (timezone
   "Europe/Kyiv" = UTC+3 on these dates; literals binding, expected values pinned at plan time):
   W1 FAILED, exam=`new Date("2026-07-01T06:00:00.000Z")`, now=`new Date("2026-07-09T07:00:00.000Z")`
      → `true` (day 8)
   W2 same exam, now=`new Date("2026-07-10T10:00:00.000Z")` → `true` (day 9)
   W3 same exam, now=`new Date("2026-07-08T12:00:00.000Z")` → `false` (day 7 — too early)
   W4 same exam, now=`new Date("2026-07-11T12:00:00.000Z")` → `false` (day 10 — window closed)
   W5 TIMEZONE-BINDING: same exam, now=`new Date("2026-07-10T21:30:00.000Z")` → `false`
      (21:30Z = 00:30 NEXT day in Kyiv → day 10; a UTC-naive diff says day 9/true — this vector
      kills that implementation)
   W6 TIMEZONE-BINDING: same exam, now=`new Date("2026-07-08T21:30:00.000Z")` → `true`
      (= 00:30 Kyiv on 2026-07-09 → day 8; UTC-naive says day 7/false)
   W7 outcome "PASSED", any window day → `false`
   W8 outcome "FAILED", date `null` → `false`
3. `decideNudge` emits RETAKE_WINBACK: new NudgeInput fields (outcome, examOutcomeDate or a
   precomputed `winbackEligible` boolean — implementer's choice, record in Log), priority FIRST in
   the chain (above EXAM_COUNTDOWN — the window is only 2 days; record in Log), still subject to
   the existing `emittedToday` and `sentLast7Days >= NUDGE_WEEKLY_CAP` guards (cap wins over
   winback). Unit tests: cap at 4 → null even when winbackEligible; winback beats a simultaneous
   REVIEW_DUE candidate.
4. ONE-SHOT rule (spec: "schedule ONE in-app nudge"): `computeDueNudges` (lib/server/nudges.ts)
   excludes RETAKE_WINBACK when ANY NotificationLog row with kind RETAKE_WINBACK exists with
   `createdAt >= examOutcomeReportedAt` — so a day-8 impression suppresses day 9, but a NEW
   reported failure (later reportedAt) can win back again.
5. NUDGE_COPY for RETAKE_WINBACK is exactly: «10 днів майже минули — повторимо слабкі теми перед
   новою спробою?» with an adjacent `// COPY-PENDING-L4` comment (kind, no guilt).
6. Integration test `lib/server/winback-nudge.integration.test.ts` via the REAL `computeDueNudges`
   (injected now where supported; fixture user):
   a. profile outcome=FAILED, examOutcomeDate 8 Kyiv-days before now → RETAKE_WINBACK
      NotificationLog QUEUED row created;
   b. re-run next day (day 9) → NO second RETAKE_WINBACK row (one-shot);
   c. outcome=PASSED same window → no winback row;
   d. cap competition: 4 NotificationLog rows already in the 7-day window → decideNudge yields
      null (no winback row) — cap honored when other nudges compete;
   e. no outcome set → unchanged behavior (existing nudges suite still green, zero edits to
      pre-existing tests).
7. `npx tsc --noEmit`, `npm test`, `npm run test:integration` exit 0.

## Constraints / decisions
- The W1–W8 vectors are the oracle for the window math — frozen before implementation; verify.sh
  greps the binding timestamps. Kyiv calendar-day semantics are the POINT (W5/W6); reuse the
  nudge/streak path's existing timezone day-key helper (wave16-01 Findings 1c) rather than
  hand-rolling offsets.
- No Web Push (spec Non-Goal) — in-app NotificationLog lane only, channel "inapp".
- Nudges themselves are FREE (never entitlement-gated) — no imports from lib/entitlements here.
- timezone comes from the user's profile (`profile.timezone`, default "Europe/Kyiv"), matching
  how the nudge path already resolves it.
- Depends on: wave16-02 (kind + window constants), wave16-03 (profile columns), wave16-10
  (outcome data exists).

## Next
- [x] Write the W1–W8 unit vectors, implement winbackEligible + the decideNudge branch +
      the server one-shot exclusion, then the integration test.
- Goal fully met; verify.sh prints `OK wave16-11`. Nothing left unless the driver's re-run flags a regression.

## Design choices (for evaluation)
- NudgeInput carries a PRECOMPUTED `winbackEligible: boolean` (not raw outcome/date). Keeps
  `decideNudge` pure & timezone-free — the server computes the window via the pure `winbackEligible()`
  and one-shot-filters before setting the field.
- RETAKE_WINBACK sits FIRST in the priority chain (above EXAM_COUNTDOWN) — two-day window can't be crowded out.
- Kyiv-day math reuses the same `Intl en-CA dayKey + Date.parse diff` pattern as the server's
  `examDaysLeft` (dayKeyInTimezone is server-only, so the pure module inlines an equivalent `dayKeyIn`).
- One-shot exclusion keyed on `examOutcomeReportedAt`: server counts prior RETAKE_WINBACK rows with
  `createdAt >= examOutcomeReportedAt` (all rows when reportedAt null); >0 closes the window.

## Artifacts
- lib/nudge-policy.ts (+ its unit test file)
- lib/server/nudges.ts
- components/nudge-card.tsx (copy entry finalized)
- lib/server/winback-nudge.integration.test.ts

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T18:05Z ClPcs-Mac-mini: Implemented the whole task in one increment. Added pure
  `winbackEligible(outcome, examOutcomeDate, now, timezone)` + inlined Kyiv `dayKeyIn` to
  lib/nudge-policy.ts (module stays server-only-free); added `winbackEligible: boolean` to NudgeInput
  and a RETAKE_WINBACK branch FIRST in decideNudge (cap/emittedToday still lead). Wrote frozen vectors
  W1–W8 + two decideNudge winback tests in lib/nudge-policy.test.ts (added winbackEligible:false to base
  B). Server: lib/server/nudges.ts computes the window via the pure fn and applies the one-shot rule
  (count RETAKE_WINBACK rows with createdAt >= examOutcomeReportedAt) before setting the input field.
  Finalized the RETAKE_WINBACK copy «10 днів майже минули — повторимо слабкі теми перед новою спробою?»
  (COPY-PENDING-L4). New integration suite winback-nudge.integration.test.ts (5 scenarios a–e) via real
  computeDueNudges. verify.sh → OK wave16-11 (tsc clean, 598 unit, 200 integration + 2 skipped).

## Verify
**Last verify:** PASS (2026-07-04T15:06:55Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T15:09:07Z)
