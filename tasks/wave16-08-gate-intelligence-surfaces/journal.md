# Task: wave16-08-gate-intelligence-surfaces

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-fable-5
**Updated:** 2026-07-04T17:55Z
**Last compute:** mac-mini

## Goal
Wire the entitlement gate into EXACTLY the four intelligence surfaces (spec T1), server-side,
inert with the flag off. The binding surface map is wave16-01 Findings 1a/1b (planner defaults
below if unchanged). PASS = ALL true:

1. LOADER ENFORCEMENT (server-side, cannot be bypassed by a client): with
   `ENTITLEMENTS_ENABLED=true` and NO entitlement, these lib/server loaders throw
   `EntitlementRequiredError` (from wave16-05): `getStudyPlan` (lib/server/study.ts) and
   `listMistakes` (lib/server/mistakes.ts) — plus the calibration loader
   (`getCalibrationForUser`) per the Findings map. With an EXAM_ACCESS entitlement, or with the
   flag off/unset, each resolves EXACTLY as before (same return shape, no extra fields).
2. PAGE RENDERING (teaser, no crash): with flag ON + no entitlement —
   a. dashboard: readiness dial shows ONLY the top-line number; the detail
      (bottleneck/seen/band per Findings 1a-i) is replaced by the wave16-07 teaser; the
      «Сьогоднішній план» card is replaced by the teaser (page checks
      `checkIntelligenceAccess` BEFORE calling the gated loader — never render from caught data);
   b. /progress: CalibrationSection replaced by the teaser; the rest of the page (topic map,
      history) untouched;
   c. /mistakes: the analytics list replaced by the teaser; the MISTAKE_PRACTICE start CTA
      remains functional (practice modes are NEVER gated — if the CTA lives on this page, it must
      still render and start a session).
3. Calibrated scheduling: per Findings 1a-iii, nudge computation does not read calibrationSlope
   today — record in Log that "calibrated reminder scheduling" is covered by the calibration
   surface gate; if Findings found a direct read, gate that input (fall back to default slope)
   without touching stored data.
4. INTEGRATION TEST `lib/server/entitlement-gating.integration.test.ts` proves through the REAL
   loaders (stubEnv flag ON): non-entitled user → `getStudyPlan` and `listMistakes` reject with
   `code === "ENTITLEMENT_REQUIRED"`; after `prisma.entitlement.create` (EXAM_ACCESS,
   validUntil null) → both resolve; flag unset → both resolve for a user with NO row.
5. FLAG-OFF INERTNESS: with no env var set, `npm test` AND `npm run test:integration` pass with
   ZERO modifications to any pre-existing test file (`git diff --name-only` shows no
   `*.test.ts`/`*.integration.test.ts` changes outside the new gating test).
6. Stored computations untouched: no diff in lib/fsrs/, lib/readiness-model.ts,
   lib/server/mastery-readiness.ts recompute/persist paths, prisma schema.
7. `npx tsc --noEmit` and `npm run build` exit 0.

## Constraints / decisions
- Gating is PRESENTATIONAL + LOADER-LAYER only. Never vary what gets COMPUTED or PERSISTED
  (readiness snapshots, mastery, calibration nightly) by entitlement — that would break flag-off
  inertness and make grants retroactively weird.
- Pattern per surface: the server PAGE calls `checkIntelligenceAccess(userId)` first; if locked,
  render `<EntitlementTeaser …/>` and SKIP the loader call. The loader ALSO throws when called
  without access (defense in depth — the client can never reach gated data even via a future
  action). Both layers required.
- The top-line readiness number stays FREE everywhere (spec). Locked = detail only.
- NEVER-GATED set (do not touch, wave16-09 enforces forever): questions, explanations, images,
  all practice/exam modes incl. MISTAKE_PRACTICE start, the simulator, progress history/topic map.
