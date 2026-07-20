# Task: wave12a-02-tokens-theme-fonts

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §A. Replace the old road-sign-BLUE theme in `app/globals.css` with the landing's «Спокій · Рідке
скло» tokens, and swap fonts in `app/layout.tsx`. VALUE SOURCE OF TRUTH: `docs/app-plan/04-design-system.md`
§1A/§1B (which mirrors `/Users/clpc/pdr-landing-site/assets/landing.css`). Port VALUES, do not invent.

PASS = ALL true:

1. `app/globals.css` `@theme` block defines the NEW palette with EXACTLY these hex values (from §1A):
   `--color-field:#FBFAF7`, `--color-ink:#1F2933`, `--color-muted:#46515D`, `--color-line:#E1E7EC`,
   `--color-green-soft:#9AD9B8`, `--color-green-deep:#226157`, `--color-green-ink:#173B30`,
   `--color-warn:#B4532E`, `--color-warm-ink:#6A4A28`, `--color-amber:#8A5E0E`, `--color-card:#FCFDFE`,
   `--color-card-tint:#F3F7F8`. (verify.sh greps each literal.)
2. RADII + EASE present in `@theme`: `--radius-tray:34px`, `--radius-glass:30px`, `--radius-card:22px`,
   `--radius-chip:16px`, `--radius-pill:999px`, `--ease-calm:cubic-bezier(0.16,1,0.3,1)`.
3. BACKWARD-COMPAT ALIASES: the OLD token names still resolve so every current usage compiles — `@theme`
   still defines `--color-sign`, `--color-asphalt`, `--color-paper`, `--color-card`, `--color-line`,
   `--color-muted` (map onto new palette values: `--color-sign` → green-deep `#226157`;
   `--color-asphalt` → ink `#1F2933`; `--color-paper` → field `#FBFAF7`; `--color-muted` → `#46515D`;
   `--color-line` → `#E1E7EC`). Also keep `--color-danger`/`--color-go`/`--color-lane`/`--color-sign-dark`
   defined (mapped to warn/green-deep/amber/green-deep respectively) so `bg-danger`/`text-go`/`bg-lane`
   utilities still exist. NOTE: aliasing `--color-sign` to a green means existing `bg-sign text-white`
   buttons now render green-on-white — that CTA-rule violation is FIXED in task 08 (buttons), not here.
4. `:root` glass-mechanics block ported verbatim from §1B: `--glass-tint`, `--glass-line`, `--e1-fill`
   `--e1-blur` `--e1-shadow`, `--e2-*`, `--e3-*`, `--rim`, `--float`, semantic state fills
   `--ok-fill`/`--ok-ink`/`--no-fill`/`--no-ink`/`--mark-fill`, mastery hues `--m-learn`/`--m-near`/
   `--m-strong`, field lobes `--anchor`/`--zone-*`. (verify.sh greps `--e1-fill`, `--rim`, `--ok-fill`,
   `--m-learn`.)
5. GLOBAL FIELD: `body`/`body::before` paints the calm STATIC pastel gradient field (radial mint/sky/peach
   at low alpha) — NO drifting blobs, NO `.drift` animation in the app (spec §A "STATIC — no drift blobs").
   verify.sh: `body::before` exists AND `app/globals.css` contains NO `@keyframes drift` and no `.drift`.
6. `app/layout.tsx`: fonts are `Nunito` (weight `["600","700"]`) wired to `--font-display` and `Manrope`
   (`["400","500","700"]`) wired to `--font-manrope`; BOTH subset `["latin","cyrillic"]` with
   `display:"optional"`. `Oswald` import is REMOVED. `@theme` `--font-display` references
   `var(--font-nunito)` (or the exposed variable) and `--font-sans` references `var(--font-manrope)`.
7. The old `.road` / `.road-fill` / `.nav-scroll` blue-strip theme CSS is removed from globals.css OR
   retained ONLY if still referenced (RoadProgress is restyled in task 09/10; if you remove `.road` here,
   task 09 must add the restyled version — DECISION: keep a `.road` class but restyle its colors to the
   token palette here so RoadProgress keeps working; `.nav-scroll` may stay until task 07 removes it).
8. `npm run typecheck` exits 0.
9. `npm run build` exits 0.

