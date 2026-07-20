# Task: wave9-07-content-stats-integration-test

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-24
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §E — integration test for the server aggregation. Add
`lib/server/content-stats.integration.test.ts`. Depends on task 04. PASS = ALL true:

1. `lib/server/content-stats.integration.test.ts` exists.
2. It exercises the REAL aggregation: imports `getContentHealth` from `@/lib/server/content-stats`, and
   self-provisions fixtures via `createOfficialQuestion` from `@/lib/server/__testutils__/official-question`
   (it does NOT hand-roll category/topic/question setup).
3. It builds a KNOWN distribution for a "wrong-key" question where a distractor option is picked MORE often
   than the keyed-correct option, by inserting throwaway `TestSession` + `TestAnswer` rows that set
   `selectedOptionId`, `isCorrect`, and `timeSpentSeconds` (multiple picks of one question live in
   DIFFERENT sessions — `TestAnswer` has `@@unique([testSessionId, questionId])`).
4. It calls `getContentHealth({ minSample: <small> })` and asserts, for the wrong-key question, the
   reported `accuracy`, the per-option `picks` (distractor picks > correct picks), and `avgTimeSeconds`
   match the constructed distribution, AND that its `flags` INCLUDE `WRONG_KEY_SUSPECTED`.
5. It adds a HEALTHY question (keyed-correct option dominates) and asserts its `flags` contain no
   actionable flag (no `WRONG_KEY_SUSPECTED`/`LOW_DISCRIMINATION`).
6. `afterAll` is FK-safe and removes every throwaway row (user→sessions/answers cascade, then questions,
   topic, category) — re-running the suite leaves no residue.
7. `npm run db:seed` exits 0, THEN `npm run test:integration` exits 0 with ZERO failures, AND
   `npx vitest list --config vitest.integration.config.ts` (capture-to-var) INCLUDES
   `content-stats.integration.test.ts`.

## Constraints / decisions
- **Evaluate: yes** — this is the behavioural proof of the headline `WRONG_KEY_SUSPECTED` signal; an
  independent judge confirms the assertions are real (not vacuous) and the suite genuinely runs the file.
- `getContentHealth` reads ALL `TestAnswer` rows (no user filter); assert on the SPECIFIC fixture
  questions (locate them in the returned `questions` by id/questionKey), NOT on global totals — other
  rows in the dev DB must not break the test.
- Pass a SMALL `minSample` to `getContentHealth` so a handful of answers clears the thin-data threshold;
  do not depend on the production default (sized for real traffic).
- FK order (CLAUDE.md): keep all throwaway sessions under the fixture's user so a user-first delete
  cascades every answer BEFORE any referenced question is deleted; run the wrong-key fixture's cleanup
  (the one owning the sessions) before deleting any other fixture's question.
- A `*.integration.test.ts` file IS collected by the integration glob (unlike `__testutils__/*.ts`).
- Non-Goals: changing the aggregation/flags (tasks 02–04), seeding official content (db:seed already
  imports it), UI assertions (task 06).

## Plan
- [x] Provision a wrong-key question (custom options) + a healthy question via `createOfficialQuestion`.
- [x] Insert sessions/answers for the known distribution; call `getContentHealth({ minSample })`.
- [x] Assert accuracy/picks/avgTime + `WRONG_KEY_SUSPECTED` (wrong-key) and no actionable flag (healthy).
- [x] FK-safe `afterAll`; run `db:seed` + `test:integration`; confirm inclusion via vitest list.

## Done
- [x] Wrote `lib/server/content-stats.integration.test.ts` (2 OFFICIAL fixture questions via
      `createOfficialQuestion`, count:2; patched per-option `optionKey` so the aggregation's
      `selectedOption.optionKey` grouping sees them; 10 sessions carrying a known wrong-key (3 correct /
      7 distractor, avg 20s) + healthy (8/2) distribution).
- [x] Asserts accuracy/correct/avgTime/per-option picks + `flags ∋ WRONG_KEY_SUSPECTED` (wrong-key)
      and `flags === []` (healthy, no actionable signal); FK-safe `afterAll` via `fixture.cleanup()`.
- [x] `verify.sh` GREEN: `db:seed` ok, vitest list includes the file, `test:integration` = 19 files /
      65 tests, ZERO failures.

## Next
- [ ] (none — Goal met; hand off to wave9-08 which runs the wave-level verify.)

## Artifacts
- `lib/server/content-stats.integration.test.ts` — the aggregation integration test.
- `tasks/wave9-07-content-stats-integration-test/verify.sh` — executable gate.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-24 ClPcs-Mac-mini: wrote `lib/server/content-stats.integration.test.ts`. Key gotcha:
  `createOfficialQuestion` leaves option `optionKey` null, but `getContentHealth` groups by
  `selectedOption.optionKey` and SKIPS null-key picks — so the test patches a unique optionKey onto
  each fixture option before recording answers. Distribution as literals (wrong-key 3 correct/7
  distractor, avg 20s; healthy 8/2). verify.sh PASS — suite 19 files/65 tests, zero failures, file
  in `npx vitest list`. Status → done.

## Verify
**Last verify:** PASS (2026-06-23T21:23:00Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T21:24:09Z)
