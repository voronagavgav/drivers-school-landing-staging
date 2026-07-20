# Task: wave13-01-investigate-pwa-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
INVESTIGATION ONLY — write NO feature code (no `app/`, `components/`, `lib/`, `prisma/`, `bin/`,
`scripts/`, `package.json` edits). Produce `docs/app-plan/WAVE13-SURFACES.md` answering, with concrete
file:line references, everything downstream wave-13 tasks need. Read `specs/wave13-pwa-offline-images.md`,
`docs/app-plan/05-tech-architecture.md` §4–§5, and `docs/app-plan/SPIKES.md` FIRST. PASS = ALL true:

1. `docs/app-plan/WAVE13-SURFACES.md` exists with sections: `## SW + build`, `## Image pipeline`,
   `## WAL + sync`, `## Track-route patterns`, `## Pack + UI hosts`, `## Secure context + E2E`.
2. `## SW + build` documents: the current `next.config.ts` shape (headers/turbopack root/
   allowedDevOrigins — all must survive the `withSerwistInit` wrap), that `package.json` `build` is
   currently plain `next build`, the SPIKES.md §1 pinned versions (`@serwist/next@9.5.11` +
   `serwist@9.5.11`) and the `/// <reference lib="webworker" />` tsc fix, and CONFIRMS with file:line
   that fonts are `next/font` self-hosted (app/layout.tsx — hashed `/_next/static` assets covered by
   the build precache manifest) and the Світлик sprite is inline JSX (`components/svitlyk.tsx`) — i.e.
   NO extra font/sprite asset URLs need hand-listing in the precache.
3. `## Image pipeline` documents: the tier walk + `SAFE_KEY` regex + `IMAGE_EXTENSIONS`
   (`lib/image-resolve.ts`), the containment re-check (`lib/server/image-resolve.ts`), the route
   (`app/api/q-image/[key]/route.ts` — current Cache-Control values), per-tier file counts
   (`public/official-images`, `public/restyled-live`, `public/image-overrides`) with extensions, and
   the COMPLETE list of `<img>` render sites of `/api/q-image` (grep `resolveImageSrc|q-image` over
   `app/ components/`) — explicitly stating whether the result page renders question images (spec §C
   says "runner + result"; if result has none, record the reduced scope as a DECISION).
4. `## WAL + sync` documents: `submitAnswerAction` (app/actions/test.ts) zod-parsed input fields,
   `submitAnswer` (lib/server/test-engine.ts) params incl. the hoisted whole-tx `clientEventId` guard
   lines, `recordReview` (lib/server/study.ts) params + inner guard + the `now` argument, the runner's
   current failure path (`submit`/`retrySubmit` + `submitError` state in components/test-runner.tsx),
   and EVERY existing test asserting `clientEventId` values (at minimum
   lib/server/srs-review.integration.test.ts, lib/server/answer-confidence.integration.test.ts) —
   these must be updated by wave13-09 when ids become `<userId>:<clientId>`-prefixed.
5. `## Track-route patterns` documents the /api/track blueprint review-sync must mirror: pure zod
   schema module (lib/analytics-ingest.ts), server context module (lib/server/analytics-ingest.ts),
   route (app/api/track/route.ts) — size-cap-BEFORE-parse, always-ack JSON, and the integration-test
   technique (construct NextRequest, call exported POST, partial-mock `@/lib/auth` getCurrentUser).
6. `## Pack + UI hosts` documents: the /progress «Карта тем» TopicRow structure (where a per-topic
   download affordance can attach), the /account page Card layout (host for the install hint + the
   offline-packs meter), how /mistakes and /saved load their question lists, and the published-question
   predicate (`baseWhere` in lib/server/test-engine.ts) a pack route must reuse.
7. `## Secure context + E2E` states that service workers require a secure context (https OR localhost)
   so the LAN audit origin `http://100.110.64.90:3100` canNOT register a SW, and records the DECISION:
   Playwright offline E2E (wave13-19) runs against `http://localhost:3100` while the cookie-transport
   bug class stays covered by the existing LAN-IP `npm run audit:browser`.
8. Every section ends with a `DECISION:` line (≥ 6 total across the doc).
9. `bash tasks/wave13-01-investigate-pwa-surfaces/verify.sh` exits 0.

