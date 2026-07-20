# Task: wave5-11-verify-wave5

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-22
**Last compute:** cloud-agent

## Goal
Spec D — Wave-5 acceptance gate. VERIFY-ONLY: no new feature code. Run the full gate; PASS only if every
criterion holds. On ANY failure, record it in this journal and REOPEN the failing upstream task (set its
Status back to `active`); do NOT fix it here. Depends on wave5-02..wave5-10.

1. `npm run typecheck` exits 0.
2. `npm test` exits 0 with ZERO failures, and `npx vitest list` includes ALL three new unit test files:
   `lib/test-engine/due-mistakes.test.ts` (A), `lib/mastery.test.ts` (B), `lib/readiness.test.ts` (C).
3. `npm run db:seed` exits 0 reporting ≥24 demo questions, THEN `npm run test:integration` exits 0 with
   ZERO failures and `npx vitest list --config vitest.integration.config.ts` includes
   `lib/server/due-mistakes.integration.test.ts` (the new Wave-5 integration test).
4. `npm run build` exits 0.
5. Static A–C presence + purity:
   a. A: `dueMistakes` exported from `lib/test-engine/selection.ts` and PURE (no server/DB tokens; no
      clock/global random EXCEPT the documented injectable `rng` defaults — scope the determinism grep
      with `grep -v rng`, per the wave3-feat-02/12 learning); `REVIEW_INTERVALS_HOURS` in
      `lib/constants.ts`; `countDueMistakes` in `lib/server/mistakes.ts`; the dashboard calls
      `countDueMistakes` and renders the `на повторення` card.
   b. B: `topicMastery` + `MASTERY_LABEL` exported from `lib/mastery.ts` and PURE; reuses
      `WEAK_TOPIC_*`; `MASTERY_STRONG_ACCURACY_THRESHOLD` in `lib/constants.ts`; `getTopicMastery` in
      `lib/server/mastery.ts`; the `/progress` page imports `getTopicMastery` + `MASTERY_LABEL` and has
      a scoped TOPIC_PRACTICE `практикувати` CTA; `components/app-nav.tsx` links `/progress`.
   c. C: `examReadiness` exported from `lib/readiness.ts` and PURE; `EXAM_READINESS_*` in
      `lib/constants.ts`; the dashboard calls `examReadiness`; the readiness disclaimer is present and
      EVERY `гаранті…` occurrence on the dashboard is negated (the token `не` on the same line).
6. `prisma/schema.prisma` is NOT modified by this wave: it is clean in `git status`, and no `wave5-`
   commit touched it (`git log --oneline -- prisma/schema.prisma | grep -i wave5` is empty).

## Constraints / decisions
- VERIFY-ONLY: this task adds NO feature code and changes no `lib/`/`app/`/`prisma/` source. Its only
  writes are this journal (recording results / reopening failed tasks) and its `verify.sh`.
- On failure: append a `## Verify` failure note naming the failing criterion + the upstream task, flip
  that task's `**Status:**` to `active`, and STOP (do not patch downstream).
- A schema change is a HARD STOP for the wave (NO `migrate dev` — see CLAUDE.md); if one is found,
  reopen the task that introduced it.
- Non-Goal: fixing anything, adding tests, or relaxing any criterion.

## Plan
- [x] Run typecheck + unit suite (assert 3 new unit files present).
- [x] Seed (≥24) + integration suite (assert the new integration file present).
- [x] Build.
- [x] Static A–C presence + purity + schema-unchanged checks.
- [x] If all green, mark done; else record + reopen the failing task.

## Done
- [x] Ran the full Wave-5 acceptance gate (`verify.sh`) — ALL criteria green; no failures to triage.

## Next
- [ ] (none — gate passed, task done)

## Artifacts
- tasks/wave5-11-verify-wave5/verify.sh — the full Wave-5 acceptance gate (A–D).

## Log
- 2026-06-22 cloud-agent: scaffolded by planner.
- 2026-06-22T22:41Z ClPcs-Mac-mini: ran `verify.sh` (full Wave-5 gate A–D). ALL green: typecheck exit 0;
  unit 244 passed / 0 fail (A/B/C unit files present); seed 25 demo questions (≥24); integration 60 passed
  / 2 skipped / 0 fail (due-mistakes.integration.test.ts present); build exit 0; static A–C presence+purity
  all pass; prisma/schema.prisma clean + no wave5 commit touched it. No failures to triage → Status: done.

## Verify
**Last verify:** PASS (2026-06-22T19:41:56Z)

## Evaluation
**Last evaluation:** PASS (2026-06-22T19:44:21Z)
