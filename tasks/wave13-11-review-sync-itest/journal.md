# Task: wave13-11-review-sync-itest

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
PRODUCTION-PATH integration test for `/api/review-sync` (spec §D: "batch replay idempotence, out-of-
range reviewedAt clamped, foreign-session items rejected per-item without failing the batch"). Drives
the EXPORTED `POST` with a `NextRequest`, auth via partial-mocked `@/lib/auth` (the /api/track
technique). PASS = ALL true:

1. `lib/server/review-sync.integration.test.ts` exists and is collected
   (`npx vitest list --config vitest.integration.config.ts`, var-captured, includes it).
2. Fixtures: `createOfficialQuestion` (the shared helper) for user+category+2 published questions; an
   IN_PROGRESS `TestSession` created directly via prisma for the fixture user; a SECOND user with
   their own IN_PROGRESS session (foreign-session case). All clientEventIds carry a module-scope
   per-run token (`` `w13sync-${Date.now()}` `` base). FK-safe cleanup (users before questions).
3. Cases (assert literals):
   a. APPLY: batch of 2 valid items → HTTP 200, `ok: true`, both results non-rejected; 2 TestAnswer
      rows exist; 2 ReviewLog rows whose clientEventId equals `<userId>:<rawId>`;
   b. REPLAY IDEMPOTENCE: POST the byte-identical batch again → 200 `ok: true`; ReviewLog count for
      those ids STILL 2; each ReviewState's `reps` still 1 and `stability` unchanged (read before/
      after, compare exactly); TestAnswer selectedOptionId unchanged;
   c. CLAMP LOW: item with `reviewedAt` = now − 8 days → stored ReviewLog.reviewedAt within 60s of
      now − 7 days;
   d. CLAMP FUTURE: item with `reviewedAt` = now + 1 hour → stored ReviewLog.reviewedAt ≤ server now;
   e. FOREIGN SESSION: one batch mixing (i) an item whose sessionId belongs to the OTHER user and
      (ii) a valid own item → 200 `ok: true`; (i) has `status: "rejected"` and NO ReviewLog row;
      (ii) applied with its row present;
   f. UNAUTH: getCurrentUser mocked → null; POST a valid batch → 200 `{ ok: false }`; row counts
      unchanged;
   g. OVERSIZE: batch of 51 items → `{ ok: false }`, zero writes.
4. `npm run test:integration` exits 0. 5. `npm run typecheck` exits 0.
6. `bash tasks/wave13-11-review-sync-itest/verify.sh` exits 0.

## Constraints / decisions
- TEST-ONLY: red cases implicate wave13-09/10 — mark blocked naming the case, do not patch the route
  here (anti self-grading).
- `submitAnswer` only checks the session exists + IN_PROGRESS + belongs to the user — direct prisma
  `TestSession.create` is a legitimate fixture (no TestSessionQuestion rows needed).
- Build the NextRequest with `new NextRequest("http://localhost/api/review-sync", { method: "POST",
  body, headers: { "content-type": "application/json" } })`; mock `getCurrentUser` to return the
  fixture user row shape (the `as SessionUser` partial-mock idiom from the existing suites).
- Case (b) must compare ReviewState fields read BEFORE and AFTER the replay — not recomputed
  expectations (drift-proof).

## Plan
- [x] Fixtures + the 7 cases; suite green; verify.sh.

## Done
- [x] Fixtures (createOfficialQuestion ×6 questions, two users, two IN_PROGRESS sessions) + all 7
      cases (a–g); suite green (7/7); full test:integration green (30 files); verify.sh PASS.

## Next
- [ ] (none — Goal met)

## Artifacts
- lib/server/review-sync.integration.test.ts — the production-path oracle

## Log
- 2026-07-02 planner: task authored from spec §D integration bullet; case table frozen at plan time.
- 2026-07-02 15:32 UTC ClPcs-Mac-mini: wrote `lib/server/review-sync.integration.test.ts` — the
  Plan's single item (fixtures + all 7 frozen cases a–g) as one increment. /api/track technique
  (NextRequest → exported POST, partial-mocked getCurrentUser); 6 fixture questions so each case
  gets a fresh (session, question) pair (TestAnswer uniqueness / first-attempt-only FSRS never
  interfere); expected namespaced ids built by concat via a local `ns()` (single-builder gate safe);
  case (b) replays the byte-identical JSON string from (a) and compares ReviewState reps/stability
  read before vs after. Suite 7/7 green first run; verify.sh PASS (typecheck + collection +
  30-file integration run). No route bugs surfaced — nothing to block on wave13-09/10.

## Verify
**Last verify:** PASS (2026-07-02T15:33:53Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T15:35:29Z)
