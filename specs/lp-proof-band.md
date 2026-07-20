# Spec: v36 landing — proof band rework («Офіційний банк» section after the hero)

## Signal / why
The section directly after the canonized «Проспект» hero (`app/lp/v36/_body.tsx`, the
`.proof` block) is the classic hero-metric template: three identical big-number stat
tiles (value / label / sub) in a floating white card. That composition is a known
AI/SaaS-template tell (impeccable absolute ban: "big number, small label, supporting
stats") and it occupies the most valuable slot on the page — the first thing a visitor
reads after the fold. The NUMBERS are load-bearing real proof (real dev.db counts) and
must stay; the PRESENTATION must stop being a dashboard.

## Scope
- `app/lp/v36/_body.tsx` — the proof band STYLES + JSX only.
- `app/lp/v36/copy.ts` — the `proof` copy key may be reshaped (values stay verbatim).
- NOTHING else: hero file `_hero-prospekt.tsx` untouched; section ORDER unchanged
  (hero → proof → features → …); no other section edited.

## Binding design direction (director's taste — not negotiable)
1. **The seam is canonized.** The dark hero ends in a crisp edge with the phone
   captures bridging into the LIGHT body. The proof band stays on the light ground
   (`--bg`); do not turn it into a dark band and do not touch the hero/seam.
2. **De-template.** The replacement must NOT be N identical stat tiles / cells in a
   row. Compose the three real figures as ONE unified typographic proof statement —
   e.g. a single large honest sentence in the display face where the figures
   (1 757 · 986 · 45) sit inline as emphasized numerals, with their qualifiers
   reading as prose, not as labels under numbers. One block, one voice. The exact
   composition is the builder's craft within this constraint.
3. **Keep the claim.** The green-dot chip claim «Офіційний банк питань 2026» (or its
   verbatim copy.ts text) must survive somewhere in the band.
4. **Identity locked.** Road palette only (existing tokens in `.v36`), Rubik display /
   Golos body, adult honest UA voice, rounded v36 language. No new hues, no gradient
   text, no metaphor illustrations, no icons-per-number, no eyebrow labels.
5. **Numbers verbatim.** Use the existing constants (`BANK_B_FMT` "1 757", `IMG_FMT`
   "986", `SECTIONS` 45) from copy.ts — no re-typed literals in JSX, no new numbers,
   no rounding («понад 1 700» is banned — the exact figure IS the honesty voice).
6. **Motion discipline.** Reveal via the existing `.reveal` gsap pattern
   (fromTo + immediateRender:false). Any new animation gets a
   prefers-reduced-motion:reduce alternative. No scroll-jacking, no counters that
   count up from 0 (template tell; the number is real — show it real).
7. **Copy laws (guard-enforced).** Never «ГСЦ МВС»; «підписка» only with «не»/«без»
   on the same line; «гаранті-» only with «не » on the same line.

## Acceptance criteria (each boolean)
1. The rendered band no longer contains three visually identical value/label cells;
   the three figures appear inside one unified statement block (structure check:
   the old `.proof-grid`/`.proof-cell` three-tile markup is gone or fundamentally
   recomposed).
2. «1 757», «986», «45» and the chip claim text all render in the band, sourced from
   the existing copy.ts constants (grep: `BANK_B_FMT` and `IMG_FMT` referenced by the
   proof copy; no hardcoded `1 757` string added to `_body.tsx`).
3. `npm run -s typecheck` exits 0 and `bash scripts/funnel-donot-guard.sh` PASSes.
4. Browser-verified over the real dev server (http://localhost:3001/lp/v36) at
   390 / 768 / 1440 widths: no horizontal overflow, no text clipped, band text
   contrast ≥ 4.5:1 (body) / ≥ 3:1 (large display) against its ground; verification
   stdout captured to a committed artifact file the evaluator can READ.
5. `_hero-prospekt.tsx` has zero diff; the section order in `_body.tsx` main is
   unchanged (hero slot → proof → #features → …).
6. `git diff` for the task touches only `app/lp/v36/_body.tsx` and
   `app/lp/v36/copy.ts` (plus the task's own journal/artifacts).
