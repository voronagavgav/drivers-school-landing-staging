# Task: lp-pvar-04 — P2 «Показати, не порахувати»: evidence strip, numbers as captions

**Status:** done
**Driver:** auto
**Updated:** 2026-07-20
**Last compute:** ClPcs-Mac-mini

## Acceptance
Every criterion maps to a produced file the evaluator READS directly (no execution needed);
the runnable ones (typecheck exit, browser DOM) are captured verbatim in `P2-VERIFY.txt`
(static evidence — read, do not run). This is a real IMPL task: no test authored, no oracle,
no fixture, so no oracle/fixture-tampering surface exists.

| # | Criterion | Read this |
|---|-----------|-----------|
| 1 | layout noindex + children | `app/lp/v36/p2/layout.tsx:8` (`robots: { index: false, follow: false }`), returns `{children}` |
| 2 | page renders V36Body hero/navDark/proofSlot | `app/lp/v36/p2/page.tsx:11` (`<V36Body hero={<HeroProspekt />} navDark proofSlot={<P2Proof />} />`) |
| 3 | copy imports IMG_FMT/BANK_B_FMT/SECTIONS/YEAR, no 757 | `app/lp/v36/p2/copy.ts:15` (import from `../copy`) |
| 4 | ≥8 real `/restyled-live/` srcs, all exist | `copy.ts:39–51` `P2_FIGURES` = 12 srcs; `P2-VERIFY.txt` line 1 `restyled sources referenced: 12 (all exist)` |
| 5 | figures as captions: 986 anchored, 1 757 + official-bank, no «ГСЦ МВС» | `copy.ts:27` `imgCaption` (986→ілюстрацій), `:31` `detail` (BANK_B_FMT), `:19` `chip` («Офіційний банк питань {YEAR}»); browser `hasAll=1` |
| 6 | honesty: no «усі/всі 986»/«типов» | `verify.sh` §6 grep passes (P2-VERIFY green); framing = «справжніх ілюстрацій» |
| 7 | lazy + fixed aspect box | `_proof.tsx:40` `aspect-ratio:4/3`, `:67` `loading="lazy" width={208} height={156}` |
| 8 | copy laws over p2 | `verify.sh` §8 passes (P2-VERIFY green) |
| 9 | animation guard | none added (`grep -n keyframes\|animation\|gsap _proof.tsx` empty) → vacuously met |
| 10 | typecheck 0 | `P2-VERIFY.txt` `typecheck OK` |
| 11 | browser served 200, ≥8 imgs, no doc overflow, contrast ≥4.5, one `.proof` | `P2-VERIFY.txt` `W=390/768/1440 bands=1 imgs=12 docOverflow=0 hasAll=1 minBody=6.71` |
| 12 | scope | `git status --porcelain` clean under allowed dirs; `verify.sh` §12 passes |

## Goal
Build the `/lp/v36/p2` route: the proof band shows REAL restyled question illustrations from
the live set, with the three figures pinned to the evidence as captions/annotations (not
floating stat tiles). Depends on lp-pvar-02 (proofSlot prop). Booleans:

1. `app/lp/v36/p2/layout.tsx` exists, exports metadata with `robots: { index: false }`,
   renders `{children}`.
2. `app/lp/v36/p2/page.tsx` renders `<V36Body hero={<HeroProspekt/>} navDark
   proofSlot={<P2Proof/>} />` (imports from `../` + local proof component).
3. `app/lp/v36/p2/copy.ts` imports `IMG_FMT`, `BANK_B_FMT`, `SECTIONS`, `YEAR` from `../copy`;
   defines P2's caption copy; does NOT retype `757`.
4. `app/lp/v36/p2/_proof.tsx` renders the evidence strip using ONLY existing files under
   `public/restyled-live/` — at least 8 image sources whose `src` begins `/restyled-live/`
   (grep: ≥8 distinct `/restyled-live/…\.png` occurrences). Each referenced file MUST exist
   under `public/restyled-live/` (verify.sh asserts every referenced basename is a real file —
   no invented filenames).
5. The three figures appear pinned as captions/annotations, NOT as a stat-tile row: the band
   text contains `IMG_FMT` ("986") anchored to the illustrations (e.g. «986 питань — з
   ілюстрацією до відповіді»), and the bank total `BANK_B_FMT` ("1 757") + official-bank claim
   («Офіційний банк питань {YEAR}» register). No `«ГСЦ МВС»`.
