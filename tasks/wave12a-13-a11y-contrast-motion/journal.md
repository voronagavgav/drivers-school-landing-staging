# Task: wave12a-13-a11y-contrast-motion

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop
**Evaluate:** yes

## Goal
Spec §D. A11y + motion floor for the restyled screens: token focus-visible rings, non-color-only
correctness signalling, an AUTOMATED contrast check that the CTA/text token pairs meet WCAG 4.5:1, and
`prefers-reduced-motion` gating. The contrast check is a PURE unit test whose oracle is the WCAG 2.1 SC
1.4.3 relative-luminance formula (NAMED external source) — anchored by known values frozen below.

### Contrast oracle (WCAG 2.1 SC 1.4.3)
Relative luminance: for each 8-bit channel `c8`, `c = c8/255`; `cl = c <= 0.03928 ? c/12.92 :
((c+0.055)/1.055)**2.4`; `L = 0.2126*rl + 0.7152*gl + 0.0722*bl`. Contrast ratio =
`(Llight+0.05)/(Ldark+0.05)`. FROZEN anchors the test MUST assert (computed at plan time):
- `contrast(#000000, #FFFFFF)` = **21.0** (±0.05) — proves the formula is the real WCAG one, not a fake.
- `contrast(#FFFFFF, #FFFFFF)` = **1.0** (±0.01).
- `contrast(#173B30, #9AD9B8)` (green-ink on green-soft, the CTA pair) ≈ **7.62** — assert `> 7.0` AND
  `>= 4.5` (this is the exact taste-law pair: dark ink on soft green, never white).

PASS = ALL true:

1. `lib/contrast.ts` (or `lib/a11y-contrast.ts`) exists and exports a PURE `contrastRatio(hexA, hexB)` +
   `relativeLuminance(hex)` implementing the WCAG formula above. PURITY: no `server-only`/`@/lib/db`/
   `@prisma/client`/`lib/generated`/`Math.random`/`Date.now`/`new Date`/DOM tokens.
2. `lib/contrast.test.ts` exists, is in the unit suite (`npx vitest list` shows it), asserts the 3 FROZEN
   anchors above, AND asserts `contrastRatio(text, fill) >= 4.5` for EACH of these token pairs (values from
   `04-design-system.md` §1A / §7), with the pair hexes written as LITERALS in the test:
   - `#173B30` on `#9AD9B8` (CTA: green-ink / green-soft)
   - `#1F2933` on `#FCFDFE` (ink / card)
   - `#1F2933` on `#F3F7F8` (ink / card-tint)
   - `#1F2933` on `#FBFAF7` (ink / field)
   - `#46515D` on `#FCFDFE` (muted / card)
   - `#226157` on `#FCFDFE` (green-deep / card)
   - `#8A5E0E` on `#FCFDFE` (amber / card)
   - `#0F3B2E` on `#DDF1E7` (ok-ink / an opaque bake of `--ok-fill` hsl(152 46% 90%); use this hex)
   - `#7D3A1F` on `#F6E2DA` (no-ink / an opaque bake of `--no-fill` hsl(16 50% 93%); use this hex)
   If any pair is `< 4.5`, the FIX is to darken the TEXT token (never harden the green fill) — but per the
   doc the chosen tokens already pass; a failure means a token was mis-copied.
3. Focus-visible: `app/globals.css` `:focus-visible` uses a TOKEN color (`--color-green-deep`/green-deep,
   not the old blue `--color-sign` literal-blue). verify.sh: `:focus-visible` rule references green-deep or
   a token, not `#1e5bbf`.
4. Non-color-only signalling: the runner correctness states carry icon + text (✓/✗ + «Правильно»/
   «Неправильно») — asserted here too (guards against a regression from task 10). verify.sh greps the runner.
