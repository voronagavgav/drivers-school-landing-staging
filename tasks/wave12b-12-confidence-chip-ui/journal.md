# Task: wave12b-12-confidence-chip-ui

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §D bullet 6: the sampled, optional, never-blocking «Наскільки впевнено?» chip row after a
practice answer. Depends on task 03 (sampling) and task 05 (action).

PASS = ALL true:

1. `components/test-runner.tsx`: after a SUCCESSFUL submit in a NON-exam mode (`mode !==
   "EXAM_SIMULATION"`), and only when `isConfidenceSampled(sessionId, questionId)` (import from
   `@/lib/confidence-sampling`), a chip row renders with: prompt text «Наскільки впевнено?», FOUR
   choice chips labelled 1–4, and a dismiss control «Пропустити».
2. Tapping a chip calls `setAnswerConfidenceAction({ sessionId, questionId, confidence })` (server
   action imported from `@/app/actions/test` — action references are client-safe per CLAUDE.md),
   fire-and-forget with a try/catch or `.catch` (a failed confidence write NEVER breaks the runner),
   then hides the prompt. «Пропустити» hides it without calling the action.
3. NEVER blocks: «Далі»/finish controls are rendered and enabled independently of the chip row
   (navigating away simply dismisses it; no `disabled` coupling between nav buttons and the chips —
   grep the nav block for absence of any confidence-state condition).
4. Chips are ≥44px touch targets (`min-h-11`/`h-11`+) and keyboard-reachable (`<button type="button">`).
5. No `Math.random` anywhere in `components/test-runner.tsx` (sampling is the pure hash only).
6. Exam sessions NEVER show the prompt (the mode guard is mechanically present next to the
   `isConfidenceSampled` call).
7. `npm run typecheck`, `npm test`, `npm run build` exit 0, and the audit's practice answer→feedback
   assertion still passes (guarded live run).

## Constraints / decisions
- Confidence UI appears WITH the feedback/explanation (below it), inside the answered state — it must
  not shift the options above the fold (place after the explanation block; auto-scroll from task 11
  already brings that region into view).
- One prompt per question attempt: once answered (chip or skip), do not re-show for that question in
  this session (client state only — no persistence needed for skips).
- Non-Goal: any server change (task 05 shipped it), calibration math (W13+).

## Plan
- [x] Wire sampling + chip row + skip into the answered state of the runner.
- [x] Call setAnswerConfidenceAction fire-and-forget.
- [x] typecheck/test/build + verify.sh.

## Done
- [x] Chip row («Наскільки впевнено?» + chips 1–4 + «Пропустити») rendered inside the practice
      feedback block after ExplanationNotice, gated on `mode !== "EXAM_SIMULATION" &&
      isConfidenceSampled(sessionId, q.questionId) && !confidenceDone[q.questionId]`. Tap →
      `rateConfidence` fires `setAnswerConfidenceAction` with `void …().catch(() => {})` and hides;
      skip hides without the action. Chips are `<button type="button">` with `min-h-11 min-w-11`.
      Nav block untouched (zero coupling). Also removed the `Math.random` clientEventId fallback
      (gate criterion 5) — replaced with `crypto.getRandomValues` (not secure-context-gated, so the
      plain-http LAN path keeps working) + a per-tab counter last resort. typecheck ✓, npm test
      466/466 ✓, all six verify.sh grep gates ✓.
- [x] Full verify green: last tick's audit FAIL was exactly the predicted stale-server chunk-hash
      trap (server booted 12:40:33, `.next` rebuilt 12:57:54 by the failed verify's own build).
      Restarted `npm run start -- -H 0.0.0.0 -p 3100` against the fresh build → browser audit
      19/19 PASS (incl. practice answer→feedback) → full verify.sh `PASS wave12b-12`.

## Next
- [ ] Nothing — task complete (verify.sh PASS end-to-end incl. the guarded audit lane).

## Artifacts
- components/test-runner.tsx

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02T13:00Z ClPcs-Mac-mini: wired the sampled confidence chip row into test-runner.tsx
  (chips 1–4 + skip inside the feedback block, fire-and-forget action, exam guard adjacent to
  isConfidenceSampled) and de-Math.random'd newClientEventId (getRandomValues fallback). Gotcha
  re-confirmed: a comment containing the literal token `Math.random` tripped the whole-file purity
  grep — reworded (known CLAUDE.md trap class). typecheck + npm test + all grep gates green; build
  + audit deferred to next tick (server restart needed after build — client chunk hashes change).
- 2026-07-02T13:07Z ClPcs-Mac-mini: fixed the verify FAIL (browser audit regressed) — confirmed it
  was the stale-server trap, not a code bug: next-server (pid 79600) started 12:40:33 but the failed
  verify's `npm run build` replaced `.next` at 12:57:54, orphaning the client chunk hashes. Killed
  the server tree, relaunched `npm run start -- -H 0.0.0.0 -p 3100`, ran bin/browser-audit.sh →
  19 passed / 0 failed, then full verify.sh → `PASS wave12b-12`. Status → done. No code changes.


## Verify
**Last verify:** PASS (2026-07-02T10:02:39Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T10:03:59Z)
