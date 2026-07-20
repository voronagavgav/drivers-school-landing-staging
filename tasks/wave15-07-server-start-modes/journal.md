# Task: wave15-07-server-start-modes

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T09:55Z
**Last compute:** ClPcs-Mac-mini

## Goal
Wire the four modes into the server start path (spec §B server wiring), exactly as ADAPTIVE_REVIEW/
SPACED_REVIEW were branched in Wave 11 — presets over existing machinery, no new engine. PASS = ALL true:

1. `startSession` (lib/server/test-engine.ts) branches `QUICK`, `MARATHON`, `SIGN_TRAINER`,
   `DIAGNOSTIC` before the generic path (grep each literal in lib/server/test-engine.ts or the
   study.ts fns it delegates to). Session creation reuses `createReviewSession` (study.ts) — grep
   shows the new start fns call it; `test_started` keeps firing via that single path.
2. SIGN_TRAINER pool filter (server-side): published/active/non-archived questions of the category
   whose topic.displayOrder ∈ {132, 133} OR imageKey != null. Underfilled pool → take what exists.
3. DIAGNOSTIC wiring: candidates loaded with topic.displayOrder + difficulty; blueprint via
   `blueprintForCategoryCode(category.code)`; spread via the pure `selectDiagnostic` (wave15-06).
   Fallback DECISION for a blueprint-less category: the generic selection path with count
   DIAGNOSTIC_COUNT (no new spread logic). Requires NO prior ReviewState/TopicMastery.
