# Task: wave15-11-marathon-runner-paging

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-03T07:19Z
**Last compute:** ClPcs-Mac-mini

## Goal
MARATHON runner mechanics in components/test-runner.tsx (spec §C/§E): rolling counter, refill near
the end of the loaded page, calm end state, always-available finish. PASS = ALL true:

1. Refill wiring: test-runner.tsx imports `extendSessionAction` from `@/app/actions/test` (grep —
   and does NOT import anything from `lib/server`/`@/lib/server` (client-bundle trap; grep absence)).
2. Refill behavior (mode === "MARATHON" only): when unanswered-questions-remaining-in-loaded-set ≤ 3
   AND not exhausted AND no refill in flight → call extendSessionAction({sessionId}) ONCE (in-flight
   latch: ref/state guard so rapid answers can't double-fire) and APPEND the returned `questions` to
   local state (the wave15-08 frozen contract `{added, total, questions}` — adapt to it, never
   change it).
3. Exhaustion: a refill returning added: 0 sets a terminal "exhausted" state → render a calm
   «Все пройдено» block (grep the literal in test-runner.tsx) with the normal finish CTA; NO error,
   NO further refill attempts.
4. Rolling counter: for MARATHON the footer/progress area shows «N відповідано · точність X%»
   (grep «відповідано» in test-runner.tsx); renders from 0 answered (accuracy placeholder «—» until
   ≥1 answered); replaces the fixed «i з N» total for this mode.
5. «Завершити тест» is ALWAYS visible for MARATHON (the existing `isLast || isExam` visibility gate
   extended to include marathon), and finishing runs the EXISTING confirm-modal → finishTestAction
   flow (no new finish path).
6. Other modes byte-equivalent: all new rendering is behind mode === "MARATHON" conditionals; exam/
   practice snapshots of behavior unchanged (`npm test` exits 0, existing audit asserts still pass in
   wave15-15/16).
7. Browser smoke (real transport, "$DRIVER_BROWSER_CMD", server on the audit origin): login → /practice
   → start MARATHON → URL /test/; textContent includes «відповідано»; a button with exact text
   «Завершити тест» exists. Close.
8. `npx tsc --noEmit` exits 0.

## Constraints / decisions
- Client may import server ACTIONS only ("use server" reference — safe per CLAUDE.md first bullet).
- No polling/setInterval refill — refill triggers from the answer-submit flow state change.
- Appended questions must get stable keys (question id) so React state (feedback map) survives appends.
- Refill failures (network) fail SOFT: keep the current questions, allow retry on next trigger — never
  crash the session (calm > pressure).
- Ukrainian copy; no new deps; reduced-motion respected (no new animations required).
- Rebuild→restart trap (wave12b-10) applies to the browser smoke.

## Next
- [x] Read wave15-01 finding (e) (runner conditional map) + the wave15-08 contract; implement the
      marathon branch.
- Goal fully met (verify.sh → `OK wave15-11`). If a reviewer reopens: all marathon logic is behind
  `isMarathon` in components/test-runner.tsx — questions became local state (`useState(initialQuestions)`,
  identical for other modes), the refill lives in one `useEffect` gated by `refillingRef` + `exhausted`,
  and the exhaustion block reuses the existing `setConfirming(true)` finish flow.

## Artifacts
- components/test-runner.tsx

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T07:19Z ClPcs-Mac-mini: Implemented the MARATHON runner branch in components/test-runner.tsx:
  (1) `questions` prop → local state (`initialQuestions` seed; other modes never mutate it);
  (2) refill `useEffect` — fires when `questions.length - answeredCount ≤ 3`, `refillingRef` in-flight
  latch, calls `extendSessionAction({sessionId})` (imported from `@/app/actions/test`; no lib/server
  import), appends only not-already-present questions (id-keyed state survives); `added: 0` →
  `exhausted` terminal state; `.catch` = soft-fail, next answer re-triggers; (3) «Все пройдено» calm
  block with the normal confirm-modal finish CTA; (4) rolling counter «N відповідано · точність X%»
  (accuracy from the feedback map, «—» until first known answer) replaces «i з N» for marathon only;
  (5) finish gate widened to `(isLast || isExam || isMarathon)`. tsc clean, npm test 571/571, rebuilt +
  restarted :3100 (wave12b-10 trap). LIVE PROOF beyond the gate: answered 17/20 in the real browser →
  navigator grew 20→40 (refill fired once), counter read «17 відповідано · точність 0%» — 0% verified
  genuine (revisited answered questions: selected marked ✗, correct option marked elsewhere).
  `DRIVER_BROWSER_CMD=agent-browser bash tasks/wave15-11-…/verify.sh` → `OK wave15-11`.

## Verify
**Last verify:** PASS (2026-07-03T07:20:15Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T07:22:31Z)
