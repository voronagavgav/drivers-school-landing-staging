# Wave 17 — Performance floor (CLS reservations + deferred hosted-PSI gate)

**Status:** pinned (2026-07-05)
**Task:** wave17-12-perf-floor
**Scope:** the LOCAL, buildable half of the wave-17 perf floor — reserve layout space
so the funnel surfaces do not shift (CLS) and defer heavy/interaction-only work off first
paint (INP). The hosted p75 Core-Web-Vitals number is **Gate-0 DEFERRED** (see below).

## (a) CLS reservations made, and where

Every wave-17 funnel surface reserves its box **before** content/data/fonts arrive, so no
layout shift occurs as the funnel entry hydrates:

- **`ReadinessDial`** (`components/readiness-dial.tsx`) — dashboard hero (spec §06). SSR
  client component: renders full HTML at first paint; the inner `<svg width=140 height=140>`
  carries a fixed intrinsic box and the count-up starts at `0` on both server and client
  (`text-anchor=middle`, no reflow). The wrapping `<section>` now has an explicit
  **`min-h-[13.5rem]`** reserved box that BOTH branches (percent dial / gathering-data
  placeholder) fit inside — a greppable, content-independent reservation rather than a
  height that depends on which branch renders.
- **`EntitlementTeaser`** (dashboard / progress / mistakes locked slots) — SSR, fixed-height
  blurred placeholder blocks (`h-3` bars) inside a card. The box is reserved at first paint;
  no change needed.
- **Segment chips** (`/segment`) — fully SSR submit chips inside a `min-h-dvh` centered
  column. Reserved at first paint; no change needed.
- **`SaveProgressPrompt`** (`test/[id]`, `mt-6` below the runner) — client reveal-on-mount
  (`useState(false)` → localStorage-gated). It is the LAST element in the flow, so its
  post-value reveal shifts nothing above it. Reserving permanent space for a prompt that may
  never show would leave a permanent blank gap (worse for perceived quality), so it stays a
  non-blocking tail reveal — not a CLS regression.
- **`A2hsPrompt`** (dashboard, last element) — same class: client reveal, fails silent,
  placed last in the page → no preceding-content shift. No change.

## (b) Deferral — heavy / interaction-only work off first paint (INP)

Nothing in the wave-17 funnel does synchronous heavy work on first paint of the funnel entry:

- **`ReadinessDial` count-up** — the number animation runs in a `requestAnimationFrame` loop
  scheduled AFTER mount (post-paint), and is skipped entirely under
  `prefers-reduced-motion` (renders the final value immediately). First paint shows a static
  dial; the animation never blocks it.
- **A2HS install** — the native `prompt()` is **interaction-only**: it fires from a user
  click on the A2HS button, never on load. The `beforeinstallprompt` event is only captured
  (cheap listener); no install UI is synthesized at first paint.
- **Client reveal prompts** (`SaveProgressPrompt`, `A2hsPrompt`) — gate on a mount `useEffect`
  reading `localStorage`, not on first paint; the reveal is a post-hydration state flip at
  the tail of the page.

No wallet button / synchronous SVG-heavy widget was introduced by wave 17 beyond the dial,
which is already deferred as above.

## (c) Hosted p75 CWV pass is Gate-0 DEFERRED

The real budget — **LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1 at p75** — is measured on
**hosted PSI / CrUX against the public origin**, NOT asserted by this task's local run.

A local (fast-machine) Lighthouse/build run **hides TBT/INP** and would fabricate a passing
CWV number that does not reflect a real mid-tier phone on a real network (documented lesson
`feedback-fast-machine-hides-tbt`). This task therefore delivers the honest local half only:
the CLS reservations and deferral work above, plus this note. The hosted CWV pass is
**Gate-0 deferred** until the public origin exists.

## (c′) How to run the hosted check once the public origin exists

1. Deploy the funnel to the public origin (e.g. the production/staging URL).
2. Run PageSpeed Insights (field data = CrUX p75) against the funnel entry route(s):
   ```
   npx psi <public-origin>/dashboard --strategy=mobile
   ```
   (or the PSI web UI / the CrUX API). Use the **field / p75** column, not lab.
3. Assert p75 **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1**. CrUX needs ~28 days of real traffic to
   populate field data; until then read the lab column only as a smoke signal, and treat the
   Gate-0 pass as still deferred.

## (d) Local build baseline (funnel entry routes)

`npm run build` exits 0. Route sizes for the funnel entry surfaces are recorded in the
task journal Log for a future baseline (no hard numeric gate here — the real budget lives on
hosted PSI/CrUX).
