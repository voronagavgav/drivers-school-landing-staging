# Task: wave13-07-qimage-negotiation-itest

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
PRODUCTION-PATH integration test for the negotiated image route (spec §C: "the route serves AVIF for
an Accept that includes it, WebP otherwise, original when no variant exists; the key regex + traversal
guard unchanged"). Drives the EXPORTED `GET` from `app/api/q-image/[key]/route.ts` — the real entry
the browser hits — never `resolveVariantDiskPath` directly. PASS = ALL true:

1. `lib/server/qimage-negotiation.integration.test.ts` exists and is collected by the integration
   suite (`npx vitest list --config vitest.integration.config.ts`, captured to a var, includes it).
2. Fixtures are hermetic and non-destructive:
   - Real committed key `11_10_0` (public/restyled-live/11_10_0.png) is the negotiated-key subject.
     `beforeAll` creates `public/img-cache/11_10_0-540.avif` + `.webp` ONLY if absent (tiny dummy
     bytes are fine — the route types by extension) and remembers which it created; `afterAll`
     removes ONLY those it created (never clobber a real bake).
   - A per-run no-variant key: `beforeAll` copies a small png to
     `public/restyled-live/itnovar<runtoken>.png` (runtoken = Date.now() at module scope);
     `afterAll` deletes it.
3. Test cases call `GET(new Request(url, { headers }), { params: Promise.resolve({ key }) })` and
   assert EXACTLY (literals frozen at plan time):
   a. key `11_10_0`, url `?w=540`, `Accept: image/avif,image/webp,*/*` → status 200,
      `content-type: image/avif`, `cache-control` contains BOTH `max-age=31536000` and `immutable`;
   b. same, `Accept: image/webp,*/*` → `content-type: image/webp`, immutable;
   c. same, `Accept: */*` → `content-type: image/png` (the restyled-live original),
      `cache-control: public, max-age=3600`, does NOT contain `immutable`;
   d. key `11_10_0`, NO `w` param, `Accept: image/avif` → `content-type: image/png` (original);
   e. no-variant key, `?w=540`, `Accept: image/avif,image/webp` → 200, `content-type: image/png`,
      NOT immutable (graceful degradation — never 404);
   f. key `../../package.json` (passed decoded via params) → status 404;
   g. key `garbage%2F..` → 404.
4. `npm run test:integration` exits 0 (whole suite — cross-task coupling rule applies).
5. `npm run typecheck` exits 0.
6. `bash tasks/wave13-07-qimage-negotiation-itest/verify.sh` exits 0.

## Constraints / decisions
- TEST-ONLY task: do NOT edit the route or lib/ code here. A red case implicates wave13-06 — mark
  this task `blocked` naming the failing case instead of fixing the implementation in place
  (anti self-grading: the implementer of 06 doesn't get to bend this oracle).
- The vectors here mirror the wave13-06 journal table THROUGH THE REAL ROUTE — same source oracle,
  different entry point (unit = pure fn, this = transport semantics incl. headers).
- Dummy variant bytes are legitimate: encoder quality is wave13-04's gate; THIS gate is routing +
  header semantics.
- Integration config stubs `server-only` (house pattern); no auth needed (q-image is unauthenticated
  by design).

## Plan
- [x] Write the suite per Goal 2–3; run integration suite; verify.sh.

## Done
- [x] Wrote `lib/server/qimage-negotiation.integration.test.ts` (fixtures + cases a–g, f+g share one `it`); verify.sh green.

## Next
- (none — task done)

## Artifacts
- lib/server/qimage-negotiation.integration.test.ts — the production-path oracle

## Log
- 2026-07-02 planner: task authored from spec §C; case table frozen before wave13-06 lands.
- 2026-07-02 13:43 UTC ClPcs-Mac-mini: wrote the suite mirroring `q-image-route.integration.test.ts` (plain `Request` + async-params, per Goal 3). Fixtures: `11_10_0-540.avif/.webp` already exist as REAL bakes → create-only-if-absent tracked list created NOTHING and afterAll leaves them; per-run `itnovar<Date.now()>.png` copied into restyled-live and removed. All 6 its (7 cases; f+g combined) green first run. Full `npm run test:integration` was red on `analytics-dashboard` (known CLAUDE.md triage: accumulated AnalyticsEvent rows crowd the top-10 topPaths — zero code cause) → `npm run db:seed` reseed → verify.sh PASS wave13-07 (typecheck + 29 files / 106 passed). Status → done.

## Verify
**Last verify:** PASS (2026-07-02T13:44:36Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T13:46:20Z)
