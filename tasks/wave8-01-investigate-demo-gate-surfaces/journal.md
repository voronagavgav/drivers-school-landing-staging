# Task: wave8-01-investigate-demo-gate-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
INVESTIGATION ONLY — write NO production/test code, only the findings artifact. Produce
`tasks/wave8-01-investigate-demo-gate-surfaces/FINDINGS.md` such that ALL hold:
1. `FINDINGS.md` exists.
2. It enumerates EVERY `SERVE_DEMO_QUESTIONS`/`demoWhere` site under `lib/` and `app/`, split into
   (a) PRODUCTION-CODE sites and (b) COMMENT-ONLY sites (in surviving integration tests).
3. It explicitly names `lib/server/mastery.ts` as a production site that the Wave-8 spec PROSE (§A) does
   NOT list but that the §D-5 grep gate requires cleaning (the key discovery).
4. It lists the four production files to edit in §A-removal: `lib/constants.ts`, `lib/server/test-engine.ts`,
   `lib/server/mastery.ts`, `app/(app)/practice/page.tsx`.
5. It records the typecheck-ordering constraint: removing the `SERVE_DEMO_QUESTIONS` export breaks
   `lib/server/demo-retired.integration.test.ts`'s `import { SERVE_DEMO_QUESTIONS }`, so that test must be
   DELETED before/with the constant removal.
6. It lists the integration suites that hand-roll a throwaway OFFICIAL (`isDemo:false`) question fixture
   (candidates for the §C shared helper) — at least: access-control, analytics-dashboard, engine,
   due-mistakes, exam-blueprint, mixed-weak-topics, finish-idempotency, exam-short-pool, progress-volume,
   saved-excludes-unpublished.
7. It records the PRESERVE list (must NOT be removed this wave): the `Question.isDemo`/`sourceType` columns,
   the `DEMO` value in `SOURCE_TYPES`, and the `lib/validation.ts` `sourceType==="DEMO" ⇔ isDemo` refine.

## Constraints / decisions
- Read-only investigation. The artifact is consumed by tasks 02–06; do not implement the cleanup here.
- Scope of the §D-5 grep is `lib/` + `app/` ONLY (generated client + `prisma/`/`scripts/` migration comments
  excluded). A repo-wide sweep already confirms there are NO matches outside `lib/`+`app/` — record that so
  later tasks don't widen scope.
- Be conservative: this wave removes ONLY the serving-gate token, never the data fields.

## Plan
- [x] `grep -rnE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/` and classify each hit production vs comment.
- [x] Read `lib/server/mastery.ts`, `lib/server/test-engine.ts`, `app/(app)/practice/page.tsx`,
      `lib/constants.ts` to confirm the exact edit sites; note line ranges.
- [x] Skim the fixture-creating integration suites to confirm the shared-helper candidate list.
- [x] Write `FINDINGS.md`.

## Done
- [x] Ran the classification grep, confirmed all four production edit sites (incl. the spec-missed
      `mastery.ts`) with line ranges, confirmed the OFFICIAL-fixture suite list, and wrote
      `FINDINGS.md`. Verify gate PASSES.

## Next
- [ ] (none — Goal met; artifact consumed by tasks 02–06.)

## Artifacts
- `tasks/wave8-01-investigate-demo-gate-surfaces/FINDINGS.md` — the enumerated cleanup map for tasks 02–06.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T00:00Z ClPcs-Mac-mini: ran `grep -rnE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/`,
  read the four production files + `lib/validation.ts` refine + `demo-retired.integration.test.ts`,
  and confirmed the OFFICIAL-fixture suite list via
  `grep -rlnE 'isDemo:\s*false|sourceType:\s*"OFFICIAL"' lib/server/*.integration.test.ts`.
  Wrote `FINDINGS.md` mapping (a) 4 production sites w/ exact lines (incl. spec-missed `mastery.ts`),
  the `demo-retired` delete-first ordering, (b) 8 comment-only test sites, (c) 10+ shared-helper
  candidate suites, (d) PRESERVE list (isDemo/sourceType columns, DEMO enum value, validation refine).
  `verify.sh` → PASS. Investigation complete; Status → done.

## Verify
**Last verify:** PASS (2026-06-23T16:28:57Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T16:31:12Z)
