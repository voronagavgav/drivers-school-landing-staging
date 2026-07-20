# Task: wave12a-05-tier-detector-shell

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop
**Evaluate:** yes

## Goal
Spec §B/§D + `04-design-system.md` §5. Wire the client device-tier detector into the app shell: read the
`UserSettings.glassTier` override SERVER-SIDE, apply the resolved tier as a body class with NO flash, honor
`prefers-reduced-*`, and add idle-freeze. The tier DECISION must delegate to the pure `resolveGlassTier`
(task 04) — do NOT re-implement the matrix in the client.

PASS = ALL true:

1. `lib/server/user-settings.ts` exists (server module — `import "server-only"` allowed), exports a fn that
   returns the current user's `glassTier` override (`"auto"|"real"|"emulated"|"solid"`), reading
   `UserSettings` via `@/lib/db` and defaulting to `"auto"` when no settings row exists. NO write required.
2. `components/glass-shell.tsx` exists, is a client component (`"use client"` at line 1), imports
   `resolveGlassTier` from `@/lib/glass-tier`, and on mount:
   - builds `GlassSignals` from `navigator.deviceMemory`/`hardwareConcurrency` (default 4 when undefined),
     `matchMedia('(pointer:fine)')`, `navigator.connection?.saveData`, the three `prefers-*` media queries,
     and `window.innerWidth`, using the server `override` prop;
   - sets EXACTLY ONE tier state on `document.body.classList`: `glass-real` (tier real), `glass-solid`
     (tier solid), and neither for emulated (emulated is the CSS base from task 03);
   - re-evaluates on `change` of the `prefers-reduced-motion` / `prefers-reduced-transparency` /
     `prefers-contrast` media queries;
   - adds `document.documentElement.classList.add("bg-idle")` after ~1.2s of no input and removes it on
     the next `pointerdown`/`keydown`/`scroll` (idle-freeze; uses `animation:none` semantics via the class,
     matching globals).
3. The `(app)` server layout (`app/(app)/layout.tsx`) reads the override via `lib/server/user-settings.ts`
   and (a) renders `<GlassShell override={override} />`, AND (b) emits an INLINE no-flash script
   (`dangerouslySetInnerHTML`) that sets the initial `glass-real`/`glass-solid` body class synchronously
   from the override + a cheap `matchMedia` check BEFORE hydration (so there is no emulated→real flash).
4. `app/globals.css` defines the SOLID override: `body.glass-solid` forces opaque fills and DISPLAYS-NONE /
   disables the glass FX (backdrop-filter + gloss) on `.glass*`/`.cta-glass` (reuse the emulated opaque
   look; reading content already opaque). verify.sh greps `body.glass-solid`.
5. NO schema change: `git diff --name-only origin/main...HEAD` (or working tree) does NOT include
   `prisma/schema.prisma` and no new migration dir is added (`UserSettings.glassTier` already exists).
6. The client does NOT duplicate the tier matrix: `components/glass-shell.tsx` calls `resolveGlassTier(...)`
   and contains no inline capability thresholds other than the default-4 fallbacks (verify.sh: file
   references `resolveGlassTier`).
7. `npm run typecheck` exits 0 and `npm run build` exits 0.

## Constraints / decisions
- No-flash requires a synchronous inline script (React effects run post-paint). Keep it tiny: read override,
  if `real`/`solid` decided, set the class; the full `resolveGlassTier` refinement happens in `GlassShell`
  on mount (it can only DEMOTE, never cause a jarring flash, since emulated is the visual base).
- `prefers-reduced-transparency`/`prefers-contrast:more` → `glass-solid` (a11y beats everything, per §5).
- Idle-freeze uses `animation:none` semantics (not `paused`) per the globals comment — the app field is
  static already, so idle-freeze mainly quiets the mascot; keep it but cheap.
- Non-Goal: the pure matrix (task 04); reduced-motion gating of specific transitions (task 13); applying
  glass classes to components (07–10). NO schema migration.

## Plan
- [x] `lib/server/user-settings.ts` — `getGlassTierOverride()` reads UserSettings via session userId, defaults "auto".
- [x] `components/glass-shell.tsx` — client detector using resolveGlassTier + idle-freeze + prefers-* listeners.
- [x] Wire into `app/(app)/layout.tsx` (GlassShell + inline no-flash script).
- [x] Add `body.glass-solid` override CSS to globals.
- [x] typecheck + build; confirm no schema diff.

## Next
- [ ] DONE — all Plan items complete. If verify re-fails, read the FAIL line and fix that; otherwise nothing to do.

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02 ClPcs-Mac-mini: added `lib/server/user-settings.ts` exporting `getGlassTierOverride()` (`server-only`, reads `prisma.userSettings` via `getSessionUserId`, defaults `"auto"` for anon/no-row); return type `GlassTierOverride` aliased from `GlassSignals["override"]`. typecheck exits 0.
- 2026-07-02 ClPcs-Mac-mini: wired the shell into `app/(app)/layout.tsx` — `getGlassTierOverride()` read server-side (parallel with `requireUser` via `Promise.all`), `<GlassShell override={…} />` mounted, and a tiny inline `dangerouslySetInnerHTML` no-flash script emitted (runs during parse: a11y prefs → `glass-solid`, else explicit override, else "auto" gets an optimistic `glass-real` from a cheap `pointer:fine`+`min-width:761px`+`!reduced-motion` probe so GlassShell can only DEMOTE post-mount, never upgrade-flash). Added `body.glass-solid` override to `app/globals.css` @layer components (opaque fills on `.glass*`, `display:none` on all glass ::before/::after gloss + `.lens`/`.cta-glass`/`.opt` FX, `backdrop-filter:none` on `.cta-glass`) and a `.bg-idle * { animation:none !important }` idle-freeze rule. typecheck + build both exit 0; no schema/migration diff. Status → done.
- 2026-07-02 ClPcs-Mac-mini: created `components/glass-shell.tsx` (client, renders null, matches analytics-provider style). Builds `GlassSignals` on mount from `navigator.deviceMemory`/`hardwareConcurrency` (default 4), `pointer:fine`, `connection.saveData`, three `prefers-*` MQs + `innerWidth` + the server `override` prop; delegates to pure `resolveGlassTier` (no duplicated matrix) and toggles exactly one of `glass-real`/`glass-solid` on `document.body` (neither = emulated base). Re-resolves on `change` of the reduced-motion/reduced-transparency/contrast MQs; idle-freeze adds `bg-idle` to `<html>` after 1.2s of no input, clears on `pointerdown`/`keydown`/`scroll`. Non-standard `deviceMemory`/`connection` typed via a local `CapabilityNavigator` cast (absent from lib.dom). typecheck exits 0. Next: wire into `app/(app)/layout.tsx`.



## Verify
**Last verify:** PASS (2026-07-02T05:45:06Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T05:46:26Z)
