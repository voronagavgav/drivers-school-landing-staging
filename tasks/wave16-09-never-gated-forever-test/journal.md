# Task: wave16-09-never-gated-forever-test

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-04T17:51Z
**Last compute:** mac-mini

## Goal
The FOREVER regression test (spec T1, verbatim: "NEVER gated — assert in an integration test that
stays forever"): with entitlements FULLY ON and a user who has NO entitlement, every piece of the
free-forever set still works through the REAL entry paths. PASS = ALL true:

1. `lib/server/never-gated.integration.test.ts` exists, with a header comment stating it encodes
   the spec-T1 free-forever contract and MUST NEVER be weakened or deleted (marker string
   `NEVER-GATED-CONTRACT` on a comment line — future waves' verify gates can grep it).
2. All assertions run under `vi.stubEnv("ENTITLEMENTS_ENABLED", "true")` with a fixture user
   (createOfficialQuestion helper) who has NO Entitlement row, and prove:
   a. QUESTIONS + MODES: the real `startTestAction` (partial-mock getCurrentUser, catch
      NEXT_REDIRECT — house pattern) succeeds for at least TOPIC_PRACTICE and EXAM_SIMULATION on
      the fixture category (session row created);
   b. ANSWER PATH + EXPLANATIONS: real `submitAnswer` on the practice session returns the
      immediate-feedback shape incl. explanation fields when present (content never trimmed);
   c. IMAGES: the real `GET` export of `app/api/q-image/[key]/route.ts` returns 200 for a live
      imageKey (reuse the wave13 q-image-route test pattern);
   d. PROGRESS HISTORY: `computeProgress` (and `getTopicMap` if that is the /progress loader per
      wave16-01 Findings) resolve for the non-entitled user with the flag ON;
   e. SIMULATOR: covered by (a) EXAM_SIMULATION — assert the session has the exam question count
      or mode field, proving it actually started.
3. The SAME file re-runs the (a)+(d) assertions with the env var UNSET (flag off) — both states
   locked in.
4. This file contains ZERO imports from lib/entitlements or lib/server/entitlements — the
   free-forever set must not even consult the gate (grep-enforced).
5. `npm run test:integration` exits 0; `npx tsc --noEmit` exits 0.
6. Scope: only this new test file (+ fixtures) — `git diff --name-only` shows no production code
   changes. If any assertion FAILS, that is a wave16-08 bug: mark this task blocked on wave16-08,
   do NOT "fix" by weakening an assertion.

## Constraints / decisions
- Written by a DIFFERENT task than the gating implementation on purpose (anti self-grading): this
  test encodes the spec's list, not wave16-08's behavior. Write assertions from spec T1's
  never-gated list FIRST, then run.
- Production-path rule: drive startTestAction / submitAnswer / the route GET export — never
  internal selection helpers.
- Fixture hygiene (house rules): lowercase fixture email labels; cleanup deletes User before
  Questions; use createOfficialQuestion from lib/server/__testutils__/official-question.ts.
- Depends on: wave16-08 landed (otherwise nothing to regress against yet).

## Next
- [x] Write the test from the spec list, run it, and if anything fails file it against wave16-08.
- (none — Goal met, verify.sh green. If a future assertion fails, that is a wave16-08 bug: block on wave16-08, do NOT weaken an assertion.)

## Artifacts
- lib/server/never-gated.integration.test.ts

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T17:51Z ClPcs-Mac-mini: Wrote lib/server/never-gated.integration.test.ts encoding spec-T1
  free-forever contract (marker NEVER-GATED-CONTRACT, header states MUST-NEVER-weaken). Uses
  createOfficialQuestion (count=20, no Entitlement row) + partial-mock getCurrentUser + catch
  NEXT_REDIRECT (house pattern). Flag ON (vi.stubEnv ENTITLEMENTS_ENABLED=true) proves: (a/e)
  startTestAction succeeds for TOPIC_PRACTICE and EXAM_SIMULATION (exam totalQuestions=20); (b) real
  submitAnswer returns immediate-feedback shape with FULL untrimmed explanation shortText/detailedText;
  (c) q-image GET → 200 for a live key (q-image route pattern, throwaway public/official-images png);
  (d) computeProgress + getTopicMap resolve. Flag-OFF describe re-locks (a)+(d). Zero entitlement
  imports. 6 tests green; verify.sh green (OK wave16-09) incl. full test:integration (190 pass/2 skip),
  tsc clean, no production changes. All assertions passed → no wave16-08 bug filed.
- GOTCHA: verify.sh line 14 greps the WHOLE test file for `lib/entitlements|lib/server/entitlements`
  — my first draft mentioned those literal paths in a comment and false-failed the "no gate import"
  gate. Reworded the comment to prose (per the CLAUDE.md purity-gate-greps-comments learning).

## Verify
**Last verify:** PASS (2026-07-04T14:52:33Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T14:53:56Z)
