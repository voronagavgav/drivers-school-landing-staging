# Task: wave14-09-account-data-export

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-03T00:52Z
**Last compute:** ClPcs-Mac-mini

## Goal
Data rights, part 1 (spec §D): `/account/data` page + JSON export of the user's OWN data. PASS = ALL true:

1. `lib/server/data-rights.ts` exports `exportUserData(userId: string): Promise<UserDataExport>` that
   returns a JSON-serializable object with a top-level key for EVERY enumerated table (exact key names
   pinned): `user`, `userStudyProfile`, `studyDays`, `reviewStates`, `reviewLogs`, `topicMasteries`,
   `readinessSnapshots`, `testSessions` (each session embedding its `answers` and `questions` join
   rows), `userMistakes`, `savedQuestions`, `userSettings`, `notificationLog`, plus
   `exportedAt` (ISO) and `format: "drivers-school-export-v1"`.
   - `user` contains ONLY safe scalars: id, email, name, role, createdAt, selectedCategoryId — NEVER
     passwordHash / tokenVersion (grep-gated).
   - Every multi-row read is chunked/cursor-paged with `take` ≤ 200; TestAnswer/TestSessionQuestion are
     read via their sessions' ids in `in`-chunks ≤ 200 (P2029 guard).
   - Zero cross-user data: every where clause scopes by userId (or session ids derived from it).
2. Page `app/(app)/account/data/page.tsx` renders BOTH actions («Завантажити мої дані» download form +
   the delete affordance placeholder/link that wave14-10 completes) and the two pinned notes:
   - AnalyticsEvent exclusion: «Знеособлена продуктова телеметрія не входить до експорту» (+ one plain
     sentence why: it is pseudonymous, not keyed to the account);
   - offline note: «Дані офлайн-режиму зберігаються лише на вашому пристрої».
   `/account` links to `/account/data` («Мої дані»).
3. Download is a REAL route the browser can hit: `app/(app)/account/data/export/route.ts` (GET,
   `requireUser()`-guarded) responding `Content-Type: application/json` +
   `Content-Disposition: attachment; filename="drivers-school-export.json"` with the exportUserData
   body. (Route handler chosen over a server action because a server action cannot stream a file
   download response.)
4. Integration test `lib/server/data-rights.integration.test.ts`, production-path where possible (call
   the exported GET with a NextRequest + partial-mocked `@/lib/auth`, per the /api/track house
   pattern):
   a. Fixture user A with ≥1 row seeded in EVERY enumerated table (profile, StudyDay, ReviewState,
      ReviewLog, TopicMastery, ReadinessSnapshot, TestSession+TestAnswer+TestSessionQuestion,
      UserMistake, SavedQuestion, UserSettings, NotificationLog) → the response JSON contains each
      seeded row's id under its pinned key (assert per-table).
   b. Fixture user B's rows: NONE of B's ids appear ANYWHERE in A's serialized export (stringify +
      includes check).
   c. The serialized export does NOT contain A's passwordHash value nor the substring
      "passwordHash".
   d. GET unauthenticated → non-200 (redirect/401 per requireUser behavior).
5. `npm run test:integration`, `npm test`, `npm run typecheck`, `npm run build` all exit 0.
6. No schema/migration change. `bash tasks/wave14-09-account-data-export/verify.sh` exits 0.

## Constraints / decisions
- HIGH-STAKES (Evaluate): privacy — an over-broad include leaks other users' data; an over-eager
  select leaks the password hash. Criteria 4b/4c are the teeth.
- Export is a snapshot object, not a streaming writer — at ≤200-chunk reads and one user's data the
  payload is small; "streaming" in the spec is satisfied by the attachment response. Documented
  simplification.
- Question CONTENT (texts/options) is NOT exported — ids only (learning state is the user's data;
  official content is not). One-line note in code.
- CRAFT: page copy direct and calm; the export button is secondary-styled (quiet); empty-state n/a.
- Delete UI/action is wave14-10 — this page only reserves its section (heading + link/disabled note ok).

## Next
- [x] Read wave14-01 finding 1f/1g; implement exportUserData + route + page; then the A/B fixture test.
- Goal fully met — `bash tasks/wave14-09-account-data-export/verify.sh` → `PASS wave14-09`
  (typecheck + unit + integration + build all green). Nothing left; wave14-10 owns the delete flow
  (the /account/data page already reserves its «Видалити акаунт» section as a placeholder).

## Artifacts
- lib/server/data-rights.ts, app/(app)/account/data/page.tsx, app/(app)/account/data/export/route.ts,
  lib/server/data-rights.integration.test.ts

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-03T00:52Z ClPcs-Mac-mini: implemented all four deliverables. `lib/server/data-rights.ts`
  `exportUserData(userId)` — keyset-paged (PAGE=200) reads of every userId-scoped table + session-join
  reads (TestAnswer/TestSessionQuestion) via `testSessionId in`-batches (IN_BATCH=200); safe
  SAFE_USER_SELECT (id/email/name/role/createdAt/selectedCategoryId only); format tag
  "drivers-school-export-v1". Generic delegate typing done via minimal structural interfaces +
  `as unknown as` casts (Prisma's overloaded findMany isn't assignable to a simplified fn type). Route
  `app/(app)/account/data/export/route.ts` GET, requireUser-guarded, Content-Disposition attachment.
  Page `app/(app)/account/data/page.tsx` — download form + reserved delete section + the two pinned
  notes (analytics-exclusion + offline-device). Linked `/account` → `/account/data` («Керувати моїми
  даними») in the Конфіденційність area. Integration test `data-rights.integration.test.ts` seeds A in
  EVERY table + B, asserts per-table ids present (4a), B's ids absent (4b), sentinel passwordHash
  absent + no "passwordHash" substring (4c), unauth GET rejects (4d) — 4/4 green.
  Trap hit: the verify secret-grep (`passwordHash|tokenVersion`) matched a DOC COMMENT naming the
  fields — reworded the comment (CLAUDE.md purity-grep-matches-comments bullet). verify.sh → PASS.

## Verify
**Last verify:** PASS (2026-07-02T21:54:38Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T21:56:40Z)
