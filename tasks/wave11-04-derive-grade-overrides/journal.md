# Task: wave11-04-derive-grade-overrides

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
Extend the PURE `deriveGrade` (lib/fsrs/grade.ts) to accept optional per-topic latency-band overrides,
defaults = the existing global constants. Behaviour is pinned by a FROZEN oracle (hand-computed at
plan time — the implementer may not change these numbers). DONE when (verify.sh exits 0):

1. `deriveGrade` accepts a second optional arg `overrides?: { easyMs?: number; hardMs?: number }`.
   `easyMs` defaults to `FSRS_EASY_LATENCY_MS` (5000), `hardMs` to `FSRS_HARD_LATENCY_MS` (30000).
   `veryFast = latencyMs <= easyMs`; `verySlow = latencyMs >= hardMs`. All other logic unchanged
   (wrong→Again; low-confidence/very-slow veto→Hard before Easy; missing latency→Good).
2. Existing single-arg callers still typecheck and behave identically (recordReview passes no overrides).
3. FROZEN ORACLE — `deriveGrade` returns EXACTLY these grades (1=Again 2=Hard 3=Good 4=Easy):
   Defaults (no overrides):
   - `{correct:true,  latencyMs:2000}`  → 4   (≤5000 fast)
   - `{correct:true,  latencyMs:6000}`  → 3   (mid → Good bulk)
   - `{correct:true,  latencyMs:30000}` → 2   (≥30000 slow → Hard)
   - `{correct:false, latencyMs:100}`   → 1   (wrong → Again)
   Overrides `{easyMs:2500, hardMs:20000}`:
   - `{correct:true,  latencyMs:2400}`  → 4   (≤2500 fast)
   - `{correct:true,  latencyMs:2500}`  → 4   (boundary ≤ ⇒ fast)
   - `{correct:true,  latencyMs:2600}`  → 3   (mid → Good)
   - `{correct:true,  latencyMs:10000}` → 3   (mid → Good stays the bulk)
   - `{correct:true,  latencyMs:19999}` → 3   (just under Hard → Good)
   - `{correct:true,  latencyMs:20000}` → 2   (boundary ≥ ⇒ slow → Hard)
   - `{correct:true}` (no latency)       → 3   (no signal → Good)
   - `{correct:true,  latencyMs:1000, confidence:1}` → 2 (low-conf veto → Hard, not Easy)
4. `lib/fsrs/grade.test.ts` adds cases covering the override behaviour; `npm test` exits 0. The whole
   pure suite includes `lib/fsrs/grade.test.ts` (prove via `npx vitest list` capture-to-var).

## Constraints / decisions
- PURE: no clock/DB/randomness/JSX; thresholds stay in lib/fsrs/constants.ts. Overrides are the
   ONLY new surface.
- The oracle above is authoritative and frozen — verify.sh runs it against the real impl via tsx
   (grade.ts imports only relative `./constants`/`./types`, so no `@/` alias resolution needed).

## Plan
- [x] Add the overrides param + default resolution to deriveGrade.
- [x] Add override unit cases to grade.test.ts.

## Next
- [x] Edit lib/fsrs/grade.ts signature.
- (none — Goal met, verify.sh green)

## Artifacts
- lib/fsrs/grade.ts — added `DeriveGradeOverrides { easyMs?; hardMs? }` second optional arg; `easyMs`/`hardMs` default to `FSRS_EASY_LATENCY_MS`/`FSRS_HARD_LATENCY_MS`; `veryFast`/`verySlow` now compare against resolved bands.
- lib/fsrs/grade.test.ts — new "per-topic latency-band overrides" describe covering defaults/partial-override fallback + the frozen tighter-band oracle.

## Log
- 2026-07-02 planner: task authored; oracle frozen.
- 2026-07-02T01:49Z ClPcs-Mac-mini: added optional `overrides` param to deriveGrade (defaults to global constants), added override unit cases; grade.test.ts 12/12, full `npm test` 356/356, verify.sh EXIT=0 (frozen oracle 12 cases OK + typecheck clean). Status→done.

## Verify
**Last verify:** PASS (2026-07-01T22:50:14Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T22:51:07Z)
