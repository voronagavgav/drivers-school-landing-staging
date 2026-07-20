# Task: wave8-02-delete-demo-retired-test

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec §B — delete the obsolete withholding test. PASS = ALL true:
1. `lib/server/demo-retired.integration.test.ts` no longer exists.
2. No remaining `*.ts`/`*.tsx` file under `lib/`/`app/` `import`s `SERVE_DEMO_QUESTIONS` from `@/lib/constants`
   in a `demo-retired` context — i.e. `grep -rl "demo-retired" lib/ app/` returns nothing.
3. `npx vitest list --config vitest.integration.config.ts` (captured to a var first) does NOT include
   `demo-retired.integration.test.ts`.
4. `npm run typecheck` exits 0 (the `SERVE_DEMO_QUESTIONS` export still exists at this step — only the test
   that asserted withholding is removed — so nothing else breaks).
5. `npm test` exits 0, ZERO failures.

## Constraints / decisions
- This task ONLY deletes the one obsolete integration test (it asserts the demo withholding that Wave 8
  removes). It does NOT yet remove the `SERVE_DEMO_QUESTIONS` constant — that is task 03.
- ORDERING: this must run BEFORE task 03. `demo-retired.integration.test.ts` is the ONLY non-comment code
  importer of `SERVE_DEMO_QUESTIONS` outside the four production files; deleting it first lets task 03 drop
  the constant export without a dangling-import typecheck error.
- Do NOT touch any other test, the constant, or production code here. Non-Goal: the §C de-dup, the §A removal.
- `npx vitest list` SIGPIPE/pipefail trap (CLAUDE.md): capture its output to a var, then `grep -q`; do not
  pipe `vitest list` straight into `grep -q`.

## Plan
- [x] `git rm lib/server/demo-retired.integration.test.ts` (or `rm`).
- [x] `x="$(npx vitest list --config vitest.integration.config.ts || true)"; echo "$x" | grep -q demo-retired`
      must be FALSE.
- [x] `npm run typecheck` and `npm test`.

## Done
- [x] Deleted `lib/server/demo-retired.integration.test.ts` via `git rm`; confirmed no `demo-retired`
      refs remain in `lib/`/`app/`, file absent from integration list, typecheck 0, `npm test` 0 failures.

## Next
- [ ] (none — Goal met; awaiting driver verify)

## Artifacts
- DELETED: `lib/server/demo-retired.integration.test.ts`

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 ClPcs-Mac-mini: `git rm lib/server/demo-retired.integration.test.ts`. Gates green —
  `grep -rl demo-retired lib/ app/` empty; `npx vitest list --config vitest.integration.config.ts`
  (captured to var) excludes demo-retired; `npm run typecheck` exit 0; `npm test` 24 files / 283 tests,
  0 failures. SERVE_DEMO_QUESTIONS export untouched (task 03's job). Status → done.

## Verify
**Last verify:** PASS (2026-06-23T16:32:28Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T16:33:02Z)
