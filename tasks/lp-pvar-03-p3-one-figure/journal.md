# Task: lp-pvar-03 — P3 «Одна цифра»: one hero-scale numeral, outcome-framed

**Status:** done
**Driver:** auto
**Updated:** <UTC>
**Last compute:** laptop

## Goal
Build the `/lp/v36/p3` route: a proof band whose single dominant element is the «1 757»
numeral at display scale, framed as the user's own outcome, with 986/45 + the official-bank
claim as clearly-subordinate quiet prose. Depends on lp-pvar-02 (proofSlot prop). Booleans:

1. `app/lp/v36/p3/layout.tsx` exists and exports metadata with `robots: { index: false }`
   (route noindexed). It renders `{children}` (fonts/JSON-LD inherited from parent `V36Layout`).
2. `app/lp/v36/p3/page.tsx` exists, default-exports a component rendering
   `<V36Body hero={<HeroProspekt/>} navDark proofSlot={<P3Proof/>} />` (imports `V36Body`,
   `HeroProspekt` from `../` and the local proof component).
3. `app/lp/v36/p3/copy.ts` exists and imports the shared constants `BANK_B_FMT`, `IMG_FMT`,
   `SECTIONS`, `YEAR` from `../copy` (grep the import). It defines P3's variant-local copy
   (the outcome sentence + subordinate prose). It does NOT retype the literal `757`.
4. `app/lp/v36/p3/_proof.tsx` (or the component in page.tsx) renders EXACTLY ONE dominant
   numeral element sourcing `BANK_B_FMT` (value "1 757"), at a larger font-size/weight class
   than the supporting 986/45 prose. Browser check (verify.sh, if origin+browser available):
   inside `.proof` the element carrying "1 757" has computed `font-size` ≥ 2× the font-size of
   the element carrying "986" (the "hero-scale vs subordinate" law).
5. The band also contains, as subordinate prose: the `IMG_FMT` ("986") figure, `SECTIONS`
   ("45"), and an official-bank claim in the «Офіційний банк питань {YEAR}» register (no
   «ГСЦ МВС»).
6. Copy laws hold on ALL new files under `app/lp/v36/p3/`:
   - the literal `757` appears in NO `.tsx` file (grep `-rF 757 app/lp/v36/p3 --include=*.tsx`
     returns nothing);
   - any «підписк…» token appears only with «не »/«без » on the same line;
   - any «гаранті…» token appears only with «не » on the same line;
   - «ГСЦ МВС» appears nowhere.
7. Any new animation (reveal) uses the existing gsap pattern (`fromTo` + `immediateRender:false`)
   OR a CSS reveal that has a `prefers-reduced-motion: reduce` alternative; `verify.sh` greps the
   new files for a `prefers-reduced-motion` guard when a keyframe/gsap animation is added, else
   this is vacuously satisfied (static composition).
