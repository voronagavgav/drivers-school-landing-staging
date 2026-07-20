# Task: wave13-03-serwist-sw-webpack

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
Service worker via Serwist on the webpack build path — the SPIKES.md §1 recipe verbatim, plus the
spec-§A caching policy and feature-detected registration. PASS = ALL true:

1. `package.json` devDependencies pin EXACTLY `"@serwist/next": "9.5.11"` and `"serwist": "9.5.11"`
   (no `^` — the spike proved these against Next 16.2.9; drift is untested).
2. `next.config.ts` exports the config wrapped with
   `withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js", ... })` while PRESERVING the existing
   `turbopack.root`, `outputFileTracingRoot`, `allowedDevOrigins`, and the security `headers()` (grep:
   `withSerwistInit`, `X-Frame-Options`, `outputFileTracingRoot` all still present).
3. `app/sw.ts` line 1 is exactly `/// <reference lib="webworker" />` (the spike's one-line tsc fix);
   it constructs `new Serwist({ precacheEntries: self.__SW_MANIFEST, ... })` and calls
   `serwist.addEventListeners()`.
4. Caching policy in `app/sw.ts` (spec §A — greppable):
   a. `/~offline` is precached (via `additionalPrecacheEntries` in next.config.ts or an explicit
      entry) AND wired as the document fallback (Serwist `fallbacks`/catch handler) — grep `~offline`
      in app/sw.ts or next.config.ts;
   b. same-origin `/api/q-image/` → `CacheFirst` with an `ExpirationPlugin` (maxEntries ≤ 300,
      maxAgeSeconds ≤ 30 days) — grep `CacheFirst` and `q-image` in app/sw.ts;
   c. `/api/track` and `/api/review-sync` and all non-GET requests → `NetworkOnly` — grep
      `NetworkOnly` in app/sw.ts;
   d. NO runtime caching of authed HTML documents: no rule pairs `request.destination === "document"`
      (or `mode === "navigate"`) with `StaleWhileRevalidate`/`NetworkFirst`/`CacheFirst` — documents
      are network-only with the precached `/~offline` fallback (a stale dashboard is worse than the
      offline page).
5. `package.json` `"build"` script is `next build --webpack`; `npm run build` exits 0 AND
   `public/sw.js` exists and is > 10240 bytes after the build.
6. `public/sw.js` (and any `public/swe-worker*.js` Serwist emits) are gitignored
   (`git check-ignore public/sw.js` exits 0) — build artifacts, never committed.
7. A client registration component (e.g. `components/sw-register.tsx`) is mounted in `app/layout.tsx`;
   it registers `/sw.js` ONLY when `"serviceWorker" in navigator` (feature-detect — the app must run
   identically when the SW cannot register: insecure context, old browser, registration error is
   caught and swallowed) and only in production (`process.env.NODE_ENV === "production"`).
8. The registration component imports NO server-graph modules (grep: no `@/lib/db`, `@/lib/auth`,
   `@/lib/rbac`, `server-only` in it — the client-bundle trap).
9. `npm run typecheck` exits 0. 10. `npm test` exits 0.
11. `bash tasks/wave13-03-serwist-sw-webpack/verify.sh` exits 0.

## Constraints / decisions
- Spike recipe is LAW (docs/app-plan/SPIKES.md §1): webpack build path, per-file webworker reference,
  dev stays Turbopack where the plugin is a no-op (desired — no SW caching in dev).
- "Question/session JSON GETs → NetworkFirst" (spec §A): the app has NO JSON GET endpoints for
  questions/sessions today (server actions + RSC only). Do NOT invent caching for RSC payload
  requests — leave navigations/documents network-only with the offline fallback. When wave13-14 adds
  `/api/offline-pack/*`, packs are stored in IndexedDB by the client, not the SW — still no SW rule
  needed. Record this in the increment log.
- `@serwist/next/worker`'s `defaultCache` may only be used if its document/HTML entries are stripped;
  an explicit small `runtimeCaching` array is simpler and preferred.
- devDependencies (not dependencies): both packages are build/SW-bundle-time only; nothing imports
  them in the server runtime graph.
- Precache scope: the build manifest (`self.__SW_MANIFEST`) already covers hashed `/_next/static`
  assets (fonts via next/font, CSS, chunks). The Світлик sprite is inline JSX — nothing to add.
- Non-Goals: manifest/icons (wave13-05), Background Sync handler (wave13-12), offline-practice
  precache entry (wave13-17).

## Plan
- [x] Install pinned deps; wire next.config.ts + app/sw.ts per spike; flip build script.
- [x] Write the caching policy rules; add the registration component; build; verify.sh.
      (caching policy DONE with item 1 — sw.ts had to exist for the build anyway; remaining:
      registration component + layout mount + verify.sh)

## Done
- [x] Deps exact-pinned (`@serwist/next@9.5.11`, `serwist@9.5.11`, devDeps); next.config.ts wrapped
      with `withSerwistInit` (swSrc/swDest per spike, `register: false` for manual registration,
      `additionalPrecacheEntries: [{url:"/~offline", revision: git HEAD}]`) preserving turbopack.root/
      outputFileTracingRoot/allowedDevOrigins/headers; `app/sw.ts` written with the full spec-§A
      policy (q-image CacheFirst+ExpirationPlugin 300/30d, track+review-sync NetworkOnly, documents
      NetworkOnly + `/~offline` fallbacks entry, non-GET NetworkOnly via per-method entries — NO
      defaultCache); build script → `next build --webpack`; public/sw.js* + swe-worker* gitignored.
      Verified: typecheck 0, `npm test` 487 passed, build exits 0, public/sw.js = 40828 bytes
      (>10240), `/~offline` present in its precache manifest, `git check-ignore public/sw.js` passes.
- [x] `components/sw-register.tsx` written ("use client", registers `/sw.js` only when
      `"serviceWorker" in navigator` && `NODE_ENV === "production"`, `.catch(() => {})` swallow,
      zero server-graph imports) and mounted in `app/layout.tsx` next to `<AnalyticsProvider />`.
      `bash tasks/wave13-03-serwist-sw-webpack/verify.sh` → PASS wave13-03 (typecheck, unit tests,
      webpack build, sw.js size, all greps green).

## Next
- (none — Goal fully met, verify.sh green; SW registration E2E proof against localhost is
  wave13-19's scope per the secure-context constraint)

## Artifacts
- app/sw.ts — the service worker source (WRITTEN, full spec-§A policy)
- next.config.ts — withSerwistInit wrap + /~offline precache entry (WRITTEN)
- package.json — exact-pinned serwist devDeps, build → `next build --webpack` (WRITTEN)
- .gitignore — public/sw.js* + swe-worker* (WRITTEN)
- components/sw-register.tsx — feature-detected registration (WRITTEN, mounted in app/layout.tsx)

## Log
- 2026-07-02 planner: task authored from spec §A + SPIKES.md §1 (positive verdict, exact config pinned).
- 2026-07-02 13:08 UTC ClPcs-Mac-mini: installed pinned serwist deps; wired next.config.ts
  (withSerwistInit, register:false, /~offline additionalPrecacheEntry) + app/sw.ts (full spec-§A
  runtimeCaching, explicit array NOT defaultCache per Constraints; documents get an explicit
  NetworkOnly route because Serwist `fallbacks` is a router catch handler — with no matching route
  a failed navigation never reaches it); build → `--webpack`; gitignored sw artifacts. All checks
  green: typecheck 0, 487 unit tests pass, build emits public/sw.js (40828 B) with /~offline
  precached. Per Constraints: NO rule invented for question/session JSON GETs (none exist — server
  actions + RSC only; wave13-14 packs go to IndexedDB, not the SW). Remaining: sw-register
  component + layout mount + verify.sh.
- 2026-07-02 13:11 UTC ClPcs-Mac-mini: wrote components/sw-register.tsx (render-nothing client
  component in the AnalyticsProvider style: mount-effect, prod-only + `"serviceWorker" in navigator`
  feature-detect, catch-and-swallow — note insecure contexts simply don't expose the property, so
  the LAN http origin degrades cleanly) and mounted it in app/layout.tsx. verify.sh → PASS
  wave13-03. Goal met → Status: done.


## Verify
**Last verify:** PASS (2026-07-02T13:12:36Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T13:13:45Z)
