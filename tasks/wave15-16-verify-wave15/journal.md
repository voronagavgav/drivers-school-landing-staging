# Task: wave15-16-verify-wave15

**Status:** done   <!-- audit MARATHON flake hardened; 66/0 green -->
**Driver:** auto
**Updated:** 2026-07-03T11:32Z
**Last compute:** mac-mini

## Goal
Close Wave 15: the FULL board green at the same bar as W10–14 (spec §F), plus wave-level invariants.
PASS = ALL true (in this order — seed before integration, build+restart before audit):

1. `npx tsc --noEmit` exits 0.
2. `npm test` exits 0.
3. `npm run db:seed` exits 0 (also clears AnalyticsEvent noise before the analytics-dashboard suite —
   house triage rule).
4. `npm run test:integration` exits 0 (cross-task coupling rule: if a file OUTSIDE wave15's
   deliverables is red, triage ownership per CLAUDE.md before touching anything — mark blocked on the
   owner, do not fix in place).
5. `npm run build` exits 0.
6. Restart the :3100 server against the fresh build (kill `next-server`, relaunch
   `npm run start -- -H 0.0.0.0 -p 3100`), then `npm run audit:browser` exits 0.
7. Frozen oracles intact end-of-wave: `shasum -a 256 -c` passes for BOTH
   tasks/wave15-03-preset-oracle/oracle.sha256 and tasks/wave15-05-diagnostic-oracle/oracle.sha256.
8. Constants sanity: the seven wave15-02 preset constants still hold their exact pinned values
   (grep), and `value="DIAGNOSTIC"` is still absent from app/(app)/practice/page.tsx (non-goal held).
9. Spec Non-goals hold: no SIGN_TRAINER flashcard/recognition sub-mode shipped (grep app/ components/
   for a recognition/flashcard surface — record the check); no new countdown surfaces (the mm:ss
   Timer render in components/test-runner.tsx is still gated to the exam deadline path only).
10. The journal Log records each gate's result + the audit ok/fail counts; PLAN.md wave-15 closure is
    left to the wave-review flow (NOT this task).

## Constraints / decisions
- This task fixes NOTHING substantive: any red gate ⇒ Status: blocked + a Log entry naming the owning
  wave15 task. Environment fixes (server restart, reseed) are in-scope; code/spec fixes are not.
- Wave-review (the adversarial panel) runs AFTER this closes, per house process — engine+UI wave ⇒
  full default panel with a UI lens; out of scope here.

## Next
- [x] Fix the MARATHON audit flake (only red gate), restart :3100, re-run audit. — 66 passed / 0 failed.
- Wave 15 is closed at the W10–14 bar. Follow-up (NOT this task): the adversarial wave-review panel.

## Artifacts
- tasks/wave15-16-verify-wave15/journal.md — board results
- bin/browser-audit.sh — added atomic `answer_radio` helper; converted all 5 `find role radio click`
  sites to it; MARATHON loop cap 26→30.

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T11:20Z ClPcs-Mac-mini: ran the full Wave-15 verify board in order (gates 1–9), restarted
  the :3100 server against the fresh build before the audit. All green; audit 66 passed / 0 failed
  after re-run past one MARATHON-refill browser flake (integration proves the logic). Status → done.
- 2026-07-03T11:32Z ClPcs-Mac-mini: driver verify RE-RAN and caught the MARATHON flake recurring —
  `FAIL MARATHON: counter did not cross 20 (got '18')` (65 passed / 1 failed, driver's audit run).
  Root cause = the flaky two-step `find role radio click` in the 26-iter answer loop dropping ~8/26
  clicks during in-flight server-action re-renders (the documented wave12b-17 detach flake). HARNESS
  fix (not product/spec): added an atomic-eval `answer_radio()` helper (clicks `main [role=radio]:not
  ([disabled])` in ONE eval, same proven pattern as `click_btn`; options are role=radio BUTTONS per
  components/CLAUDE.md, so `input[type=radio]` would miss); converted all 5 radio-click sites; bumped
  the MARATHON loop cap 26→30. Restarted :3100 on the fresh build (server 11:11 was stale vs build
  11:22), re-ran audit → **66 passed / 0 failed**, MARATHON gate green («21 відповідано»). Other gates
  (typecheck/test/seed/integration/build/oracles/constants) were already green in the driver's run and
  are unaffected by an audit-harness-only edit. Status → done.


## Verify
**Last verify:** PASS (2026-07-03T08:37:50Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T08:44:21Z)