5. `prefers-reduced-motion` gating: every non-opacity transition/animation (sweeps, count-ups, the `.road`
   fill transition, mascot) is inside a `@media (prefers-reduced-motion: no-preference)` guard OR disabled
   under `@media (prefers-reduced-motion: reduce)`. verify.sh: globals.css contains `prefers-reduced-motion`
   and no un-guarded `animation:` with a duration on `.glass*`/`.opt`/`.cta-glass` outside a reduced-motion
   or hover media block (soft check: at least the reduced-motion guard exists and covers the sweeps).
6. `npm run typecheck` 0; `npm test` 0 (with the new contrast test passing); `npm run build` 0.

## Constraints / decisions
- The oracle is the WCAG formula + the 3 frozen anchors — the implementer may NOT tweak expected numbers to
  match a buggy luminance impl (the 21.0 anchor catches a wrong formula immediately).
- `--ok-fill`/`--no-fill` are HSL-with-alpha in the glass block; for the contrast test use the OPAQUE baked
  hexes given above (the reading tiers render them opaque). If the implementer computes different bakes,
  they must be the opaque-over-card composite — but the provided hexes are the accepted values.
- If a real pair fails 4.5:1, darken the TEXT token and re-run; do NOT weaken the test threshold.
- Non-Goal: full axe/lighthouse a11y audit (post-wave e2b step); ARIA rework beyond preserving existing
  labels. This is the contrast + focus + motion floor.

## Plan
- [x] `lib/contrast.ts` — WCAG relativeLuminance + contrastRatio (pure).
- [x] `lib/contrast.test.ts` — 3 anchors + 9 token-pair ≥4.5 assertions (literal hexes).
- [x] Token focus-visible ring in globals; confirm runner icon+label; reduced-motion guards.
- [x] typecheck + test + build.

## Next
- [x] Goal fully met — all 6 PASS conditions green (verify.sh PASS). No further increment.

## Log
- 2026-07-02 laptop: planner scaffolded task; froze WCAG anchors (black/white=21.0; CTA pair≈7.62).
- 2026-07-02T00:00Z ClPcs-Mac-mini: created pure `lib/contrast.ts` (relativeLuminance + contrastRatio per WCAG 2.1 SC 1.4.3; hex parse supports #RGB/#RRGGBB). tsx smoke confirms all frozen anchors — black/white=21, white/white=1, CTA #173B30/#9AD9B8=7.621, and all 9 token pairs ≥4.5 (min = amber #8A5E0E/#FCFDFE=5.591). No server-only/db/clock/random/DOM tokens (Math.max/min only). Artifacts: lib/contrast.ts.
- 2026-07-02T09:33Z ClPcs-Mac-mini: added `lib/contrast.test.ts` (vitest, matches glass-tier.test.ts style — `it.each` for the 9 token pairs, literal hexes; 3 frozen anchors black/white=21, white/white=1, CTA>7.0 & ≥4.5). `npx vitest list` shows `lib/contrast.test.ts`; suite green (13/13). Artifacts: lib/contrast.test.ts.
- 2026-07-02T09:36Z ClPcs-Mac-mini: closed §D floor in app/globals.css. (3) `:focus-visible` ring `var(--color-sign)`→`var(--color-green-deep)` (canonical token, sheds the confusingly-named sign alias). (4) confirmed runner non-color signalling already present — option marks render `✓/✗` (aria-hidden) + sr «правильна/неправильна відповідь» (test-runner.tsx:318-322) AND the practice-feedback Badge carries «Правильно»/«Неправильно» text (:353); no regression from task 10. (5) added a `@media (prefers-reduced-motion: reduce)` block killing `animation`+non-opacity `transition` on `.glass*`/`.opt`(+`.reveal-soft`/`::after`)/`.cta-glass`(+`::before`)/`.btn-ghost`/`.road-fill` — the hover sweeps + one-shot `softglow` reveal + lift/scale + road-fill grow all neutralized; opacity fades left intact (vestibular-safe). Mascot is static (no float) so nothing to gate; no count-up animation exists in globals. typecheck 0, unit 405/405, build 0, verify.sh PASS. Status→done. Artifacts: app/globals.css.



## Verify
**Last verify:** PASS (2026-07-02T06:36:52Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T06:37:49Z)
