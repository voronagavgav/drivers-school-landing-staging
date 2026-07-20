# Task: wave1-sec-11-security-headers

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add cheap, safe security headers in `next.config.ts` (spec section E) without breaking the app.

1. `next.config.ts` adds an `async headers()` that applies, to all routes (`source: "/:path*"`), at
   least these three response headers:
   - `X-Frame-Options: DENY` (or an equivalent CSP `frame-ancestors 'none'`),
   - `X-Content-Type-Options: nosniff`,
   - a `Referrer-Policy` (e.g. `no-referrer` or `strict-origin-when-cross-origin`).
2. The existing config is PRESERVED: `turbopack.root`, `outputFileTracingRoot`, and the
   `allowedDevOrigins` array remain intact.
3. `npm run build` exits 0 with the headers in place.
4. `npm run typecheck` exits 0 (the config still type-checks as `NextConfig`).

## Constraints / decisions
- Edit ONLY `next.config.ts`.
- Headers must apply in production (a Next `headers()` block applies to prod responses; `allowedDevOrigins`
  is dev-only and unrelated — keep it).
- If a CSP is added it must be conservative enough not to break the existing app (the app uses inline
  styles via Tailwind + Next's runtime); prefer the three cheap headers above and avoid a strict
  `script-src`/`style-src` CSP that could break Turbopack/React hydration. A `frame-ancestors` directive
  is safe. Keeping it to the three headers is sufficient for this task.
- Non-Goal: a full Content-Security-Policy with nonces, HSTS tuning, or per-route header variation.

## Plan
- [x] Add `async headers()` to `nextConfig` returning the three headers for `/:path*`.
- [x] Keep `turbopack`, `outputFileTracingRoot`, `allowedDevOrigins`.
- [x] `npm run typecheck` && `npm run build`.

## Done
- [x] Added `async headers()` to `next.config.ts` (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin) for `source: "/:path*"`; existing config preserved; typecheck + build both exit 0.

## Next
- [ ] (none — goal met; driver re-runs verify.sh)

## Artifacts
- next.config.ts — security headers
- tasks/wave1-sec-11-security-headers/verify.sh — header presence + build succeeds

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: added `async headers()` block to next.config.ts with the three security headers for `/:path*`; preserved turbopack.root, outputFileTracingRoot, allowedDevOrigins. `npm run typecheck` exit 0; `npm run build` exit 0. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T08:39:40Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:41:00Z)
