# Task: wave6-03-image-resolve-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec B (pure part) — the ordered candidate-path resolver. Pass = all true:
1. `lib/image-resolve.ts` exists and exports a pure function `imageCandidatePaths(key: string): string[]`.
2. For a valid key it returns candidate paths in PRECEDENCE order **override ▸ restyled-live ▸ original**,
   and WITHIN each tier across the extensions `.png`, `.jpeg`, `.jpg`, `.svg` (override-png comes before
   any restyled-live path; all restyled-live before any original). Paths are root-relative under `public/`
   using the agreed tier dirs (override `image-overrides/`, restyled-live `restyled-live/`, original
   `official-images/`) — keep the dir names as exported constants so other tasks reuse them.
3. Key sanitization: `imageCandidatePaths` returns `[]` (empty, no paths) for an unsafe/garbage key —
   empty string, a key containing `/`, `\`, `..`, a leading dot, or any char outside `[A-Za-z0-9_-]`.
4. `lib/image-resolve.test.ts` exists and asserts: (a) precedence ordering for a normal key (override
   before restyled-live before original); (b) all four extension variants appear per tier; (c) each of
   `""`, `"a/b"`, `"..%2f"` (and a raw `".."`), `"a\\b"`, `".hidden"` → `[]`.
5. Module is PURE: grep of `lib/image-resolve.ts` finds NONE of `server-only`, `@/lib/db`,
   `@prisma/client`, `lib/generated`, `Math.random`, `Date.now`, `new Date(`, and no JSX/`fs`/`path` import.
6. `npm run typecheck` exits 0; `npm test` exits 0 with ZERO failures; `npx vitest list` includes
   `lib/image-resolve.test.ts`.

## Constraints / decisions
- PURE string logic only — NO filesystem access (no `node:fs`/`node:path`). It returns CANDIDATE relative
  paths; the server task (wave6-04) decides which exists on disk. Keeping it fs-free is what makes it unit-testable.
- Return root-relative `public/`-rooted paths (e.g. `image-overrides/1_7_0.png`) WITHOUT a leading `/`
  or `public/` prefix is acceptable AS LONG AS wave6-04's server resolver joins them consistently; pick
  one convention and document it at the top of the file. Recommended: paths relative to `public/`.
- Sanitization is a SECURITY boundary against path traversal — reject, never sanitize-and-continue.
- Do NOT write the literal forbidden tokens (`server-only`, `@/lib/db`, `@prisma/client`, `lib/generated`)
  in comments — the purity grep matches the whole file (see CLAUDE.md). Describe traversal in prose, not
  with example `../` markup that could trip a grep.

## Plan
- [x] Write `lib/image-resolve.ts`: exported tier-dir constants, extension list, `isSafeKey`, `imageCandidatePaths`.
- [x] Write `lib/image-resolve.test.ts` covering precedence, extensions, and traversal rejection.
- [x] typecheck + `npm test`; confirm `vitest list` includes the file.

## Done
- [x] `lib/image-resolve.ts` created: exported tier-dir constants (`IMAGE_OVERRIDE_DIR`/`RESTYLED_LIVE_DIR`/`ORIGINAL_IMAGE_DIR` + `IMAGE_TIER_DIRS`), `IMAGE_EXTENSIONS` (`.png`,`.jpeg`,`.jpg`,`.svg`), `isSafeKey`, and tier-major/ext-minor `imageCandidatePaths` returning `public/`-relative paths (no leading slash); `[]` for unsafe keys. `npm run typecheck` exits 0.
- [x] `lib/image-resolve.test.ts` created (mirrors `lib/sanitize.test.ts` style: vitest `describe`/`it`/`expect`, `@/lib/...` import). 18 tests across 4 suites: tier precedence (override ▸ restyled-live ▸ original, override-png first, root-relative no-slash/no-public-prefix), all four extension variants in order per tier + count, `it.each` table rejecting `""`/`"a/b"`/`"..%2f"`/`".."`/`"a\\b"`/`".hidden"` → `[]`, plus `isSafeKey` accept/reject. `npm run typecheck` exits 0; `npm test` 262/262 pass; `npx vitest list` includes `lib/image-resolve.test.ts`.

## Next
- [ ] None — Goal fully met. (Downstream: wave6-04 consumes these tier-dir constants in the server resolver.)

## Artifacts
- lib/image-resolve.ts — pure candidate-path resolver
- lib/image-resolve.test.ts — unit tests

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T09:30Z ClPcs-Mac-mini: wrote pure `lib/image-resolve.ts` (tier-dir constants, `IMAGE_EXTENSIONS`, `isSafeKey` regex `^[A-Za-z0-9_-]+$`, `imageCandidatePaths` → 12 ordered `public/`-relative candidates, `[]` on unsafe key). Matched `lib/sanitize.ts` style. Verified `npm run typecheck` exits 0. No node:fs/node:path import; no clock/randomness. Next: the unit test file.
- 2026-06-23T12:22Z ClPcs-Mac-mini: wrote `lib/image-resolve.test.ts` (18 tests, mirrors `lib/sanitize.test.ts`). Covers tier precedence, all-four-extensions-per-tier, root-relative path shape, `it.each` traversal-rejection table, and `isSafeKey`. typecheck 0; `npm test` 22 files / 262 tests all pass; `npx vitest list` includes the file. Goal fully met → Status: done.


## Verify
**Last verify:** PASS (2026-06-23T09:22:32Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T09:24:07Z)
