# Drivers School — Security + UX + Correctness Audit (re-audit @ 2026-06-17)

**Verdict: CONVERGED on security & correctness. 0 Critical · 0 unaddressed High.** Every High
finding from the original audit (login brute-force, raw image-URL injection, `finishSession`
re-finish race) is fixed AND independently verified green, and the new Wave 2–4 surfaces
(change-password, account settings, session resume, question navigator, accessible test runner,
error boundaries) introduced no new High/Critical security or correctness gap. The remaining open
items are all Medium/Low polish/hardening — none warrants an autonomous wave.

_Re-verified this pass: `npm run build` PASS (exit 0, 19/19 routes) · `npm test` 122 unit tests
PASS (12 files) · risky-sink sweep (`dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function`) =
none · `searchParams` are map-lookups, never raw-rendered · all server actions `requireUser()`/
`requireContentManager()`-gated, zod-validated, and `userId`-scoped._

_Read this pass: PLAN.md, git log (Waves 1→4 + blocked wave3 tail), lib/auth.ts, lib/session-secret.ts,
lib/sanitize.ts, lib/validation.ts, lib/login-throttle.ts, lib/server/login-throttle.ts,
lib/server/test-engine.ts, app/actions/{auth,test,user}.ts, app/admin/actions.ts,
components/{test-runner,account-forms}.tsx, next.config.ts._

## High / Critical findings — status

| Severity | Finding | Status | Evidence |
|---|---|---|---|
| High | No brute-force protection on login | **FIXED** | `loginAction` calls `isLoginThrottled(email)` BEFORE any DB/bcrypt work; `noteLoginFailure` on miss, `clearLoginThrottle` on success (`app/actions/auth.ts:62-74`). Pure core `lib/login-throttle.ts` + per-instance store `lib/server/login-throttle.ts`, unit-tested. |
| High | Image URL stored/rendered verbatim (XSS/SSRF-via-`<img>`) | **FIXED** | `safeImageUrl` (`lib/sanitize.ts`, allow-lists `http:`/`https:` via `new URL`) is applied at admin save — non-http(s) rejected with a Ukrainian error AND only the sanitised value persisted (`app/admin/actions.ts:115-118,187-190`) — and again at render (`components/test-runner.tsx:56,154`). Unit-tested. |
| High | `finishSession` re-runs on an already-COMPLETED session (dup ProgressSnapshot + double-fired analytics) | **FIXED** | Idempotency guard returns the stored summary without re-snapshot/re-emit when `status !== "IN_PROGRESS"` (`lib/server/test-engine.ts:289-300`); client `finishingRef` latch makes the timer-onExpire + manual-submit finish once (`components/test-runner.tsx:52,110-117`). Integration-tested (`finish-idempotency.integration.test.ts`). |

No NEW High/Critical issue was found in the Wave 2–4 code.

## FIXED 2026-06-18 (hardening wave — security / admin / engine·ux groups)

All six items below were implemented across three group commits (`5b82737` security ·
`fb606cb` admin · `4a9a547` engine/ux) and verified green by the full gate from a clean state:
`npm run -s typecheck` (exit 0) · `npm test` **136 unit** (12 files) · `npm run test:integration`
**29** (11 files) · `npm run build` (exit 0, 19/19 routes). DB content preserved (1693 `isDemo=false`
questions intact); the `User.tokenVersion` column shipped via an additive migration
(`prisma/migrations/20260618140000_user_token_version`, no reseed).

