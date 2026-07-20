# Task: wave12a-07-app-nav-capsule

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §C (App nav). Replace `components/app-nav.tsx` (the 7-link `.nav-scroll` strip) with the glass TAB
CAPSULE: bottom-fixed on phone (thumb zone), top capsule on ≥sm. 5 targets mapping to EXISTING routes; NO
new pages. Also restyle the brand wordmark to the Світлик glyph.

PASS = ALL true:

1. `components/app-nav.tsx` renders EXACTLY these 5 primary targets, each to an EXISTING route (verify.sh
   greps each label + href):
   - `Головна` → `/dashboard`
   - `Навчання` → `/practice`
   - `Іспит` → the existing exam launcher (an existing route/anchor/action — e.g. `/dashboard` exam start;
     NOT a new page; document which in Constraints)
   - `Прогрес` → `/progress`
   - `Профіль` → `/account`
   Помилки/Збережені/Історія are NOT top-level tabs (they nest under their parent pages via existing links).
2. Active-tab state: the nav is a client component using `usePathname`; the active tab has
   `aria-current="page"` AND the soft-green active pill styling (`bg-green-soft`/`--ok-fill` pill +
   `text-green-ink`/`text-green-deep` — dark ink, NEVER white). verify.sh greps `aria-current` and
   `usePathname`.
3. Each tab target is ≥44×44px (verify.sh greps a `min-h`/`min-w`/`h-` utility ≥ 44px, e.g.
   `min-h-[44px]` or `h-14`/`py-*` producing ≥44px — assert presence of an explicit ≥44 sizing token).
4. Surface = e1 EMULATED glass: the nav container uses the `.glass-e1` class (or `glass`+`e1`) from task 03
   (no raw `backdrop-filter` in the component). Bottom bar has `env(safe-area-inset-bottom)` padding.
5. Nav is HIDDEN during a running test: when `usePathname()` matches `^/test/[^/]+` (the runner), the nav
   renders `null`. verify.sh greps for a `/test/` pathname guard returning null/hidden.
6. The old `.nav-scroll` strip is GONE: `components/app-nav.tsx` contains no `nav-scroll` className, and
   `app/globals.css` no longer defines `.nav-scroll` (removed here). verify.sh: no `nav-scroll` in either.
7. `components/brand.tsx` `Wordmark` renders the Світлик glyph (`<Svitlyk/>` or `<use href="#svitlyk"/>`)
   instead of the blue `ПДР` tile; the `bg-sign text-white` ПДР tile is removed. verify.sh: `brand.tsx`
   references svitlyk and does NOT contain `ПДР` in a `bg-sign` tile.
8. `npm run typecheck` exits 0 and `npm run build` exits 0.

## Constraints / decisions
- Follow the WAVE12A spec's 5-target set (Головна/Навчання/Іспит/Прогрес/Профіль → /dashboard, /practice,
  exam launcher, /progress, /account) — this SUPERSEDES 04-design-system §2.1's older set (Головна·Практика·
  Іспит·Помилки·Ще) for this wave.
- `Іспит` must target an EXISTING entry (no new route this wave). Record the chosen href in the Log.
- Admin link + logout stay reachable (keep them on the top bar / Профіль area; admin keeps its own nav).
- The in-test layout stays (task 10 restyles it); this task only HIDES the tab capsule on `/test/[id]`.
- Non-Goal: bottom-sheet «Ще» menu, new nested pages, W12b IA rework. 5 flat tabs + existing links only.

## Plan
- [x] Rewrite `components/app-nav.tsx` as a client tab-capsule (bottom phone / top ≥sm, usePathname active).
- [x] Add `/test/[id]` hide guard; safe-area inset; 44px targets; `.glass-e1` surface.
- [x] Restyle `components/brand.tsx` Wordmark → Світлик glyph.
- [x] Remove `.nav-scroll` from globals + component.
- [x] typecheck + build.

## Next
- [ ] (none — task complete; verify.sh green)

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02 ClPcs-Mac-mini: Rewrote `components/app-nav.tsx` as the glass tab capsule — 5 flat
  targets (Головна→/dashboard, Навчання→/practice, Іспит→/dashboard#exam, Прогрес→/progress,
  Профіль→/account). Іспит anchors to the EXISTING exam launcher (added `id="exam"`+`scroll-mt-4` on
  the dashboard "Почати тест" quick-start div — no new route). Client component (`usePathname`):
  active tab gets `aria-current="page"` + `bg-green-soft text-green-ink` pill (dark ink, never white),
  inactive `text-muted`; hidden on `/test/` (runner) via `pathname.startsWith("/test/")`. Bottom-fixed
  capsule on phone (`fixed inset-x-0 bottom-0` + `pb-[env(safe-area-inset-bottom)]`), static top capsule
  on ≥sm; `.glass-e1` surface, `min-h-[44px] min-w-[44px]` tabs. Top bar keeps brand + admin + logout.
  KEY FIX: `"use client"` on app-nav pulled `@/lib/rbac`→`@/lib/auth` (node:module) into the client
  bundle → build error. Resolved by taking `canManage`/`userName` as plain props (layout computes
  `canManageContent(user.role)` server-side); `logoutAction` stays imported (a `"use server"` module →
  action reference is client-safe). Restyled `brand.tsx` Wordmark → `<Svitlyk size={30}/>` (removed the
  `bg-sign text-white` ПДР tile). Removed `.nav-scroll` @media block from globals.css. Layout `<main>`
  gets `pb-28 sm:pb-6` so the phone bottom bar doesn't cover content. typecheck 0 · build 0 · verify.sh
  PASS.

## Artifacts
- `components/app-nav.tsx` (rewritten — glass tab capsule)
- `components/brand.tsx` (Wordmark → Світлик glyph)
- `app/globals.css` (removed `.nav-scroll` @media block)
- `app/(app)/layout.tsx` (props to AppNav; main bottom padding)
- `app/(app)/dashboard/page.tsx` (`#exam` anchor)

## Verify
**Last verify:** PASS (2026-07-02T05:56:49Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T05:58:09Z)
