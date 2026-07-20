# Task: wave16-05-entitlements-engine

**Status:** done
**Driver:** auto
**Updated:** 2026-07-04T16:56Z
**Last compute:** mac-mini

## Goal
Implement the pure entitlement engine (making the wave16-04 oracle green WITHOUT touching it) plus
the server loader/guard. PASS = ALL true:

1. `lib/entitlements.ts` implemented (stub gone): `hasIntelligenceAccess` + `isEntitlementsEnabled`
   per the frozen oracle semantics; module stays pure (same forbidden-token rule as wave16-04).
2. `npx vitest run lib/entitlements.test.ts` exits 0 AND
   `shasum -a 256 lib/entitlements.test.ts` matches `tasks/wave16-04-entitlements-oracle/oracle.sha256`
   EXACTLY (the oracle was not edited — anti self-grading).
3. `lib/server/entitlements.ts` exists (`import "server-only"`), exporting:
   - `getEntitlement(userId: string)` → the user's Entitlement row or null (prisma findUnique);
   - `checkIntelligenceAccess(userId, now?: Date)` → `{ enabled: boolean; hasAccess: boolean }`
     where `enabled = isEntitlementsEnabled()` and `hasAccess = !enabled ? true :
     hasIntelligenceAccess(mapped row, now ?? new Date())` — flag OFF means everyone passes (inert);
   - `class EntitlementRequiredError extends Error` with `code = "ENTITLEMENT_REQUIRED"` and a
     Ukrainian message (active voice, e.g. «Потрібен «Доступ до іспиту», щоб бачити цей розділ» —
     direct, no guilt);
   - `requireIntelligenceAccess(userId, now?)` → resolves void when access, throws
     EntitlementRequiredError when flag ON and no access.
4. `lib/server/entitlements.integration.test.ts` proves through the REAL server module (server-only
   stubbed per house vitest.integration.config.ts):
   a. fresh user (no Entitlement row) + `vi.stubEnv("ENTITLEMENTS_ENABLED","true")` →
      `checkIntelligenceAccess` → `{enabled:true, hasAccess:false}` and
      `requireIntelligenceAccess` rejects with code `ENTITLEMENT_REQUIRED`;
   b. after `prisma.entitlement.create({tier:"EXAM_ACCESS", validUntil:null})` for that user →
      `hasAccess:true`, `requireIntelligenceAccess` resolves;
   c. env unset (flag OFF) → `{enabled:false, hasAccess:true}` even with NO row — inertness;
   d. expired row (`validUntil` in the past) with flag ON → `hasAccess:false`.
   Fixture user cleaned up (delete user cascades the Entitlement row).
5. `npm test` exits 0 (unit suite fully green again after the wave16-04 red window).
6. `npm run test:integration` exits 0. `npx tsc --noEmit` exits 0.

## Constraints / decisions
- Do NOT edit lib/entitlements.test.ts — Goal 2's hash check enforces it.
- Enforcement direction: `hasAccess:true` when flag OFF is the INERTNESS contract every gated
  surface relies on (spec: "Flag OFF ⇒ every existing test passes unmodified; no UI change").
- No gating of any surface yet (wave16-08); no admin actions yet (wave16-06). This task is engine +
  loader + guard only.
- `getEntitlement` maps the prisma row to `EntitlementLike` (tier + validUntil) for the pure fn —
  keep the mapping in the server module, the pure core never sees prisma types.

## Next
- [x] Implement lib/entitlements.ts until the oracle is green; then write the server module + the
      integration test.
- Goal fully met — full verify.sh prints `OK wave16-05` (oracle green + sha unchanged, purity gate,
  server-module gates, tsc, unit suite, integration suite all pass). Nothing left for this task.

## Artifacts
- lib/entitlements.ts
- lib/server/entitlements.ts
- lib/server/entitlements.integration.test.ts

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T16:56Z ClPcs-Mac-mini: Implemented the pure engine (`lib/entitlements.ts`):
  `hasIntelligenceAccess` = tier==="EXAM_ACCESS" && (validUntil===null || validUntil>now) (strict
  boundary), `isEntitlementsEnabled` = `process.env.ENTITLEMENTS_ENABLED === "true"`. Oracle green
  (12/12), sha256 matches wave16-04 oracle.sha256 unchanged. Wrote `lib/server/entitlements.ts`
  (server-only): getEntitlement, checkIntelligenceAccess (flag-OFF ⇒ inert, no DB read),
  EntitlementRequiredError (code ENTITLEMENT_REQUIRED, uk message), requireIntelligenceAccess.
  Wrote `lib/server/entitlements.integration.test.ts` proving a–d (4/4). Full verify.sh → OK
  wave16-05: tsc clean, npm test 588 pass, integration 175 pass/2 skip. Status: done.

## Verify
**Last verify:** PASS (2026-07-04T13:57:12Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T13:58:59Z)
