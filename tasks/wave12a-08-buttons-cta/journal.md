# Task: wave12a-08-buttons-cta

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop
**Evaluate:** yes

## Goal
Spec §A CTA rule + §C Buttons. Restyle `components/ui.tsx` `Button`/`LinkButton` variants to the taste law:
primary = SOFT-GREEN fill + DARK slate-green ink (NEVER white on green, NEVER harden the green); secondary =
glass-e1 pill; destructive = coral tint + dark ink. Min 44px targets. This task OWNS the enforced CTA grep.

PASS = ALL true:

1. `components/ui.tsx` `BTN_VARIANTS.primary` uses the soft-green fill + `text-green-ink` (dark) — it
   contains `bg-green-soft` (or the `.cta-glass` class) AND `text-green-ink`, and does NOT contain
   `text-white`. verify.sh asserts this on the primary variant string.
2. CTA-RULE STATIC GATE (spec §A / §E): NO `text-white` appears on ANY green/sign-filled button class
   across `components/ui.tsx` — i.e. no `bg-sign…text-white`, `bg-green…text-white`, `.cta-glass…text-white`.
   verify.sh greps and FAILS on any such pairing.
3. `BTN_VARIANTS.secondary` = glass-e1 pill (uses `glass-e1`/`btn-ghost` or `border-line bg-card` neutral;
   NOT the blue `bg-sign`); `BTN_VARIANTS.danger`/destructive = coral/`--no-fill` tint + dark ink
   (`text-warn` or `--no-ink`), NOT `bg-danger text-white`. verify.sh: `danger` variant contains no
   `text-white`.
4. Min target size: `BTN_BASE` yields ≥44px height on the primary/large action (e.g. `min-h-[44px]` or
   `py-3`+`text-base`). verify.sh greps a ≥44px sizing token in `BTN_BASE` or a `btn-lg` variant.
5. Radii use the token scale (`rounded-pill`/`rounded-chip`/`rounded-card`), not the old `rounded-lg`
   blue-era radius (soft check: primary uses `rounded-pill` or `rounded-chip`). 
6. Focus-visible ring present on buttons (either the global `:focus-visible` from globals covers them, or a
   `focus-visible:` utility on `BTN_BASE`) — verify.sh confirms a focus-visible affordance exists (global
   rule in globals.css OR utility in ui.tsx).
7. `npm run typecheck` exits 0 and `npm run build` exits 0.
8. `npm test` exits 0 (no unit regressions).

## Constraints / decisions
- HARD taste law: soft-green fill + `--green-ink` dark text. If contrast were ever short, darken the TEXT,
  never the green fill. The a11y contrast oracle (task 13) proves the `green-soft`/`green-ink` pair ≥4.5:1.
- Keep the `Button`/`LinkButton`/`variant` API stable so all callers keep compiling (do not rename props).
- This task is where the wave-wide `text-white`-on-green regression is eliminated at the source (the token
  aliasing in task 02 made `bg-sign` green, so any leftover `bg-sign text-white` is now a violation).
- Non-Goal: Card/Badge/other ui.tsx surfaces (task 09); per-screen button usages (task 12 sweep). Just the
  button variants + the CTA gate here.

## Plan
- [x] Rewrite `BTN_VARIANTS` (primary green-soft+green-ink, secondary glass-e1, danger coral+dark ink).
- [x] Set `BTN_BASE` ≥44px + token radii + focus-visible.
- [x] Run the CTA grep gate; typecheck + build + test.

## Next
- [ ] (none — Goal met; verify.sh green.)

## Artifacts
- `components/ui.tsx` — rewrote `BTN_BASE` (min-h-[44px], py-3, no old rounded-lg) + `BTN_VARIANTS`
  (primary `bg-green-soft text-green-ink rounded-pill`; secondary `glass-e1` pill; danger
  `bg-[var(--no-fill)] text-[var(--no-ink)]`; ghost `text-green-deep`). No `text-white` anywhere.

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02T08:59Z ClPcs-Mac-mini: rewrote BTN_BASE + BTN_VARIANTS per taste law (soft-green fill +
  dark green-ink primary, glass-e1 secondary, coral no-fill/no-ink danger; ≥44px, rounded-pill token
  radii; global :focus-visible covers buttons). verify.sh PASS — CTA grep clean, typecheck+build+test
  green (37 files / 392 tests). Status → done.

## Verify
**Last verify:** PASS (2026-07-02T05:59:59Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T06:01:06Z)