| # | Severity | Finding | Fix + evidence |
|---|---|---|---|
| 1 | Med | Login throttle was per-email only / no per-IP (password-spraying not stopped) | **FIXED.** Added a second per-IP bucket: `isIpLoginThrottled`/`noteIpLoginFailure`/`clearIpLoginThrottle` + `ipStore`/`ipConfig` (`lib/server/login-throttle.ts:23-69`); pure `clientIpFromHeaders` derives the IP from `x-forwarded-for`/`x-real-ip` (null → graceful skip, `lib/login-throttle.ts:66`). `loginAction` now checks `isLoginThrottled(emailKey) || (ip && isIpLoginThrottled(ip))` BEFORE any DB/bcrypt and counts misses against BOTH buckets (`app/actions/auth.ts:70-91`). Still in-process `Map` (shared-store note retained below). |
| 2 | Med | Stateless cookie not invalidated on password change | **FIXED.** Cookie payload is now `userId:tokenVersion:expiry` (`lib/auth.ts:48-52,72-89`); on every request the embedded version is compared to `User.tokenVersion` and a stale cookie is rejected (`lib/auth.ts:117-119`). `changePasswordAction` bumps `tokenVersion: { increment: 1 }` in the same write and re-mints the caller's session (`app/actions/auth.ts:118-130`), so every old cookie dies on password rotation. Migration `20260618140000_user_token_version` adds the column (`@default(0)`). |
| 3 | Med/Low | Admin editor could mislabel demo content as official (`sourceType=OFFICIAL` + `isDemo` unchecked → no `<DemoBadge/>`) | **FIXED.** `adminQuestionSchema` gained a `.refine` enforcing `sourceType==="DEMO" ⇔ isDemo===true`, rejecting any inconsistent combo with a Ukrainian error (`lib/validation.ts:103-111`). Demo/official labels can no longer silently disagree; legal positioning stays trustworthy. |
| — | Perf | Admin questions list loaded ALL ~1700 rows (with options) per page render | **FIXED.** `listQuestions(filter, page, pageSize)` now paginates with `skip`/`take` and a clamped page (`lib/server/admin.ts:73-104`), returning `{rows,total,page,pageSize,totalPages}`; the page reads `?page=` and renders a pager (`app/admin/questions/page.tsx:9-23,103-117`). |
| — | Perf | `startSession` pool fetch loaded every candidate row WITH its `options` join, even though selection only needs ids | **FIXED (not skipped).** EXAM/TOPIC/MIXED now fetch a lightweight candidate pool with `select: { id, topicId, difficulty }` only (`options:[]` placeholder), paying the heavy options join only at render time in `getSessionState` (`lib/server/test-engine.ts:113-129`). Same ids in the same order for the same rng — selection is unchanged (covered by existing engine/short-pool integration tests). |
| 4 | Low | `toggleSave` never reconciled — no revert on failure, not seeded from server | **FIXED.** `saved` state is seeded from `q.saved` on mount so an already-saved question shows "★ Збережено" on load (`components/test-runner.tsx:48-50`); `toggleSave` captures the question id, reverts the optimistic toggle and surfaces a Ukrainian error on a `toggleSaveAction` throw (`components/test-runner.tsx:124-138`). |

## Open items (Medium / Low — not wave-worthy)

