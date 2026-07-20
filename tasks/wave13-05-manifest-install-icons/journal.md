# Task: wave13-05-manifest-install-icons

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
Installability metadata (spec §B): `app/manifest.ts`, committed maskable Світлик icons, iOS meta.
PASS = ALL true:

1. `app/manifest.ts` exists, typechecks, and defines: Ukrainian `name` and `short_name`;
   `display: "standalone"`; `start_url: "/dashboard"`; `categories: ["education"]`;
   `theme_color` and `background_color` as hex literals copied EXACTLY from the app tokens in
   `app/globals.css` `:root` (cite which tokens in a comment — calm pastel, never a hardened green).
2. The manifest `icons` array references `/icons/icon-192.png` (192×192) and `/icons/icon-512.png`
   (512×512), each listed with `purpose: "maskable"` (an additional `purpose: "any"` entry is fine).
3. `public/icons/icon-192.png`, `public/icons/icon-512.png`, and
   `public/icons/apple-touch-icon.png` (180×180) exist, are valid PNGs with EXACTLY those pixel
   dimensions (asserted via sharp metadata), and are COMMITTED (not gitignored). Artwork = the
   Світлик mascot from `components/svitlyk.tsx` on a calm token-background; for the maskable icons
   the mascot fits within the inner 80% safe zone (maskable rule of thumb).
4. `scripts/gen-icons.mjs` exists (repeatable generation via sharp rasterizing the mascot SVG) and
   `npm run gen:icons` regenerates the three PNGs byte-stably or near-stably (rerun must not change
   dimensions; content drift is acceptable).
5. Root layout (`app/layout.tsx`) metadata gains: `icons.apple` → `/icons/apple-touch-icon.png`, and
   Apple PWA meta via the Metadata API `appleWebApp` field (`capable: true`, `statusBarStyle`,
   `title`) — grep gates: `appleWebApp` and `apple-touch-icon` in app/layout.tsx.
6. `npm run typecheck` exits 0. 7. `npm test` exits 0.
8. `bash tasks/wave13-05-manifest-install-icons/verify.sh` exits 0.

## Constraints / decisions
- Next serves `app/manifest.ts` at `/manifest.webmanifest` and links it automatically — do NOT add a
  manual `<link rel="manifest">`. Real-transport reachability + JSON validity is wave13-18's audit.
- iOS ignores manifest icons — that's why apple-touch-icon is separate and mandatory. The spec's
  claim that it already exists is WRONG (root layout defines no icons today; wave13-01 confirms).
- Icons are the one COMMITTED generated artifact (three small stable PNGs); `public/img-cache` stays
  ignored. sharp is already a devDependency (wave13-04); if this task runs before 04, add it the same
  way (devDep only).
- The install HINT card is wave13-13, `beforeinstallprompt` is NOT touched here.
- DESIGN: theme/background colors come from the existing token palette (pdr-design identity: calm
  pastel, `--green-ink` on soft surfaces); the icon background must not be white-on-soft-green.

## Plan
- [x] Extract mascot SVG → scripts/gen-icons.mjs → three PNGs; commit them.
- [x] Write app/manifest.ts + layout appleWebApp metadata; typecheck; verify.sh.

## Done
- [x] scripts/gen-icons.mjs + `npm run gen:icons` + the three PNGs generated (byte-stable rerun
      verified, exact dims via sharp, not gitignored, mascot visually confirmed in safe zone).
- [x] app/manifest.ts (uk name/short_name, standalone, /dashboard, education, theme #9AD9B8 /
      background #FBFAF7 from cited globals.css tokens, 192/512 icons maskable+any) + app/layout.tsx
      `icons.apple` and `appleWebApp` metadata; verify.sh PASS.

## Next
- [ ] Nothing — Goal fully met, verify.sh PASS.

## Artifacts
- app/manifest.ts — the web app manifest
- app/layout.tsx — icons.apple + appleWebApp metadata
- public/icons/ — committed icon PNGs
- scripts/gen-icons.mjs — icon generator

## Log
- 2026-07-02 planner: task authored from spec §B; layout currently has NO icons metadata (verified).
- 2026-07-02 13:29 UTC ClPcs-Mac-mini: wrote scripts/gen-icons.mjs (svitlyk symbol serialized from
  components/svitlyk.tsx JSX→SVG, bg `--color-green-soft` #9AD9B8, `translate(10 10) scale(0.8)` =
  inner-80% maskable safe zone, per-target-size rasterization so no double resampling); added
  `gen:icons` npm script; generated public/icons/{icon-192,icon-512,apple-touch-icon}.png. Verified:
  rerun is BYTE-STABLE (identical shasums), sharp metadata 192/512/180 png exact, none gitignored,
  192px render visually correct (feDropShadow rasterizes fine under sharp's librsvg).
- 2026-07-02 16:31 UTC ClPcs-Mac-mini: wrote app/manifest.ts (MetadataRoute.Manifest; theme_color
  #9AD9B8 = --color-green-soft, background_color #FBFAF7 = --color-field, both cited in a comment;
  icons 192/512 each listed maskable AND any) and added `icons.apple: "/icons/apple-touch-icon.png"`
  + `appleWebApp: {capable, statusBarStyle: "default", title: "ПДР Школа"}` to app/layout.tsx
  metadata. verify.sh PASS (typecheck 0, 487 unit tests green). Status → done.


## Verify
**Last verify:** PASS (2026-07-02T13:32:01Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T13:32:58Z)
