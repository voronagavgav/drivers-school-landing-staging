# Task: wave16-14-seo-gate-sitemap

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-04T18:37Z
**Last compute:** mac-mini

## Goal
Spec T5 (SEO half): the noindex gate on `APP_ORIGIN`, JSON-LD on /q pages, and the sitemap module.
Gate 0 is CLOSED (APP_ORIGIN unset) — the shipped default must be fully de-indexed. PASS = ALL true:

1. Pure `lib/seo.ts` exists: `publicOrigin(): string | null` (trimmed `process.env.APP_ORIGIN` or
   null — call-time read), `indexingEnabled(): boolean` (origin present), and
   `questionJsonLd(q, revealed: boolean)` building the schema.org object. Unit tests
   (`lib/seo.test.ts`, vi.stubEnv): unset/empty → indexing off; a real origin → on;
   `questionJsonLd(q, false)` has `@context:"https://schema.org"`, `@type:"Quiz"` with a
   `hasPart` Question carrying `suggestedAnswer` entries and NO `acceptedAnswer` KEY ANYWHERE
   (JSON.stringify does not contain `"acceptedAnswer"`); `questionJsonLd(q, true)` DOES carry
   `acceptedAnswer` with the correct option text.
2. `app/q/[key]/page.tsx` gains `generateMetadata`: while `indexingEnabled()` is false the page
   metadata yields `<meta name="robots" content="noindex">`; when enabled, no noindex and a
   canonical URL built from `publicOrigin()`. The page embeds the JSON-LD from `questionJsonLd`
   in a `<script type="application/ld+json">`, passing `revealed` = whether `?v=` is present
   (acceptedAnswer NEVER in the un-revealed document — preserves wave16-13's no-leak contract).
3. `app/sitemap.ts` exists (Next MetadataRoute.Sitemap): static entries always (at minimum `/`);
   the question section (`/q/<key>` for every published+active+non-archived question with a
   questionKey) is included ONLY when `indexingEnabled()`. Base URL = `publicOrigin() ??
   "http://localhost:3000"` (the fallback only ever serves the gate-closed sitemap, which has no
   question URLs).
4. Integration test `lib/server/seo-gate.integration.test.ts` drives the REAL exports:
   a. `generateMetadata` from `app/q/[key]/page.tsx` for a live fixture key with APP_ORIGIN unset
      → robots noindex present (spec: "Integration test asserts noindex present while gate
      closed");
   b. same with `vi.stubEnv("APP_ORIGIN","https://example.com")` → no noindex;
   c. `sitemap()` from `app/sitemap.ts` with APP_ORIGIN unset → ZERO urls containing `/q/`;
   d. with APP_ORIGIN stubbed → contains `/q/<fixture key>` and the count of `/q/` urls equals
      the DB count of published+active+non-archived questions with a questionKey (computed in the
      test via prisma — dynamic, seed-size-proof).
5. Live check (server restarted on fresh build, APP_ORIGIN unset in the runtime env):
   `curl -s $ORIGIN/q/<live-key>` contains `name="robots"` with `noindex` AND contains
   `application/ld+json` AND the initial document still lacks «Правильна відповідь» and
   `acceptedAnswer`; `curl -s $ORIGIN/sitemap.xml` returns 200 and contains no `/q/` locs.
6. `npx tsc --noEmit`, `npm test`, `npm run test:integration`, `npm run build` exit 0.

## Constraints / decisions
- acceptedAnswer-only-when-revealed is a deliberate deviation from a "complete" Quiz JSON-LD: a
  full schema on the initial document would leak the correct answer in view-source, violating
  spec T5's no-leak criterion. While the gate is closed nothing is indexed anyway; when Gate 0
  opens, the revealed URL variant carries the full schema. Recorded here so wave-review doesn't
  flag it as an accidental omission.
- The JSON-LD builder is PURE (lib/seo.ts) so its shape is unit-testable without rendering RSC;
  the page must use it (grep-enforced) — no hand-rolled duplicate JSON-LD in the page.
- `APP_ORIGIN` must NOT be added to any .env/.env.local committed or local default — the gate
  ships CLOSED. Verify greps that no tracked file sets it.
- No robots.ts this wave (nothing else needs directives; conservative scope — noindex meta +
  sitemap exclusion are what the spec demands).
- Depends on: wave16-13 (the page).

## Next
- [x] Write lib/seo.ts + unit tests (publicOrigin/indexingEnabled/questionJsonLd).
- [x] Wire generateMetadata (robots noindex while gate closed / canonical when open) + JSON-LD
      `<script type="application/ld+json">` into app/q/[key]/page.tsx (revealed = `?v=` present).
- [x] Write app/sitemap.ts (static `/` always; `/q/<key>` section gated on indexingEnabled()).
- [x] Write lib/server/seo-gate.integration.test.ts (drives real generateMetadata + sitemap).
- [x] Live checks: restart LAN server on fresh build, curl /q/<key> + /sitemap.xml (Goal 5).
- [x] Full gate: npm test, npm run test:integration, npm run build all green.
- Goal fully met — nothing further. (If a re-verify ever fails on the live check, the cause is the
  stale LAN server predating a fresh build: rebuild + restart `npm run start -- -H 0.0.0.0 -p 3100`.)

## Artifacts
- lib/seo.ts, lib/seo.test.ts
- app/q/[key]/page.tsx (generateMetadata + JSON-LD)
- app/sitemap.ts
- lib/server/seo-gate.integration.test.ts

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T18:29Z ClPcs-Mac-mini: wrote pure lib/seo.ts (publicOrigin/indexingEnabled call-time
  APP_ORIGIN reads; questionJsonLd builds schema.org Quiz, acceptedAnswer added ONLY when revealed)
  + lib/seo.test.ts (5 tests, vi.stubEnv + JSON.stringify no-leak assert). `npx vitest run
  lib/seo.test.ts` → 5 passed. Next: wire the /q page + sitemap.
- 2026-07-04T18:52Z ClPcs-Mac-mini: fixed last verify FAIL (generateMetadata missing). Wired
  `generateMetadata` into app/q/[key]/page.tsx — returns `{ robots: { index:false, follow:false } }`
  while `indexingEnabled()` is false (Gate 0 closed → noindex), else `{ alternates: { canonical:
  `${publicOrigin()}/q/${key}` } }`. Embedded `<script type="application/ld+json">` with
  `JSON.stringify(questionJsonLd(question, revealed))` (revealed = `?v=` picks a real option, so the
  initial doc carries no acceptedAnswer). `npx tsc --noEmit` → 0. Next: app/sitemap.ts.
- 2026-07-04T19:10Z ClPcs-Mac-mini: wrote app/sitemap.ts (Next MetadataRoute.Sitemap). Static `/`
  entry always; the `/q/<questionKey>` section (published+active+non-archived, questionKey not null —
  matches the public-question loader boundary) is gated on `indexingEnabled()`. Base =
  `publicOrigin() ?? "http://localhost:3000"` (placeholder only serves the gate-closed, question-free
  sitemap). `npx tsc --noEmit` → 0. Next: lib/server/seo-gate.integration.test.ts.
- 2026-07-04T18:33Z ClPcs-Mac-mini: wrote lib/server/seo-gate.integration.test.ts (drives the REAL
  `generateMetadata` from app/q/[key]/page.tsx + default `sitemap` from app/sitemap.ts). Mirrors
  public-question.integration.test.ts fixture pattern: createOfficialQuestion + PATCH a per-run unique
  questionKey. 4 cases via vi.stubEnv("APP_ORIGIN", …): gate-closed → `robots:{index:false,follow:false}`
  + no canonical + zero `/q/` sitemap urls (static `/` still present); gate-open → no robots + canonical
  `${ORIGIN}/q/${KEY}` + fixture key in urls + `/q/` count === prisma count of published+active+
  non-archived+questionKey!=null (dynamic, seed-size-proof). vi.unstubAllEnvs in afterEach. `npx vitest
  run … seo-gate.integration.test.ts` → 4 passed; `npx tsc --noEmit` → 0. Next: live curl checks (Goal 5)
  then the full gate.



- 2026-07-04T18:37Z ClPcs-Mac-mini: STALE-SERVER fix (last verify's live check failed «noindex meta
  missing while gate closed»). The LAN next-server (pid 83165) booted 18:24, before generateMetadata was
  wired at 18:52 — so it served the pre-gate build (curl showed no robots meta). Rebuilt (`npm run build`
  → 0), killed the stale port-owner, relaunched `npm run start -- -H 0.0.0.0 -p 3100` (no EADDRINUSE),
  ready in 1s. Live checks now all PASS: `/q/q_1_1` carries `<meta name="robots" content="noindex,
  nofollow">` + `application/ld+json`, no `acceptedAnswer`, no «Правильна відповідь»; `/sitemap.xml` 200
  with only `http://localhost:3000/` loc, zero `/q/`. Full gate green: tsc 0, npm test 603 passed,
  test:integration 215 passed/2 skipped, build 0. Status → done.


## Verify
**Last verify:** PASS (2026-07-04T15:38:35Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T15:40:09Z)