## Constraints / decisions
- READ-ONLY: the only files this task writes are the findings doc and this journal.
- Findings are advisory scaffolding; downstream tasks own their own boolean gates.
- Reference-dense (file:line), not a re-spec. De-risk, don't design.
- Where the spec asserts something the repo contradicts (e.g. "apple-touch-icon (exists)" — root
  layout metadata currently defines NO icons), record the contradiction explicitly so wave13-05
  scopes correctly.

## Plan
- [x] Read spec + 05-tech-architecture §4–5 + SPIKES.md.
- [x] Read the surfaces listed in Goal 2–7; grep for image render sites and clientEventId tests.
- [x] Write WAVE13-SURFACES.md; run verify.sh.

## Done
- [x] Read spec + 05-tech §4–5 + SPIKES.md; swept Goal-2 surfaces; created WAVE13-SURFACES.md with
      `## SW + build` COMPLETE (config shape, build script, 9.5.11 pins + webworker fix, next/font
      confirmation, inline-sprite confirmation, the «apple-touch-icon (exists)» contradiction recorded)
      + DECISION line. Remaining 5 sections stubbed with TODO markers.
- [x] Filled `## Image pipeline` (Goal 3): tier walk + SAFE_KEY + IMAGE_EXTENSIONS (lib/image-resolve.ts),
      containment re-check line (lib/server/image-resolve.ts:31), route Cache-Control (`public, max-age=3600`,
      non-immutable), per-tier disk counts (overrides 0 · restyled-live 60 png · official 1078 = 898 jpeg/
      178 png/1 jpg/1 svg), and the COMPLETE render-site sweep — exactly ONE q-image `<img>`
      (test-runner.tsx:101/379); result page renders zero images → reduced-scope DECISION recorded.
- [x] Filled `## WAL + sync` (Goal 4): submitAnswerAction + submitAnswerSchema fields incl. the 64-char
      clientEventId cap (app/actions/test.ts:54–67, lib/validation.ts:54–79), submitAnswer params + the
      hoisted whole-tx guard (test-engine.ts:340–347) + shared `now` (line 334), recordReview signature/
      inner guard/injected now (study.ts:67–161), the global `@unique` (schema.prisma:329), the runner's
      in-memory-only failure path (newClientEventId 46–56, choose 172–201, submit 206–232, retrySubmit
      234–238), and the FULL clientEventId test sweep — srs-review + answer-confidence + wave11-review-fixes
      integration tests must update to namespaced ids; validation.test.ts (raw schema passthrough) must NOT.
      DECISION recorded (guard+write flip together in 13-09; WAL persists the queue; 13-10 owns answer-time now).
- [x] Filled the remaining three sections (Goals 5–7) and went green: `## Track-route patterns`
      (three-layer blueprint w/ line refs + the NextRequest/exported-POST/partial-mock recipe +
      review-sync divergence DECISION), `## Pack + UI hosts` (TopicRow sibling-affordance constraint,
      account Card/inline-"use server" pattern, mistakes/saved loaders DON'T filter published →
      intersect-with-baseWhere DECISION), `## Secure context + E2E` (LAN http origin ≠ secure context;
      localhost:3100 E2E DECISION). verify.sh → PASS wave13-01 (6 DECISION lines, read-only clean).

## Next
- (none — Goal fully met; verify green.)

## Artifacts
- docs/app-plan/WAVE13-SURFACES.md — findings note (the deliverable)

## Log
- 2026-07-02 planner: task authored from specs/wave13-pwa-offline-images.md.
- 2026-07-02 12:45 UTC ClPcs-Mac-mini: read spec/05-tech §4–5/SPIKES; swept next.config.ts (lines 6–29:
  turbopack.root, tracing root, allowedDevOrigins, headers — all survive a pure withSerwistInit wrap),
  package.json:7 (`build` = plain `next build`), app/layout.tsx:2,7–20 (next/font Manrope+Nunito ⇒ hashed
  /_next/static, precache-covered), components/svitlyk.tsx:16 (inline-JSX sprite, mounted app/(app)/layout.tsx:25
  ⇒ no asset URL), and confirmed NO manifest/icons/apple-touch-icon exist anywhere (spec-§B contradiction
  recorded for wave13-05). Wrote docs/app-plan/WAVE13-SURFACES.md: `## SW + build` complete + DECISION;
  other 5 sections stubbed. verify.sh NOT yet expected green (substance greps for later sections + ≥6
  DECISIONs pending) — status stays active.
