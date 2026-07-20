# Task: wave12b-14-account-settings

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §E second bullet (minus validation copy — that's task 15): /account gains exam-date + daily-goal
editing, the glass-tier setting, and a streak/вихідний status view.

PASS = ALL true:

1. `lib/server/user-settings.ts` exports a NEW server action
   `setGlassTierAction(formData: FormData): Promise<{ ok: true } | { error: string }>` (or the
   StudyProfileActionState shape) that: requires the current user; zod-validates the value against
   exactly `["auto","real","emulated","solid"]`; upserts `UserSettings.glassTier` for THAT user only;
   invalid value → `{ error }`, no write. (The read path `getGlassTierOverride` already consumes this
   field — do not change it.)
2. `lib/server/glass-tier-setting.integration.test.ts` exists: via the real action with partial-mocked
   `getCurrentUser` (CLAUDE.md idiom), asserts a valid write persists `glassTier`, an invalid value is
   rejected with no write, and an unauthenticated call writes nothing. Collected by
   `npx vitest list -c vitest.integration.config.ts` (captured to a var).
3. `app/(app)/account/page.tsx` (+ `components/account-forms.tsx`) renders, in addition to the
   existing password/analytics cards:
   - exam-date form labelled «Дата іспиту» → `setExamDateAction`;
   - daily-goal form labelled «Денна ціль» → `setDailyGoalAction`;
   - glass-tier select labelled «Скляні ефекти» with the four options (auto/real/emulated/solid as
     Ukrainian labels) → `setGlassTierAction`;
   - a read-only streak status block showing streakCurrent («днів поспіль» or similar), streakBest,
     and freezeTokens as «вихідні» — calm informational copy.
4. Changing the tier takes effect on next server render (the `(app)` layout already maps the override
   to the body class — no client hack; constraint: do not add client-side tier switching).
5. `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build` exit 0.
6. Browser (guarded): /account contains «Дата іспиту», «Денна ціль», «Скляні ефекти».

## Constraints / decisions
- Self-only writes; reuse `StudyProfileActionState`-style return shapes so the forms can share error
  rendering.
- The glass select is progressive enhancement — plain `<form>` + submit is fine (no JS dependency).
- Non-Goal: Ukrainian client validation messages (task 15), category switching on /account.

## Plan
- [x] Add setGlassTierAction (+ zod) to lib/server/user-settings.ts.
- [x] Write glass-tier-setting.integration.test.ts.
- [x] Add the three forms + streak view to /account.
- [x] Suite + verify.sh.

## Done
- [x] Add `setGlassTierAction` to `lib/server/user-settings.ts`.
- [x] Write `lib/server/glass-tier-setting.integration.test.ts` (3 tests, all green; collected by
      `npx vitest list -c vitest.integration.config.ts`).
- [x] Add the three forms + streak view to `/account` (criterion 3) and wire them into
      `app/(app)/account/page.tsx`; full suite (typecheck / unit / build / integration) green.

## Next
- (none — Goal met; criterion 6 browser copy check is guarded and the three strings are in the
  server-rendered page source.)

## Artifacts
- lib/server/user-settings.ts, lib/server/glass-tier-setting.integration.test.ts,
  app/(app)/account/page.tsx, components/account-forms.tsx

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 10:26 UTC ClPcs-Mac-mini: added `setGlassTierAction` to lib/server/user-settings.ts —
  zod enum over exactly ["auto","real","emulated","solid"] (inline, `satisfies readonly
  GlassTierOverride[]` pins it to the `GlassSignals["override"]` union; the verify gate greps the
  four literals in THIS file, so the schema lives here, not lib/validation.ts), `requireUser()`
  identity, `userSettings.upsert` self-only write, `StudyProfileActionState` return via
  `firstIssueMessage`. `npm run typecheck` green. Next: the integration test.
- 2026-07-02 13:29 UTC ClPcs-Mac-mini: wrote lib/server/glass-tier-setting.integration.test.ts —
  mirrors change-password.integration.test.ts (throwaway prisma user, partial-mock `@/lib/auth`
  `getCurrentUser`, User→UserSettings Cascade cleanup). Covers: valid write persists (upsert
  create THEN update path, "solid"→"real"), invalid value ("frosted") → `{ error }` with the row
  byte-identical (glassTier + updatedAt unchanged), unauthenticated (`getCurrentUser`→null) →
  requireUser redirect()-throw asserted via `.rejects.toThrow()` + userSettings count unchanged.
  `npm run typecheck` green; `npx vitest list -c vitest.integration.config.ts` (captured to a var)
  lists the file; `vitest run` on the file: 3/3 pass. Next: the /account forms + streak view.
- 2026-07-02 10:34 UTC ClPcs-Mac-mini: added the three forms + streak view. `components/account-forms.tsx`
  gains `ExamDateForm` («Дата іспиту», type=date, empty clears), `DailyGoalForm` («Денна ціль (5–100
  питань)», number 5–100) and `GlassTierForm` («Скляні ефекти», plain select+submit, 4 Ukrainian
  options, no client tier switching) — each `useActionState` over a `SettingsFormAction` prop with
  shared `ActionNotes` (StudyProfileActionState → Error/SuccessNote). The actions live in
  `server-only` modules (NOT "use server" files), so `app/(app)/account/page.tsx` defines module-scope
  inline `"use server"` wrappers (`submitExamDate`/`submitDailyGoal`/`submitGlassTier`, adapted to the
  `(prev, formData)` signature) and passes them down as props; the client file only `import type`s the
  state shape. Page fetches profile (`getOrCreateProfile`) + `getGlassTierOverride` in parallel and
  renders the read-only «Серія навчання» card (streakCurrent «днів поспіль», streakBest, freezeTokens
  «Вихідні в запасі»). Verified: all verify.sh grep gates green (bash dry-run), `npm run typecheck`,
  `npm test` (466), `npm run build`, `npm run db:seed` + `npm run test:integration` (27 files, 97
  pass/2 skip) all exit 0. Status → done.



## Verify
**Last verify:** PASS (2026-07-02T10:36:57Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T10:38:29Z)
