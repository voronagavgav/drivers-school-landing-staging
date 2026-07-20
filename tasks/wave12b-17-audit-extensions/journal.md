# Task: wave12b-17-audit-extensions

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §H: extend `bin/browser-audit.sh` (KEEP its ok/bad + assert_url/assert_text style) with the four
W12b end-to-end assertions. Real transport over the non-localhost origin, as always.

PASS = ALL true:

1. FRESH-USER lane added: the audit registers a unique user per run (email suffixed with a run token,
   e.g. `audit-$(date +%s)@drivers.school`), completes onboarding (category B; skips the optional
   steps), and with THAT user asserts:
   - (a) dashboard dial insufficient-data state: page text contains «Ще недостатньо даних» and does
     NOT show a dial percent/verdict;
   - (b) SPACED nothing-due calm state: starting «Інтервальне повторення» from /practice lands back on
     /practice with the calm copy «пам'ять ще тримає» (asserted as text, not an error state).
2. Plan-card lane (seeded user): clicking the «Сьогоднішній план» start lands on a URL matching
   `/test/` and the runner header shows «Розумне повторення» (the mode label task 10 renders) —
   proving the plan card starts ADAPTIVE_REVIEW through the real action.
3. Result lane (seeded user): the audit FINISHES an exam (port the design-shots answer→«Завершити»→
   confirm flow, bin/design-shots.sh ~lines 70–78) and asserts the result page contains
   «Найбільше помилок у темах» (first-option answering makes 20/20 correct implausible; if the audit
   ever hits an all-correct run, the summary is legitimately absent — guard by asserting EITHER the
   summary heading OR the pass headline «Складено. Тримайте форму.» is present, and log which).
4. All PRE-EXISTING assertions are preserved (login-persists, tab capsule, 2b answer loop, RBAC,
   admin, readiness-shadow, …) and the summary line still prints `browser audit: N passed, M failed`
   with exit-nonzero on any failure.
5. `bash -n bin/browser-audit.sh` passes; the script still only uses `agent-browser` (`AB`) + curl
   (no new tooling).
6. Live run (guarded on server reachability — but for THIS task the driver SHOULD ensure the LAN
   server is running the current build; STALE-SERVER trap in CLAUDE.md: rebuild + restart
   `npm run start -- -H 0.0.0.0 -p 3100` if routes 404): `bin/browser-audit.sh` exits 0 with the new
   assertions counted in.

## Constraints / decisions
- Fresh-user rows accumulate in the dev DB — acceptable (audit users are namespaced `audit-*`); do
  NOT add destructive cleanup to the audit script.
- The fresh-user lane runs BEFORE the seeded-user lanes it doesn't depend on, or after a logout —
  keep session handling explicit like the existing logout-guard block.
- Depends on tasks 06/07/08/09/10 having landed (the copy/labels it asserts).
- Non-Goal: design-shots changes (18 re-runs the existing script), digit/swipe assertions (unit-level
  per spec).

## Plan
- [x] Read the current audit + design-shots finish flow.
- [x] Add the fresh-user lane (register → onboarding → dial + spaced-calm asserts).
- [x] Add plan-card and exam-finish→result lanes.
- [x] Run against the live server; verify.sh.

## Done
- [x] Fresh-user lane added as audit section 9 (register unique `audit-<epoch>@drivers.school` →
      onboarding B + skip×2 → dashboard): asserts dial insufficient copy «Ще недостатньо даних»,
      NO percent (eval: no `svg text` inside `[data-testid=readiness-dial]`), SPACED start →
      `/practice?empty=SPACED_REVIEW` + «пам'ять ще тримає». Live run GREEN: 25 passed, 0 failed.
- [x] Plan-card lane added as section 10 (logout → seeded login → dashboard → click «Почати план»):
      asserts `/test/` + runner header «Розумне повторення» (MODE_LABEL, no uppercase transform —
      plain assert_text works).
- [x] Result lane added as section 11: starts an exam sim, answers ALL 20 questions first-option
      (radio click + sleep 1 + «Далі» ×20 — one answered question is NOT enough: topWrongTopics
      counts only ANSWERED-and-wrong, so a 1-answer finish can show NEITHER guard string), then
      finishes via atomic eval clicks («Завершити тест» → confirm «Завершити», exact-text match,
      3× retry-until-/result). Asserts «Найбільше помилок у темах» OR pass headline
      «Складено. Тримайте форму.», logging which branch fired.
- [x] verify.sh PASS (all static greps + live audit 30 passed / 0 failed); a second consecutive
      live run also 30/0 (finish-step flake fixed — see Log).

## Next
- (none — Goal fully met; verify.sh PASS with the live audit at 30/0)

## Artifacts
- bin/browser-audit.sh

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 11:09 UTC ClPcs-Mac-mini: read browser-audit.sh + design-shots.sh; added the §H
  fresh-user lane (section 9/9a/9b: register→onboard→dial-insufficient + spaced-nothing-due
  asserts). `bash -n` clean; live audit against http://100.110.64.90:3100 GREEN — 25 passed,
  0 failed (log /tmp/ds-browser-audit/audit-20260702-140822.log). SPACED card targeted via its
  hidden `input[name=mode][value=SPACED_REVIEW]` → closest form → button.click() eval (2nd
  «Почати» on /practice — name-based find would hit the adaptive card). verify.sh still red by
  design: its «Розумне повторення»/«Найбільше помилок у темах» greps need the next two lanes.
- 2026-07-02 11:24 UTC ClPcs-Mac-mini: added sections 10 (plan-card → ADAPTIVE_REVIEW runner
  header) + 11 (exam finish → result guard) to bin/browser-audit.sh. Two bugs found live:
  (1) `find text "Завершити"` substring-matched the overlay-covered nav «Завершити тест» and
  refused the click (design-shots' port of that flow was best-effort so it masked this);
  (2) even exact-text `find` locate-then-click raced the runner's re-renders while 20 answer
  responses landed — one verify run flaked (28/2). Fixed with atomic single-JS-call eval clicks
  (exact textContent match) + 3× retry-until-/result. verify.sh PASS: static greps green, live
  audit 30 passed / 0 failed (audit-20260702-142027.log), second run also 30/0
  (audit-20260702-142151.log). Status → done. Housekeeping: folded the click-flake learning into
  the existing agent-browser CLAUDE.md bullet + merged the Prisma-client/migration bullets
  (44→41); the Learnings section still exceeds the 30-bullet cap — future ticks should keep
  merging.


## Verify
**Last verify:** PASS (2026-07-02T11:27:27Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T11:28:51Z)