8. `npm run -s typecheck` exits 0.
9. Browser (served): `/lp/v36/p3` returns 200; at 390/768/1440 no horizontal document overflow;
   the numeral does not overflow (`text-wrap:balance`, clamped size — no element scrollWidth >
   clientWidth+2 in the band); `.proof` body-text contrast ≥4.5:1, large-text ≥3:1. There is NO
   duplicate default statement band on this route (exactly one `.proof` region, and it is P3's).
10. `git status --porcelain` shows changes only under `app/lp/v36/p3/` (+ this task dir).

## Constraints / decisions
- Composition asymmetric / clearly NON-row; typography carries it; no decoration competing
  with the numeral. `text-wrap:balance`; clamp the numeral so it never overflows at 390.
- Numbers VERBATIM from shared constants — never retype `757`/`986`/`45` as literals in `.tsx`.
- Honesty register: outcome framing like «Рівно стільки питань може випасти на іспиті. Усі
  вони — тут.» is a starting point; wording may be refined but must stay honest (no overclaim,
  no fake counters/press/user-totals). 986/45 subordinate, not co-equal tiles.
- Uniqueness law: apply the reference PRINCIPLE (one number at headline weight beats a row) —
  do NOT reproduce any reference site's layout. Expression 100% ours.
- Own scoped `<style>` inside `_proof.tsx` (like the hero) using only NEW class names or the
  existing `.v36` palette vars — do not edit `_body.tsx`'s STYLES.

## Plan
- [x] Scaffold `p3/{layout.tsx,page.tsx,copy.ts,_proof.tsx}` — all four present.
- [x] Compose the one-numeral band (dominant `BANK_B_FMT` + subordinate 986/45/claim prose).
- [x] typecheck; run verify.sh against the served origin — PASS (browser incl.).

## Next
- [ ] None — Goal fully met, verify.sh green (typecheck + browser at 390/768/1440). Downstream:
  lp-pvar-06 (static gates) and lp-pvar-07 (browser acceptance) run once p1/p2 also land.

## Artifacts
- `app/lp/v36/p3/layout.tsx` — noindex layout (robots.index=false), renders `{children}`;
  fonts/JSON-LD inherited from parent `V36Layout`.
- `app/lp/v36/p3/copy.ts` — variant-local copy `P3_PROOF`; imports `BANK_B_FMT`, `IMG_FMT`,
  `SECTIONS`, `YEAR` from `../copy`. No literal `757`.
- `app/lp/v36/p3/_proof.tsx` — `P3Proof`: `wrap proof` band, ONE dominant `BANK_B_FMT` numeral
  (`.p3-num`, clamp(4rem,15vw,8.6rem)) at ≥2× the «986» prose; asymmetric non-row grid;
  scoped `<style>` (new `p3-` classes + `.v36` palette vars); static (no motion).
- `app/lp/v36/p3/page.tsx` — `<V36Body hero={<HeroProspekt/>} navDark proofSlot={<P3Proof/>} />`.
- `tasks/lp-pvar-03-p3-one-figure/P3-VERIFY.txt` — captured verify output (browser dials green).

## Log
- <UTC> laptop: scaffolded by planner.
- 2026-07-20 ClPcs-Mac-mini: created `app/lp/v36/p3/layout.tsx` — minimal noindex layout
  (`robots: { index: false, follow: false }`) that returns `<>{children}</>`; fonts/JSON-LD
  come from the parent V36Layout (Goal boolean 1). Verified parent shell provides those; p2/p1
  do not yet exist. Next: p3/copy.ts.
- 2026-07-20 ClPcs-Mac-mini: created `app/lp/v36/p3/copy.ts` — `P3_PROOF` object importing
  `BANK_B_FMT`/`IMG_FMT`/`SECTIONS`/`YEAR` from `../copy` (Goal boolean 3). Defines chip
  («Офіційний банк питань {YEAR}»), outcome-framed lead, `hero=BANK_B_FMT` + unit, outcome
  sentence, subordinate detail (986 illustrated / 45 sections) + honest official-bank claim.
  No retyped `757`; no «ГСЦ МВС»/«підписк…»/«гаранті…». `typecheck` exits 0. Next: `_proof.tsx`
  + `page.tsx` wiring the one-numeral band via `proofSlot`.


- 2026-07-20 ClPcs-Mac-mini: created `_proof.tsx` (`P3Proof`) — asymmetric one-numeral band:
  chip + outcome lead, the dominant `BANK_B_FMT` numeral (`.p3-num`, clamp(4rem,15vw,8.6rem) +
  «питань» unit) then outcome/detail(986·45)/claim as quiet subordinate prose; scoped `<style>`
  with new `p3-` classes over `.v36` palette vars; static (no reveal). Wired `page.tsx`
  `<V36Body … proofSlot={<P3Proof/>}/>`. Hit the whole-file-grep trap 3×: removed the literal
  `757` from `_proof.tsx` comments (757-grep targets *.tsx incl. comments), removed «ГСЦ МВС»
  from `copy.ts` comment, and removed «gsap» from `_proof.tsx` comment (animation-detect grep
  false-tripped on the word). verify.sh now GREEN incl. browser: bands=1, no overflow, hasAll=1,
  fsBig≥2×fsSmall (64/15.2 … 137.6/16.3), contrast ≥4.5/≥3 at 390/768/1440. Status→done.


## Verify
**Last verify:** PASS (2026-07-20T11:05:13Z)

## Evaluation
**Last evaluation:** PASS (2026-07-20T11:07:26Z)
