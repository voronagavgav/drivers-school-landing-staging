# Task: lp-proof-02 — recompose the v36 proof band as ONE unified typographic statement

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** <UTC>
**Last compute:** laptop

## Goal
Replace the three-identical-stat-tile dashboard in the v36 proof band with ONE unified
typographic proof statement, per `specs/lp-proof-band.md`. Touch ONLY
`app/lp/v36/copy.ts` (the `proof` key may be reshaped; number VALUES stay verbatim) and
`app/lp/v36/_body.tsx` (the proof band JSX + its `.proof*` STYLES). Each boolean is
mechanically checkable (see verify.sh):

1. **De-templated (structure).** `app/lp/v36/_body.tsx` contains NONE of the substrings
   `proof-grid`, `proof-cell`, `proof-val`, `proof-lab`, `proof-sub` (the old
   `repeat(3,1fr)` grid of identical value/label/sub cells — both its CSS rules AND its
   JSX `c.proof.stats.map` render — is gone). The builder is free to introduce new class
   names for the replacement statement block.
2. **Numbers sourced, not retyped.** `app/lp/v36/copy.ts` `proof` copy still references
   the existing constants `BANK_B_FMT`, `IMG_FMT`, and `SECTIONS` (grep copy.ts).
   `app/lp/v36/_body.tsx` contains NO retyped figure literal — specifically the substring
   `757` does NOT appear anywhere in `_body.tsx` (proving "1 757" was not hardcoded; the
   band reads the numerals from the `c.proof` copy object). No new numbers, no rounding.
3. **Numerals + chip claim render.** The chip claim text «Офіційний банк питань» survives
   in `copy.ts` `proof.chip` and is rendered by the band in `_body.tsx` (the band JSX
   references `c.proof.chip`). The three figures «1 757», «986», «45» reach the band via
   the reshaped `c.proof` copy (verified visually in lp-proof-03). Figures read as inline
   emphasized numerals inside prose, NOT as N labels-under-numbers cells.
3a. **Anchor hook for the browser test.** The band's OUTER container keeps a `proof`
   class (`<div className="wrap proof …">`) — lp-proof-03 selects `.proof` to scope its
   render / overflow / contrast measurements. Keep it (it is not one of the banned
   dashboard classes).
4. **Motion discipline.** The proof band's outer container keeps a `reveal` class (the
   existing `fromTo + immediateRender:false` gsap pattern — no new opacity:0 default). If
   any NEW `@keyframes`/animation is added inside the `.v36` STYLES for this band, a
   `@media (prefers-reduced-motion:reduce)` alternative for it is present in the same file.
   No count-up-from-0 counter is introduced (grep: no new `count`-up animation added).
5. **Copy laws (scoped to the two changed files).** Neither `copy.ts` nor `_body.tsx`
   contains «ГСЦ МВС»; any line containing «підписк» also contains «не» or «без»; any line
   containing «гаранті» also contains «не » (trailing space); «понад» does not appear in
   the proof-band copy (the exact figure is the honesty voice — no «понад 1 700»).
6. **Identity locked.** No new hex color literal is introduced in the proof band STYLES
   beyond the existing `.v36` tokens (grep the changed `.proof*` / band rules: no `#`hex
   that is not already a `.v36` var reference); no gradient-text
   (`-webkit-background-clip:text`) added; no per-number icon/lucide import added for the
   band; no eyebrow-label element.
7. **Regression gates.** `npm run -s typecheck` exits 0 and `bash scripts/funnel-donot-guard.sh`
   exits 0 (global always-green guard; it does not scan v36 but must stay green).
8. **Scope locked.** `git diff --name-only` for this task (excluding `tasks/`) lists EXACTLY
   `app/lp/v36/_body.tsx` and `app/lp/v36/copy.ts` — nothing else. `app/lp/v36/_hero-prospekt.tsx`
   has zero diff. In `_body.tsx` the section order is unchanged: the proof band still sits
   between the swappable hero slot (`{hero}`) and `<section className="sec" id="features">`.

