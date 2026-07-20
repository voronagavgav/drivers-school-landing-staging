# Wave 13 — PWA / offline / images (table-stakes parity, spike-de-risked)

Make the app installable, study-capable offline, and image-light on weak networks — per
`docs/app-plan/05-tech-architecture.md` §4–§5 and the **positive spike verdicts in
`docs/app-plan/SPIKES.md`** (READ BOTH FIRST; the spikes pin the exact working configs). Deploy target:
self-hosted Node box. RULES unchanged (CLAUDE.md; purity split; additive migrations only if truly needed —
prefer NONE; production-path integration tests; Ukrainian; honest copy; `npx vitest list` proof; the
frontend-design craft rules for any UI: errors direct, empty states invite, action names persist).

## A. Service worker (Serwist — the spike's exact recipe)
- `@serwist/next` + `serwist` pinned to the spike's working versions; `app/sw.ts`; production build via
  **`next build --webpack`** (update the `build` script; dev stays Turbopack where the SW is a no-op) +
  the spike's one-line tsc fix. `public/sw.js` must emit in CI-verifiable form (verify.sh runs the build
  and asserts the file).
- Precache: the app shell, `/~offline` fallback route (calm Ukrainian offline page — an invitation, not
  an apology), fonts, the Світлик sprite, global CSS. Runtime caching: `/api/q-image/*` + same-origin
  images → CacheFirst (immutable by imageKey; count/age caps); question/session JSON GETs →
  NetworkFirst-with-cache-fallback; ALL mutations (server actions, `/api/track`, `/api/review-sync`) →
  NetworkOnly (+ §D's queue for review-sync). NO caching of authed HTML documents beyond the shell/offline
  fallback (a stale dashboard is worse than the offline page).
- A no-SW fallback stays structurally possible: the app must run identically when the SW fails to
  register (feature-detect, never assume).

## B. Installability
- `app/manifest.ts` (Ukrainian name/short_name, `display: standalone`, calm `theme_color`/`background_color`
  from the tokens, maskable 192+512 Світлик icons — generate PNGs from the sprite at build/dev time and
  commit them, `categories: ["education"]`, `start_url: /dashboard`). iOS: `apple-touch-icon` (exists) +
  `apple-mobile-web-app-*` meta. A calm in-app install hint card on /account (Профіль): browser-appropriate
  copy (Android: the native prompt via `beforeinstallprompt` when available; iOS: «Додати на головний
  екран» instructions) — NEVER a nag, dismissable, remembered (localStorage).

## C. Image weight (the current villain: restyled PNGs ≈342KB avg)
- Content-negotiation INSIDE the existing resolver (`/api/q-image/[key]` — the stable key is sacrosanct):
  honor `?w={360,540,720}` + `Accept`-driven format (AVIF → WebP → original fallback), serving from a
  BUILD-TIME prebake per the sharp spike (`scripts/prebake-images.mjs`: sharp, Node-25-proven, AVIF
  quality tuned to ≤120KB hard cap — spike showed ~9KB typical at w=540; WebP fallback; writes
  `public/img-cache/<key>-<w>.<fmt>`, idempotent, skips up-to-date outputs; runs via npm script — NOT at
  request time). The resolver keeps its tier walk (overrides ▸ restyled-live ▸ official) and serves the
  prebaked variant when present, the original otherwise (graceful per-key degradation, never a 404 from
  a missing variant). `Cache-Control: public, max-age=31536000, immutable` on negotiated variants.
- Runner + result `<img>`s: `srcset` 360/540/720 + `sizes`, explicit width/height (CLS), `loading="lazy"`
  below the fold. Integration test: the route serves AVIF for an Accept that includes it, WebP otherwise,
  original when no variant exists; the key regex + traversal guard unchanged.

## D. Offline review (the W10 clientEventId plumbing pays off)
- IndexedDB write-ahead log in the runner: a failed `submitAnswerAction` (network) enqueues
  {sessionId, questionId, optionId, latencyMs, clientEventId, reviewedAt: clientNow} and the UI shows the
  calm queued state («Збережемо, щойно з'явиться мережа» — not an error). On reconnect (online event +
  Background Sync where available), the queue POSTs to a NEW `app/api/review-sync/route.ts`.
- `/api/review-sync`: session-cookie auth; zod batch validation (size-capped, mirrors /api/track
  patterns); applies each item through the SAME submitAnswer path (idempotent by clientEventId — replays
  are no-ops); items applied in reviewedAt order; **client reviewedAt lands here** (the deferred W10f
  item): accepted only with a clientEventId, clamped to [now−7d, now] (never future), server time wins
  otherwise. Always acks 200-shape JSON (never leaks internals to a beacon).
- **Per-user event-id namespacing** (deferred W10f item): `clientEventId` uniqueness enforced per-user —
  keep the global unique column but PREFIX server-side (`<userId>:<clientId>` on write in recordReview +
  the sync route) so one user's id can't collide with/replay-block another's. One additive data shape
  change, no schema migration (same column); update the existing idempotency tests accordingly.
- Integration: batch replay idempotence (same batch twice → identical state), out-of-range reviewedAt
  clamped, foreign-session items rejected per-item without failing the batch.

## E. Offline packs (opt-in, honest sizes)
- «Завантажити тему для офлайн» on a topic (progress/practice surface): caches that topic's question JSON
  (IndexedDB) + its images (Cache Storage, negotiated w=540 variants) after a size-confirm dialog («≈X МБ»,
  computed from real variant sizes). Global cap 50MB with an honest usage meter + per-topic delete in
  Профіль. Mistakes + Saved auto-cached on view (small). Offline runner: cached topics playable offline
  through the WAL path; anything uncached shows the calm offline state.

## F. Verification
- Full suite + `next build --webpack` green + `public/sw.js` emitted + drift zero (NO schema change
  expected this wave).
- browser-audit extensions (real transport): manifest reachable + valid JSON; `/~offline` renders; a
  q-image request with `Accept: image/avif` returns `content-type: image/avif` and body ≤120KB for a
  known restyled key; SW registration succeeds on the served origin (best-effort assert via page eval).
- Offline E2E (the audit tool can't kill the network reliably — do it in the wave's verify task via
  Playwright `context.setOffline(true)`): load dashboard → go offline → reload → offline fallback renders;
  answer a cached question offline → reconnect → the answer lands exactly once (WAL + review-sync).

## Out of scope: Web Push/notifications/calm ritual/data export (W14) · monetization · Postgres ·
`SIGN_TRAINER`/`QUICK`/`MARATHON` modes · any landing work.