- 2026-07-02 13:05 UTC ClPcs-Mac-mini: filled `## Image pipeline` in WAVE13-SURFACES.md from a real read of
  lib/image-resolve.ts (IMAGE_TIER_DIRS 14–23, IMAGE_EXTENSIONS 27, SAFE_KEY 34, imageCandidatePaths 52–61,
  resolveImageSrc 80), lib/server/image-resolve.ts (PUBLIC_DIR 15, containment re-check 31), and the q-image
  route (nodejs runtime 13, CONTENT_TYPES 17–22, `Cache-Control: public, max-age=3600` non-immutable 52).
  Disk audit: image-overrides 0 · restyled-live 60 png · official-images 1078 (898 jpeg + 178 png + 1 jpg +
  1 svg). Render-site grep: ONE site only — test-runner.tsx:101 (`<img>` at 379–380, fed by
  app/(app)/test/[id]/page.tsx:21–22); result page has zero images (reduced §C scope), admin editor preview
  is raw safeImageUrl (not q-image). DECISION recorded (srcset = runner only; Vary: Accept in 13-06; 13-04
  skips the lone svg). DECISION count now 3/6 — verify still expected red on later-section greps; active.
- 2026-07-02 13:35 UTC ClPcs-Mac-mini: filled `## WAL + sync` from real reads: submitAnswerAction
  (app/actions/test.ts:54–67) + submitAnswerSchema (lib/validation.ts:54–79 — clientEventId string 1..64,
  zod strips undeclared keys), submitAnswer (test-engine.ts:312–422 — hoisted whole-tx guard 340–347
  returning `replayed`, single `now` at 334, recordReview call 396–412, replay skips analytics 425),
  recordReview (study.ts:67–161 — inner guard 86–93, ReviewLog write w/ clientEventId at 158, injected
  `now` param), ReviewLog global `@unique` (schema.prisma:329), runner failure path (test-runner.tsx —
  newClientEventId 46–56, attempt-keyed eventIdRef in choose 172–201, submit/submitError 206–232,
  retrySubmit 234–238; all in-memory, reload loses the snapshot → wave13-12 gap). clientEventId test grep
  found FOUR files: srs-review (§1/§3/§E1/§E2 lines 94–398), answer-confidence (90/112), wave11-review-fixes
  (105/108 — a findUnique lookup, breaks under prefixing too), and validation.test.ts:134–147 (schema-level,
  unaffected — recorded as NO-update). DECISION recorded. verify.sh run: FAIL `expected >=6 DECISION lines,
  got 4` — expected mid-flight red (remaining 3 sections add one DECISION each); status stays active.
- 2026-07-02 12:55 UTC ClPcs-Mac-mini: fixed the verify FAIL by finishing the doc — filled the last three
  sections from real reads. Track-route: lib/analytics-ingest.ts (whitelist schema 71–98, throttle-core
  reuse 108–126, param-injected salt), lib/server/analytics-ingest.ts (cookies 21–22, rateStore 25–29,
  _resetTrackRateStore 45, deriveTrackContext 73–97, opt-out/DNT 122–130), app/api/track/route.ts (ack()
  25–30, gate order: opt-out→size-cap-before-parse w/ double-check 43–56→safeParse→429→failure-tolerant
  getCurrentUser 82–87), test recipe from analytics-ingest.integration.test.ts (vi.mock-before-import
  16–20, postTrack/NextRequest 124–137, cookie-as-header 130, mock flip 199). Pack+UI: TopicRow
  (progress/page.tsx:28–49, whole-row form ⇒ download affordance must be a SIBLING in the li), account
  Card stack + inline-"use server" wrappers (account/page.tsx:21–43), listMistakes (mistakes.ts:82–90) +
  listSavedQuestions (saved.ts:5–13) have NO published filter, baseWhere test-engine.ts:65–70 (shape
  already duplicated in topic-map.ts:29–31). Secure-context: LAN IP over http ≠ secure context ⇒ no SW;
  E2E pinned to http://localhost:3100 loopback exception. 3 new DECISIONs (total 6). verify.sh: PASS
  wave13-01. Status → done.




## Verify
**Last verify:** PASS (2026-07-02T12:57:18Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T12:58:50Z)