## Constraints / decisions
- Binding design direction is `specs/lp-proof-band.md` §"Binding design direction" 1–7 —
  read it in full. The seam/hero are canonized: do NOT edit the hero, do NOT darken the band
  (stays on `--bg`), do NOT change section order.
- The composition is the builder's craft WITHIN the constraint "ONE unified typographic
  proof statement" (a single large honest sentence in the Rubik display face where 1 757 ·
  986 · 45 sit inline as emphasized numerals, qualifiers reading as prose). NOT N tiles.
- Numbers VERBATIM from `BANK_B_FMT`/`IMG_FMT`/`SECTIONS` — no re-typed literals, no
  rounding, no new numbers (spec §5, AC2).
- Reference the lp-proof-01 FINDINGS.md for the exact current markup + guard scope.
- Do NOT add the band to `scripts/funnel-donot-guard.sh` (out of scope; that guard owns
  the app funnel surfaces, not the landing).
- The rendered no-overflow / contrast / cross-width proof is lp-proof-03's job (browser).
  This task's verify.sh is static (structure + greps + typecheck + guard + scope).

## Plan
- [x] Read the spec's binding direction §1–7 and lp-proof-01 FINDINGS.md.
- [x] Reshape `copy.ts` `proof` key: keep `chip` verbatim; recast the three figures +
      qualifiers into a prose-friendly `statement` segment array (still sourcing
      BANK_B_FMT/IMG_FMT/SECTIONS).
- [x] Rewrite the proof band JSX in `_body.tsx` as one statement block; delete the
      `.proof-grid/.proof-cell/.proof-val/.proof-lab/.proof-sub` CSS rules + their mobile
      overrides; add the new `.proof-say/.proof-num` styles using existing `.v36` tokens.
- [x] Keep the band's `reveal` class; no new animation added (reveal-only) → no
      reduced-motion alt needed.
- [x] Run verify.sh; green.

## Next
- [x] DONE — proof band recomposed as ONE display-face sentence; verify.sh green.
      Rendered no-overflow / contrast / cross-width proof is lp-proof-03's job (browser).

## Artifacts
- app/lp/v36/copy.ts — reshaped `proof` copy key (values verbatim).
- app/lp/v36/_body.tsx — recomposed proof band JSX + STYLES.

## Log
- <UTC> laptop: scaffolded by planner.
- 2026-07-20T00:00Z ClPcs-Mac-mini: recomposed the proof band as ONE unified typographic
  statement. copy.ts: replaced `proof.stats[3]` + unused `lead` with a `proof.statement`
  segment array — a single display-face sentence «Повний офіційний банк категорії B — усі
  1 757 питань, з них 986 з ілюстрацією до відповіді, розкладені по 45 розділах. Справжній
  банк, а не демо.» where each segment is `{text,num}` (num:true = emphasized figure);
  figures still sourced verbatim from BANK_B_FMT/IMG_FMT/SECTIONS. _body.tsx: JSX now maps
  `c.proof.statement` into a `<p className="proof-say">` with `<b className="proof-num num">`
  inline numerals (chip preserved, outer `proof` + `proof-card reveal` classes kept); deleted
  the `.proof-grid/-cell/-val/-lab/-sub` CSS rules + their ≤620px mobile overrides; added
  `.proof-say` (clamp display sentence, 24ch, text-wrap:balance) + `.proof-num` (blue-700,
  800). No new animation → reveal-only, no reduced-motion alt required. No new hex/gradient/
  icon/eyebrow. verify.sh green (typecheck 0, funnel-guard clean, two-file scope, order intact).

## Verify
**Last verify:** PASS (2026-07-20T10:21:40Z)

## Evaluation
**Last evaluation:** PASS (2026-07-20T10:23:14Z)
