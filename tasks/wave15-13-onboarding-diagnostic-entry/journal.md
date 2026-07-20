# Task: wave15-13-onboarding-diagnostic-entry

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T10:35Z
**Last compute:** ClPcs-Mac-mini

## Goal
DIAGNOSTIC entry points (spec §D entry + §E): onboarding CTA after category select, completed-guard,
and a single gentle dashboard nudge for users who never completed one. PASS = ALL true:

1. app/(app)/onboarding/page.tsx: AFTER category select in the existing flow (per wave15-01 finding
   (g) — step 2 or an equivalent point), a DIAGNOSTIC CTA block renders with copy containing
   «Дай нам 3 хвилини» (grep) and a `<form action={startTestAction}>` with
   `<input type="hidden" name="mode" value="DIAGNOSTIC"/>` (grep). The existing skip/continue path
   («Пропустити» links, step flow) still works (greps unchanged).
2. Completed-guard (NO new schema): the CTA does NOT render for a user who has a COMPLETED
   DIAGNOSTIC TestSession — derived from the session table (grep the query tokens
   `mode: "DIAGNOSTIC"` + `"COMPLETED"` in the page or its server helper); `git diff --name-only`
   does NOT list prisma/schema.prisma or prisma/migrations.
3. Dashboard nudge: app/(app)/dashboard/page.tsx renders ONE gentle diagnostic card (start form or
   link to the diagnostic) ONLY when the user has no COMPLETED DIAGNOSTIC session (grep DIAGNOSTIC
   in the dashboard page/component graph). It follows the quiet Card idiom beside the wave14
   NudgeCard (decision from wave15-01 finding (h)) and never stacks noisily (a single card).
4. Browser (seeded user has never completed a diagnostic): /dashboard textContent includes the
   diagnostic card copy («Стартова перевірка» or the CTA line); /onboarding (post-category step)
   textContent includes «Дай нам 3 хвилини» and the DIAGNOSTIC discriminator input exists. PRESENCE
   asserts only — do NOT click-start a diagnostic here (would leave an IN_PROGRESS session polluting
   later audits; the production start path is already integration-proven in wave15-07(e,g)).
5. `npx tsc --noEmit` exits 0; `npm test` exits 0.

## Constraints / decisions
- Guard is computed server-side per request (page/server helper) — no client fetch, no new schema
  (spec §D: "derive from the session table — NO new schema").
- Calm copy, Ukrainian, no scores-as-judgement; the CTA promises ~3 хвилини and the diagnostic is
  skippable — never a gate on using the app.
- DIAGNOSTIC stays OFF /practice (guarded by wave15-10 gate).
- Design craft: the dashboard card is QUIET (the readiness dial stays the screen's one bold thing);
  empty states invite action; the CTA keeps its name through the flow («Стартова перевірка» on card,
  runner header shows the same MODE_LABEL).

## Next
- [x] Read wave15-01 findings (g)(h); add the onboarding CTA + guard, then the dashboard card.
- All criteria met. If a future tick re-verifies: restart :3100 against the current build first
  (browser asserts hit the live LAN server; stale build → false-fail).

## Artifacts
- app/(app)/onboarding/page.tsx — `DiagnosticCta` block rendered at step=2 (guarded), «Дай нам 3 хвилини» + DIAGNOSTIC start form.
- app/(app)/dashboard/page.tsx — quiet «Стартова перевірка» Card near the dial, gated on !hasCompletedDiagnostic.
- lib/server/study.ts — new `hasCompletedDiagnostic(userId)` guard helper (session-table derived, no schema).

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T10:35Z ClPcs-Mac-mini: Added `hasCompletedDiagnostic` guard to lib/server/study.ts
  (mode DIAGNOSTIC + status COMPLETED, no new schema). Onboarding: extracted `DiagnosticCta`
  (CTA «Дай нам 3 хвилини…» + `<form action=startTestAction>` hidden mode=DIAGNOSTIC), rendered at
  step=2 guarded by !diagnosticDone (verify.sh browser step probes ?step=2, so placed there rather
  than step=done per finding (g); step 1 already persists the category so categoryId still resolves).
  Skip links unchanged. Dashboard: quiet «Стартова перевірка» Card near the dial hero, gated on
  !hasCompletedDiagnostic (sibling Card, not NudgeCard, per finding (h)). tsc 0, npm test 571 pass,
  no schema/migration diff. Rebuilt + restarted :3100 (fresh 10:33:48 build); ran the live browser
  asserts — dashboard card=true, onboarding CTA+DIAGNOSTIC input=true. Status → done.

## Verify
**Last verify:** PASS (2026-07-03T07:35:03Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T07:37:13Z)
