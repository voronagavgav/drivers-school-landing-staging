# Task: wave1-sec-06-create-safe-image-url

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add the PURE image-URL sanitiser and its unit tests (spec section C core). No render/admin wiring here
(that is task 08).

1. A NEW file `lib/sanitize.ts` exists and exports a PURE function
   `safeImageUrl(url: string | null | undefined): string | null` that returns the URL string ONLY when
   it is an absolute `http:` or `https:` URL, and returns `null` otherwise. It is pure: no I/O and it
   does NOT import `@/lib/db`, `server-only`, `@prisma/client`, or `lib/generated`.
2. `safeImageUrl` ACCEPTS and returns (unchanged, modulo trim) `http://example.com/a.png` and
   `https://example.com/a.png` (uppercase scheme like `HTTPS://…` also accepted).
3. `safeImageUrl` returns `null` for every one of: `null`, `undefined`, `""`, a whitespace-only string,
   `"javascript:alert(1)"`, `"data:text/html;base64,xxx"`, `"file:///etc/passwd"`, a protocol-relative
   `"//evil.com/x.png"`, and a relative path `"/img/x.png"` (no scheme → rejected).
4. A NEW file `lib/sanitize.test.ts` (importing from `vitest`) covers the accept cases (criterion 2)
   and the reject cases (criterion 3) with explicit assertions.
5. `npm run typecheck` exits 0. `npm test` exits 0 (zero failures) and the test-file count increases by
   exactly 1 versus baseline.

## Constraints / decisions
- Implement by parsing with `new URL(url.trim())` inside try/catch and allow-listing
  `protocol === "http:" || protocol === "https:"`; any parse failure or other protocol → `null`.
  (This cleanly rejects `javascript:`/`data:`/`file:`, protocol-relative, and relative inputs.)
- Keep it a SEPARATE pure module from `lib/validation.ts` so spec section C is self-contained and the
  admin-validation task (07) and this task never edit the same file.
- Non-Goal: applying it at render or admin save (task 08); changing how `imageUrl` is stored.

## Plan
- [x] Write `lib/sanitize.ts` with `safeImageUrl` (URL allow-list, try/catch).
- [x] Write `lib/sanitize.test.ts` with accept + reject cases.
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] Created `lib/sanitize.ts` exporting pure `safeImageUrl` (URL parse + http/https allow-list, try/catch → null).
- [x] Created `lib/sanitize.test.ts` (vitest, `@/lib/sanitize`) covering accept (http/https/uppercase/trim) + reject (null/undefined/empty/whitespace/javascript:/data:/file:/protocol-relative/relative) cases.
- [x] `npm run typecheck` exits 0; `npm test` green — 76 tests / 7 test files (baseline 6, +1).

## Next
- [ ] None — goal met; awaiting driver re-run of verify.sh.

## Artifacts
- lib/sanitize.ts — pure `safeImageUrl`
- lib/sanitize.test.ts — unit tests
- tasks/wave1-sec-06-create-safe-image-url/verify.sh — export + purity + behavior + typecheck/test

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: created `lib/sanitize.ts` — pure `safeImageUrl` parsing via `new URL(url.trim())` with http/https allow-list, try/catch → null; rejects empty/whitespace/non-string. Next tick: write `lib/sanitize.test.ts`.
- 2026-06-17T11:18Z ClPcs-Mac-mini: created `lib/sanitize.test.ts` (vitest, imports `@/lib/sanitize`) mirroring `lib/validation.test.ts` style — accept block (http/https/uppercase scheme/trim) + reject block (null/undefined/empty/whitespace/javascript:/data:/file:/protocol-relative/relative). `npm run typecheck` exit 0; `npm test` 76 passed / 7 files. Goal met → Status: done.


## Verify
**Last verify:** PASS (2026-06-17T08:18:58Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:19:52Z)
