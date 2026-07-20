# Task: wave12a-03-glass-component-css

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §B (CSS half) + §C recipes. Add the reusable glass/solid/option/CTA component classes to
`app/globals.css` in an `@layer components` block, ported from `04-design-system.md` §2 / landing.css.
DEFAULT = EMULATED glass (painted fill + gloss + rim + colored shadow, ZERO `backdrop-filter`); real
`backdrop-filter` frost is applied ONLY under a `body.glass-real` opt-up (task 05 sets the class).

PASS = ALL true:

1. `app/globals.css` contains an `@layer components` block defining these classes (verify.sh greps each
   selector): `.glass`, `.glass-e1`, `.glass-e2`, `.lens`, `.solid`, `.opt`, `.cta-glass`, `.btn-ghost`.
2. EMULATED-BY-DEFAULT: `.glass-e1` and `.glass-e2` base rules set a painted background fill + `--rim`
   inset shadow + elevation shadow and DO NOT set `backdrop-filter` in the base rule. `backdrop-filter`
   for e1/e2 appears ONLY inside a `body.glass-real` … selector (verify.sh: every `backdrop-filter:`
   occurrence for `.glass-e1`/`.glass-e2` is under a `.glass-real` ancestor selector, OR under `.lens`).
3. `.cta-glass` (primary CTA): `background` uses the soft-green token (`hsl(152 47% 83% / .95)` or
   `var(--color-green-soft)`), `color: var(--color-green-ink)` (NOT white), pill radius, box-shadow with
   the green colored shadow + `--rim`, and NO `backdrop-filter`. verify.sh asserts `.cta-glass` block
   contains `--color-green-ink` (or `#173B30`) and does NOT contain `color:#fff`/`color:white`.
4. `.opt` (answer option row): min-height ≥44px, flex, chip mark, near-opaque fill, `rounded-chip`; state
   modifiers `.opt.correct` (uses `--ok-fill`/`--ok-ink`), `.opt.wrong` (uses `--no-fill`/`--no-ink`).
   The hover light-sweep is gated `@media (hover:hover)` ONLY (verify.sh: the `.opt` sweep keyframe/rule is
   inside a `@media (hover:hover)` block; no periodic/`infinite` animation on `.opt`).
5. `.solid` (reading surface): opaque `background: var(--color-card-tint)` (or `--color-card`),
   `border: … var(--color-line)`, `--float` shadow, `rounded-card`. NO `backdrop-filter` on `.solid` at
   any tier (reading content is always opaque — spec taste law).
6. `.lens` class is DEFINED (reserved for W12b signature lenses) but NO element in the app applies it this
   wave — verify.sh: `grep -rn 'className=.*\blens\b'` over `app/` and `components/` returns ZERO matches
   (ship the class, ship zero lenses).
7. NO periodic/idle gloss: `app/globals.css` `@layer components` contains no `animation:` with `infinite`
   on `.glass*`/`.cta-glass`/`.opt` (light responds to hover/press/reveal only — taste law).
8. `npm run typecheck` exits 0 and `npm run build` exits 0.

## Constraints / decisions
- Port recipes from `04-design-system.md` §2 (which mirrors landing.css). Keep the emulated recipe as the
  base; real frost is an opt-UP, never the default — the app targets weak phones.
- Reading content stays opaque at every tier (`.solid` never gets backdrop-filter). Glass is chrome only.
- `.lens` is defined-but-unused this wave (0 lenses shipped) per spec §B.
- Non-Goal: the tier-detection JS + body-class wiring (task 05); applying these classes to real components
  (tasks 07–10). This task ships the CSS vocabulary only.

## Plan
- [x] Add `@layer components` with `.glass`/`.glass-e1`/`.glass-e2`/`.lens`/`.solid`/`.opt`/`.cta-glass`/`.btn-ghost`.
- [x] Emulated base (no backdrop-filter); `body.glass-real` opt-up adds frost to e1/e2.
- [x] `@media (hover:hover)` sweep for `.opt`/`.cta-glass`; no infinite animations.
- [x] typecheck + build.

## Next
- [ ] (none — Goal met; verify.sh PASS. Follow-ups are downstream tasks 05/07–10 applying these classes.)

## Artifacts
- `app/globals.css` — appended `@layer components` block (§2 port from landing.css): `.glass`/`.glass-e1`/`.glass-e2` (emulated base, gloss+rim, no backdrop-filter), `.lens` (reserved, 0 elements), `.solid` (opaque `--color-card-tint`), `.opt` (+`.correct`/`.wrong`/`.mark`/reveal), `.cta-glass` (green-ink), `.btn-ghost`; real frost gated under `body.glass-real`; `@keyframes liquidSweep`/`softglow` (no `infinite`).

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02 ClPcs-Mac-mini: Ported full §2 component library into `app/globals.css` `@layer components`. INVERTED the landing's default→opt-down model: emulated glass (painted fill + `--rim` + gloss `::after`, ZERO backdrop-filter) is the app DEFAULT; real frost `::before` (`--e1-blur`/`--e2-blur`/`--e3-blur`) is opt-UP under `body.glass-real` only (task 05 sets it). Mapped landing var names → app tokens (`--calm-ease`→`--ease-calm`, `--font-body`→`--font-sans`, `--green-*`/`--ink`/`--muted`/`--warn`→`--color-*`, radius `--radius-md/sm`→`--radius-card/chip`). `.cta-glass` soft-green fill + `--color-green-ink` (no white), `.opt` min-height 44px + hover-only sweep (`@media (hover:hover)`), `.solid` opaque `--color-card-tint` (no backdrop-filter any tier). `verify.sh` PASS (all 8 selectors, cta green-ink guard, no-lens-in-markup, no-infinite, hover-media-query, typecheck 0, build 0).

## Verify
**Last verify:** PASS (2026-07-02T05:35:24Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T05:36:50Z)
