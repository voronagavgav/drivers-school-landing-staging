# Task: wave16-06-admin-grant-revoke

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-04T17:08Z
**Last compute:** ClPcs-Mac-mini

## Goal
Minimal admin grant/revoke for manual/promo entitlements — server actions + the smallest possible
admin surface. PASS = ALL true:

1. Server actions exist (in `app/admin/actions.ts` or a sibling admin actions file, following the
   `createQuestion` pattern from wave16-01 Findings 1i): `grantEntitlement` and `revokeEntitlement`.
   Each starts with `await requireContentManager()` BEFORE any input handling.
2. `grantEntitlement` is zod-validated against a schema in `lib/validation.ts`: user identified by
   email (lowercased before lookup — house login-lane rule) or userId; `tier` from
   `z.enum(ENTITLEMENT_TIERS)`; optional ISO `examDate`/`validUntil` via `z.iso.datetime()` (zod v4
   form); `source` from `z.enum(ENTITLEMENT_SOURCES)`. Invalid input → `{ error }` with a Ukrainian
   message, no write. Grant upserts the Entitlement row (userId unique).
3. `revokeEntitlement` deletes (or downgrades to FREE — pick one, record in Log) the row; idempotent
   on a user with no row (no throw).
4. Minimal admin UI: a small section/page under `app/admin/` with a form (email, tier, optional
   dates, source) + revoke — copy in Ukrainian, no design flourish (admin surface). No client-side
   RBAC logic; the actions are the guard.
5. `lib/server/admin-entitlements.integration.test.ts` (or extension of an existing admin suite)
   proves via the REAL actions (partial-mock `@/lib/auth` getCurrentUser, house pattern):
   a. non-admin (`role:"USER"`) calling grantEntitlement → rejects (redirect-throw) AND no
      Entitlement row is written;
   b. admin grant for a fixture user → row exists with tier EXAM_ACCESS, then (flag ON via stubEnv)
      `checkIntelligenceAccess` → hasAccess:true;
   c. admin revoke → subsequent checkIntelligenceAccess (flag ON) → hasAccess:false;
   d. invalid tier string → `{ error }`, no row.
6. `npx tsc --noEmit`, `npm test`, `npm run test:integration` all exit 0.

## Constraints / decisions
- RBAC server-side ONLY (standing rule). No entitlement self-service — users cannot grant
  themselves anything; there is deliberately NO user-facing action here.
- No payment fields, no promo-code redemption flow — `source:"PROMO"` is just a label an admin
  sets manually this wave.
- Keep the UI minimal (this is an internal tool); do not add nav links visible to non-admins.
- Depends on: wave16-03 (schema), wave16-05 (checkIntelligenceAccess used in the test).

## Next
- [x] Add the zod schema to lib/validation.ts, the two actions, the minimal admin form, then the
      integration test.
- [x] Fix false-fail verify gate: anchor the RBAC-guard grep on the action DEFINITION file, not
      any mention of the name.
- Goal fully met. If follow-up needed: wire an entitlements listing/read view (out of scope this wave).

## Decisions
- Revoke DELETEs the Entitlement row (via `deleteMany`, idempotent — 0 rows affected on a missing
  row, never throws) rather than downgrading to FREE. Simpler and matches "one row per user, absent
  = FREE" semantics already used by checkIntelligenceAccess (null row → not EXAM_ACCESS).
- Date fields in the admin form are plain text ISO inputs (placeholder `2026-07-04T00:00:00Z`) NOT
  `datetime-local` — the latter emits `YYYY-MM-DDTHH:mm` (no seconds/offset) which `z.iso.datetime()`
  rejects, so it would always error. `purchasedAt` left null (manual grant, not a purchase).

## Artifacts
- lib/validation.ts — entitlementGrantSchema, entitlementRevokeSchema (email-OR-userId refine,
  z.enum(ENTITLEMENT_TIERS/SOURCES), z.iso.datetime() optional dates)
- app/admin/actions.ts — grantEntitlement (upsert) / revokeEntitlement (deleteMany, idempotent);
  both requireContentManager() first, log AdminActionLog
- app/admin/entitlements/entitlement-form.tsx — GrantEntitlementForm / RevokeEntitlementForm
- app/admin/entitlements/page.tsx — minimal Ukrainian admin surface
- app/admin/layout.tsx — nav link «Доступи»
- lib/server/admin-entitlements.integration.test.ts — 5 cases (a–d + idempotent revoke)
- tasks/wave16-06-admin-grant-revoke/verify.sh — RBAC-guard grep anchored on the action definition
  (`export async function grantEntitlement`) so a conventional client form can't false-fail it

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T17:05Z ClPcs-Mac-mini: implemented schema+actions+admin UI+test. Actions call
  requireContentManager() before any input handling; user located by email (lowercased) or userId;
  grant upserts, revoke deletes (idempotent). Gates green: `npx tsc --noEmit` clean, `npm test`
  588 passed, `npm run test:integration` 180 passed/2 skipped (incl. new admin-entitlements suite
  5/5). Marked done.
- 2026-07-04T17:08Z ClPcs-Mac-mini: verify had false-failed ("actions not RBAC-guarded") — the gate
  `grep -rlE 'grantEntitlement' app/admin | head -1` non-deterministically grabbed the client form
  `entitlement-form.tsx` (which imports the action by name per house convention: category-form.tsx,
  topic-form.tsx all do the same) instead of `actions.ts`; a client component structurally can't call
  requireContentManager, so the check false-failed. The code was already correct (actions.ts:696/747
  call requireContentManager() first). Fixed the genuinely-flawed gate by anchoring on the DEFINITION
  (`export async function grantEntitlement`), which matches only actions.ts — strengthens the intent
  check (Goal item 1 = the action-definition file is RBAC-guarded). Full verify now green: OK wave16-06.
  Status: done.


## Verify
**Last verify:** PASS (2026-07-04T14:10:02Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T14:11:54Z)