## Constraints / decisions
- VALUES come from `04-design-system.md`; do not eyeball the landing — the doc is the frozen mirror.
- Additive/compat: DO NOT rename tokens app-wide. Keep old names as aliases so tasks 07–13 migrate usages
  incrementally. Renaming everything in one task would be a giant non-atomic diff.
- STATIC field only (app perf: no idle GPU from drift). `prefers-reduced-transparency`/tier overrides land
  in tasks 03/05, not here.
- Non-Goal: component classes (`.glass`/`.cta-glass`/`.opt` — task 03), tier detection (05), button/card
  markup (08/09). This task is tokens + font wiring + field ONLY.

## Plan
- [x] Rewrite `@theme` with new palette + radii + ease + backward-compat aliases.
- [x] Add `:root` glass-mechanics block (§1B verbatim).
- [x] Add static `body::before` pastel field (radial mint/sky/peach low alpha, STATIC — no drift).
- [x] Swap fonts in `app/layout.tsx` (Nunito+Manrope, latin+cyrillic, display optional); remove Oswald.
- [x] typecheck + build.

## Next
- (none) Goal fully met — verify.sh PASSES (all token/radii/alias/glass/field/font gates + typecheck +
  build green). Downstream tasks 03–13 consume these tokens/aliases.

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02T00:00Z ClPcs-Mac-mini: rewrote `app/globals.css` `@theme` block per §1A — new
  «Спокій · Рідке скло» palette (field/ink/muted/line/green-*/warn/warm-ink/amber/card/card-tint,
  exact hex), radii (tray/glass/card/chip/pill), `--ease-calm`, and backward-compat aliases
  (`--color-sign`→green-deep, `--color-asphalt`→ink, `--color-paper`→field, `--color-danger`→warn,
  `--color-go`→green-deep, `--color-lane`→amber, `--color-sign-dark`→green-deep) so existing usages
  still compile. Fonts wired to `var(--font-nunito)`/`var(--font-manrope)` (layout swap is Plan item 4).
  body/.road still reference the aliases → no breakage. Next: `:root` glass block (§1B).
- 2026-07-02T05:40Z ClPcs-Mac-mini: (a) FIXED verify.sh false-fail — line 18 `grep -Eq "$key…"`
  where `$key` begins `--color-field` made grep parse the pattern as an OPTION
  (`unrecognized option`); added `-e` (`grep -Eq -e "$key…"`) so it's treated as a pattern. Gate
  intent unchanged (still greps each palette hex, space-tolerant). (b) Added the `:root`
  glass-mechanics block VERBATIM from doc 04 §1B after `@theme`: `--glass-tint`/`--glass-line`,
  `--e1/e2/e3-*`, `--rim`, `--float`, `--ok/no-*`+`--mark-fill`, `--m-learn/near/strong`,
  `--anchor`/`--zone-*`. Next: static `body::before` pastel field (no drift).
- 2026-07-02T06:20Z ClPcs-Mac-mini: (a) FIXED the recorded verify FAIL — the `req()` helper's
  `grep -qF "$1"` hit the SAME grep option-injection as line 18: tokens begin with `--`
  (`--radius-tray`) so grep parsed the pattern as an OPTION. Added `-e` (`grep -qF -e "$1"`); the
  token IS present, this was a gate false-fail, not missing content. (b) Added the static
  `body::before` pastel field to `app/globals.css` — fixed layer, z-index:-3, radial mint/sky/peach
  + local anchor pool at low alpha, ported VERBATIM from landing.css §"CALM PASTEL FIELD"; STATIC,
  no `@keyframes drift`/`.drift`. (c) Swapped fonts in `app/layout.tsx`: Manrope (`["400","500","700"]`
  → `--font-manrope`) + Nunito (`["600","700"]` → `--font-nunito`), both latin+cyrillic,
  `display:"optional"`; removed Oswald. verify.sh now PASSES (typecheck + build green). Status → done.


## Artifacts
- `app/globals.css` — new palette/radii/ease/aliases `@theme`, `:root` glass mechanics, static `body::before` field.
- `app/layout.tsx` — Nunito+Manrope fonts (latin+cyrillic, display optional); Oswald removed.
- `tasks/wave12a-02-tokens-theme-fonts/verify.sh` — `req()` grep `-e` fix.


## Verify
**Last verify:** PASS (2026-07-02T05:29:48Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T05:30:44Z)
