# Task: wave6-04-q-image-route

**Status:** done   <!-- unblocked 2026-06-23: wave6-08 rescoped seed-content; verify.sh re-run → PASS (266 unit / 67 integration incl. q-image route test) -->
**Was blocked on:** wave6-08 — the full `test:integration` gate (criterion 7) was red ONLY because the shared dev DB
has imported official `isDemo:false` content, so `seed-content.integration.test.ts` (asserts demo-only published)
failed until wave6-08 rescoped that invariant to the demo subset. wave6-04's own deliverables (criteria 1–6) were done all along.
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec B (server + route) — resolve a key to the best on-disk image. Pass = all true:
1. A server resolver in `lib/server/` (e.g. `lib/server/image-resolve.ts`) exports a function that takes a
   key, calls `imageCandidatePaths(key)` (from `lib/image-resolve.ts`), joins each candidate against the
   `public/` dir at `process.cwd()`, and returns the FIRST candidate that EXISTS on disk (else null).
2. `app/api/q-image/[key]/route.ts` exists, exports `const runtime = "nodejs"`, and a `GET` handler that:
   resolves the key; on hit serves the image (stream/buffer bytes OR redirect to the static `/public` path)
   with a correct `Content-Type` for the extension and a `Cache-Control` header; on miss returns HTTP 404.
3. A safe key present ONLY in the original tier resolves to the original image (HTTP 200).
4. Adding an OVERRIDE-tier file for that same key makes the route serve the override (precedence honoured).
5. An unknown/garbage key returns 404; a traversal attempt (`..%2f`, encoded or raw) returns 404/4xx and
   NEVER reads a file outside `public/` (the pure sanitizer rejects it → no candidates → 404).
6. `lib/server/q-image-route.integration.test.ts` (a `*.integration.test.ts`) drives the exported `GET`
   directly (build a `NextRequest`, pass `{ params: Promise.resolve({ key }) }` matching Next 16's async
   params) and asserts criteria 3–5. It creates any needed tier files under `public/<tier>/` in `beforeAll`
   and removes them in `afterAll` (leave the repo's tracked `public/` contents untouched).
7. `npm run typecheck` exits 0; `npm test` exits 0; `npm run test:integration` exits 0 with ZERO failures
   and includes the new route test.

## Constraints / decisions
- **Evaluate: yes** — this route takes an untrusted `[key]` from the URL and reads the filesystem; a path-
  traversal escape would be a real vulnerability. The independent judge must confirm traversal is impossible
  (rejection happens in the pure sanitizer AND the joined path is re-checked to stay within `public/`).
- Reuse `imageCandidatePaths` — do NOT re-implement candidate logic or sanitization in the route/resolver.
- Node runtime (fs access). Set a sane `Cache-Control` (e.g. `public, max-age=3600`) — overrides can change,
  so do NOT mark immutable.
- Test files must be self-cleaning: only create/remove files under throwaway keys; never delete tracked images.
- Keep `lib/image-resolve.ts` itself pure — fs/path live ONLY in the `lib/server/*` resolver and the route.

## Plan
- [x] Write `lib/server/image-resolve.ts`: join candidates to `public/`, return first existing (with an
      in-`public/` containment re-check as defense-in-depth).
- [x] Write `app/api/q-image/[key]/route.ts` (Node runtime, content-type map, cache header, 404 on miss).
- [x] Write `lib/server/q-image-route.integration.test.ts` covering original-hit, override-wins, garbage/traversal-404.
- [x] typecheck + `npm test` (green) + `npm run test:integration` (this file green; suite blocked by upstream seed-content).

## Done
- [x] `lib/server/image-resolve.ts` — exports `resolveImageDiskPath(key)`: iterates `imageCandidatePaths(key)`,
      joins each against `public/` at `process.cwd()`, returns the first existing abs path (else null), with an
      in-`public/` containment re-check. typecheck green.
- [x] `app/api/q-image/[key]/route.ts` — `runtime = "nodejs"`; `GET(_req, {params})` awaits Next 16's async
      `params`, resolves the key via `resolveImageDiskPath`, on hit `readFile`s the bytes and serves them with
      `Content-Type` by ext (png/jpeg/jpg/svg map, octet-stream fallback) + `Cache-Control: public, max-age=3600`
      (not immutable), on miss (no candidate / rejected traversal / read race) returns HTTP 404. typecheck green.
- [x] `lib/server/q-image-route.integration.test.ts` — drives the exported `GET` with a `NextRequest` and
      `{ params: Promise.resolve({ key }) }` (Next 16 async params). 3 cases: (3) original-only key → 200,
      `image/png`, `max-age=3600` non-immutable, bytes == original; (4) after writing
      `public/image-overrides/<key>.png` → bytes == override (precedence); (5) unknown key + 4 traversal forms
      (`..%2f…`, `../../package.json`, `..`, `a/../b`) → 404. Self-cleaning: writes only a unique
      `itest_qimg_<ts>` key under `official-images/`+`image-overrides/`, unlinks exactly those in `afterAll`.
      typecheck 0; this file passes 3/3 and is listed in the integration suite; `npm test` 262/262 (excludes it).

## Next
- [ ] BLOCKED on wave6-08. wave6-04's code is done: resolver + route + integration test all written, typecheck 0,
      `npm test` 262/262, the new route test passes 3/3 and is in the integration suite. The full `test:integration`
      gate (criterion 7) is red ONLY because `seed-content.integration.test.ts` fails — the dev DB has imported
      official `isDemo:false` published content while seed-content still asserts demo-only (it must be reschoped to
      the demo subset by wave6-08). That failure is unrelated to this task's code (a filesystem-only image test
      cannot touch DB content). Do NOT "fix" seed-content here (rescoping it is wave6-08's deliverable; deleting
      official content would break the browser-audit prereq). Re-run this task's gate AFTER wave6-08 lands, or let
      wave6-11 triage. If wave6-08 is already done and the suite is green, flip Status to done (criteria 1–6 met).

