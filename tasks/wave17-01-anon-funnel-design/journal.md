# Task: wave17-01-anon-funnel-design

**Status:** done
**Driver:** auto
**Updated:** 2026-07-05T00:00Z
**Last compute:** mac-mini

## Goal
INVESTIGATION ONLY — produce the architecture decision record (ADR) the rest of Wave 17 builds
against. No product code changes; this task writes ONE doc, nothing else. PASS = ALL true:

1. File `docs/strategy/wave17-anon-funnel-adr.md` exists and contains these H2 sections (verbatim
   headings so downstream greps bind): `## Anon-session model`, `## Cookie & identity`,
   `## Unblock strategy`, `## Migration & IDOR`, `## Flag gating`, `## Non-goals`, `## Task map`.
2. `## Anon-session model` PINS the chosen representation with a concrete decision (not a menu of
   options): an anonymous `User` row (`isAnonymous Boolean @default(false)` on the existing `User`
   model) minted lazily on first play, vs. a separate `AnonSession` table. It states which existing
   FKs (`TestSession.userId`, `TestAnswer` via session, `ReviewState.userId`, `UserMistake`,
   `SavedQuestion`, `UserStudyProfile`, `ReadinessSnapshot`) therefore work UNCHANGED, and names the
   exact fields the anon user row carries (NO email/passwordHash → the no-PII guarantee).
3. `## Cookie & identity` names the anon cookie (decision: distinct from `ds_session` AND from the
   analytics `ds_anon`; proposed `ds_anon_play`), whether it reuses the HMAC-signed stateless scheme
   in `lib/auth.ts` or a DB-lookup opaque token, its httpOnly / secure / maxAge, and states it carries
   NO PII.
4. `## Unblock strategy` specifies EXACTLY how a logged-out visitor reaches a question loop that
   today's `requireUser()` blocks: names the two guard layers that must change (`app/(app)/layout.tsx`
   `requireUser()` and every `requireUser()` in `app/actions/test.ts`), defines a single new resolver
   (proposed `requirePlayableUser()` in `lib/server/anon-session.ts`) returning a real OR anon user,
   and asserts that flag-OFF keeps `requireUser()` behavior byte-for-byte (still redirects `/login`).
5. `## Migration & IDOR` states the migration approach (DECISION: CONVERT-IN-PLACE the anon user into
   the real user on register — set email/passwordHash/isAnonymous=false on the SAME row so no data
   reassignment / no IDOR surface — vs. reassign child rows; pick ONE and justify), how idempotency is
   guaranteed (re-running register/migrate is a no-op), and why an attacker cannot claim another
   visitor's anon session (possession-of-signed-cookie == own session; the migrate path never takes a
   target anon-id from the request body).
6. `## Flag gating` names the env flag governing the whole funnel (DECISION: `VALUE_FIRST_FUNNEL` env
   var, exact-string `=== "true"` opt-in, mirroring `ENTITLEMENTS_ENABLED`), lists which surfaces gate
   on it, and confirms the Wave-16 entitlement flag (`ENTITLEMENTS_ENABLED`) governs the T4 grant
   separately.
7. `## Non-goals` records the deferred items (real payment charge; hosted-PSI CWV number; public ship;
   P2.5 SEO/JSON-LD; P3.1 streak; P3.2 reverse-trial; anon-user garbage-collection job).
8. `## Task map` lists wave17-02..14 and the one decision each depends on, so a later task's driver can
   resolve an ambiguity by reading this doc.

## Constraints / decisions
- INVESTIGATION task — DO NOT implement schema, libs, or UI here. Output is the ADR only. Later tasks
  may not silently override this doc's decisions; a deviation must be logged in the deviating task.
- Ground every decision in the repo facts in Findings below, not guesses.
- Be conservative: smallest change that unblocks anon play. Convert-in-place migration is strongly
  preferred over cross-user row reassignment (no IDOR surface, trivially idempotent).

## Findings (from planner repo map — treat as ground truth)
- NO `middleware.ts`. Auth guarded at layout + action level only. `app/(app)/layout.tsx` does
  `requireUser()` (→ `/login`); every action in `app/actions/test.ts` calls `requireUser()`.
- `lib/auth.ts`: cookie `ds_session`, HMAC-signed stateless payload `userId:tokenVersion:expiry`,
  `secure` iff `COOKIE_SECURE==="true"`. `getCurrentUser()` loads full `prisma.user` row incl.
  `selectedCategory`. `SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>`.
- Analytics `ds_anon` cookie (httpOnly, 1y) minted in `lib/server/analytics-ingest.ts` — DISTINCT
  concept; do NOT overload it for play sessions.
- Entitlement flag is env `ENTITLEMENTS_ENABLED` via `isEntitlementsEnabled()` in `lib/entitlements.ts`
  (exact-string opt-in). Mirror this pattern for `VALUE_FIRST_FUNNEL`.
- `startSession({ userId, mode, categoryId, topicId? })` (lib/server/test-engine.ts) needs only a
  userId — an anon User row satisfies it with ZERO engine changes. `submitAnswer({...,userId})` same.
- `registerAction` (app/actions/auth.ts) creates a User, `createSession`, records `user_registered`,
  redirects `/onboarding`. This is the migration hook point.
- Seed reset deletes children in FK-safe order; an `isAnonymous` flag on User needs no seed change.

## Next
- [x] Write `docs/strategy/wave17-anon-funnel-adr.md` with the seven pinned sections + task map.
- Goal fully met; no further increments. Downstream wave17-02..14 read this ADR.

## Artifacts
- `docs/strategy/wave17-anon-funnel-adr.md` — the pinned ADR (7 H2 sections + task-map table).

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T00:00Z ClPcs-Mac-mini: verified repo facts (entitlements `=== "true"` flag, `ds_session`
  cookie attrs incl. 30-day MAX_AGE_SECONDS, 6 `requireUser()` sites in app/actions/test.ts, layout
  `requireUser()`, registerAction hook at auth.ts:54-56), then wrote the ADR with all seven pinned
  sections + task map. verify.sh → PASS. Status: done.

## Verify
**Last verify:** PASS (2026-07-05T15:13:47Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T15:14:43Z)
