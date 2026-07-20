# Task: wave13-08-runner-srcset

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
Responsive question images (spec §C): `srcset` 360/540/720 + `sizes`, explicit dimensions (CLS),
lazy below the fold. PASS = ALL true:

1. PURE helper in `lib/image-resolve.ts`: `imageSrcSet(key: string): string | null` returning EXACTLY
   `"/api/q-image/<key>?w=360 360w, /api/q-image/<key>?w=540 540w, /api/q-image/<key>?w=720 720w"`
   (null for an unsafe key — reuse `isSafeKey`). Built from `IMAGE_VARIANT_WIDTHS`, not hardcoded
   numbers.
2. ORACLE unit test (frozen literal) in `lib/image-resolve.test.ts`:
   `imageSrcSet("11_10_0")` === `"/api/q-image/11_10_0?w=360 360w, /api/q-image/11_10_0?w=540 540w, /api/q-image/11_10_0?w=720 720w"`;
   `imageSrcSet("../etc")` === `null`.
3. Every `<img>` rendering `/api/q-image` (grep `resolveImageSrc|q-image` across app/ + components/ —
   per wave13-01 findings this is the question image in `components/test-runner.tsx`; extend any
   other site the grep reveals) gains: `srcSet={imageSrcSet(key)}`, a `sizes` attribute (e.g.
   `(max-width: 720px) 100vw, 720px` — match the actual rendered box), explicit `width` + `height`
   attributes with CSS `w-full h-auto` (aspect-ratio hint for CLS without distorting variable-ratio
   originals), and Ukrainian `alt` preserved.
4. Lazy-loading is applied ONLY below the fold: the ACTIVE question image stays eager (it IS the LCP
   candidate); any secondary/list instances get `loading="lazy"`. If the runner renders exactly one
   image at a time, `loading` is omitted there and the decision recorded in the increment log.
5. Grep gates: `components/test-runner.tsx` contains `srcSet`, `sizes=`, `width=`, `height=` on the
   question image element; no site renders `/api/q-image` without `srcSet` afterwards.
6. `npm test` exits 0; `npx vitest list` (var-captured) includes lib/image-resolve.test.ts;
   `npm run typecheck` exits 0.
7. Browser spot-check (best-effort, server permitting): drive a practice run with
   `$DRIVER_BROWSER_CMD`; if the drawn question has an image, eval
   `document.querySelector('img[src*="q-image"]').srcset.includes("?w=540 540w")` → true. The drawn
   set may legitimately contain no image — then note it and rely on gates 1–6.
8. `bash tasks/wave13-08-runner-srcset/verify.sh` exits 0.

## Constraints / decisions
- Plain `<img>` + our proxy route stays (NOT next/image — the resolver route is the contract and
  next/image would double-proxy). The base `src` keeps working unchanged for non-srcset consumers.
- The browser picks a variant only when wave13-06's negotiation is live; before that, `?w=` URLs fall
  through to the original — srcset is safe to land independently (graceful).
- `sizes` must reflect the runner's real CSS box; read the runner layout before choosing the literal.
- REDUCED SCOPE note: spec says "runner + result"; if wave13-01 confirmed the result page renders no
  question images, this task touches only the runner (record in log).

## Plan
- [x] Add imageSrcSet + oracle test; wire the runner img; typecheck/test; browser spot-check.

## Done
- [x] Add `imageSrcSet` to lib/image-resolve.ts and the frozen-literal unit test.
- [x] Wire the runner `<img>` (components/test-runner.tsx): srcSet + sizes + width/height
  + `w-full h-auto`; eager-vs-lazy decided (single active image → `loading` omitted).
- [x] Browser spot-check per Goal §7: live practice run over the real transport — question img
  `srcset.includes("?w=540 540w")` === true (full exact srcset + sizes + width/height, loading absent).

## Next
- (none — Goal fully met; gates 1–6 green at last verify, §7 spot-check green live)

## Artifacts
- lib/image-resolve.ts — `imageSrcSet(key)` added (built from IMAGE_VARIANT_WIDTHS, null on unsafe key)
- lib/image-resolve.test.ts — frozen-oracle srcset test (exact literal + `../etc` → null)
- components/test-runner.tsx — question `<img>` gains srcSet/sizes/width/height (`w-full h-auto`)

## Log
- 2026-07-02 planner: task authored from spec §C.
- 2026-07-02 13:47 UTC ClPcs-Mac-mini: added pure `imageSrcSet` to lib/image-resolve.ts
  (maps IMAGE_VARIANT_WIDTHS → `/api/q-image/<key>?w=<w> <w>w`, comma-joined; `isSafeKey`
  gate → null) + frozen-literal oracle test in lib/image-resolve.test.ts (Goal §1–2).
  `npm test` 498/498 green, `npm run typecheck` clean. Next: wire the runner `<img>` (Goal §3–4).
- 2026-07-02 13:51 UTC ClPcs-Mac-mini: FIXED last verify FAIL ("runner img missing srcSet") by
  wiring the runner (Goal §3–5). Grep confirmed the ONLY q-image render site is
  components/test-runner.tsx (app/sw.ts is the SW route matcher, not a render site) — result page
  renders no question images, so runner-only per the REDUCED SCOPE note. Question `<img>` gains
  `srcSet={imageSrcSet(key)}` (keyed images only — a freeform imageUrl has no variants; `?? undefined`
  since React rejects null), `sizes="(max-width: 712px) calc(100vw - 80px), 632px"` (measured box:
  max-w-2xl page 672px − layout px-5 − .solid p-5; 712px is where the max-width binds),
  `width={720} height={405}` (CLS hint; sampled official originals are variable-ratio, dominant
  ~16:9; `h-auto` restores the true ratio on load), class `max-h-56` → `h-auto w-full` per Goal §3.
  Goal §4 decision: the runner renders exactly ONE image (the active question's, the LCP candidate)
  → `loading` OMITTED, stays eager. verify.sh PASS (typecheck clean, 498/498 unit tests green).


## Verify
**Last verify:** PASS (2026-07-02T13:52:03Z)