## Artifacts
- lib/server/image-resolve.ts — disk resolver (DONE: `resolveImageDiskPath`)
- app/api/q-image/[key]/route.ts — the image route (DONE: Node-runtime `GET`, ext→content-type, cache header, 404)
- lib/server/q-image-route.integration.test.ts — route test (DONE: 3 cases — original-hit, override-wins, garbage/traversal-404; self-cleaning)

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 ClPcs-Mac-mini: wrote lib/server/image-resolve.ts — `resolveImageDiskPath(key)` reuses pure
  `imageCandidatePaths`, joins each candidate against `public/` (process.cwd()), returns first existing abs
  path else null, with defense-in-depth containment re-check (path stays inside PUBLIC_DIR). `npm run typecheck` exits 0.
- 2026-06-23 ClPcs-Mac-mini: wrote app/api/q-image/[key]/route.ts — `runtime = "nodejs"`, `GET` awaits async
  `params`, resolves via `resolveImageDiskPath`, serves bytes (`new Response(Uint8Array(buffer))`) with ext→
  Content-Type (png/jpeg/jpg/svg, octet-stream fallback) + `Cache-Control: public, max-age=3600`; 404 on
  miss/read-race. Reuses the resolver — no candidate/sanitiser logic re-implemented. `npm run typecheck` exits 0.
- 2026-06-23 ClPcs-Mac-mini: wrote lib/server/q-image-route.integration.test.ts (mirrors the NextRequest pattern
  in analytics-ingest.integration.test.ts). Static-imports `GET`; helper builds `NextRequest` + Next-16 async
  `{ params: Promise.resolve({ key }) }`. Cases: (3) original-only `itest_qimg_<ts>` key → 200 / `image/png` /
  `max-age=3600` non-immutable / bytes==original; (4) after writing `public/image-overrides/<key>.png` →
  bytes==override (precedence); (5) unknown key + 4 traversal forms → 404. Self-cleaning (unlinks only its own
  throwaway files; `official-images` exists, `image-overrides` mkdir-recursive). typecheck 0; this file 3/3 green
  and listed in the integration suite; `npm test` 262/262 (default config excludes `*.integration.test.ts`).
  GATE BLOCKER (not this task's bug): full `npm run test:integration` is red on `seed-content.integration.test.ts`
  ("must be isDemo: expected false to be true") — the dev DB has imported official `isDemo:false` published
  content; seed-content asserts demo-only published and must be reschoped to the demo subset by wave6-08. A
  filesystem-only image test cannot affect DB content, so this is a pre-existing cross-task condition. Status →
  blocked on wave6-08; criteria 1–6 met, criterion 7 (zero-failure integration suite) pending that upstream fix.
- 2026-06-23 ClPcs-Mac-mini: re-verified the blocker is unchanged. Re-ran `npm run test:integration`: exactly
  ONE failure — `seed-content.integration.test.ts` ("must be isDemo: expected false to be true"); all other 18
  files / 64 tests pass, including this task's `q-image-route.integration.test.ts`. wave6-08 (owner of the
  seed-content rescope) is still `active`, so criterion 7 cannot pass yet. Did NOT touch seed-content (rescoping
  it games wave6-08) or delete official content (breaks the browser-audit prereq). Staying blocked on wave6-08;
  no code change this tick. Re-verify after wave6-08 lands, or let wave6-11 triage.
