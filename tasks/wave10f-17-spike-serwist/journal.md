# Task: wave10f-17-spike-serwist

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
INVESTIGATION (half-day cap): does `@serwist/next` build a service worker on the Next 16 WEBPACK path?
Record the verdict in `docs/app-plan/SPIKES.md`. NO production wiring in this wave — the branch is thrown
away; only the verdict file is committed on main.

Boolean acceptance criteria:
1. `docs/app-plan/SPIKES.md` exists and contains a section headed for the Serwist spike (e.g. "Spike 1 —
   Serwist × Next 16") with a clear VERDICT line (works / doesn't / conditional).
2. That section records ALL of: whether `public/sw.js` emits, whether `next build` is green on the webpack
   path, whether dev (Turbopack) is a no-op / OK, and the EXACT config that worked OR the failure + the
   no-SW fallback recommendation for Wave 13.
3. No `@serwist/next` / `serwist` dependency is added to the repo `package.json` (spike is throwaway):
   `grep -Eq "serwist" package.json` is FALSE.
4. No `app/sw.ts` or `public/sw.js` is left committed on main (throwaway artifacts): neither path is
   tracked by git after the task.
5. The spike branch (`spike/serwist`) is not merged; `git status` on main is clean apart from
   `docs/app-plan/SPIKES.md`.

## Constraints / decisions
- Verify the CURRENT Serwist API via context7/web before wiring (the API drifts) — the recorded config
  must match what actually built.
- Time-box: half a day. If it doesn't build cleanly, record the failure + recommend the no-SW fallback for
  Wave 13 — a negative verdict is a valid, complete outcome.
- Non-Goal: any production PWA wiring, manifest, install prompt.

## Plan
- [x] Create throwaway `spike/serwist` branch; wire minimal `@serwist/next` + trivial `app/sw.ts` precache.
- [x] `next build` on the webpack path; observe `public/sw.js`; note dev/Turbopack behaviour.
- [x] Write the verdict + exact config (or failure + fallback) into `docs/app-plan/SPIKES.md` on main.
- [x] Delete the branch/artifacts; confirm no serwist dep leaked into package.json.

## Next
- (none) — Goal met. `docs/app-plan/SPIKES.md` written on main with the Serwist verdict + exact config;
  verify.sh PASSES. No serwist in package.json; app/sw.ts & public/sw.js untracked. Spike branch
  `spike/serwist` stays unmerged for reference (deleting it is optional cleanup, not required by criteria).

## Findings (spike run 2026-07-02) — VERDICT: WORKS (webpack), conditional
- Versions: `@serwist/next@9.5.11` + `serwist@9.5.11` (peer `next >=14`; serwist's own devDep pins `next 16.2.4`,
  so it's tested against Next 16). Installed as devDeps on the `spike/serwist` branch ONLY.
- **Webpack build is GREEN.** `next build --webpack` (Next 16.2.9) emitted the SW:
  `✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'` and produced
  `public/sw.js` (167 KB). Full build completed (23 routes, static gen, traces) — no errors.
- **Exact working config** (both committed on `spike/serwist`):
  - `next.config.ts`: `import withSerwistInit from "@serwist/next";`
    `const withSerwist = withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js" });`
    `export default withSerwist(nextConfig);`
  - `app/sw.ts`: `/// <reference lib="webworker" />` (line 1, REQUIRED — see gotcha) then the standard
    `import { defaultCache } from "@serwist/next/worker";` + `new Serwist({ precacheEntries: self.__SW_MANIFEST,
    skipWaiting:true, clientsClaim:true, navigationPreload:true, runtimeCaching: defaultCache }).addEventListeners();`
  - Build script must pass `--webpack` (Next 16 `next build` defaults to Turbopack; the serwist plugin is a
    webpack plugin).
- **Gotcha (one-line fix):** without the `webworker` lib, `tsc` (run by `next build`) fails
  `Cannot find name 'ServiceWorkerGlobalScope'` — root `tsconfig.json` has `lib: [dom, dom.iterable, esnext]`.
  Fix: per-file `/// <reference lib="webworker" />` at the top of `app/sw.ts` (avoids a project-wide
  dom↔webworker `self` global conflict). The webpack SW bundle (`public/sw.js`) emits even BEFORE the typecheck
  runs, but the build only goes fully green with the reference directive.
- **Dev / Turbopack = no-op (OK).** `@serwist/next` injects via the webpack config callback, which Turbopack
  (Next 16 dev default) does not consume → no SW is generated in `next dev`. That is fine/desirable (SW caching
  in dev is unwanted). Serwist ships a SEPARATE `@serwist/turbopack` package for a Turbopack SW path; NOT needed
  for Wave 13 if the production build runs `next build --webpack`.
- **Wave 13 recommendation:** ship with `@serwist/next` and a `build` that uses `--webpack`; keep dev on
  Turbopack (SW no-op). No fallback required — it builds cleanly. (If a future decision forces Turbopack-only
  production builds, revisit `@serwist/turbopack`.)

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-02 ClPcs-Mac-mini: Wrote `docs/app-plan/SPIKES.md` on main ("Spike 1 — Serwist × Next 16") from
  the recorded findings — VERDICT WORKS (webpack, conditional), exact config, gotcha, Wave 13 rec. verify.sh
  PASSES; main clean (no serwist dep, no tracked sw.ts/sw.js). Goal met → Status: done.
- 2026-07-02 ClPcs-Mac-mini: Verified current Serwist API via context7 (`/websites/serwist_pages_dev`):
  `withSerwistInit({swSrc,swDest})` wrapping the next config + `app/sw.ts` with `defaultCache`. Created throwaway
  `spike/serwist` branch, `npm i -D @serwist/next serwist` (both 9.5.11), wired `next.config.ts` + `app/sw.ts`,
  committed on the branch (85782c7). Ran `next build --webpack`: serwist bundled `public/sw.js` (167 KB) and the
  build went GREEN after adding `/// <reference lib="webworker" />` to `app/sw.ts` (tsc needed the webworker lib
  for `ServiceWorkerGlobalScope`). Confirmed dev/Turbopack is a no-op by architecture (webpack-plugin only).
  VERDICT: WORKS on the webpack path (conditional on `--webpack` + the reference directive). Returned to `main`
  clean — no serwist in package.json, `app/sw.ts`/`public/sw.js` untracked, spike branch unmerged. Next tick
  writes `docs/app-plan/SPIKES.md`.

## Artifacts
- `docs/app-plan/SPIKES.md` (committed on main) — "Spike 1 — Serwist × Next 16": VERDICT WORKS (webpack),
  full findings + exact `next.config.ts`/`app/sw.ts`/build-script config + the webworker-lib gotcha.
- `spike/serwist` branch commit 85782c7 (throwaway): `next.config.ts`, `app/sw.ts`, `package.json`,
  `package-lock.json` with the working config.
- Build logs: `/tmp/serwist-webpack-build.log` (pre-fix TS failure), `/tmp/serwist-webpack-build2.log` (green).


## Verify
**Last verify:** PASS (2026-07-01T21:24:20Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T21:25:23Z)
