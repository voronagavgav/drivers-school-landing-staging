# Task: wave15-14-diagnostic-finish-screen

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-03T10:46Z
**Last compute:** mac-mini

## Goal
The DIAGNOSTIC finish experience (spec §D): first readiness-dial reveal (honest), named weakest topic
from the diagnostic's OWN answers, plan CTA, and the diagnostic_completed event. PASS = ALL true:

1. Pure helper `weakestTopicFromAnswers(answers: readonly { topicId: string; isCorrect: boolean }[])
   : string | null` exported from lib/test-engine/diagnostic.ts (grep). Rules (normative):
   per-topic accuracy = correct/total; weakest = LOWEST accuracy; ties → MORE wrong answers wins;
   still tied → lexicographically smallest topicId; returns null when input is empty OR every
   topic's accuracy is 1.0 (never a fabricated weakness).
2. Unit tests in a NEW file lib/test-engine/diagnostic-finish.test.ts (the wave15-05 oracle file is
   FROZEN — do not touch it) with these PLANNER-FROZEN literal vectors:
   - [{t1,true},{t1,false},{t2,false}] → "t2"            (0% < 50%)
   - [{t1,false},{t2,false},{t2,false}] → "t2"           (tie at 0%; t2 has 2 wrong > 1)
   - [{t1,false},{t2,false}] → "t1"                      (full tie → lexicographic)
   - [{t1,true},{t2,true}] → null                        (all perfect → no dishonest weakness)
   - [] → null
   `npx vitest run lib/test-engine/diagnostic-finish.test.ts` exits 0.
3. Result page (app/(app)/test/[id]/result/page.tsx) for a COMPLETED DIAGNOSTIC session renders a
   diagnostic-specific section:
   a. The reused ReadinessDial (components/readiness-dial.tsx — grep the import/usage on the result
      page) fed from the REAL getLatestReadiness values; the `sufficientData` flag is passed through
      UNTOUCHED (grep: no hardcoded `sufficientData={true}`) — if insufficient at N=15, the honest
      insufficient-data state shows with the plan CTA (spec: "never a fabricated number"; per
      wave15-01 finding (f), this may be the COMMON state — design for it, the dial percent is the
      lucky case).
   b. The weakest topic's TITLE (via weakestTopicFromAnswers over the session's own TestAnswer rows
      joined to topics), with a start-practice affordance for that topic; when null → neutral praise
      copy instead (no invented weakness).
   c. A plan CTA into the existing plan surface (LinkButton/anchor to /dashboard — grep in the
      diagnostic branch).
4. `diagnostic_completed` recorded EXACTLY ONCE per diagnostic, at the finish transition inside
   finishSession's status-flip branch, mode-gated (grep diagnostic_completed in
   lib/server/test-engine.ts; the name exists in ANALYTICS_EVENTS since wave15-02).
5. Integration proof — lib/server/diagnostic-finish.integration.test.ts;
   `npx vitest run --config vitest.integration.config.ts lib/server/diagnostic-finish.integration.test.ts`
   exits 0, proving: fixture diagnostic with CONTROLLED answers (topic X all-wrong, topic Y
   all-correct via chosen optionIds) → after the real finishSession, weakestTopicFromAnswers over the
   persisted rows returns X's topicId; exactly 1 AnalyticsEvent row with eventName
   "diagnostic_completed" exists for the session's user; re-running finishSession (idempotent
   retry) leaves the count at 1.
6. Frozen-oracle sha checks (wave15-03, wave15-05) pass; `npm test` exits 0; `npx tsc --noEmit` exits 0.

## Constraints / decisions
- DIAL HONESTY is the point of this task: if READINESS_MIN_SEEN > 15, sufficientData will be false
  after a pure diagnostic — the spec REQUIRES the honest state + plan CTA, not a number. Never
  special-case the threshold for diagnostics.
- First-reveal count-up animation only under motion-safe (prefers-reduced-motion respected — reuse
  whatever the dial already does; do not add new animation machinery).
- Post-finish reveal is allowed (withholding was pre-finish only) — the existing result breakdown may
  render for DIAGNOSTIC as-is.
- Design craft: calm Ukrainian copy, no scores-as-judgement («Ось з чого почати», not failure
  framing); boldness in ONE place (the dial); the weakest-topic line names the topic and invites one
  action; legal positioning unchanged.
- recordEvent stays fire-and-forget OUTSIDE any $transaction (house rule).

## Next
- [x] Read wave15-01 findings (f)(k); write weakestTopicFromAnswers + its frozen-literal unit tests.
- [x] Record `diagnostic_completed` EXACTLY ONCE in finishSession's IN_PROGRESS status-flip branch,
      mode-gated (`if (session.mode === "DIAGNOSTIC") void recordEvent(...)` alongside the existing
      `test_completed`; name already in ANALYTICS_EVENTS).