4. Integration proof — new file `lib/server/practice-modes.integration.test.ts`;
   `npx vitest run --config vitest.integration.config.ts lib/server/practice-modes.integration.test.ts`
   exits 0. Self-provisioned fixtures via `createOfficialQuestion` (lib/server/__testutils__), FK-safe
   cleanup (user → questions → topic → category). It proves ALL of:
   a. QUICK: fixture ≥12 published; FRESH user (zero ReviewState) → session has EXACTLY
      QUICK_COUNT (10) TestSessionQuestion rows, TestSession.mode === "QUICK".
   b. SIGN_TRAINER: fixture category containing a topic with displayOrder 132 plus a NON-sign topic;
      give SOME non-sign questions an imageKey, leave ≥1 non-sign question with imageKey null →
      session contains ONLY questions with (topic.displayOrder ∈ {132,133} OR imageKey != null);
      the imageKey-less non-sign question is ABSENT; size = min(SIGN_TRAINER_COUNT, eligible pool).
   c. MARATHON: fixture ≥25 published → first page has EXACTLY MARATHON_PAGE (20) rows, status
      IN_PROGRESS (resumable later via the untouched getResumableSession path).
   d. DIAGNOSTIC fallback (fixture category, no blueprint): fresh user → session has
      min(DIAGNOSTIC_COUNT, pool) rows.
   e. DIAGNOSTIC blueprint path against the SEEDED category B (exam-blueprint suite pattern): fresh
      throwaway user; `ctx.skip` unless every non-remainder blueprint block resolves ≥3 published
      official cat-B questions (compute in beforeAll via topic displayOrder). When it runs: 15 rows
      with per-block counts EXACTLY structure 2 · medicine 2 · law 1 · general 1 · safety 1 ·
      remainder 8 (the wave15-05 frozen vector, checked via each question's topic.displayOrder).
   f. QUICK counts toward daily goal: fixture user with dailyGoal 1; answer ≥1 question via the REAL
      `submitAnswer`, then `finishSession` → the StudyDay row for the finish day has
      answeredCount ≥ 1 AND goalMet === true.
   g. PRODUCTION ENTRY (at least once): QUICK driven through the real `startTestAction`
      (partial-mock @/lib/auth getCurrentUser + next/headers per house idiom; catch NEXT_REDIRECT) —
      assert redirect target starts with "/test/" and a TestSession with mode "QUICK" exists.
5. Frozen oracles untouched: both `shasum -a 256 -c` checks (wave15-03, wave15-05 records) pass.
6. `npm test` exits 0; `npx tsc --noEmit` exits 0.

## Constraints / decisions
- Candidate loads follow the loadReviewCandidates JS-join pattern — NEVER an id-list `in`/`notIn`
  over unbounded sets (P2029, chunk ≤200 if unavoidable). Extending loadReviewCandidates' select is
  allowed only ADDITIVELY (existing ADAPTIVE/SPACED behavior byte-identical).
- Pool empty → throw the existing NoQuestionsError (startTestAction already maps it to
  /dashboard?empty=<mode>); do NOT invent new error types.
- Server files may use `now: Date = new Date()` default-args (house pattern); all selection logic
  stays in the pure presets/diagnostic modules — no scoring/ordering code in lib/server.
- Never touch: FSRS math, recordReview path (it already fires per answer for every mode — spec §B),
  stable-key loader, existing modes' branches.
- Full `npm run test:integration` is wave15-16's gate (cross-task coupling rule) — this task gates
  only its own file plus the unit board.

## Next
- [x] Read wave15-01 Findings; added the four `startSession` branches + preset-driven start fns in
      study.ts (loadSignTrainerCandidates + loadDiagnosticCandidates) + practice-modes.integration.test.ts.
      `verify.sh` → `OK wave15-07`. Goal fully met.
- [ ] (follow-up, other tasks) DIAGNOSTIC blueprint (e) currently SKIPS on the live dev.db because the
      seeded topics sit at +101 not +99 (structure block §31/§45 → displayOrder 130/144 has only 1 pub
      question). Self-heals once official content at correct +99 offsets is imported — no code change here.

## Artifacts
- lib/server/test-engine.ts — four new mode branches in startSession (QUICK/MARATHON/SIGN_TRAINER/DIAGNOSTIC)
- lib/server/study.ts — startQuickSession/startMarathon/startSignTrainer/startDiagnostic + loadSignTrainerCandidates
  + loadDiagnosticCandidates; createReviewSession mode-union widened to the six preset/queue modes
- lib/constants.ts — SIGN_TRAINER_TOPIC_ORDERS = [132, 133]
- lib/server/practice-modes.integration.test.ts — proofs (a)–(g)

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T09:55Z ClPcs-Mac-mini: implemented server wiring. Added SIGN_TRAINER_TOPIC_ORDERS to constants;
  in study.ts added startQuickSession/startMarathon (reuse loadReviewCandidates), startSignTrainer (new
  loadSignTrainerCandidates: filters pool to topic.displayOrder∈{132,133} OR imageKey!=null, JS-join for
  ReviewState/mastery, never id-list `in`), startDiagnostic (new loadDiagnosticCandidates: id+difficulty+
  displayOrder, NO prior state; blueprintForCategoryCode→selectDiagnostic, else shuffle+slice fallback);
  widened createReviewSession's mode union; branched all four in startSession before baseWhere. Wrote the
  integration file (self-provisioned OFFICIAL fixtures + a manual sign fixture with topic displayOrder 132/
  imageKey control + a seeded-cat-B blueprint fixture with a ≥3-per-block readiness gate). Ran verify.sh →
  `OK wave15-07`: 4 mode branches present, selectDiagnostic + presets called, both frozen oracles intact,
  integration 6 passed/1 skipped, tsc clean, unit board 571 passed. Blueprint (e) SKIPS on the live seed
  (topics at +101 not +99 → structure block has 1 pub question) — legitimate, mirrors exam-blueprint suite.
  Followed the Goal's spec displayOrders {132,133} exactly (wave15-01 finding (i) notes the real live sign
  topics are 134/135, but the imageKey arm carries them; fixing the blueprint offset is out of scope).

## Verify
**Last verify:** PASS (2026-07-03T06:55:31Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T06:57:00Z)