- Teaser copy: one line of value + link to /pricing; calm, no urgency (wave16-07 component).
- Typed "403": in this app the gated entry points are server loaders/pages, not REST routes —
  EntitlementRequiredError with code ENTITLEMENT_REQUIRED + Ukrainian message IS the typed 403
  contract (record in Log; spec's "APIs return a typed 403" maps to this).
- Depends on: wave16-01 (map), 16-05 (guard), 16-07 (teaser).

## Next
- [x] Re-read wave16-01 Findings 1a/1b; wire loader guards; wire the three pages; write the
      gating integration test; prove flag-off inertness.
- (none — Goal met; verify.sh green end to end)

## Artifacts
- lib/server/study.ts (`getStudyPlan` guard + `skipEntitlementGate` opt for the ONE free caller),
  lib/server/mistakes.ts (`listMistakes` guard + ungated `countActiveMistakes` for the never-gated
  CTA), lib/server/calibration.ts (`getCalibrationForUser` guard; nightly refresh untouched)
- app/(app)/dashboard/page.tsx, app/(app)/progress/page.tsx, app/(app)/mistakes/page.tsx (check
  access BEFORE the gated loader; teaser when locked), app/(app)/onboarding/page.tsx (bypass opt)
- lib/server/entitlement-gating.integration.test.ts

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T17:55Z ClPcs-Mac-mini: full increment. Loader guards: `requireIntelligenceAccess`
  at the top of `getStudyPlan` (study.ts), `listMistakes` (mistakes.ts),
  `getCalibrationForUser` (calibration.ts — `refreshCalibrationSlope` deliberately ungated,
  stored computations never vary). `getStudyPlan` gained
  `opts.skipEntitlementGate` (3rd param, default gated); the onboarding done-screen is the ONE
  bypass caller (Findings 1a-ii decision). Pages: dashboard checks `checkIntelligenceAccess`
  BEFORE `getStudyPlan` (locked → plan never loaded → «Сьогоднішній план» teaser; dial keeps only
  the top-line percent — bottleneck/seenCount props nulled; insufficient-data state = detail, so
  locked+insufficient renders only the «Деталі готовності» teaser); /progress replaces only
  CalibrationSection with the teaser (topic map untouched); /mistakes locked branch uses new
  ungated `countActiveMistakes` to keep the MISTAKE_PRACTICE CTA functional and hides the count
  line + list behind the «Аналітика помилок» teaser. GOAL 3 RECORD: re-confirmed grep-clean —
  `lib/server/nudges.ts`/`lib/nudge-policy.ts` have ZERO calibration/calibrationSlope reads, so
  "calibrated reminder scheduling" is covered by the calibration surface gate; no scheduling
  input to gate. TYPED-403 RECORD (per Constraints): gated entry points are server
  loaders/pages — `EntitlementRequiredError` (code ENTITLEMENT_REQUIRED, Ukrainian message) IS
  the typed 403 contract; no REST routes involved. Test: entitlement-gating.integration.test.ts
  drives the REAL loaders (flag ON no row → all three reject with code; EXAM_ACCESS row → all
  resolve; flag unset no row → all resolve). Proofs: tsc 0; npm test 588 pass; test:integration
  43 files/184 pass (zero pre-existing test edits — new file only); build green;
  tasks/.../verify.sh prints OK wave16-08. REAL-TRANSPORT smoke (beyond the gate): booted
  throwaway `ENTITLEMENTS_ENABLED=true` server on :3101, browser-logged-in as seeded
  user@drivers.school (no entitlement): dashboard {planTeaser,readinessTeaser,planQuotaHidden,
  examCTA,practiceCTA}=all true; /progress {calibrationTeaser,topicMapFree,noBuckets}=true;
  /mistakes teaser + (with a throwaway ACTIVE UserMistake row) the «Опрацювати помилки» CTA
  rendered while «Активних помилок» count stayed hidden; entitled row → planCard back, no
  teaser. Cleaned up smoke rows + killed :3101; restarted the LAN :3100 server against the
  fresh build (verify.sh rebuilt .next under it — stale-server learning).

## Verify
**Last verify:** PASS (2026-07-04T14:44:17Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T14:46:46Z)
