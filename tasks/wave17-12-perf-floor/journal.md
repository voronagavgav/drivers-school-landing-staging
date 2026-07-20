# Task: wave17-12-perf-floor

**Status:** done
**Driver:** auto
**Updated:** 2026-07-05T17:20Z
**Last compute:** mac-mini

## Goal
T6/P1.6 — the LOCAL, buildable half of the perf floor: reserve layout space so the funnel surfaces
don't shift (CLS) and defer heavy widgets (INP). The hosted-PSI/CrUX p75 number is Gate-0 DEFERRED
(needs the public origin — do NOT claim a CWV pass from a local run per
[[feedback-fast-machine-hides-tbt]]). PASS = ALL true:

1. The readiness dial and every new funnel glass tile/card (offer card, save prompt, segment chips,
   A2HS/checkout surfaces) reserve their box BEFORE content loads — an explicit min-height / aspect
   container / skeleton so no layout shift occurs as data/fonts arrive. Assert (source grep or a
   documented review) that the dial container and the offer/save surfaces have a reserved size, not a
   zero-height-until-hydrated node.
2. Any heavy/interaction-only widget introduced by wave-17 (e.g. a wallet button, the SVG dial
   animation) is deferred to first interaction / lazy where reasonable — no synchronous heavy work on
   first paint of the funnel entry. Record what was deferred in Log.
3. A perf note file `docs/strategy/wave17-perf-floor.md` documents: (a) the CLS reservations made and
   where; (b) the explicit statement that the p75 CWV pass (LCP ≤2.5 / INP ≤200 / CLS ≤0.1) is
   MEASURED ON HOSTED PSI/CrUX and is Gate-0 DEFERRED — not asserted by this task's local run; (c) how
   to run the hosted check when the public origin exists.
4. `npm run build` exits 0 and does not regress bundle expectations — record the built size of the
   funnel entry route(s) in Log for a future baseline (no hard numeric gate here, since the real
   budget lives on hosted PSI).
5. `npx tsc --noEmit`, `npm test` exit 0.

## Constraints / decisions
- Do NOT fabricate a CWV pass from a local/fast-machine run — the local number hides TBT/INP
  (documented lesson [[feedback-fast-machine-hides-tbt]]). The honest deliverable here is the
  layout-stability + deferral work + a documented deferred hosted gate.
- Keep it calm/light — this wave adds surfaces; each must reserve space and not block first paint.
- Depends on: the surfaces from wave17-06/07/08/09/10 exist (so reserve their space). May run last
  among the UI tasks.

## Plan
- [x] Add/confirm reserved boxes (min-height/skeleton) on the dial + new funnel surfaces.
- [x] Defer heavy/interaction-only widgets; record what was deferred.
- [x] Write `docs/strategy/wave17-perf-floor.md` (CLS reservations + deferred hosted-PSI gate).
- [x] Run build/typecheck/unit; record route sizes.

## Audit — reserved space per funnel surface (2026-07-05)
- `ReadinessDial` (dashboard hero, spec §06): SSR client component (renders full HTML at first
  paint), inner `<svg width=140 height=140>` carries a fixed box, count-up starts at 0 both
  server+client (no reflow — `text-anchor=middle`). Was relying on content height; NOW given an
  explicit `min-h-[13.5rem]` on the `<section>` that both branches (percent dial / gathering-data)
  fit inside → greppable reserved box, satisfies PASS §1 for the named hero.
- `EntitlementTeaser` (dashboard/progress/mistakes locked slots): SSR, fixed-height blurred
  placeholder blocks (`h-3` bars) + card → box reserved at first paint. No change needed.
- `SaveProgressPrompt` (test/[id], below runner in `mt-6`): client reveal-on-mount (`useState(false)`
  → localStorage-gated). It is the LAST element in the flow, so its post-value reveal shifts nothing
  above it — intentional non-blocking reveal, not a CLS regression. No change (reserving space for a
  prompt that may never show would leave a permanent blank gap — worse).
- `A2hsPrompt` (dashboard, last element line 414): same class — client reveal, fails silent, placed
  last → no preceding-content shift. No change.
- Segment chips (`/segment`): fully SSR submit chips in a `min-h-dvh` centered column → reserved at
  first paint. No change.

## Next
- [x] All PASS items met — Status set to done. If verify re-run flags anything, re-open here.

## Artifacts
- `docs/strategy/wave17-perf-floor.md` — perf-floor note (CLS reservations, deferral pass,
  deferred hosted-PSI Gate-0, how-to-run-hosted, local build baseline).
- `components/readiness-dial.tsx` — `min-h-[13.5rem]` reserved box (prior tick).

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T00:00Z ClPcs-Mac-mini: Audited all wave-17 funnel surfaces for reserved space (see
  Audit section). Added explicit `min-h-[13.5rem]` reserved box to the `ReadinessDial` `<section>`
  (`components/readiness-dial.tsx`) — the one hero PASS §1 names — with a comment. SSR surfaces
  (teaser, segment chips) already reserve their box; the two client reveal-prompts sit last in their
  flows so their post-value reveal shifts nothing above. No CLS regression found elsewhere.
- 2026-07-05T17:20Z ClPcs-Mac-mini: Wrote `docs/strategy/wave17-perf-floor.md` (the gate that
  failed last verify — missing note). Documents (a) the CLS reservations per surface, (b) the
  deferral pass — dial count-up is post-mount rAF + reduced-motion-gated, A2HS `prompt()` is
  interaction-only (fired on click, not load), the reveal prompts gate on a mount `useEffect`
  not first paint; nothing does synchronous heavy work at funnel-entry first paint, (c) the
  Gate-0-DEFERRED hosted-PSI/CrUX p75 CWV pass + how to run `npx psi` once the public origin
  exists (honest local-half only per [[feedback-fast-machine-hides-tbt]]). `npm run build`
  exits 0; funnel entry routes (`/dashboard`, `/segment`, `/test/[id]`, `/practice`) all build
  as dynamic `ƒ` server routes — Next 16 Turbopack build output emits no per-route
  Size/First-Load-JS column here, so no numeric baseline captured (no hard gate; real budget is
  hosted PSI). Set Status: done.


## Verify
**Last verify:** PASS (2026-07-05T17:02:18Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T17:03:38Z)
