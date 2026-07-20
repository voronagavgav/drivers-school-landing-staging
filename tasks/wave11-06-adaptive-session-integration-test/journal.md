# Task: wave11-06-adaptive-session-integration-test

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
Author `lib/server/adaptive-session.integration.test.ts` proving the queue-driven sessions work through
PRODUCTION entry paths. Depends on wave11-05. DONE when (verify.sh exits 0):

1. The suite self-provisions an OFFICIAL fixture via `__testutils__/official-question.ts`
   (`createOfficialQuestion`), with a UNIQUE fixture category/keys per run (noise-proof — no reliance
   on top-N ordering or the shared seed pool). FK-safe `afterAll` cleanup.
2. Seeds `ReviewState` rows for the fixture user with a KNOWN mix: some due/overdue (past `dueAt`),
   some new (no ReviewState). Then asserts:
   - `startAdaptiveReview(userId, categoryId, now)` returns a session id; the created
     `TestSessionQuestion` set has size ≤ the effective size and is NON-empty; it INCLUDES the due
     items (due-first composition) and ≤ the new-item budget of unseen items.
   - A fixture category with published questions but ZERO due & ZERO seen → `startAdaptiveReview`
     still returns a NON-empty session (unseen-first fallback; never throws).
3. `startSpacedReview(userId, categoryId, now)` with NOTHING due throws `NothingDueError`
   (`await expect(...).rejects.toThrow(NothingDueError)` or instanceof check).
4. ADAPTIVE_REVIEW is startable through the ACTION: calling `startTestAction` (the real server action;
   partial-mock `@/lib/rbac`/`@/lib/auth` to return the fixture user) with `FormData mode=ADAPTIVE_REVIEW`
   creates a `TestSession(mode="ADAPTIVE_REVIEW")` row for the user (catch the `NEXT_REDIRECT` throw,
   then query the DB for the session). This proves the action-level acceptance, not just the helper.
5. The integration file is in the integration list (`npx vitest list --config vitest.integration.config.ts`
   capture-to-var) and the file runs GREEN in isolation.

## Constraints / decisions
- PRODUCTION-PATH: §4 drives the real `startTestAction`, not only the internal fn (spec §B: "ADAPTIVE_REVIEW
   now startable through the ACTION").
- NOISE-PROOF: unique fixture identifiers per run (analytics-suite top-N fragility is the counterexample,
   UX-FINDINGS). Assert set membership/counts, never absolute ordering of rng-shuffled new items.
- Test-only task: NO product-code edits (if a bug is found, mark blocked on wave11-05, don't patch here).
- Verify runs ONLY this file (dev-DB state is shared — avoid cross-task red, CLAUDE.md).

## Plan
- [x] Provision fixtures + seed ReviewStates.
- [x] Assert composition, fallback, NothingDueError, action-path start.

## Next
- [x] Suite authored and green — task done. (wave11-16 runs the wave verify.)

## Log
- 2026-07-02 planner: task authored.
- 2026-07-02 ClPcs-Mac-mini: Authored `lib/server/adaptive-session.integration.test.ts` (4 tests) mirroring
  srs-review's style. Self-provisions two throwaway OFFICIAL fixtures via createOfficialQuestion (unique
  per-run codes/emails), seeds 12 due/overdue ReviewState rows + 8 unseen for the composition fixture and a
  fresh 5-question pool for fallback/NothingDue. §2 asserts all due cards present + unseen ≤ round(size×0.2)
  budget (size 12 seen fills all but the budget so it binds, backfill can't overfill); §2b non-empty fallback;
  §3 rejects.toThrow(NothingDueError); §4 drives real startTestAction (getCurrentUser partial-mock, NEXT_REDIRECT
  caught) and asserts a new ADAPTIVE_REVIEW TestSession row (before+1). verify.sh green: 1 file / 4 tests passed.

## Artifacts
- lib/server/adaptive-session.integration.test.ts (new)

## Verify
**Last verify:** PASS (2026-07-01T23:02:30Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T23:04:37Z)