| Severity | Area | Finding | File:where | Note |
|---|---|---|---|---|
| Low | Security / throttle | The per-email **and** per-IP login throttles (both shipped 2026-06-18, item #1 above) still live in an **in-process `Map`** — they don't survive a restart or coordinate across instances. | `lib/server/login-throttle.ts:23-24` | Acceptable for MVP / single-instance scale (in-code comment documents it). Revisit if deployed multi-instance: back both buckets with a shared store (Redis/Upstash), keyed the same way. |
| Low | Correctness | `MISTAKE_PRACTICE`/`SAVED_QUESTIONS` pools are global (by `userId`), not category-scoped like exam/topic/mixed. A user who switched categories sees mistakes/saved from the other category. | `lib/server/test-engine.ts:63-93` vs `:54-59` | **Intended** (mistakes are global). Documented decision; no action required. Genuinely skipped — left open. |

## Checked and GOOD this pass (don't re-investigate)

- **All High fixes verified present + wired + tested** (table above). Build + 122 unit tests + the
  integration suites (`access-control`, `finish-idempotency`, `engine`, `exam-short-pool`,
  `mixed-weak-topics`, `progress-volume`, `saved-excludes-unpublished`, `change-password`) are green.
- **RBAC server-side everywhere.** Every `app/admin/actions.ts` mutation calls `requireContentManager()`;
  `app/admin/layout.tsx` gates the subtree. Every `app/actions/{test,user,auth}.ts` action calls
  `requireUser()`/`requireContentManager()` first.
- **No IDOR.** `getSessionState`/`submitAnswer`/`finishSession`/`getResumableSession` all query
  `where: { id, userId }` (or `{ userId }`); saved/mistakes/progress are `userId`-scoped.
  `changePasswordAction` takes identity from the session only (no id/email read from the form).
- **No answer-leak.** `getSessionState` withholds `isCorrect`/explanations until `status==="COMPLETED"`;
  in-progress feedback only flows from `submitAnswer`, which is suppressed for `EXAM_SIMULATION`.
- **No XSS sink.** No `dangerouslySetInnerHTML`/`innerHTML`/`eval`; the only attacker-influenced
  attribute (image `src`) is `safeImageUrl`-guarded at render. `searchParams.empty`/`edit` are map
  lookups, never raw-rendered.
- **Input validation everywhere.** zod schemas (`lib/validation.ts`) on every auth/user/test/admin
  action; friendly Ukrainian messages via `firstIssueMessage`.
- **Auth basics.** bcrypt cost 10; `httpOnly`+`sameSite=lax`+env-gated `secure` cookie; HMAC verified
  with `timingSafeEqual` (length-checked); expiry embedded + checked; generic login error (no
  enumeration); `SESSION_SECRET` is a **hard prod requirement** (`resolveSessionSecret` throws,
  lazily at request time so `next build` isn't tripped).
- **Security headers** present (`next.config.ts`): `X-Frame-Options: DENY`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (a strict CSP is intentionally skipped —
  Tailwind/Turbopack inline assets).
- **UX/a11y hardening shipped (Wave 2).** Route `error.tsx` under `app/(app)` + `app/admin`;
  `not-found.tsx` for foreign/missing test ids; submit pending states; confirm-before-finish with an
  unanswered warning; question navigator with non-colour markers; options as an ARIA `radiogroup`
  (roving tabindex, arrow keys, ✓/✗ + `sr-only` text); `aria-live` low-time timer.
- **Demo/legal positioning intact.** Disclaimers on landing/onboarding/register/admin; `<DemoBadge/>`
  wherever demo questions surface; exam rules are configurable `lib/constants.ts` constants.

## Non-audit note (carry-over, not a finding)

- Wave 3 tail tasks `wave3-feat-11-expand-seed-content` and `wave3-feat-12-verify-wave3` are **BLOCKED**
  in the Mesa journals (tick budget exhausted). These are a **content-depth feature** (more seeded
  topics/questions), not a security/correctness issue — they do not affect this verdict. The shipped
  Wave 3 logic (spaced-mistake ordering, streak/goal, readiness sparkline, change-password) landed and
  is unit/integration-tested. Resume separately if more demo content is wanted; it is not a wave the
  auditor should auto-generate.

## FALSE-ALARM-prone (look risky, actually fine — don't re-flag)

- **`selectCategoryAction` sets any active category by id** — Category is shared global content (not
  user-owned), validated `isActive:true`; selecting any category is intended product behaviour.
- **Admin `questions/new` + `[id]` pages have no own `requireContentManager()`** — `app/admin/layout.tsx`
  wraps the subtree and the mutating actions re-check; defense is layered.
- **`intOr`/`bool`/`sourceTypeOr` "trust FormData"** — they coerce defensively (finite-check, enum
  allow-list w/ safe fallback); the one real gap (`imageUrl`) is now `safeImageUrl`-guarded.
- **`changePasswordAction` has no rate limit on the current-password check** — it requires an
  already-authenticated session, so it's not a brute-force surface against other accounts.
- **Stateless cookie has no server session table** — by design for the MVP; the only consequence
  (non-invalidation on password change) is captured as a Medium above, not a separate bug.
