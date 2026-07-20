# Task: wave15-10-practice-mode-cards

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T12:00Z
**Last compute:** mac-mini

## Goal
Three new mode cards on `/practice` (spec §E), same `<form action>` + hidden `mode` input pattern the
page already uses. PASS = ALL true:

1. app/(app)/practice/page.tsx contains a `<form action={startTestAction}>` card with
   `<input type="hidden" name="mode" value="…"/>` for EACH of QUICK, MARATHON, SIGN_TRAINER
   (grep `value="QUICK"`, `value="MARATHON"`, `value="SIGN_TRAINER"` in the file).
2. NO DIAGNOSTIC card on /practice: grep `value="DIAGNOSTIC"` finds NOTHING in the file
   (onboarding-only entry — spec §E).
3. Copy (Ukrainian, calm): card titles come from MODE_LABEL («Швидка сесія», «Марафон», «Знаки»);
   the QUICK card mentions «5 хв» as SOFT text (never a numeric countdown); existing cards
   (ADAPTIVE_REVIEW lead, SPACED_REVIEW, MIXED_PRACTICE, topic cards) are untouched.
4. Browser (real transport; app served on the audit origin, default http://100.110.64.90:3100):
   login as seeded user → /practice textContent includes «Швидка сесія», «Марафон», «Знаки»;
   `input[name=mode]` discriminators for all three exist; clicking the QUICK form's submit lands on
   a URL containing "/test/". (verify.sh drives "$DRIVER_BROWSER_CMD".)
5. `npx tsc --noEmit` exits 0.

## Constraints / decisions
- DESIGN CRAFT (this is a design surface; unattended implementers don't fire skills, so the rules
  live here): copy is design material — active verbs; an action keeps its name through its flow (the
  card CTA stays «Почати», consistent with the existing cards, and the runner header shows the same
  MODE_LABEL); boldness in ONE place per screen — the ADAPTIVE_REVIEW card REMAINS the lead, the
  three new cards are quiet siblings using the SAME Card/SubmitButton/glass-tier idiom (W12a tokens,
  no new CSS, no new fonts/deps); structural devices (numbering/eyebrows/dividers) only where they
  encode real meaning; quality floor: responsive at 390px, visible focus, reduced-motion respected.
- «~5 хв» is a soft textual hint (spec Non-goal: no timed variants, calm > pressure).
- Legal copy positioning unchanged — no official-exam claims.
- Server-restart trap (wave12b-10/11-16): if the browser assert misses text after a rebuild, restart
  the :3100 server against the fresh build — environment fix, not code.
- verify.sh login mechanics may be ADAPTED to match bin/browser-audit.sh's login() if the eval
  approach fights the form — but the ASSERTIONS may not be weakened.

## Next
- [x] Read app/(app)/practice/page.tsx and add the three cards per the existing card idiom.
- [x] Driver: run verify.sh (browser assert on the :3100 build). Rebuilt + restarted the stale :3100
      server against the fresh build; verify.sh now green (OK wave15-10). Goal met.

## Artifacts
- app/(app)/practice/page.tsx

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T12:40Z ClPcs-Mac-mini: Added QUICK/MARATHON/SIGN_TRAINER cards to app/(app)/practice/page.tsx
  after MIXED_PRACTICE, before Теми — same form+hidden-mode+secondary-SubmitButton idiom, ADAPTIVE
  card stays the lead. QUICK copy carries soft «5 хв» hint (no countdown). No DIAGNOSTIC card (onboarding
  only). Titles from MODE_LABEL. tsc --noEmit exits 0; local grep gates (3 values present, DIAGNOSTIC
  absent, «5 хв» present) all green. Set Status: done; driver re-runs verify.sh (browser assert).
- 2026-07-03T13:05Z ClPcs-Mac-mini: Diagnosed the verify FAIL as the stale-server trap (server boot
  predated the page commit). `npm run build` (green), killed the old `next start` (pids 54347/54359),
  relaunched `npm run start -- -H 0.0.0.0 -p 3100` on the fresh build. Re-ran verify.sh against the
  live server → `OK wave15-10` (browser login → /practice shows Швидка сесія/Марафон/Знаки, three
  mode discriminators present, QUICK submit lands in /test/). No code change. Status: done.


## Verify
**Last verify:** PASS (2026-07-03T07:12:55Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T07:13:46Z)