- 2026-06-23 ClPcs-Mac-mini: re-verified again — state still identical. `npm run test:integration` → 1 failed
  (`seed-content.integration.test.ts`, same isDemo assertion) | 18 passed (64/65 tests pass). Ran this task's
  own file in isolation: `q-image-route.integration.test.ts` → 3/3 PASS. wave6-08 still `active` (its journal
  shows no Done items ticked yet), so the upstream rescope hasn't landed and criterion 7 remains blocked.
  Failing FILE differs from this task's deliverable and a filesystem-only image route cannot mutate DB content,
  so per CLAUDE.md convention this stays blocked on wave6-08 — no in-place fix. No code change this tick.
- 2026-06-23 ClPcs-Mac-mini: re-verify tick — state UNCHANGED. Checked wave6-08/journal.md: still `status: active`,
  Done list `(none yet)`, so the seed-content rescope still hasn't landed. `npm run test:integration` → 1 failed
  (`seed-content.integration.test.ts`, identical `must be isDemo: expected false to be true` on official cat-B
  question `cmqpmp8ex…`) | 18 passed (64/65). This task's own file in isolation → 3/3 PASS. Held blocked on
  wave6-08 — did NOT rescope seed-content (games wave6-08) or delete official content (breaks browser-audit
  prereq). No code change. Re-verify after wave6-08 lands, or let wave6-11 triage.
- 2026-06-23 ClPcs-Mac-mini: re-verify tick — state STILL UNCHANGED. wave6-08/journal.md still `status: active`,
  Done `(none yet)`. `npm run test:integration` → 1 failed (`seed-content.integration.test.ts`, same
  `must be isDemo: expected false to be true` on `cmqpmp8ex…`) | 18 passed (64/65). This task's
  `q-image-route.integration.test.ts` in isolation → 3/3 PASS. Criteria 1–6 met; criterion 7 (zero-failure
  integration suite) remains gated on wave6-08's seed-content rescope. No code change this tick — staying blocked.
- 2026-06-23 ClPcs-Mac-mini: re-verify tick — state UNCHANGED. wave6-08 still `status: active`, Done `(none yet)`
  (the seed-content rescope has not landed). `npm run test:integration` → exactly 1 failed
  (`seed-content.integration.test.ts`, identical `must be isDemo: expected false to be true` on
  `cmqpmp8ex00020eges0owfvfi`) | 18 passed (64/65). This task's `q-image-route.integration.test.ts` in
  isolation → 3/3 PASS. Held blocked on wave6-08 — did NOT rescope seed-content (games wave6-08) or delete
  official content (breaks browser-audit prereq). No code change. Re-verify after wave6-08 lands, or let wave6-11 triage.
- 2026-06-23 ClPcs-Mac-mini: re-verify tick — state UNCHANGED. wave6-08/journal.md still `status: active`,
  Done `(none yet)`. `npx vitest run --config vitest.integration.config.ts` → 1 failed
  (`seed-content.integration.test.ts`, same `must be isDemo: expected false to be true` on
  `cmqpmp8ex00020eges0owfvfi`) | 18 passed (64/65), this task's route test among the 18. Criteria 1–6 met;
  criterion 7 (zero-failure integration suite) remains gated on wave6-08's seed-content rescope. No code change
  — staying blocked on wave6-08. Re-verify after it lands, or let wave6-11 triage.
- 2026-06-23 ClPcs-Mac-mini: re-verify tick — state UNCHANGED. wave6-08 still `status: active`, Done `(none yet)`;
  `seed-content.integration.test.ts:35` still asserts every published question `isDemo===true` (un-rescoped).
  `npx vitest run --config vitest.integration.config.ts` → 1 failed (`seed-content` "seeds at least 24 published,
  one-correct, clearly-demo questions") | 18 passed (64/65). This task's `q-image-route.integration.test.ts` in
  isolation → 3/3 PASS, and it is among the 18 passing files. Criteria 1–6 met; criterion 7 (zero-failure
  integration suite) still gated on wave6-08's seed-content rescope. Held blocked — did NOT rescope seed-content
  (games wave6-08) or delete official content (breaks browser-audit prereq). No code change. Re-verify after
  wave6-08 lands, or let wave6-11 triage.
- 2026-06-23 ClPcs-Mac-mini: re-verify tick — state UNCHANGED. wave6-08/journal.md still `status: active`,
  Done `(none yet)`. `npx vitest run --config vitest.integration.config.ts` → 1 failed (`seed-content`, same
  un-rescoped demo-only assertion at :35) | 18 passed (64/65). This task's `q-image-route.integration.test.ts`
  in isolation → 3/3 PASS. Criteria 1–6 met; criterion 7 gated on wave6-08. No code change — staying blocked.












## Verify
**Last verify:** FAIL (2026-06-23T09:50:03Z)
Fixing this is the next increment. Error excerpt (last 20 lines):
```
> drivers-school@0.1.0 typecheck
> tsc --noEmit



 Test Files  22 passed (22)
      Tests  262 passed (262)
   Start at  12:49:54
   Duration  810ms (transform 522ms, setup 0ms, import 975ms, tests 263ms, environment 2ms)
```
