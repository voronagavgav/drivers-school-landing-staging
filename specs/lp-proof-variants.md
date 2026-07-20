# Spec: v36 proof band — 3 full-concept variants (lab routes p1/p2/p3)

## Signal / why
Danil rejected the single-statement proof band (commit 9c43077). He wants THREE
different approaches as browsable variants, one of which merges the proof into the
hero block. Direction method: principles stolen from real references
(`docs/research/proof-band-references-2026-07-20.md` — READ IT before building),
expression 100% our own. Uniqueness test: if a variant can be traced to a specific
reference site's composition, it FAILS.

## Structure / routes (canonical page untouched)
- `/lp/v36` (canonical: `page.tsx`, `_body.tsx`, `_hero-prospekt.tsx`, `copy.ts`)
  must render EXACTLY as today — zero behavioral diff for the default route.
- New lab routes: `app/lp/v36/p1/page.tsx`, `app/lp/v36/p2/page.tsx`,
  `app/lp/v36/p3/page.tsx`, each with a `layout.tsx` carrying
  `robots: { index: false }` metadata (experiments must not be indexed).
- To vary the proof presentation per route, `V36Body` may gain OPTIONAL props with
  defaults preserving current behavior (e.g. `proofSlot?: React.ReactNode` where
  `undefined` → the current band; `null` → no proof band). Adding optional props is
  the ONLY allowed edit to `_body.tsx`, plus any shared style additions that are
  additive (new class names only — no existing rule changed).
- `_hero-prospekt.tsx` must NOT be edited. P1 gets its own hero component file
  under `app/lp/v36/p1/` (may start as a copy of the canonical hero and diverge).
- Variant-local copy lives in each variant dir (importing shared constants
  `BANK_B_FMT`, `IMG_FMT`, `SECTIONS`, `YEAR`, `PASS_FIRST` from `../copy`).

## Locked identity (all variants)
Road palette tokens only (`.v36` vars) · Rubik display / Golos body · adult honest
UA voice · numbers VERBATIM from the shared constants (no new numbers, no rounding,
no retyped literals — grep: `757` must not appear in any new `.tsx`) · never
«ГСЦ МВС» · «підписка» only with «не»/«без» on the same line · «гаранті-» only with
«не » on the same line · no fake counters/press/testimonials/user-totals (we have no
users yet — content numbers only) · no gradient text, no eyebrow labels, no
identical stat-tile rows (the exact thing being replaced) · reveal motion via the
existing gsap patterns (fromTo + immediateRender:false), reduced-motion alternative
for every new animation.

## The three concepts (binding direction; craft expression is the builder's)

### P1 «До героя» — proof merged into the hero (Danil's explicit ask)
Principles applied: one fact with headline weight; checkable-over-boastful.
- The separate proof band is GONE on this route (`proofSlot={null}`); after the
  hero the body goes straight to `#features`.
- The proof lives INSIDE the hero composition as part of the night-city world —
  a single compact proof line/strip integrated into the hero's lower region
  (e.g. riding the fold edge zone), carrying the bank facts «1 757 · 986 · 45»
  with ONE of them given clear primary weight and the official-bank claim
  («Офіційний банк питань 2026» register) present. White/marking-yellow on the
  dark ground, ≥4.5:1 body / ≥3:1 large against real pixels.
- HARD safe-zone law inherited from the canonized hero: Батьківщина-мати's
  silhouette stays visible and unobstructed at 390/768/1280/1920; the added proof
  element must not cover the monument nor the phones' readable area.
- The hero copy (h1, sub, CTAs, note) stays verbatim; only the proof element is
  added and the hero's sub may drop its stat sentence if redundancy appears.

### P2 «Показати, не порахувати» — evidence strip, numbers as captions
Principles applied: product demonstrates first, numbers confirm; anchor each
figure to visible evidence of what it claims.
- The band presents REAL question images from the live restyled set: use ONLY
  existing files under `public/restyled-live/` (glob it; pick 8–12 visually varied
  ones). They are real official-bank illustrations — the evidence itself.
- The three figures are pinned to the evidence as captions/annotations (e.g. the
  strip captioned by «986 питань — з ілюстрацією до відповіді», the bank total
  anchored to the whole set), NOT floating in a row. No stat tiles.
- Honesty law: do NOT claim the images shown are all/typical of 986; caption must
  stay true (these are real illustrations from the official bank). NO overclaim
  of restyle coverage.
- Must degrade gracefully: images lazy-load, no layout shift (fixed aspect
  boxes), works at 390 (horizontal scroll or wrap — builder's craft).

### P3 «Одна цифра» — one hero-scale fact, outcome-framed
Principles applied: one number with headline weight beats a row; translate the
stat into the user's own outcome.
- «1 757» set at display scale (the single dominant element of the band), with
  outcome framing in the copy: this is exactly the pool the exam draws from, and
  all of it is here (adult phrasing, e.g. «Рівно стільки питань може випасти на
  іспиті. Усі вони — тут.» — builder may refine wording, honesty register).
- The 986/45 figures + official-bank claim appear as QUIET supporting prose
  (clearly subordinate — different size/weight class), not co-equal tiles.
- Composition asymmetric or otherwise clearly non-row; typography carries it; no
  decoration that competes with the numeral. `text-wrap:balance`, no overflow at
  390 (clamp the numeral size).

## Acceptance criteria
1. Three routes render at `/lp/v36/p1|p2|p3`, each noindexed, each matching its
   concept's binding direction above (structure checks per concept: p1 has no
   proof band after the hero and a proof element inside the hero section; p2
   renders ≥8 `<img|Image>` sources from `/restyled-live/`; p3 renders one
   dominant numeral element sourcing `BANK_B_FMT`).
2. Canonical `/lp/v36` byte-identical behavior: `_hero-prospekt.tsx` zero diff;
   `_body.tsx` diff limited to additive optional props + additive styles;
   canonical route still renders the current statement band (browser-checked).
3. `npm run -s typecheck` 0; `bash scripts/funnel-donot-guard.sh` PASS; copy laws
   greps pass on all new files (case-explicit Cyrillic classes per repo learnings).
4. Browser-verified over http://localhost:3001 at 390/768/1440 for ALL THREE
   routes + canonical: no horizontal overflow, proof text contrast ≥4.5:1 (body)
   / ≥3:1 (large) against real rendered pixels (p1 measured over the photo
   ground), P1 monument safe-zone visually confirmed (screenshot evidence),
   evidence captured to a committed artifact readable by the evaluator.
5. Task diffs touch only `app/lp/v36/**` (+ their own task dirs).
