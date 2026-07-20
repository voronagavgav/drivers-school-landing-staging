# Task: wave13-02-offline-fallback-page

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
The calm Ukrainian `/~offline` fallback page (spec §A) — the route the service worker (wave13-03)
precaches and serves when a navigation fails offline. PASS = ALL true:

1. `app/~offline/page.tsx` exists — OUTSIDE the authed `(app)` route group (an offline visitor has no
   session round-trip; the page must render with zero auth/DB work).
2. The file imports NONE of: `@/lib/db`, `@/lib/auth`, `@/lib/rbac`, `server-only`, `getCurrentUser`
   (grep gate — keeps it statically renderable and precacheable).
3. Copy is an INVITATION, not an apology: the page contains the literal heading «Ви офлайн» and does
   NOT contain «помилк» (no error framing) and does NOT contain «вибач» (no apology).
4. It offers a way back: a link or button with the literal «Спробувати знову» pointing at `/dashboard`
   (retries the network when it returns).
5. It reserves the future packs slot honestly: one sentence telling the user that downloaded topics
   will be playable here, containing the literal «Завантажені теми» (wave13-17 replaces the sentence
   with the real client-side pack list — keep the copy in a clearly-marked spot).
6. `npm run typecheck` exits 0. 7. `npm test` exits 0.
8. `bash tasks/wave13-02-offline-fallback-page/verify.sh` exits 0.

## Constraints / decisions
- Route path is literally `/~offline` (directory `app/~offline/` — the tilde is a valid dir name;
  Serwist's conventional offline-fallback URL). Root layout provides fonts/CSS.
- Real-transport render (unauthenticated GET → 200, no /login bounce) is asserted by wave13-18's
  browser-audit extension; this task's gates are file-level + typecheck.
- FRONTEND CRAFT (unattended implementer — these ARE the review bar): copy is design material (active
  verbs, no vague "щось пішло не так"); empty states invite action; boldness in ONE place (the
  heading — everything else quiet); no structural devices that don't encode meaning; quality floor =
  responsive, visible focus on the link/button, `prefers-reduced-motion` respected (no animation is
  fine and preferred here). Use existing tokens/components (`Card` from `@/components/ui`, the calm
  palette) — this page must look native to the app, not like a browser error.
- Static Світлик is welcome (components/svitlyk.tsx `Svitlyk` needs `SvitlykSprite` mounted on the
  page — it lives in the (app) shell, so mount a local sprite instance here if used). No float
  animation (taste law).
- Non-Goals: NO service-worker code (wave13-03), NO pack list logic (wave13-17), NO nav shell.

## Plan
- [x] Read WAVE13-SURFACES.md + components/ui.tsx + app/(app) empty-state precedents.
- [x] Write the page; typecheck; run verify.sh.

## Done
- [x] Create `app/~offline/page.tsx` per Goal 1–5 using existing tokens/Card.

## Next
- [ ] (none — Goal met; verify.sh PASS. Real-transport render is wave13-18's job.)

## Artifacts
- app/~offline/page.tsx — the offline fallback route

## Log
- 2026-07-02 planner: task authored from spec §A (offline fallback = invitation, not apology).
- 2026-07-02 13:01 UTC ClPcs-Mac-mini: wrote app/~offline/page.tsx — centered layout mirroring
  /login, `Card` empty-state pattern from /saved, local `SvitlykSprite` mount (route is outside
  the (app) shell which normally owns it), static `Svitlyk` 112. Heading «Ви офлайн»; retry is a
  plain `<a href="/dashboard">` styled as the primary pill (full document nav retries the network;
  a next/link client transition on a SW-served fallback can dead-end) with «Спробувати знову»;
  packs slot is one marked sentence containing «Завантажені теми» (wave13-17 replaces it). No
  auth/db imports, no error/apology framing. verify.sh PASS (gates + typecheck + 487 unit tests).
  Status → done.

## Verify
**Last verify:** PASS (2026-07-02T13:02:30Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T13:03:18Z)
