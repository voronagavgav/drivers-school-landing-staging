# Task: wave12a-09-cards-ui-restyle

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §C Cards + §C Toasts/badges. Restyle the remaining `components/ui.tsx` surfaces to the token palette:
`Card` → opaque `.solid` reading surface, `Badge` tones recolored, `SectionTitle`/`Stat`/`Field`/
`RoadProgress`/`ReadinessMeter` recolored via NEW tokens. Reading content stays OPAQUE at every tier.

PASS = ALL true:

1. `Card` renders the OPAQUE reading surface: uses `.solid` class (or `bg-card`/`bg-card-tint` + token
   `border-line` + `--float`/token shadow + `rounded-card`), and does NOT apply any glass/`backdrop-filter`
   (reading content is opaque — taste law). verify.sh: `Card` uses `bg-card`/`bg-card-tint`/`.solid` and
   no `backdrop`.
2. `Badge` tone map uses the NEW tokens (green-soft/green-deep for success, `--no-fill`/warn for
   danger/wrong, amber, neutral line) — NOT the old `bg-go`/`bg-danger`/`bg-lane`/`bg-sign` raw utilities in
   a way that reads harsh. Success badge = mint/soft-green + dark ink; wrong = peach + icon-friendly. No
   `text-white` on a tinted badge. verify.sh: `Badge` block contains no `text-white`.
3. `ReadinessMeter` tones recolored to the token ring hues (`--m-learn`/`--m-near`/`--m-strong` or the
   green/amber tokens) with DARK ink text — no harsh saturated red/blue rings, no `text-white`. (This is a
   restyle-in-place; the readiness DIAL hero is W12b out-of-scope.)
4. `RoadProgress` uses the token palette (green gradient / token track), not the old
   `--color-sign`(blue)→`--color-go` gradient literally as blue. Since task 02 aliased `--color-sign`→green,
   confirm the fill reads as calm green, not blue (verify.sh soft-checks the `.road` fill was
   token-retinted in globals per task 02; here just ensure RoadProgress still renders + no blue literal).
5. `Field` inputs use token border/focus (`border-line`, `focus:border-green-deep` or token ring), keep the
   `text-base` iOS-zoom guard on phone. verify.sh: `Field` has no `focus:border-sign` referencing blue
   intent (aliased green is fine) — soft check it uses `border-line`.
6. NO `text-white` anywhere in `components/ui.tsx` except on a genuinely dark opaque surface (not on any
   green/coral/amber tint). verify.sh: reuse the CTA-style grep across the whole file.
7. `npm run typecheck` exits 0; `npm run build` exits 0; `npm test` exits 0.

## Constraints / decisions
- Recolor via tokens ONLY — do not restructure component APIs (callers keep compiling). This is skin, not
  markup rework.
- Reading surfaces (`Card`) are OPAQUE at every tier. Glass is chrome (nav/toasts), not content.
- `DemoBadge`/`ExplanationNotice`/`LegalDisclaimer` copy stays intact (legal positioning is law); only
  their colors/tokens may change.
- Non-Goal: the dashboard readiness DIAL hero (W12b); the runner's option/feedback cards (task 10); toast
  component creation if none exists (only recolor existing Badge-based notices). Do not invent new surfaces.

## Plan
- [x] `Card` → `.solid` opaque token surface.
- [x] `Badge` tone map → tokens, no white-on-tint.
- [x] `ReadinessMeter`/`RoadProgress`/`SectionTitle`/`Stat`/`Field` → token recolor.
- [x] Grep no-white-on-tint; typecheck + build + test.

## Next
- [ ] (none) Goal fully met — all 7 PASS criteria satisfied; verify green (typecheck+build+test).

## Artifacts
- `components/ui.tsx` — `Card` = `.solid` opaque reading surface; `Badge` tones recolored to
  `--ok-fill`/`--no-fill`/amber/green-soft tokens (dark ink, no white-on-tint); `ReadinessMeter`
  rings→`--m-learn`/`--m-near`/`--m-strong` hues with dark-ink text; `Field` focus→`border-green-deep`.

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02 ClPcs-Mac-mini: restyled `Card` to use the `.solid` class (opaque `--color-card-tint` fill + `border-line` + `--float` shadow + `--radius-card`, no backdrop-filter) keeping `p-5`; `.solid` already carries radius/bg/border/shadow so the ad-hoc `rounded-xl bg-card shadow-sm` utilities are gone. Satisfies PASS #1.
- 2026-07-02 ClPcs-Mac-mini: recolored `Badge` tone map — go→`bg-[var(--ok-fill)] text-[var(--ok-ink)]` mint, danger→`bg-[var(--no-fill)] text-[var(--no-ink)]` peach, lane→`bg-amber/10 text-amber`, sign→`bg-green-soft/30 text-green-deep` (green, no residual blue); all dark-ink, no `text-white` (PASS #2). `ReadinessMeter` rings→`border-[color:hsl(var(--m-learn|near|strong))]`, ready/almost→green-deep, text→warn/amber/green-deep dark ink (PASS #3, no harsh red/blue). `Field` focus→`focus:border-green-deep`, keeps `border-line` + `text-base` iOS guard (PASS #5). `RoadProgress` `.road` unchanged (globals `--color-sign` already aliased green, task 02 — PASS #4). Grep: zero legacy `bg-go/bg-danger/bg-sign/border-*/text-white` remain (PASS #6). typecheck+build+`npm test` (392) all green (PASS #7). Goal fully met → Status: done.


## Verify
**Last verify:** PASS (2026-07-02T06:04:41Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T06:06:09Z)
