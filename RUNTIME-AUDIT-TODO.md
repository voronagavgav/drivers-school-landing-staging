# Runtime audit — COMPLETE (2026-06-17)

A real-browser, real-transport audit was owed because the wave audits were STATIC, the verify gate is
typecheck/test/build, and the smoke minted its OWN cookie + curled status codes — NONE exercised the real
**browser → HTTP → cookie → Server-Action** path, so Bug #1 slipped through every green check.

## How it was done
Drove an actual browser (`agent-browser`) over the **non-localhost** Tailscale origin
`http://100.110.64.90:3100` (localhost is a secure context and would have masked the cookie bug) through
every flow: register → onboarding → dashboard → all 5 test modes (exam sim, topic, mistake, mixed, saved) →
answer → confirm-finish → result/review → mistakes → saved → history → account/change-password → admin
overview/questions/edit-save/categories/topics/content-versions → logout → auth guard → RBAC → IDOR →
bad-id not-found.

## Bug #1 — FIXED + VERIFIED in a real browser: session drops after login over plain HTTP
- **Symptom:** log in (dashboard renders), click "Почати симуляцію" → bounced back to `/login`.
- **Root cause:** `lib/auth.ts` set the session cookie `secure: NODE_ENV === "production"`. Under
  `next start`, NODE_ENV=production → `Secure` cookie; the app is served over plain `http://` (Tailscale/LAN),
  so the browser never sent it → session looked lost on the next request.
- **Fix:** gate `Secure` on `COOKIE_SECURE === "true"` (default off; set only behind real HTTPS).
- **Verified:** login → "Почати симуляцію" now lands on `/test/<id>` (16-question Cat-B exam), not `/login`.

## Other findings — investigated, NONE are bugs
- Exam-mode answers looked "locked" (radios `disabled`) right after selecting — that's just the transient
  `pending` submit state; `locked = !isExam && Boolean(fb)` (`components/test-runner.tsx:59`) keeps exam
  answers revisable. A later snapshot confirmed the radio re-enabled. Not a bug.
- Result shows "16 ПОМИЛОК" while the mistake bank shows "1 active" — distinct concepts (this-test score
  counts skipped questions wrong; the review bank only adds questions you actively answered wrong). Correct;
  copy could disambiguate but it's not wrong.
- A new (category-less) user who navigates away from onboarding is server-side redirected BACK to
  `/onboarding` from `/dashboard` and `/practice`. Correct gating.
- Security spot-checks PASS: RBAC (plain user → `/admin` bounces to `/dashboard`), IDOR (a non-owner gets
  not-found for another user's `/test/<id>/result`, not their data), bad id → graceful "ТЕСТ НЕ ЗНАЙДЕНО".
- Admin edit write-path persists correctly (verified an edit + revert). An apparent save failure was a tool
  artifact (`agent-browser find role button click` didn't submit; explicit ref-click did) — NOT the app.

## Durable gate (so this can't regress silently)
`bin/browser-audit.sh` → `npm run audit:browser`. 14 real-transport assertions, all green 2026-06-17.
Run it (and against the non-localhost origin) before claiming any UI/auth change is "verified". See the
matching CLAUDE.md learning ("REAL-TRANSPORT GATE").

## Lesson (kept in memory: feedback-runtime-audit)
typecheck + tests + build + a curl-minted-cookie smoke PASSED while the real user flow was broken.
"Audited / verified green" must include real-browser, real-transport E2E — not just static review +
DB-layer tests + header checks.
