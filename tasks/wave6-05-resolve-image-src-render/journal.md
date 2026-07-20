# Task: wave6-05-resolve-image-src-render

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
Spec C — render question images through the resolver. Pass = all true:
1. `lib/image-resolve.ts` (or a small pure sibling) exports `resolveImageSrc(question)` where `question`
   has `{ imageKey?: string | null; imageUrl?: string | null }`. Behaviour:
   - `imageKey` set → returns `/api/q-image/${imageKey}`;
   - else `imageUrl` present and `safeImageUrl(imageUrl)` non-null → returns that safe URL;
   - else → `null`.
   (If `resolveImageSrc` needs `safeImageUrl`, importing `@/lib/sanitize` is fine — that module is pure.)
2. `lib/image-resolve.test.ts` (or a sibling test) asserts all THREE branches (key present; no key but
   valid url; neither → null), plus that an unsafe `imageUrl` with no key → null.
3. `lib/server/test-engine.ts`'s `getSessionState` per-question projection now includes `imageKey` so the
   render layer can see it (grep test-engine for `imageKey`).
4. `app/(app)/test/[id]/page.tsx` passes `imageKey` through to the runner, and `components/test-runner.tsx`
   computes its `<img>` src via `resolveImageSrc({ imageKey, imageUrl })` instead of `safeImageUrl(q.imageUrl)`
   alone (grep test-runner for `resolveImageSrc`).
5. The admin question preview path is checked: if the admin editor renders a question image, it routes
   through `resolveImageSrc` too (or a note in the journal Log explains why admin keeps `safeImageUrl`,
   e.g. it edits a freeform `imageUrl` with no key). Either way `safeImageUrl` is NOT weakened.
6. `npm run typecheck` exits 0; `npm test` exits 0 with ZERO failures; `npx vitest list` includes the
   resolveImageSrc tests.

## Constraints / decisions
- `resolveImageSrc` stays PURE (no fs/db/clock) — same purity rules as wave6-03.
- Do NOT weaken `safeImageUrl` (`lib/sanitize.ts`); it already permits root-relative `/api/...` paths —
  confirm with a quick test/grep, no edits to sanitize required.
- The `imageKey` field flows DB → `getSessionState` → page → runner. Add it to the projection/types, not
  by widening the public API beyond images.
- Keep Ukrainian copy + existing `alt`/styling on the `<img>`; this is a src-source change only.

## Plan
- [x] Add `resolveImageSrc` to `lib/image-resolve.ts` + branch tests.
- [x] Thread `imageKey` through `getSessionState` projection and the page → runner props/types.
- [x] Swap `test-runner.tsx` img src to `resolveImageSrc`; check admin preview path.
- [x] typecheck + `npm test`.

## Done
- [x] Added pure `resolveImageSrc(question)` to `lib/image-resolve.ts` (imports pure
  `safeImageUrl` from `@/lib/sanitize`): key → `/api/q-image/<key>`, else safe url, else null.
  Added 4-branch tests to `lib/image-resolve.test.ts` (key wins / safe url / neither→null /
  unsafe url→null). typecheck 0; `npx vitest run lib/image-resolve.test.ts` 22 passed;
  `npx vitest list` shows the resolveImageSrc tests.
- [x] Threaded `imageKey` DB→render: added `imageKey: sq.question.imageKey` to `getSessionState`'s
  per-question projection (`lib/server/test-engine.ts`); passed it through the page projection
  (`app/(app)/test/[id]/page.tsx`); added `imageKey: string | null` to `RunnerQuestion` and swapped the
  runner `<img>` src from `safeImageUrl(q.imageUrl)` to `resolveImageSrc({ imageKey: q.imageKey, imageUrl: q.imageUrl })`
  (`components/test-runner.tsx`). Admin editor (`question-editor.tsx`) keeps `safeImageUrl`: it live-previews
  a FREEFORM `imageUrl` text input the admin types (no `imageKey` in scope) — routing it through
  `resolveImageSrc` would never hit the key branch and add nothing. `safeImageUrl`/`lib/sanitize.ts`
  left untouched. typecheck 0; `npm test` 266 passed (0 failures); `bash verify.sh` → PASS.

## Next
- (none — Goal fully met; verify.sh PASSES)

## Artifacts
- lib/image-resolve.ts — adds `resolveImageSrc` + `ImageRef` (DONE)
- lib/image-resolve.test.ts — adds 4-branch `resolveImageSrc` tests (DONE)
- lib/server/test-engine.ts — `getSessionState` projection now selects `imageKey` (DONE)
- app/(app)/test/[id]/page.tsx — passes `imageKey` through to the runner (DONE)
- components/test-runner.tsx — `RunnerQuestion.imageKey` + `<img>` src via `resolveImageSrc` (DONE)

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T12:51Z ClPcs-Mac-mini: added pure `resolveImageSrc(question)` to lib/image-resolve.ts
  (key→/api/q-image/<key>, else safeImageUrl, else null) + 4 branch tests in image-resolve.test.ts.
  typecheck 0; vitest run image-resolve.test.ts → 22 passed; vitest list includes resolveImageSrc.
  Next increment = thread imageKey through engine projection → page → runner.
- 2026-06-23T12:54Z ClPcs-Mac-mini: threaded `imageKey` through the render path — engine projection
  (test-engine.ts `getSessionState`), page projection (test/[id]/page.tsx), and runner
  (test-runner.tsx: `RunnerQuestion.imageKey` + `<img>` src now `resolveImageSrc({imageKey,imageUrl})`).
  Admin editor keeps `safeImageUrl` (freeform imageUrl input, no key). sanitize.ts untouched.
  typecheck 0; `npm test` 266 passed; `bash verify.sh` → PASS. Goal fully met → Status: done.


## Verify
**Last verify:** PASS (2026-06-23T09:55:05Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T09:56:37Z)
