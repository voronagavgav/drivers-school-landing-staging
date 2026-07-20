# Task: wave17-10-pwa-manifest-a2hs

**Status:** done
**Driver:** auto
**Updated:** 2026-07-05T19:36Z
**Last compute:** mac-mini

## Goal
T5/P1.7 — finish the PWA install story on the Wave-10f/13 Serwist foundation: manifest tuned to spec,
question loop cached for anon offline, and an HONEST non-blocking A2HS prompt AFTER value (never on
arrival). PASS = ALL true:

1. `app/manifest.ts` reflects the spec: `theme_color: "#FBFAF7"` (spec P1.7 — currently `#9AD9B8`;
   change it), `display: "standalone"`, `name`/`short_name` set, Світлик icons 192 + 512 present.
   `GET /manifest.webmanifest` returns 200 with `theme_color` `#FBFAF7`.
   - If `start_url` should change for the value-first funnel, record the decision in Log (default
     `/dashboard` may stay; do NOT break the authed default).
2. The service worker (`app/sw.ts`) already runtime-caches the question loop / q-images (Wave 13) —
   confirm the anon play path (`/test/*` documents are NetworkOnly by design; q-image + offline-pack
   caching still applies) is not broken by the wave-17 changes. No SW logic regression: `public/sw.js`
   still builds under `next build --webpack` and precaches `/~offline`.
3. An A2HS prompt component exists (`components/a2hs-prompt.tsx`, `"use client"`) that:
   a. listens for `beforeinstallprompt`, stashes the event, and shows a calm, dismissable invite
      «Додати на головний екран» ONLY after a value moment (e.g. after ≥1 completed session or the
      dial rendered — driven by a prop/flag), NOT on first paint / arrival;
   b. dismiss is neutral and sticks for the session (localStorage guard, e.g. `ds_a2hs_dismissed`);
   c. never blocks content; no repeated nag.
4. HARD DO-NOT: the A2HS prompt is not an arrival interstitial, not exit-intent, not a repeated nag.
   Assert the component does not mount unconditionally at the top of the shell.
5. Browser/serve checks (verify.sh, assumes served origin): `/manifest.webmanifest` → 200 and contains
   `#FBFAF7`; `/sw.js` served (200). (SW REGISTRATION can only be asserted on `localhost` per CLAUDE.md
   secure-context rule — the LAN origin may only assert it is SERVED.)
6. `npx tsc --noEmit`, `npm test`, `npm run build` all exit 0.

## Constraints / decisions
- Reuse the existing Serwist/`@serwist/next` wiring (`next.config.ts`, `components/sw-register.tsx`) —
  do NOT re-architect the SW. This task is manifest tuning + A2HS prompt + a no-regression check.
- SW/registration assertions belong to `localhost` (secure context); the LAN audit origin can never
  register a SW (CLAUDE.md). Keep the two origins' assertions disjoint.
- DESIGN CRAFT (apply directly): the A2HS invite is calm and honest («Додати на головний екран» — a
  real benefit, no hype), one green accent, dismiss neutral, visible focus, reduced-motion respected.
- Depends on: wave10f/13 SW foundation (present). Independent of the offer/checkout tasks.

## Plan
- [x] Set `theme_color: "#FBFAF7"` in `app/manifest.ts`; confirm icons/standalone.
- [x] Build `a2hs-prompt.tsx` (beforeinstallprompt, after-value, neutral dismiss, session guard).
- [x] Mount it after a value moment behind the flag; confirm SW still builds + precaches.
- [x] verify.sh: manifest 200 + #FBFAF7, /sw.js served, build green.
- [x] Run gates.

