# Task: wave10f-18-spike-sharp-avif

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
INVESTIGATION: does `sharp` produce AVIF on Node 25 on this box? Transcode ONE representative restyled PNG
(`public/restyled/…`) to AVIF ≤120 KB + a WebP fallback at w=540 and record the findings in
`docs/app-plan/SPIKES.md`. No repo dependency added unless the trial concludes a devDependency is fine.

Boolean acceptance criteria:
1. `docs/app-plan/SPIKES.md` contains a section headed for the sharp spike (e.g. "Spike 2 — sharp AVIF on
   Node 25") with a clear VERDICT line.
2. That section records ALL of: does the Node-25 sharp prebuild work (or need a build-from-source), the
   AVIF + WebP output sizes at w=540 (AVIF target ≤120 KB), the encode time on this box, and a
   recommendation for the Wave-13 image resolver (build-time prebake per plan).
3. States explicitly WHICH trial mode was used (throwaway scratch vs a devDependency trial) and whether a
   `sharp` dependency should be added — and if the verdict is "no dep yet", `grep -Eq "\"sharp\"" package.json`
   is FALSE (scratch cleaned, no repo dep leaked).
4. `npm run typecheck` exits 0 (repo unaffected by the scratch trial).

## Constraints / decisions
- Use a representative existing `public/restyled/*.png` as the input; keep the transcoded outputs OUT of
  the repo (they're throwaway measurements, not assets to ship).
- If sharp's Node-25 prebuild fails, record that + the fallback recommendation — a negative verdict is a
  complete outcome.
- Non-Goal: wiring the Wave-13 resolver, adding a build step, shipping AVIF assets.

## Plan
- [x] `npm i sharp` in a scratch (or devDep trial — record which); transcode one restyled PNG → AVIF + WebP @ w=540.
- [x] Measure sizes + encode time; note prebuild success.
- [x] Write the verdict + recommendation into `docs/app-plan/SPIKES.md`; clean the scratch.
- [x] `npm run typecheck` 0; confirm no stray sharp dep unless the trial says devDep is fine.

## Next
- [x] Run the sharp transcode measurement on a representative restyled PNG.
- (none — Goal met; awaiting driver verify.)

## Artifacts
- `docs/app-plan/SPIKES.md` — "Spike 2 — sharp AVIF on Node 25" section (verdict + measurements + Wave-13 rec).

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-02 ClPcs-Mac-mini: Ran sharp trial in a throwaway `/tmp/sharp-spike.*` scratch dir (own npm init + `npm i sharp`, deleted after — NO repo dep). Node 25.9.0. `sharp@0.35.3` installed clean via N-API prebuild (`@img/sharp-darwin-arm64` + `sharp-libvips-darwin-arm64`, libvips 8.18.3), no build-from-source. Transcoded `public/restyled/11_10_0.png` (512×288, 236 KB) → AVIF w=540 q50/e4 = 9.3 KB (~98 ms, PASS ≤120 KB) + WebP w=540 q80 = 17.7 KB (~14 ms). Wrote Spike 2 verdict/findings/Wave-13 build-time-prebake rec into SPIKES.md; recommended sharp as devDependency-only in Wave 13. Cleaned scratch; `grep '"sharp"' package.json` FALSE; `npm run typecheck` exit 0. Status → done.

## Verify
**Last verify:** PASS (2026-07-01T21:28:06Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T21:28:48Z)
