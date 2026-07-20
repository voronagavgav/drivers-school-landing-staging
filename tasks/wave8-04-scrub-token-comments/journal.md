# Task: wave8-04-scrub-token-comments

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
Finalize Spec §A's grep-cleanliness: the `SERVE_DEMO_QUESTIONS`/`demoWhere` tokens still appear in stale
COMMENTS inside surviving integration tests (they explain the old "demo questions are withheld" fixture
rationale). Scrub them so the whole `lib/`+`app/` tree is token-free. PASS = ALL true:
1. `grep -rnE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/ --exclude-dir=generated` returns NOTHING (this is
   the canonical Spec §D-5 gate over the whole tree).
2. The edits are COMMENT-ONLY (no test assertion, fixture data, or production code changed): for every file
   touched, the only changed lines are comments — the fixtures still create `isDemo:false` OFFICIAL questions
   exactly as before.
3. `npm run typecheck` exits 0.
4. `npm test` exits 0, ZERO failures.
5. `npm run db:seed` exits 0, then `npm run test:integration` exits 0, ZERO failures.

## Constraints / decisions
- DEPENDS ON tasks 02 (demo-retired deleted) and 03 (production tokens removed): only once those land will
  the §D-5 grep be reducible to comment-only hits. If either is undone, mark BLOCKED.
- The affected files are the surviving integration suites whose comments still mention the tokens — at the
  time of planning: `access-control`, `due-mistakes`, `engine`, `exam-short-pool`, `finish-idempotency`,
  `mixed-weak-topics`, `progress-volume`, `saved-excludes-unpublished` (`.integration.test.ts`). Re-run the
  grep to get the live list; edit whatever still matches.
- Reword each stale comment to describe the CURRENT reality (the suite provisions its own OFFICIAL questions
  because the seeded category is content the live pool serves directly) WITHOUT naming the removed tokens —
  do not just delete the explanation if it still aids the reader; just drop the obsolete token reference.
- Do NOT change any fixture/`isDemo:false`/assertion/`it()` here — behaviour-neutral comment edits only. The
  §C de-dup (task 05) is a SEPARATE concern and may later rewrite these fixtures; this task must not
  pre-empt it.
- This task runs BEFORE task 05 so §D-5 is clean regardless of which suites 05 chooses to refactor; task 05
  must not re-introduce the tokens.

## Plan
- [x] `grep -rnE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/ --exclude-dir=generated` → the live hit list.
- [x] For each hit (all should be comments now), reword/trim the comment to drop the token, keeping the
      fixture rationale accurate.
- [x] Re-run the grep → empty; `npm run typecheck`; `npm test`.
- [x] `npm run db:seed` then `npm run test:integration` → green.

## Done
- [x] Ran the §D-5 grep: 9 stale comment hits across 8 surviving integration suites (access-control ×2,
      due-mistakes, engine, exam-short-pool, finish-idempotency, mixed-weak-topics, progress-volume,
      saved-excludes-unpublished).
- [x] Reworded all 9 comments to current reality (demo-serving retired; every published question is
      OFFICIAL) without naming `SERVE_DEMO_QUESTIONS`/`demoWhere`. Verified comment-only via git diff.
- [x] §D-5 grep now empty; `typecheck` exit 0; `npm test` 283 passed; `db:seed` then `test:integration`
      18 files / 63 tests passed, 0 failures. All 5 PASS conditions met → Status: done.

## Next
- [ ] (none — goal met; driver re-runs verify)

## Artifacts
- Comment-only edits to: lib/server/{access-control,due-mistakes,engine,exam-short-pool,
  finish-idempotency,mixed-weak-topics,progress-volume,saved-excludes-unpublished}.integration.test.ts

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 ClPcs-Mac-mini: grep found 9 comment hits in 8 suites; reworded each to drop the
  SERVE_DEMO_QUESTIONS/demoWhere tokens while keeping fixture rationale accurate (all changed lines are
  `//` comments, confirmed via git diff). §D-5 grep now returns nothing; typecheck exit 0; npm test
  283/283; db:seed reseeded 1691 official Qs; test:integration 18 files/63 tests, 0 failures. Status → done.

## Verify
**Last verify:** PASS (2026-06-23T16:42:06Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T16:43:12Z)
