# Task: wave14-03-server-nudges

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-03T00:10Z
**Last compute:** mac-mini

## Goal
Server orchestration for in-app nudges (spec §A): `lib/server/nudges.ts` gathers state, calls the PURE
`decideNudge` (wave14-02 — do NOT edit its tests), persists via NotificationLog. NO schema change (the
model already has kind/channel/status/dedupeKey). PASS = ALL true:

1. `lib/server/nudges.ts` exports:
   - `computeDueNudges(userId: string, now: Date = new Date()): Promise<NudgeCard | null>` where
     `NudgeCard = { id: string; kind: NudgeKind }` — decides AND persists (details below), returning
     the nudge to render today, or null.
   - `dismissNudge(userId: string, id: string, now?: Date): Promise<void>` — sets
     `status: "SENT", sentAt: now` on the row iff it belongs to userId (scope the update where clause
     by BOTH id and userId — never trust the id alone).
2. computeDueNudges behavior (pin):
   a. If a NotificationLog row for this user with `channel:"inapp"`, `status:"QUEUED"` and today's
      dedupeKey day already exists → return it (idempotent re-render, "the day's nudge").
   b. Builds NudgeInput from: `countDueReviews` (lib/server/study.ts), `profile.examDate` →
      examDaysLeft = whole calendar days from `now` to examDate in the profile timezone (null if
      unset; 0 = exam today), streak fields + yesterday/today StudyDay rows (goalMet/reviewCount),
      the TWO most recent ReadinessSnapshots (prev/curr dialPercent; sufficientData per wave14-01
      findings), rolling `sentLast7Days` = count of rows with `status:"SENT"` and `sentAt >= now-7d`,
      `emittedToday` = any row (any status) whose dedupeKey ends with today's `:<day>:<userId>` shape
      (query by the exact dedupeKeys of the four kinds for today — indexable, no LIKE),
      and the user's UserSettings notif toggles (defaults if no row).
   c. On a non-null decision: `create` the NotificationLog row `{ kind, channel: "inapp",
      status: "QUEUED", dedupeKey }`; on the unique-violation race (P2002 on dedupeKey) fall back to
      reading the existing row — never throws to the page.
   d. All multi-row reads bounded (`take` ≤ 200); no `in` lists near the P2029 cap.
3. Integration test `lib/server/nudges.integration.test.ts` (self-provisioned fixtures per house
   pattern, FK-safe cleanup; justification for direct-call: the real entry is a server-page call that
   vitest can't render — the browser audit task wave14-14 covers the page path):
   a. User with ≥1 due ReviewState (dueAt in the past) → computeDueNudges returns kind REVIEW_DUE and a
      NotificationLog row exists with dedupeKey `"REVIEW_DUE:" + day + ":" + userId` (concat, not the
      helper), status QUEUED, channel inapp.
   b. Second call same day → SAME row id (no duplicate), still one row for that dedupeKey.
   c. dismissNudge → row status SENT + sentAt set; a third computeDueNudges call the same day returns
      null (emittedToday suppressor — never re-shown same day).
   d. With 4 SENT rows inside the last 7 days (seeded directly) → computeDueNudges returns null (cap).
   e. `notifReviewDue: false` in UserSettings → null despite due reviews.
   f. dismissNudge with user B's id on user A's row → row unchanged (cross-user scope).
4. `npm run test:integration` exits 0; `npm test` exits 0; `npm run typecheck` exits 0.
5. `lib/nudge-policy.test.ts` is UNCHANGED (`git diff --name-only` clean of it — oracle protection).
6. No schema.prisma edit, no new migration dir (count stays 9).
7. `bash tasks/wave14-03-server-nudges/verify.sh` exits 0.

## Constraints / decisions
- Status lifecycle pinned: created QUEUED (visible card) → dismissed SENT+sentAt. The ≤4/7d cap counts
  SENT rows (spec letter); the one-per-day rule counts ANY today row via emittedToday. A never-dismissed
  QUEUED row still blocks new nudges that day (a) and is simply the card shown.
- The decision logic itself stays in lib/nudge-policy.ts — this module ONLY gathers state + persists.
  If a rule needs changing, that's wave14-02 territory (but its oracle vectors are frozen).
- Day key derivation follows the existing streak convention (profile.timezone, "YYYY-MM-DD" — see
  finalizeSession/bumpStudyDay); reuse the existing helper if one is exported, else mirror it.
- No nudge writes inside any $transaction on hot paths — computeDueNudges is called from the dashboard
  page render only.
- HIGH-STAKES (Evaluate): engagement caps are a tone-law promise (≤4/week, ≤1/day) — a counting bug
  spams users; a scoping bug leaks cross-user rows.

## Next
- [x] Read wave14-01 Findings (1a–1c), then implement lib/server/nudges.ts against the pinned lifecycle.
- Goal met: `lib/server/nudges.ts` (computeDueNudges + dismissNudge) + 6-case integration suite green;
  verify.sh PASS. Downstream: wave14-04 consumes `NudgeCard`/`computeDueNudges`/`dismissNudge`.

## Artifacts
- lib/server/nudges.ts, lib/server/nudges.integration.test.ts

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-03T00:10Z ClPcs-Mac-mini driver: implemented lib/server/nudges.ts — `computeDueNudges`
  gathers state (getOrCreateProfile tz/examDate/streak, countDueReviews via user.selectedCategoryId,
  today/yesterday StudyDay, two latest ReadinessSnapshots→dialPercent+inputsJson.sufficientData,
  UserSettings notif toggles w/ @default(true) fallbacks, rolling SENT count in NUDGE_WINDOW_DAYS,
  emittedToday via the four exact today dedupeKeys — no LIKE), calls pure `decideNudge`, persists a
  `{channel:"inapp",status:"QUEUED",dedupeKey}` row (P2002 race → read-back), returns null otherwise.
  Idempotent re-render returns the existing QUEUED row. `dismissNudge` = updateMany scoped by BOTH
  id+userId → SENT+sentAt. Wrote lib/server/nudges.integration.test.ts (6 cases a–f, self-provisioned
  fixtures via createOfficialQuestion, FK-safe cleanup). typecheck + npm test (542) + test:integration
  (130/2-skip) + full verify.sh all green (PASS wave14-03). Status: done.

## Verify
**Last verify:** PASS (2026-07-02T21:11:42Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T21:13:14Z)
