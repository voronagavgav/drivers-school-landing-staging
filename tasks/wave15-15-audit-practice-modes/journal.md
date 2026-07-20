# Task: wave15-15-audit-practice-modes

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T16:05Z
**Last compute:** mac-mini

## Goal
Extend the real-transport gate `bin/browser-audit.sh` with the three learner-startable new modes
(spec §F): QUICK, MARATHON (incl. one refill), SIGN_TRAINER over the real http origin. PASS = ALL true:

1. New audit sections exist in bin/browser-audit.sh (grep QUICK, MARATHON, SIGN_TRAINER in the
   script), each following the existing helper idiom (assert_url/assert_text/eval — wave15-01
   finding (l)):
   a. QUICK: from /practice, eval-click the `input[name=mode][value=QUICK]` form's button →
      assert_url /test/ + mode label «Швидка сесія» via eval textContent (Cyrillic grep trap —
      never `get text | grep -i`); click one answer option → Правильно|Неправильно appears
      (immediate reveal over the real transport); then finish the session via the exact-text
      «Завершити тест» eval-click + confirm (leave no IN_PROGRESS session behind).
   b. MARATHON: start → /test/; answer with the wave12b-17 atomic-eval retry loop until the rolling
      counter shows ≥18 answered (`18 відповідано` reachable — seeded pool ≫ 20 so the ≤3-unanswered
      refill MUST fire); assert an unanswered question is still presented after 18 answers (refill
      appended — the page-1-only session would have ≤2 left, so assert ≥1 selectable radio remains
      AND the counter can reach 19); finish via «Завершити тест» → assert_url /result.
   c. SIGN_TRAINER: start → /test/ + label «Знаки»; assert options render; answer one → feedback
      appears; reload the /test/<id> URL → assert_url still /test/ (session persists/resumes, not
      bounced); finish the session.
2. `npm run audit:browser` exits 0 against the LAN origin (default http://100.110.64.90:3100) with a
   FRESHLY RESTARTED :3100 server on the current build (wave11-16/12b-10 trap: kill + relaunch
   `npm run start -- -H 0.0.0.0 -p 3100` after `npm run build` BEFORE auditing — legitimate env setup).
3. Existing assertions unchanged: the diff to bin/browser-audit.sh contains NO removed assert lines
   (`git diff -- bin/browser-audit.sh` has zero `^-` lines matching `assert_|bad `, excluding the
   `---` header — ERE, not BRE, per the wave7-09 grep-dialect trap).
4. The journal Log records the audit's pass count before vs after (expect ≥ +9 new ok-asserts).

## Constraints / decisions
- Finish every session the audit starts (QUICK/MARATHON/SIGN_TRAINER) so repeated audit runs stay
  order-independent (getResumableSession would otherwise surface leftovers).
- Answer clicks during in-flight updates use ONE atomic eval + retry-until-state-changes
  (wave12b-17); exact-text match distinguishes «Завершити» from «Завершити тест».
- The audit asserts SERVED behavior only — no localhost/SW assertions here (that split belongs to
  the Playwright E2E origin, wave13-01 rule).
- If SIGN_TRAINER's seeded pool surprises (wave15-01 finding (i) numbers), adjust the ASSERTED
  expectations honestly — never fake a pass.

## Next
- [x] Read wave15-01 finding (l) + bin/browser-audit.sh; add the three sections; rebuild, restart
      :3100, run the audit green.
- (none — Goal met: 66 passed / 0 failed on a freshly restarted :3100.)

## Artifacts
- bin/browser-audit.sh

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T16:05Z ClPcs-Mac-mini: added 4 helpers (click_btn / start_mode / assert_main_text /
  finish_session) + three §F mode sections (3a QUICK, 3b MARATHON, 3c SIGN_TRAINER) after section 3
  in bin/browser-audit.sh, following the wave15-01 finding (l) discriminator + wave12b-17 atomic-eval
  idioms. QUICK/SIGN_TRAINER surface «Завершити тест» only on isLast, so finish_session advances via
  «Далі» first when the finish button is absent; MARATHON shows it always. MARATHON proof: answered
  until the rolling «N відповідано» counter crossed 20 (reached 21) — a page-1-only session hits «Все
  пройдено» at 20, so >20 proves the ≤3-left refill appended a page. `bash -n` clean; grep QUICK/
  MARATHON/SIGN_TRAINER present; git-diff shows ZERO removed assert lines. Rebuilt (`npm run build`),
  killed the stale 10:33 next-server, relaunched `npm run start -- -H 0.0.0.0 -p 3100` on the fresh
  build. First audit run: 65 passed / 1 failed — SIGN_TRAINER radio-count eval used `input[type=radio]`
  but the runner options are ARIA `role="radio"` buttons (test-runner.tsx:537, radiogroup:518), so the
  count was 0 even though `find role radio click` answered fine. Fixed the selector to `[role=radio]`;
  re-ran → **66 passed / 0 failed** (exit 0). New sections contribute +14 ok-asserts (QUICK 4, MARATHON
  4, SIGN_TRAINER 6 — ≥ the +9 Goal item 4 expects). Status → done.

## Verify
**Last verify:** PASS (2026-07-03T08:04:29Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T08:09:46Z)
