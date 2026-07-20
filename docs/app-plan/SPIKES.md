# SPIKES — de-risking investigations

Owner: Tech Architect · Target repo: `/Users/clpc/drivers-school` (branch `main`)

Time-boxed investigations that answer a single build-or-buy / does-it-work question before a wave
commits to it. Each spike is run on a **throwaway branch**; only the verdict is recorded here on `main`.
No production wiring lands from a spike — that happens in the wave the verdict feeds.

---

## Spike 1 — Serwist × Next 16 (service worker on the webpack path)

Run: 2026-07-02 (ClPcs-Mac-mini) · Branch: `spike/serwist` (throwaway, unmerged) · Time-box: half-day.

**Question:** does `@serwist/next` build a service worker under Next 16, given that Next 16 `next build`
now defaults to Turbopack (and the Serwist plugin is a webpack plugin)? This de-risks the offline/PWA
capability targeted for Wave 13.

### VERDICT: WORKS on the webpack path — conditional on `next build --webpack` + a one-line tsc fix.

A negative fallback is NOT required: the build is green. Ship it in Wave 13.

### Findings

- **Versions:** `@serwist/next@9.5.11` + `serwist@9.5.11` (peer `next >=14`; serwist's own devDep pins
  `next 16.2.4`, so it is tested against Next 16). Installed as devDeps on `spike/serwist` ONLY.
- **`public/sw.js` emits: YES.** `next build --webpack` (Next 16.2.9) logged
  `✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'` and produced
  `public/sw.js` (167 KB).
- **`next build` green on the webpack path: YES.** Full build completed (23 routes, static generation,
  traces) with no errors — after the tsc fix below.
- **Dev / Turbopack: NO-OP (OK/desirable).** `@serwist/next` injects via the webpack config callback,
  which Turbopack (the Next 16 `next dev` default) does not consume → no SW in dev. SW caching in dev is
  unwanted, so this is fine. A separate `@serwist/turbopack` package covers a Turbopack SW path if a
  future decision ever forces Turbopack-only production builds.

### Exact config that worked (committed on `spike/serwist`)

`next.config.ts`:
```ts
import withSerwistInit from "@serwist/next";
const withSerwist = withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js" });
export default withSerwist(nextConfig);
```

`app/sw.ts`:
```ts
/// <reference lib="webworker" />   // line 1, REQUIRED — see gotcha
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});
serwist.addEventListeners();
```

`package.json` build script must pass `--webpack` (Next 16 `next build` defaults to Turbopack; the
Serwist plugin only runs on the webpack path):
```json
"build": "next build --webpack"
```

### Gotcha (one-line fix)

Without the `webworker` lib reference, the `tsc` pass run by `next build` fails
`Cannot find name 'ServiceWorkerGlobalScope'` — the root `tsconfig.json` `lib` is `[dom, dom.iterable, esnext]`
(no `webworker`). Fix with a **per-file** `/// <reference lib="webworker" />` at the top of `app/sw.ts`
(a project-wide lib change would cause a dom↔webworker `self` global conflict). The webpack SW bundle
(`public/sw.js`) emits even before typecheck, but the build only goes fully green with the directive.

### Wave 13 recommendation

Ship with `@serwist/next` and a `build` that uses `--webpack`; keep dev on Turbopack (SW no-op). No
fallback required. If a future decision forces Turbopack-only production builds, revisit
`@serwist/turbopack`.

---

## Spike 2 — sharp AVIF on Node 25

Run: 2026-07-02 (ClPcs-Mac-mini) · Mode: **throwaway scratch dir** (`mktemp -d /tmp/sharp-spike.*`,
deleted after) — NOT a repo devDependency · Time-box: half-day.

**Question:** does `sharp` produce AVIF on Node 25 on this box (arm64 macOS), and can it hit a
≤120 KB AVIF + a WebP fallback at w=540 from a representative restyled PNG? This de-risks the
build-time image prebake targeted for Wave 13.

### VERDICT: WORKS — Node-25 prebuild installs clean, AVIF is ~9 KB (well under 120 KB). Recommend build-time prebake in Wave 13; NO repo dep added yet.

### Findings

- **Node-25 prebuild: YES, no build-from-source.** `npm i sharp` in the scratch dir exited 0 and
  dropped the platform prebuilds `@img/sharp-darwin-arm64` + `@img/sharp-libvips-darwin-arm64` into
  `node_modules/@img/` — no `node-gyp`/source compile ran. `sharp@0.35.3`, bundled `libvips 8.18.3`,
  `sharp.prototype.avif` present. (Unlike the DB stack, sharp ships N-API prebuilds that already cover
  Node 25 on darwin-arm64.)
- **Input:** `public/restyled/11_10_0.png` — 512×288 PNG, 236 434 bytes (a representative restyled
  question image; the `cmp_*` files are review composites, not shipping assets).
- **Outputs at w=540** (resize width 540, slight upscale from 512), first encode discarded to warm the
  pipeline:
  - **AVIF** (`quality: 50, effort: 4`): **9 536 bytes (9.3 KB)** — **PASS** vs the ≤120 KB target
    (with ~13× headroom; quality could be raised well before hitting the cap).
  - **WebP** (`quality: 80`): **18 132 bytes (17.7 KB)** — fallback for browsers without AVIF.
- **Encode time on this box:** AVIF ≈ **98 ms**, WebP ≈ **14 ms** per image (post-warmup, single-thread).
  For ~1691 official questions that is a one-time prebake of roughly 3 min of AVIF encode wall-time
  (embarrassingly parallel) — trivially a build-step cost, never a request-path cost.

### Trial mode & dependency decision

Ran in a **throwaway scratch dir** under `/tmp` (own `npm init` + `npm i sharp`), NOT as a repo
devDependency, then deleted. **No `sharp` dependency was added to the repo** — `grep -Eq '"sharp"'
package.json` is FALSE. Wave 13 will add `sharp` as a **devDependency** (build-time only) when it wires
the prebake; it must never enter the runtime/edge bundle.

### Wave 13 recommendation

**Build-time prebake**, per the app plan: at build, transcode each restyled PNG → AVIF (primary) +
WebP (fallback) at the served width(s), emit them as static assets, and have the image resolver serve
`<picture>`/`srcset` with AVIF → WebP → PNG. Keep `sharp` a devDependency only (Node build step); do
NOT transcode on the request path. AVIF at q50/e4 already clears the size budget with large headroom, so
quality can be tuned up in the prebake without risking the ≤120 KB target.
