# Task: wave1-sec-08-apply-safe-image-url

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Apply the task-06 `safeImageUrl` at the render site AND at admin save (spec section C), so a rejected
URL renders NO image and admin shows a validation error.

1. RENDER: `components/test-runner.tsx` imports `safeImageUrl` from `@/lib/sanitize` and the question
   image is rendered through it — the `<img>` is emitted ONLY when `safeImageUrl(q.imageUrl)` is
   non-null, using the sanitised value as `src`. The raw `src={q.imageUrl}` form is GONE.
2. ADMIN SAVE: `app/admin/actions.ts` imports `safeImageUrl` and BOTH `createQuestion` and
   `updateQuestion`, when a non-empty `imageUrl` is provided, reject it with a Ukrainian `FormState`
   error (and write nothing) when `safeImageUrl` returns null; an empty/absent `imageUrl` is allowed,
   and a valid `http:`/`https:` URL is stored.
3. The admin rejection uses this exact Ukrainian message string:
   «Посилання на зображення має починатися з http:// або https://.»
4. The test runner is still a client component (`"use client"`) and `@/lib/sanitize` stays pure (no
   server-only/DB import), so the client import is valid.
5. `npm run typecheck` exits 0 and `npm test` exits 0 (zero failures).

## Constraints / decisions
- Edit ONLY `components/test-runner.tsx` and `app/admin/actions.ts`. (The result page and admin detail
  page render no `<img>` for `imageUrl` today — confirmed by grep — so no change is needed there; if a
  driver finds another live `<img src={...imageUrl}>` render site, sanitise it the same way.)
- In admin save, run the `safeImageUrl` check AFTER `requireContentManager()` and the task-07 schema
  parse, BEFORE the `prisma` write, so a bad URL never persists.
- Store the sanitised value (or the original validated http(s) string) — do not store a value that
  `safeImageUrl` would reject.
- Non-Goal: changing `safeImageUrl` itself (task 06) or adding new image features.

## Plan
- [x] test-runner: import `safeImageUrl`; compute a sanitised URL; guard the `<img>` on it.
- [x] admin actions: import `safeImageUrl`; in create/update reject a non-http(s) imageUrl with the
      exact Ukrainian message before writing.
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] test-runner: imports `safeImageUrl` from `@/lib/sanitize`, computes `imageSrc =
      safeImageUrl(q.imageUrl)`, and renders the `<img>` only when `imageSrc` is non-null
      (raw `src={q.imageUrl}` removed).
- [x] admin actions: imports `safeImageUrl` from `@/lib/sanitize`; both `createQuestion` and
      `updateQuestion` compute `safeImage` after the schema parse, return the exact Ukrainian error
      when a non-empty `imageUrl` is rejected, and persist `imageUrl: safeImage` (never a raw value).

## Next
- [x] Goal fully met — render site + admin save both route imageUrl through safeImageUrl; verify.sh
      PASS (typecheck 0, 81/81 tests). Nothing further for this task.

## Artifacts
- components/test-runner.tsx — image rendered through safeImageUrl
- app/admin/actions.ts — imageUrl rejected at save when not http(s)
- tasks/wave1-sec-08-apply-safe-image-url/verify.sh — render-guard + admin-reject + typecheck/test

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: wired render site — added `import { safeImageUrl } from
  "@/lib/sanitize"`, computed `const imageSrc = safeImageUrl(q.imageUrl)`, and guarded the `<img>` on
  `imageSrc` (was raw `src={q.imageUrl}`) in components/test-runner.tsx. Admin-save wiring is next.
- 2026-06-17T11:30Z ClPcs-Mac-mini: wired admin save — added `import { safeImageUrl } from
  "@/lib/sanitize"` to app/admin/actions.ts; in both `createQuestion` and `updateQuestion` compute
  `safeImage` after the schema parse, return «Посилання на зображення має починатися з http:// або
  https://.» when a non-empty `imageUrl` is rejected, and store `imageUrl: safeImage`. typecheck 0,
  81/81 tests, verify.sh PASS. Status → done.


## Verify
**Last verify:** PASS (2026-06-17T08:31:12Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:31:52Z)
