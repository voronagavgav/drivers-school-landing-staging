# Task: wave16-02-constants-flags

**Status:** done
**Driver:** auto
**Updated:** 2026-07-04T16:42Z
**Last compute:** mac-mini

## Goal
Add the Wave-16 constants to `lib/constants.ts` (spec T1/T2/T3), following the house
configurable-constants pattern. PASS = ALL true:

1. `lib/constants.ts` exports, with these EXACT values:
   `PRICE_UAH = 399`, `PRICE_TEST_ARM_UAH = 499`,
   `ENTITLEMENT_TIERS = ["FREE", "EXAM_ACCESS"] as const`,
   `ENTITLEMENT_SOURCES = ["MANUAL", "PROMO"] as const`,
   `WINBACK_WINDOW_START_DAY = 8`, `WINBACK_WINDOW_END_DAY = 9`,
   `PREP_MODES = ["SCHOOL", "SELF", "BOTH"] as const`,
   `EXAM_OUTCOMES = ["PASSED", "FAILED"] as const`.
2. `NUDGE_KINDS` contains `"RETAKE_WINBACK"` (appended to the existing four).
3. `ANALYTICS_EVENTS` contains `"exam_outcome_reported"` and `"onboarding_jtbd_answered"`
   (recordEvent rejects unknown names — events themselves are recorded in wave16-10/12).
4. `npx tsc --noEmit` exits 0 — every `Record<NudgeKind,…>`/exhaustive per-kind site from the
   wave16-01 Findings (1c) is satisfied. Adding a copy entry for RETAKE_WINBACK in
   `components/nudge-card.tsx` `NUDGE_COPY` is IN scope (placeholder Ukrainian copy, one line,
   marked `// COPY-PENDING-L4` — final copy lands in wave16-11); adding any LOGIC (priority,
   window math) is OUT of scope.
5. `npm test` exits 0.
6. Scope: `git diff --name-only` (unstaged+staged) touches only `lib/constants.ts` plus files whose
   ONLY change is an added Record/label entry for RETAKE_WINBACK. No ENTITLEMENTS_ENABLED reader
   here (that is `isEntitlementsEnabled()` in lib/entitlements.ts, wave16-04/05 — a call-time env
   read, NOT a module-scope constant, so tests can vi.stubEnv it).

## Constraints / decisions
- Transitional state is EXPECTED: RETAKE_WINBACK becomes a legal NudgeKind while `decideNudge`
  never emits it until wave16-11. No policy/server branches here.
- `PRICE_TEST_ARM_UAH` (499) exists ONLY as a constant for a future price test arm (research
  addendum: WTP closed at 399) — nothing reads it yet; do not build any A/B plumbing.
- ENTITLEMENTS_ENABLED is deliberately NOT a module-scope `process.env` constant in constants.ts —
  module-scope freezes at import and constants.ts is imported client-side. The flag reader lives
  server/pure-side in lib/entitlements.ts (wave16-04 stub, wave16-05 impl).
- Depends on wave16-01 Findings 1c for the exhaustive-site list.

## Next
- [x] Edit lib/constants.ts (prices, tiers, sources, winback window, prep modes, outcomes,
      NUDGE_KINDS, ANALYTICS_EVENTS), then chase tsc exhaustiveness fallout with entry-only edits.
- (none — Goal met: all constants exported with exact values, RETAKE_WINBACK in NUDGE_KINDS +
  placeholder copy in nudge-card.tsx, two analytics events added; tsc 0, npm test 576 pass,
  diff scoped to lib/constants.ts + nudge-card.tsx entry-only.)

## Artifacts
- lib/constants.ts
- components/nudge-card.tsx (RETAKE_WINBACK NUDGE_COPY entry, // COPY-PENDING-L4)

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T16:42Z ClPcs-Mac-mini: verify FAIL was the purity gate `grep -q ENTITLEMENTS_ENABLED`
  matching the token inside a doc COMMENT (whole-file grep, not import-only). Reworded the comment
  to "entitlements master flag" — no literal token. Re-ran verify.sh: OK wave16-02 (tsc 0, 576 tests).
  Status → done.
- 2026-07-04T16:40Z ClPcs-Mac-mini: added Wave-16 monetization constants to lib/constants.ts
  (PRICE_UAH=399, PRICE_TEST_ARM_UAH=499, ENTITLEMENT_TIERS, ENTITLEMENT_SOURCES,
  WINBACK_WINDOW_START_DAY=8/END_DAY=9, PREP_MODES, EXAM_OUTCOMES + their type aliases);
  appended RETAKE_WINBACK to NUDGE_KINDS and exam_outcome_reported/onboarding_jtbd_answered to
  ANALYTICS_EVENTS. Per wave16-01 Finding 1c, the ONLY exhaustive Record<NudgeKind> site is
  NUDGE_COPY in components/nudge-card.tsx — added the placeholder copy entry there. tsc --noEmit
  exit 0; npm test 576 passed; git diff scoped to lib/constants.ts + nudge-card.tsx (entry-only).
  Status → done.


## Verify
**Last verify:** PASS (2026-07-04T13:42:10Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T13:43:42Z)