- [x] Add the DIAGNOSTIC finish section to app/(app)/test/[id]/result/page.tsx (ReadinessDial via
      getLatestReadiness with `sufficientData` untouched; weakest-topic TITLE via
      weakestTopicFromAnswers over the session's TestAnswer rows joined to topics + start-practice
      affordance / neutral praise when null; plan CTA to /dashboard). Per finding (f), N=15 < READINESS_MIN_SEEN=20
      so the honest insufficient-data dial state is the COMMON case — design for it.
- [x] Integration proof lib/server/diagnostic-finish.integration.test.ts: fixture DIAGNOSTIC session
      with controlled answers (topic X all-wrong, topic Y all-correct) → after real finishSession,
      weakestTopicFromAnswers over persisted rows returns X's topicId; exactly 1 AnalyticsEvent
      "diagnostic_completed" for the user; re-run finishSession keeps count at 1.
- Goal fully met; all task gates green (see Log). Nothing left.

## Artifacts
- lib/test-engine/diagnostic.ts (helper append) · lib/test-engine/diagnostic-finish.test.ts
- app/(app)/test/[id]/result/page.tsx · lib/server/test-engine.ts
- lib/server/diagnostic-finish.integration.test.ts

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T10:38Z ClPcs-Mac-mini: Read wave15-01 findings (f)(k). Added pure `weakestTopicFromAnswers`
  to lib/test-engine/diagnostic.ts (accuracy=correct/total; lowest wins; tie→more wrong; tie→lex-min
  topicId; null on empty or all-1.0). Wrote frozen-literal unit oracle lib/test-engine/diagnostic-finish.test.ts
  (5 planner vectors). `npx vitest run lib/test-engine/diagnostic-finish.test.ts` = 5 passed; frozen
  wave15-05 oracle still 6 passed; `npx tsc --noEmit` clean. Next: the event, the result-page section,
  the integration file.
- 2026-07-03T10:52Z ClPcs-Mac-mini: Added the `diagnostic_completed` event to finishSession
  (lib/server/test-engine.ts) — mode-gated inside the IN_PROGRESS status-flip branch right after
  `test_completed`, fire-and-forget `void recordEvent(...)` outside any $transaction, so a repeat
  finish on an already-COMPLETED session (early return) can never re-emit. Confirmed name present in
  ANALYTICS_EVENTS (lib/constants.ts:192). `npx tsc --noEmit` clean. Verify still expected RED on the
  result-page dial gate (that section is the next increment). Next: the result-page DIAGNOSTIC section.
- 2026-07-03T11:10Z ClPcs-Mac-mini: Added the DIAGNOSTIC finish section to app/(app)/test/[id]/result/page.tsx.
  Imports ReadinessDial + getLatestReadiness + weakestTopicFromAnswers + READINESS_MIN_SEEN. For a
  COMPLETED DIAGNOSTIC session: fetches the real snapshot via getLatestReadiness(user.id, session.categoryId)
  and feeds the reused <ReadinessDial> with `sufficientData` passed THROUGH untouched (no hardcode —
  honest insufficient-data state at N=15 < minSeen=20); computes the weakest topic from the session's
  OWN answered questions (topicId+isCorrect) via weakestTopicFromAnswers, resolves its title from
  state.questions, renders a «Ось з чого почати» card with a TOPIC_PRACTICE start-affordance (or neutral
  praise copy when null), plus a «Мій план навчання» LinkButton CTA to /dashboard. `npx tsc --noEmit`
  clean; verify's dial gate + no-hardcoded-sufficientData gate now PASS. Next fail is the missing
  integration file (task item 5) — the next increment.
- 2026-07-03T10:46Z ClPcs-Mac-mini: Wrote lib/server/diagnostic-finish.integration.test.ts (mirrors
  finish-idempotency style). Two createOfficialQuestion fixtures share one category/user: X owns
  category+user+topicX (3 Qs), Y attaches to X's category (withUser:false) + topicY (3 Qs). Drives the
  REAL startDiagnostic(userId, categoryId) (no blueprint → fallback shuffle picks all 6), answers
  topic X all-wrong / topic Y all-correct by chosen optionIds, then real finishSession. Asserts
  weakestTopicFromAnswers over the PERSISTED TestAnswer rows = topicX; polls (vi.waitFor — recordEvent
  is fire-and-forget/void) that exactly 1 "diagnostic_completed" AnalyticsEvent exists for the user;
  a repeat finish keeps it at 1. FK-safe teardown deletes analyticsEvent+user (cascades session/answers)
  BEFORE the fixture cleanups. `npx vitest run --config vitest.integration.config.ts …` = 1 passed;
  `npm test` 576 passed; `npx tsc --noEmit` clean; full verify.sh → "OK wave15-14". Task DONE.


## Verify
**Last verify:** PASS (2026-07-03T07:46:36Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T07:47:56Z)
