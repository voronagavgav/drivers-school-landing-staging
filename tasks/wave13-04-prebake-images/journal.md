# Task: wave13-04-prebake-images

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
Build-time image prebake per SPIKES.md §2 (sharp is Node-25-proven on this box): AVIF + WebP variants
at w ∈ {360, 540, 720} for every tier-resolved question image, ≤120KB hard cap, idempotent, never on
the request path. PASS = ALL true:

1. `sharp` is in package.json **devDependencies** (grep `"sharp"` under devDependencies) and NOT in
   `dependencies`; no `app/` or `lib/` module imports it (grep) — build-step only.
2. `scripts/prebake-images.mjs` exists; `npm run prebake:images` runs it.
3. The script collects keys by walking the tier dirs in the SAME precedence as the resolver
   (`image-overrides` ▸ `restyled-live` ▸ `official-images`; first tier owning a key wins), sources
   `.png`/`.jpeg`/`.jpg` (`.svg` skipped), and for each key emits
   `public/img-cache/<key>-<w>.avif` + `public/img-cache/<key>-<w>.webp` for w = 360, 540, 720.
4. Encode params start at the spike's proven values (AVIF quality 50 / effort 4, WebP quality 80).
   HARD CAP: every emitted `.avif` is ≤ 122880 bytes — when an encode exceeds it the script retries at
   lower quality (e.g. 35 then 25) and SKIPS the variant if still over (a skipped variant just means
   the resolver degrades to the original; never emit an over-cap file).
5. Idempotent: an up-to-date output (exists AND newer than its source) is skipped. The script prints a
   summary line `prebake: encoded N, skipped M, failed K`. Boolean: running
   `npm run prebake:images -- --only 11_10_0` twice in a row → the SECOND run prints `encoded 0`.
6. `--only <key>` limits the run to one key (verify/test hook).
7. The FULL bake has been run on this box:
   `find public/img-cache -name '*-540.avif' | wc -l` ≥ 1000 (≈1100+ keys exist across tiers).
8. `public/img-cache/` is gitignored (`git check-ignore public/img-cache/x` exits 0) — a generated
   artifact, rebaked per box/deploy.
9. Known-answer oracle (frozen from SPIKES.md §2, source `public/restyled-live/11_10_0.png`,
   512×288, 236434 bytes): after the bake, `public/img-cache/11_10_0-540.avif` exists, its size is
   ≤ 30000 bytes (spike measured 9536 B at q50/e4 — generous headroom, but 30KB catches a
   misconfigured encoder), and `sharp` metadata on it reports `format: "avif"`, `width: 540`.
10. `npm run typecheck` and `npm test` exit 0 (nothing in the app graph changed).
11. `bash tasks/wave13-04-prebake-images/verify.sh` exits 0.

## Constraints / decisions
- NOT wired into `npm run build` — the bake is a deploy/content step (`npm run prebake:images`),
  keeping builds fast; wave13-20 asserts the box is baked.
- Mild upscale is allowed (512-wide sources → 540/720 variants; the spike did 512→540). Always resize
  to exactly w (the filename is a contract the resolver trusts).
- Skip keys whose winning source is `.svg` (vector signs stay vector; the resolver serves the
  original). Skip nothing else silently — failures land in the `failed K` count and a per-key warning.
- The script re-implements the 3-dir/3-ext tier walk locally (it's an .mjs build script; do NOT import
  TS from lib/). Keep the dir names literally in sync with `lib/image-resolve.ts`
  (`image-overrides`/`restyled-live`/`official-images`).
- Full-bake wall time ≈ 1100 keys × 3 widths × ~115ms ≈ 6–7 min once; subsequent runs are
  mtime-skips (seconds). verify.sh runs the full bake — fast when already baked.
- Non-Goals: no route/resolver changes (wave13-06), no `<picture>`/srcset (wave13-08), no icon
  generation (wave13-05 has its own script).

## Plan
- [x] `npm i -D sharp` (prebuild lands per SPIKES.md §2); write scripts/prebake-images.mjs.
- [x] Bake `--only 11_10_0`, check the oracle; run the full bake; verify.sh.

## Done
- [x] sharp ^0.35.3 in devDependencies (not dependencies); scripts/prebake-images.mjs written
      (tier walk in resolver precedence, svg-winner skip, AVIF q50/e4 → 35 → 25 cap-retry ≤122880B,
      WebP q80 with same cap ladder, mtime skip, `--only`, summary line); `prebake:images` npm
      script added; `/public/img-cache/` gitignored. Smoke: `--only 11_10_0` run 1 → `encoded 6,
      skipped 0, failed 0`, run 2 → `encoded 0, skipped 6` (idempotency green); 11_10_0-540.avif =
      9536 B (byte-identical to the SPIKES.md §2 measurement), metadata heif 540x304.
- [x] Full bake complete on this box: 6462 variants across 1077 keys (`*-540.avif` count = 1077,
      ≥ 1000 ✓), zero AVIFs over the 122880 B cap, 1 svg key left to the resolver; re-run prints
      `encoded 0, skipped 6462, failed 0` (idempotent). verify.sh PASS.

## Next
- [ ] (none — Goal met, Status: done)

## Artifacts
- scripts/prebake-images.mjs — the prebake script
- public/img-cache/ — generated variants (gitignored)

## Log
- 2026-07-02 planner: task authored from spec §C + SPIKES.md §2 (verdict: works, 9.3KB AVIF @ w=540).
- 2026-07-02T13:17Z ClPcs-Mac-mini: npm i -D sharp@0.35.3; wrote scripts/prebake-images.mjs +
  `prebake:images` npm script + /public/img-cache/ gitignore. Tier counts: image-overrides 0,
  restyled-live 60 png, official-images 898 jpeg/1 jpg/178 png/1 svg. Smoke `--only 11_10_0`:
  encoded 6 → encoded 0 (idempotent); oracle variant 9536 B, heif 540x304 (verify regex accepts
  avif|heif). Full bake + verify.sh = next tick.
- 2026-07-02T13:24Z ClPcs-Mac-mini: full bake confirmed complete (prior tick's verify run had baked
  it): `npm run prebake:images` → `encoded 0, skipped 6462, failed 0`; 1077 `*-540.avif`, 0 over-cap;
  verify.sh PASS → Status: done.


## Verify
**Last verify:** PASS (2026-07-02T13:25:18Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T13:26:38Z)
