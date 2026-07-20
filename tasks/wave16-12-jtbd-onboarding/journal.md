# Task: wave16-12-jtbd-onboarding

**Status:** done
**Driver:** auto
**Updated:** 2026-07-04T18:14Z
**Last compute:** mac-mini

## Goal
Spec T4: JTBD onboarding instrumentation — two OPTIONAL questions, skippable, never blocking; this
replaces the 3×-failed JTBD research with production telemetry. Per wave16-01 Findings 1d the
exam-date question ALREADY exists as onboarding step 2; this task extends it and adds a prep-mode
step. PASS = ALL true:

1. Onboarding exam-date step gains an explicit «Ще не записався / Ще не записалася» choice (or a
   single neutral variant — record in Log) alongside the date input; choosing it writes NOTHING to
   `examDate` and advances the flow.
2. A NEW optional step «Як готуєшся?» exists (single-select: «автошкола» / «самостійно» /
   «і те, і те»), following the house `?step=` server-routing pattern; answer persists
   `prepMode` (SCHOOL/SELF/BOTH via `z.enum(PREP_MODES)` in lib/validation.ts) through a
   `lib/server/study-profile.ts` action; «Пропустити» advances without any write.
3. Analytics: each ANSWERED question fires the typed `onboarding_jtbd_answered` event via
   `recordEvent` (server-side, fire-and-forget) with payload ONLY from
   `{ question: "exam_date" | "prep_mode", examDateKnown?: boolean, prepMode?: enum }` — enum/bool
   only, no free text, no PII, no date value beyond examDateKnown (the date itself already lives in
   the profile). Skips fire NOTHING (absence of the event IS the skip signal).
4. Integration test `lib/server/jtbd-onboarding.integration.test.ts` via the REAL profile actions:
   a. prep-mode answer «SELF» → profile.prepMode === "SELF" AND a vi.waitFor-polled
      `onboarding_jtbd_answered` event with payload question:"prep_mode";
   b. skip path: flow completes with profile.prepMode still null and ZERO
      `onboarding_jtbd_answered` events for that user;
   c. «ще не записався» → examDate stays null, event has examDateKnown:false;
   d. invalid prepMode string → `{ error }`, profile untouched.
5. Existing onboarding tests green with ZERO edits (`git diff --name-only` shows no pre-existing
   test files changed) — the new steps never block: every step reachable from the previous one has
   a skip affordance and the final redirect to the plan/done screen still happens.
6. `npx tsc --noEmit`, `npm test`, `npm run test:integration`, `npm run build` exit 0.

## Constraints / decisions
- OPTIONAL is the contract: no required fields, no validation error on skip, flow NEVER blocks
  (spec: "skippable, never block the flow"). A user mashing «Далі»/«Пропустити» reaches the
  dashboard exactly as today.
- The typed `recordEvent` lane IS the "/api/track whitelist" for these events: onboarding answers
  are submitted via server actions, so the production path is server-side; ANALYTICS_EVENTS (the
  typed whitelist, extended in wave16-02) constrains the name and the zod-validated action
  constrains the payload to enum/bool. Record this mapping in Log (spec wording says "extend
  /api/track zod whitelist"; the freeform client lane is not part of this flow's real path).
- DESIGN CRAFT: copy in Ukrainian, informal ти-form matching existing onboarding steps; one
  question per screen, one job per element; skip link quiet, primary action bold; step counter
  consistent with the existing «Крок N з M» pattern (update M honestly if the step count grows —
  check the uppercase text-transform browser-assert trap if auditing).
- No free-text inputs anywhere (spec: enum/date only).
- Depends on: wave16-02 (PREP_MODES, event name), wave16-03 (prepMode column).

## Next
- [x] Re-read Findings 1d; extend step 2, add the prep-mode step + action + validation, wire
      recordEvent, then the integration test.
- Goal fully met — all 6 PASS criteria green (tsc/test/integration/build exit 0; new test 5/5;
  no pre-existing test files changed). Nothing further.

## Artifacts
- app/(app)/onboarding/page.tsx
- lib/server/study-profile.ts — prep-mode action
- lib/validation.ts — prepMode schema
- lib/server/jtbd-onboarding.integration.test.ts

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T18:14Z ClPcs-Mac-mini: implemented the whole increment.
  - DECISION (item 1): chose the EXPLICIT «Ще не записався / записалася» secondary submit button
    (name="scheduled" value="no") alongside the date input + «Продовжити», not a single neutral
    variant. It writes nothing to examDate, advances to step 3, and is a real ANSWER (fires
    `onboarding_jtbd_answered` with examDateKnown:false) — distinct from «Пропустити» (a plain Link
    that writes/fires nothing; absence of the event IS the skip signal).
  - DECISION (analytics lane, per Constraints): the typed `recordEvent`→`onboarding_jtbd_answered`
    lane IS the whitelist here — onboarding answers are server-action submits, so the production
    path is server-side; the name is constrained by ANALYTICS_EVENTS (wave16-02) and the payload by
    the zod-validated action to enum/bool only (`{ question, examDateKnown? , prepMode? }`). The
    freeform /api/track client lane is NOT part of this flow.
  - Step order now 1 category → 2 exam date → 3 prep mode (NEW) → 4 daily goal → done;
    StepIndicator «Крок N з 4» (was «з 3»); daily-goal moved 3→4, routing accepts "4".
  - lib/validation.ts: `setPrepModeSchema` = `z.enum(PREP_MODES)`.
  - lib/server/study-profile.ts: `setPrepModeAction` (persist prepMode + fire event) and
    `answerOnboardingExamDate` (scheduled=no path OR delegate to setExamDateAction, then fire event
    with examDateKnown). setExamDateAction unchanged (account page still reuses it silently).
  - app/(app)/onboarding/page.tsx: step 2 «ще не записався» button, new step 3 prep-mode
    single-select (SCHOOL/SELF/BOTH labels «Автошкола»/«Самостійно»/«І те, і те»), local server
    wrappers savePrepModeAction/saveExamDateAction rewired.
  - Test lib/server/jtbd-onboarding.integration.test.ts (5/5): §a SELF persists + polled event,
    §b skip=no-call → prepMode null + zero events, §c ще-не-записався → examDate null +
    examDateKnown:false, §d invalid → { error } + profile byte-equal.
  - Gates: `npx tsc --noEmit` 0; `npm test` 598 pass; `npm run test:integration` 205 pass/2 skip;
    `npm run build` compiled successfully. `git diff --name-only` = only the 3 source files; the
    new test is the sole untracked file — zero pre-existing test files touched (item 5).

## Verify
**Last verify:** PASS (2026-07-04T15:16:46Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T15:19:59Z)
