# Wave 1 — Security & correctness hardening

Harden the existing MVP. No behaviour regressions; keep Ukrainian copy and the demo/legal positioning.
Keep new core logic PURE + unit-tested so the `typecheck && test` gate is meaningful.

## A. Input validation on server actions
Acceptance criteria (boolean):
- A shared validation approach (e.g. `lib/validation.ts` using `zod`, already a dependency) validates inputs
  for every server action in `app/actions/*` and `app/admin/actions.ts` (auth register/login, category select,
  start/submit/finish test, save/unsave, all admin create/update mutations).
- Invalid input returns a friendly Ukrainian message via the existing `useActionState` error pattern (form
  actions) or a thrown-and-caught guard (object-arg actions) — it never persists bad data and never 500s.
- Pure validation helpers have unit tests (valid + invalid cases) in a `*.test.ts` file.
- `npm run typecheck` + `npm test` pass.

## B. Login throttling
Acceptance criteria (boolean):
- Repeated failed logins for the same email (and/or IP) are throttled after a configurable threshold
  (constant in `lib/constants.ts`, e.g. `LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_SECONDS`), returning a clear
  Ukrainian "завелика кількість спроб" message; successful login resets the counter.
- The throttle logic core is a PURE, unit-tested function (state in → decision out); storage can be a simple
  in-memory map keyed by email/IP (documented as per-instance for the MVP).
- Tests cover: under limit allowed; over limit blocked; window reset. typecheck + test pass.

## C. Sanitize rendered question image URLs
Acceptance criteria (boolean):
- A pure `safeImageUrl(url): string | null` (allow only `http:`/`https:`; reject `javascript:`, `data:`, etc.)
  is added and unit-tested.
- It is applied wherever a question `imageUrl` is rendered (test runner, result review, admin) and validated
  on admin save. A rejected URL renders no image (and admin shows a validation error).
- typecheck + test pass.

## D. Access-control hardening + tests (no IDOR)
Acceptance criteria (boolean):
- Integration tests (in the `*.integration.test.ts` suite, real DB) prove: user A cannot read user B's
  `TestSession` via `getSessionState`/result (returns null/forbidden); a non-admin role is rejected by every
  admin mutation in `app/admin/actions.ts`; the engine only selects active+published questions.
- Any gap the tests reveal is fixed in the server layer (server-side checks, never UI-only).
- `npm run test:integration` passes; `npm test` + typecheck pass.

## E. Basic security headers
Acceptance criteria (boolean):
- `next.config.ts` sets cheap, safe headers (e.g. `X-Frame-Options: DENY` or frame-ancestors, `X-Content-Type-Options: nosniff`, a `Referrer-Policy`) without breaking the app.
- `npm run build` succeeds with the headers in place.

## F. Correctness bugs (from AUDIT.md — read it for specifics)
Acceptance criteria (boolean):
- `finishSession` (lib/server/test-engine.ts) is IDEMPOTENT: it acts only when the session is
  `IN_PROGRESS`; finishing an already-COMPLETED session does NOT duplicate the ProgressSnapshot or
  re-fire `test_completed`/exam analytics. Covered by an integration test (finish twice → one snapshot,
  counts unchanged).
- The test runner's `finish()` cannot double-fire: timer `onExpire` and the manual "Завершити" button
  must result in a single finish (guard with the existing `finishing` flag / a ref). The server
  idempotency above is the backstop.
- `npm run test:integration` + `npm test` + `npm run typecheck` pass.

> The full prioritized findings are in `AUDIT.md` (Severity | Area | Finding | File | Fix | Wave). The
> planner/driver should read it for exact locations. This wave covers the High-severity + cheap-correctness
> items mapped to Wave 1; UX-messaging items (e.g. "exam silently runs short") are deferred to Wave 2.

## Out of scope
- No DB schema change. No new third-party auth. No change to legal/demo positioning. No UI redesign.
- Audit Med/Low items not listed above (handled in later waves per AUDIT.md's Wave column).