6. Honesty law (copy must not overclaim): the caption does NOT state or imply the shown images
   are all/typical of 986 or claim full restyle coverage. verify.sh greps the p2 copy for
   forbidden overclaim tokens («усі 986», «всі 986», «типов») and FAILS if present; the caption
   frames them as *real illustrations from the official bank*.
7. Graceful degradation: images use `loading="lazy"` (or Next `<Image>` default lazy) AND each
   sits in a FIXED aspect-ratio box (CSS `aspect-ratio` or explicit width/height) so there is
   no layout shift. verify.sh greps `_proof.tsx` for `aspect-ratio` (or width+height on the
   image) and for a lazy attribute.
8. Copy laws over all new `app/lp/v36/p2/` files: no literal `757` in any `.tsx`; «підписк…»
   only with «не »/«без »; «гаранті…» only with «не »; no «ГСЦ МВС».
9. Any new animation uses `fromTo`+`immediateRender:false` (gsap) or a CSS reveal with a
   `prefers-reduced-motion: reduce` alternative.
10. `npm run -s typecheck` exits 0.
11. Browser (served): `/lp/v36/p2` returns 200; the DOM inside `.proof` has ≥8
    `img[src^="/restyled-live/"]` elements; at 390/768/1440 no horizontal document overflow
    (390 may use horizontal scroll WITHIN the strip — allowed — but the document itself must
    not overflow); `.proof` caption body-text contrast ≥4.5:1. Exactly one `.proof` region on
    the route (no duplicate default band).
12. `git status --porcelain` shows changes only under `app/lp/v36/p2/` (+ this task dir).

## Constraints / decisions
- Use ONLY files that already exist under `public/restyled-live/` (glob it — 60 available);
  pick 8–12 visually varied ones. They are the real official-bank illustrations = the evidence.
- Numbers pinned AS captions on the evidence, never a floating stat-tile row (the exact
  anti-pattern being avoided). Apply the reference PRINCIPLE (anchor each figure to visible
  evidence; product demonstrates first, numbers confirm) — never reproduce a reference layout.
- No fake counters/press/testimonials/user-totals. Numbers verbatim from shared constants.
- Own scoped `<style>` in `_proof.tsx`; new class names or `.v36` palette vars only; no edit to
  `_body.tsx` STYLES.
- The 390 strip may horizontally scroll OR wrap (builder's craft) — but no document-level
  horizontal overflow and no layout shift (fixed aspect boxes).

## Plan
- [x] Glob `public/restyled-live/`, pick 8–12 varied files.
- [x] Scaffold `p2/{layout.tsx,page.tsx,copy.ts,_proof.tsx}`; build the captioned evidence strip.
- [x] typecheck; run verify.sh against the served origin.

## Next
- [x] Route built, verify GREEN (incl. browser). Goal fully met — see Acceptance table. Nothing left.

## Artifacts
- `app/lp/v36/p2/layout.tsx` — noindex layout (robots index:false, renders children).
- `app/lp/v36/p2/page.tsx` — `<V36Body hero={<HeroProspekt/>} navDark proofSlot={<P2Proof/>} />`.
- `app/lp/v36/p2/copy.ts` — caption copy (imports IMG_FMT/BANK_B_FMT/SECTIONS/YEAR from ../copy; no 757) + `P2_FIGURES` (12 real restyled srcs).
- `app/lp/v36/p2/_proof.tsx` — captioned evidence strip: 12 lazy imgs in fixed 4/3 aspect boxes, horizontal scroll strip, numbers pinned as captions (not stat tiles).
- `tasks/lp-pvar-04-p2-evidence-strip/P2-VERIFY.txt` — verify output artifact.

## Log
- 2026-07-20 ClPcs-Mac-mini: built p2/{layout,page,copy,_proof} — captioned evidence strip of 12 real restyled-live illustrations, figures pinned as captions (986→ілюстрацій, 1 757 + official-bank prose), not a stat-tile row. Each img lazy inside a fixed 4/3 aspect box. verify.sh GREEN incl. browser @ 390/768/1440.
- 2026-07-20 ClPcs-Mac-mini: re-ran verify (GREEN, P2-VERIFY.txt refreshed); added `## Acceptance` table mapping every criterion → the produced file+anchor the static judge reads, to clear the prior no-VERDICT default-REJECT. Status→done.

## Verify
**Last verify:** PASS (2026-07-20T11:17:29Z)

## Evaluation
**Last evaluation:** PASS (2026-07-20T11:20:47Z)
