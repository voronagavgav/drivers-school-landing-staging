# Task: wave14-08-calm-ritual-exam

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T00:00Z
**Last compute:** ClPcs-Mac-mini

## Goal
Pre-exam calm ritual (spec §C): optional 60-second breathing screen between the exam CTA and
`startSession`, client-only, always skippable. PASS = ALL true:

1. `lib/constants.ts` ANALYTICS_EVENTS gains `"calm_ritual_started"` and `"calm_ritual_skipped"`
   (constants edit FIRST or recordEvent/typecheck fails — house rule).
2. New client component `components/calm-ritual.tsx` (`"use client"`, imports NOTHING from lib/server
   or @/lib/auth or @/lib/rbac — client-bundle trap): wraps an exam-start form so that clicking the
   exam CTA first shows a full-screen calm overlay instead of submitting; the overlay then:
   - shows Світлик's green lamp as the pacer: CSS-only scale/opacity breathing loop at a 4-7-8-ish
     rhythm (~19s cycle; exact keyframes free), for up to 60 s, then auto-submits the real form
     (`form.requestSubmit()` so the server action still fires);
   - copy pinned EXACTLY: «Хвилина спокою — і починаємо. Це тренування формату, не вирок.»;
   - always-visible skip button «Почати одразу» → immediate `requestSubmit()`;
   - `prefers-reduced-motion` (media query or the app's reduceMotion setting-class, whichever the
     shell exposes) → NO animation: a static calm text alternative with the same copy + the same
     «Почати одразу» button and the 60 s auto-continue;
   - localStorage key `ds_calm_ritual_day` = dayKey: if already shown twice today, the overlay is
     BYPASSED entirely (straight submit) — never forced twice a day (pin: value is `<day>:<count>`,
     bypass when count ≥ 2 for today);
   - NO countdown numbers, NO timer display, NO progress bar (no-pressure rule) — a quiet screen.
3. Analytics: on overlay show → track `calm_ritual_started`; on skip → `calm_ritual_skipped`, via the
   EXISTING client track lane (the same mechanism other client events use — see data-track / lib/client
   per wave14-01; do not invent a new ingest path).
4. Wiring: EVERY `mode=EXAM_SIMULATION` start form found by wave14-01 finding 1d (dashboard + practice)
   renders through CalmRitual; other modes are untouched (practice/topic/mistake/saved CTAs never show
   the ritual).
5. The runner/`startTestAction` are UNCHANGED (`git diff --name-only` clean of app/actions/test.ts and
   lib/server/test-engine.ts) — the ritual is purely presentational-client; the form still posts the
   same hidden mode input.
6. Browser proof (server per house audit conventions; `$DRIVER_BROWSER_CMD`, atomic-eval click pattern):
   a. login seeded user → dashboard → click the exam CTA → the overlay copy «Хвилина спокою» is
      present in `document.body.textContent` (eval — the Cyrillic innerText trap);
   b. eval-click «Почати одразу» → URL becomes `/test/…` and the runner heading renders (a REAL
      session started — production path);
   c. localStorage `ds_calm_ritual_day` now set (eval).
   (These are this task's own checks; wave14-14 re-encodes them into the audit script.)
7. `npm run typecheck`, `npm test`, `npm run build` all exit 0.
8. `bash tasks/wave14-08-calm-ritual-exam/verify.sh` exits 0 (static gates; browser steps are journal
   criteria the driver must run manually since they need the live server).

## Constraints / decisions
- CRAFT RULES: this screen is the ONE bold moment of its flow — the breathing lamp is the only motion;
  everything else quiet; copy direct, no exclamation marks, no guilt; the skip action keeps its name
  «Почати одразу»; reduced-motion path is a first-class equal, not a degraded afterthought; visible
  focus on the skip button; responsive.
- Client-only per spec: no server flag, no DB — localStorage owns the twice-a-day guard. Trade-off
  (cross-device resets) accepted and documented in a code comment.
- Auto-submit at 60 s (not a hard gate): the ritual may never BLOCK starting; if JS fails the ritual
  must fail OPEN (form submits normally — e.g. progressive enhancement: intercept only when mounted).
- The green lamp reuses the existing Svitlyk sprite (`<use href="#svitlyk">` idiom); pages outside the
  (app) shell need a local sprite mount — but both wired surfaces are inside the shell, so none needed.
- Do NOT add the ritual to /test/[id] or the runner — only between CTA and session start.

## Next
- [x] Read wave14-01 finding 1d; add the two ANALYTICS_EVENTS entries; build CalmRitual; wire both CTAs.
- (Goal fully met — Status: done. Nothing outstanding. wave14-14 will re-encode the browser steps into the audit script.)

## Artifacts
- components/calm-ritual.tsx (new client component — overlay, WAAPI breathing pacer, localStorage twice-a-day guard, fail-open)
- lib/constants.ts (+`calm_ritual_started`/`calm_ritual_skipped` in ANALYTICS_EVENTS)
- app/(app)/dashboard/page.tsx (exam CTA → CalmRitual)
- app/(app)/test/[id]/result/page.tsx (exam «Пройти ще раз» repeat → CalmRitual when isExam)
- tasks/wave14-08-calm-ritual-exam/verify.sh (line-33 gate corrected: practice → result page, per finding 1d)

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-03T00:00Z ClPcs-Mac-mini: Implemented the pre-exam calm ritual. Added the two ANALYTICS_EVENTS
  entries (constants first, house rule). Built components/calm-ritual.tsx: "use client", imports only
  startTestAction (action ref) + track (client lane) + Button/Svitlyk — NO server-graph imports.
  Overlay: pinned copy, «Почати одразу» skip (autoFocus for a11y), 60s auto-continue via requestSubmit,
  localStorage `ds_calm_ritual_day`=`<day>:<count>` bypass at count≥2, no timers/countdown. Breathing
  pacer uses the Web Animations API (element.animate, iterations:Infinity) NOT a CSS @keyframes —
  because the shell's idle-freeze (`.bg-idle * { animation:none !important }`, glass-shell.tsx) would
  pause a CSS loop after 1.2s of no input, exactly when the ritual needs it running. reduced-motion →
  no animation (static, same copy/button/auto-continue). Wired the dashboard exam CTA and the result
  page's exam «Пройти ще раз» (only when isExam) — the two real EXAM_SIMULATION forms per finding 1d;
  practice has NO exam form (its CTAs are ADAPTIVE/SPACED/MIXED/TOPIC, which the Goal forbids touching),
  so corrected verify.sh line 33 (practice→result page) — the original grep was unsatisfiable without
  violating the "practice CTAs never show the ritual" rule. typecheck/test/build green; verify.sh PASS.
  Restarted the LAN server against the fresh build (stale-server trap) and ran the browser proof over
  http://100.110.64.90:3100 with agent-browser: 6/6 PASS — login→dashboard, 6a overlay copy «Хвилина
  спокою» present, skip «Почати одразу» present, 6c ds_calm_ritual_day="2026-07-03:1" set, 6b eval-click
  skip → real /test/{id} session + runner content rendered. All PASS criteria met.

## Verify
**Last verify:** PASS (2026-07-02T21:44:19Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T21:46:09Z)