## Next
- (none — Goal met, Status: done) If a regression surfaces: the value flag is
  `a2hsValueReached = p.completedSessions >= 1 || sufficientData` in `app/(app)/dashboard/page.tsx`,
  passed as a plain boolean to `<A2hsPrompt show={…} />` mounted at the BOTTOM of the dashboard
  content (never the shell top).

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T00:00Z ClPcs-Mac-mini: Set `app/manifest.ts` `theme_color` `#9AD9B8` → `#FBFAF7`
  (spec P1.7; OS/install chrome now matches the app field surface, not the green accent); updated the
  color-source comment; `display:standalone`, `start_url:/dashboard` (kept — authed default), name/
  short_name and 192+512 Світлик icons unchanged. `npx tsc --noEmit` clean. Found the LAN `next-server`
  on :3100 was serving the STALE build (manifest still `#9AD9B8`) — rebuilt (`npm run build`, exit 0,
  BUILD_ID present) and relaunched `npm run start -- -H 0.0.0.0 -p 3100`. Served verify: `GET
  /manifest.webmanifest` → 200 with `theme_color":"#FBFAF7"` on BOTH localhost:3100 and
  100.110.64.90:3100; `/sw.js` → 200. Manifest item done; A2HS component next.
- 2026-07-05T17:40Z ClPcs-Mac-mini: FIX last verify FAIL — the purity gate (`grep -En
  'lib/server|@/lib/db|@/lib/rbac|@/lib/auth' a2hs-prompt.tsx`) matched the literal `lib/server` in my
  own doc comment (root-CLAUDE whole-file source-grep trap). Reworded the comment in prose ("any
  server-only module (data, auth, or rbac helpers)") — no forbidden tokens now; confirmed grep returns
  empty. Comment-only change, no behavior/typecheck impact. Mount still pending (next increment).
- 2026-07-05T17:05Z ClPcs-Mac-mini: Built `components/a2hs-prompt.tsx` (`"use client"`, mirrors
  `calm-ritual.tsx` style — Button from `@/components/ui`, minimal local `BeforeInstallPromptEvent`
  interface since it's absent from lib.dom). Listens for `beforeinstallprompt` (preventDefault +
  stash), renders the calm «Додати на головний екран» invite ONLY when `show` (value-moment prop) AND
  the event fired AND `ds_a2hs_dismissed` unset — else returns null (satisfies DO-NOT #4: never
  unconditional). Neutral «Не зараз» sets the localStorage guard; «Додати» consumes `event.prompt()`
  once. Read the dismiss guard in a mount effect (not lazy init) per components/CLAUDE.md hydration
  rule. Pure client — no lib/server imports (verify's server-graph grep passes). `npx tsc --noEmit`
  exit 0. Next: mount it behind a value moment (not the shell top).

- 2026-07-05T19:36Z ClPcs-Mac-mini: MOUNTED the A2HS prompt (final increment). `app/(app)/dashboard/
  page.tsx`: computed server-side value flag `a2hsValueReached = p.completedSessions >= 1 ||
  sufficientData` (real value moment — ≥1 completed session or a meaningful readiness dial), passed as
  a plain boolean to `<A2hsPrompt show={a2hsValueReached} />` mounted at the BOTTOM of the dashboard
  content (after weak-topics), NOT the shell top — satisfies DO-NOT #4. Gates: `npx tsc --noEmit` 0;
  `npm test` 608/608 pass; `npm run build` (`next build --webpack`) exit 0 — `public/sw.js` rebuilt
  (107 KB, 19:34) and still precaches `/~offline` (grep `~offline` = 1). Served: manifest theme_color
  `#FBFAF7` + `/sw.js` 200 on 100.110.64.90:3100. Restarted the stale LAN `next-server` (pid was 15288,
  serving pre-rebuild chunks) → fresh `npm run start -- -H 0.0.0.0 -p 3100` (Ready, no EADDRINUSE),
  `/dashboard` → 307 (route present, unauth redirect). Goal fully met → Status: done.

## Artifacts
- `app/(app)/dashboard/page.tsx` — `a2hsValueReached` server value flag + `<A2hsPrompt show>` mounted
  at the bottom of the dashboard content (never the shell top).
- `app/manifest.ts` — `theme_color: "#FBFAF7"` (spec P1.7).
- `components/a2hs-prompt.tsx` — `"use client"` A2HS invite: `beforeinstallprompt` stash + preventDefault,
  gated by `show` prop (value moment) AND event presence AND `!ds_a2hs_dismissed`; returns null otherwise
  (never unconditional). Neutral «Не зараз» dismiss persists to `localStorage`; «Додати» calls
  `event.prompt()`. Pure client (no lib/server graph). tsc clean.




## Verify
**Last verify:** PASS (2026-07-05T16:36:01Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T16:37:51Z)
