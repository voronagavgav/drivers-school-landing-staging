# Task: wave3-feat-06-sparkline-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add a PURE helper that turns a series of readiness scores into sparkline geometry (points + SVG path),
with colocated unit tests. Spec C (the pure-helper half). No DB and no rendering here (task 07 renders it).

1. New file `lib/sparkline.ts` exports a pure function (e.g. `sparkline`) with a documented signature like
   `sparkline(values: number[], opts?: { width?: number; height?: number; padding?: number }):
   { points: { x: number; y: number }[]; path: string; width: number; height: number }`.
2. Geometry is correct: with ≥2 values, `points.length === values.length`; x-coordinates are evenly spread
   across the drawable width (first point at the left edge + padding, last at the right edge − padding);
   y-coordinates map value→pixel with the MAX value at the top and MIN at the bottom (y inverted for SVG),
   staying within `[padding, height − padding]`. `path` is a valid SVG polyline path string beginning with
   `M` and containing `L` segments for the remaining points.
3. Degenerate inputs are handled without `NaN`/throw: empty array → `points: []` and an empty (or `"M"`-only)
   `path`; a single value → one point; all-equal values → a flat horizontal line at the vertical midpoint
   (no divide-by-zero).
4. `lib/sparkline.ts` is PURE: it does NOT contain any of the tokens `server-only`, `@/lib/db`,
   `@prisma/client`, or `lib/generated`, and contains no JSX/React import (geometry only — task 07 renders
   the SVG). Deterministic: no `Math.random`.
5. `lib/sparkline.test.ts` imports the function from `@/lib/sparkline` and covers: empty, single value,
   all-equal (flat midline), an increasing series (monotonic y trend matching the inversion), point count,
   and that `path` starts with `M`.
6. `npm test` exits 0 (zero failures) and includes `lib/sparkline.test.ts`; `npm run typecheck` exits 0.

## Constraints / decisions
- Pure geometry module only — return numbers/strings, NOT JSX. The dashboard (task 07) wraps the `path` in
  an `<svg><path/></svg>`. This keeps the helper unit-testable without a DOM.
- Default `width`/`height`/`padding` to small inline-sparkline values (e.g. 120×32, padding 2) via the
  opts defaults; document them.
- Round coordinates to a fixed precision (e.g. 2 decimals) so `path` strings are stable for snapshot-style
  assertions.
- Non-Goal: colors, axes, tooltips, gradients, or reading data from the DB. Geometry + path string only.

## Plan
- [x] Write `lib/sparkline.ts` (normalize values → points → `M…L…` path).
- [x] Write `lib/sparkline.test.ts` (cases above); `npm test` + `npm run typecheck`; run verify.sh.

## Done
- [x] Implemented `sparkline()` pure geometry helper: min/max normalize (range==0 → flat midline, no divide-by-zero), evenly-spaced x (left+pad → right−pad, single point centred), inverted y (max top / min bottom), `M…L…` path, 2-dp rounding.
- [x] Authored `lib/sparkline.test.ts` (empty, single, all-equal flat midline, even-x spread, y-inversion monotonicity, path `M`/`L` shape + exact string).
- [x] verify.sh PASSES: typecheck clean, 114 tests pass, sparkline.test.ts included.

## Next
- [ ] (none — goal met; ready for task wave3-feat-07 to render the path into an SVG)

## Artifacts
- lib/sparkline.ts — pure sparkline geometry/path helper.
- lib/sparkline.test.ts — unit tests.
- tasks/wave3-feat-06-sparkline-pure/verify.sh — purity + export + tests gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T15:36Z ClPcs-Mac-mini: wrote lib/sparkline.ts + lib/sparkline.test.ts; reworded a doc comment to drop the literal `<svg>…</svg>` markup (verify's whole-file `</|/>` grep false-flagged it as JSX); verify.sh PASS (typecheck 0, 114 tests, sparkline.test.ts listed). Status→done.

## Verify
**Last verify:** PASS (2026-06-17T12:37:37Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T12:39:11Z)
