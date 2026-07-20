# Task: lp-pvar-02 — add optional proofSlot prop to V36Body (shared plumbing)

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** <UTC>
**Last compute:** laptop

## Goal
The ONLY structural edit the 3 variant routes need from the shared shell: make the proof
band a swappable slot on `V36Body` WITHOUT changing the canonical route's behaviour. Booleans
(each mechanically checkable; `verify.sh` runs the greps + typecheck):

1. `app/lp/v36/_body.tsx` `V36Body` gains an OPTIONAL prop `proofSlot?: React.ReactNode`
   (added to the props type + destructure). No existing prop removed/renamed.
2. The shell renders the proof region by this rule (grep the JSX):
   - `proofSlot === undefined` → renders the CURRENT band (the existing
     `<div className="wrap proof">…c.proof.statement.map…</div>` block, unchanged markup).
   - `proofSlot === null` → renders NOTHING in the proof region.
   - `proofSlot` is a node → renders `{proofSlot}` in place of the band.
   Implementation must distinguish `undefined` from `null` (e.g.
   `proofSlot === undefined ? <DefaultBand/> : proofSlot`), NOT a truthy `proofSlot && …`
   (which would drop the band when `undefined`).
3. `app/lp/v36/page.tsx` (canonical) is UNCHANGED except (optionally) nothing — it must keep
   passing no `proofSlot` so the canonical route still renders the statement band. `git diff
   --stat app/lp/v36/page.tsx` shows 0 changed lines.
4. `app/lp/v36/_hero-prospekt.tsx` has ZERO diff (`git diff --exit-code app/lp/v36/_hero-prospekt.tsx`
   exits 0).
5. `_body.tsx` diff is ADDITIVE ONLY: the diff adds the prop + the slot conditional (and, if
   needed, new CSS class names appended to `STYLES` — no existing rule edited). No existing
   `STYLES` rule text is modified (verify: the pre-existing `.v36 .proof` / `.proof-card` /
   `.proof-say` / `.proof-num` rules still present verbatim).
6. `npm run -s typecheck` exits 0.
7. Browser (served origin): canonical `/lp/v36` still renders a `.proof` element whose text
   contains "1 757", "986", "45" and "Офіційний банк питань" (the statement band intact) —
   `verify.sh` drives `$DRIVER_BROWSER_CMD` if set + origin reachable; else this criterion is
   deferred to lp-pvar-07 (record SKIP in the artifact).
8. `git status --porcelain` shows changes only under `app/lp/v36/` (+ this task dir).

## Constraints / decisions
- This is the SPEC's only sanctioned edit to `_body.tsx` (optional props + additive styles).
  Do NOT refactor the proof band, change its copy, or touch any other section.
- Keep the default band's exact current markup/classes so the canonical route is
  byte-identical in behaviour (spec AC2). Extract it inline or into a tiny local
  `DefaultProofBand()` component in `_body.tsx` — either is fine as long as the rendered DOM
  is unchanged when `proofSlot === undefined`.
- `proofSlot={null}` (P1) and `proofSlot={<node/>}` (P2/P3) are consumed by later tasks; do
  not build those here — only the prop + conditional.

## Plan
- [x] Add `proofSlot?: React.ReactNode` to the `V36Body` props type + destructure.
- [x] Replace the hardcoded proof block with `{proofSlot === undefined ? (<current band/>) : proofSlot}`.
- [x] typecheck; confirm hero zero-diff, page zero-diff, additive-only body diff.

## Next
- [x] Done — plumbing landed; verify.sh green (incl. browser proof-band check). Consumed next by lp-pvar-03/04/05.

## Log
- <UTC> laptop: scaffolded by planner.
- 2026-07-20 ClPcs-Mac-mini: added optional `proofSlot?: React.ReactNode` prop (type + destructure) to `V36Body`; wrapped the proof band in `proofSlot === undefined ? (<default band/>) : proofSlot` so canonical (undefined) keeps the statement band, `null` renders nothing, a node replaces it. No STYLES rule edited; hero + page.tsx zero-diff; only `_body.tsx` changed. `npm run -s typecheck` exit 0; `verify.sh` green (browser check passed — canonical band intact w/ figures + «Офіційний банк питань»). Status→done.

## Artifacts
- `app/lp/v36/_body.tsx` — V36Body proofSlot plumbing.
- `tasks/lp-pvar-02-proofslot-plumbing/PLUMBING-VERIFY.txt` — verify output.

## Verify
**Last verify:** PASS (2026-07-20T10:55:27Z)

## Evaluation
**Last evaluation:** PASS (2026-07-20T10:57:55Z)
