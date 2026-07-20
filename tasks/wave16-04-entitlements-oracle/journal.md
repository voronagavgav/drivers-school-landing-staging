# Task: wave16-04-entitlements-oracle

**Status:** done
**Driver:** auto
**Updated:** 2026-07-04T16:52Z
**Last compute:** mac-mini

## Goal
ORACLE AUTHORING ONLY (anti self-grading): write the reference unit tests for the pure entitlement
engine from the FROZEN vectors below, against a STUB that throws. Implementation is wave16-05 and
may NOT edit these tests. PASS = ALL true:

1. `lib/entitlements.ts` exists as a STUB: exports
   `type EntitlementLike = { tier: string; validUntil: Date | null } | null`,
   `function hasIntelligenceAccess(ent: EntitlementLike, now: Date): boolean` and
   `function isEntitlementsEnabled(): boolean` — each body throws
   `new Error("NOT_IMPLEMENTED_WAVE16_05")`. Pure module: no server-only marker, no db, no
   generated-client import, no Math.random/Date.now/new Date( in the SOURCE file (comments
   included — do not name forbidden tokens in doc comments).
2. `lib/entitlements.test.ts` encodes EXACTLY these frozen vectors (hand-derived from spec T1 at
   plan time — literal values, no computation from the implementation):
   hasIntelligenceAccess —
   V1 `null`, now=any → `false`
   V2 `{tier:"FREE", validUntil:null}` → `false`
   V3 `{tier:"EXAM_ACCESS", validUntil:null}` → `true` (open-ended grant)
   V4 `{tier:"EXAM_ACCESS", validUntil:new Date("2026-09-01T00:00:00.000Z")}`,
      now=`new Date("2026-07-04T12:00:00.000Z")` → `true`
   V5 same validUntil, now=`new Date("2026-09-01T00:00:00.000Z")` → `false`
      (BOUNDARY: access iff now < validUntil, STRICT — expiry instant is expired)
   V6 same validUntil, now=`new Date("2026-09-02T00:00:00.000Z")` → `false`
   V7 `{tier:"EXAM_ACCESS", validUntil:new Date("2026-07-04T11:59:59.000Z")}`,
      now=`new Date("2026-07-04T12:00:00.000Z")` → `false`
   V8 `{tier:"GOLD", validUntil:null}` → `false` (tier whitelist: only EXAM_ACCESS grants access)
   isEntitlementsEnabled (via `vi.stubEnv("ENTITLEMENTS_ENABLED", …)`) —
   V9 `"true"` → `true`; V10 env unset → `false`; V11 `"false"` → `false`; V12 `"1"` → `false`
   (exact-string opt-in, matching the COOKIE_SECURE==="true" house pattern).
3. `npx tsc --noEmit` exits 0.
4. `npx vitest run lib/entitlements.test.ts` FAILS (red against the stub — proves the oracle binds).
5. `shasum -a 256 lib/entitlements.test.ts > tasks/wave16-04-entitlements-oracle/oracle.sha256`
   written (wave16-05's verify asserts the hash is unchanged).

## Constraints / decisions
- The vectors above are the oracle — frozen at PLAN time, before any implementation exists. Do not
  add vectors derived from implementation behavior; do not weaken V5's strict boundary.
- `isEntitlementsEnabled()` reads `process.env.ENTITLEMENTS_ENABLED` at CALL time (never
  module-scope) so vi.stubEnv works in later integration tests — the test must assert V9-V12 in one
  file run, which only passes with call-time reads.
- KNOWN TRANSIENT: `npm test` (full unit run) is RED between this task and wave16-05. This task's
  gate deliberately checks only typecheck + targeted-red; wave16-05 restores green immediately after.
- No I/O in the pure core; `now` is always injected (house determinism rule).

## Next
- [x] Write the stub + the test file with the 12 vectors verbatim, confirm red, freeze the hash.
- (none — Goal fully met; wave16-05 implements against the frozen oracle.)

## Artifacts
- lib/entitlements.ts (stub)
- lib/entitlements.test.ts (frozen oracle)
- tasks/wave16-04-entitlements-oracle/oracle.sha256

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T16:52Z ClPcs-Mac-mini: wrote lib/entitlements.ts stub (pure — purity grep CLEAN, no forbidden tokens incl. comments) with EntitlementLike/hasIntelligenceAccess/isEntitlementsEnabled each throwing NOT_IMPLEMENTED_WAVE16_05; wrote lib/entitlements.test.ts encoding all 12 frozen vectors V1-V12 verbatim (V10 unset via vi.stubEnv undefined). `npx tsc --noEmit` exit 0; `npx vitest run lib/entitlements.test.ts` RED 12/12 (proves oracle binds). Froze sha256 → oracle.sha256 (8dc08cab…). Goal fully met → Status: done.

## Verify
**Last verify:** PASS (2026-07-04T13:52:04Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T13:52:39Z)
