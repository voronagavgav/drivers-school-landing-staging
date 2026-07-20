# Task: wave13-10-review-sync-route

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
`/api/review-sync` (spec §D): session-authed batch replay of offline answers through the SAME
submitAnswer path, with clamped client `reviewedAt` (the deferred W10f item). Mirrors the /api/track
architecture (pure schema module + thin route). PASS = ALL true:

1. PURE module `lib/review-sync.ts` (no `server-only`/db imports) exports:
   - `reviewSyncItemSchema` (zod): `{ sessionId: string (min 10), questionId: string (min 10),
     selectedOptionId: string | null, latencyMs?: int 0..600000, clientEventId: string (min 8,
     max 128), reviewedAt: ISO-8601 datetime string }` — unknown keys stripped (zod object default;
     the PII-guard property /api/track proved);
   - `reviewSyncBatchSchema`: array of items, max `REVIEW_SYNC_MAX_ITEMS`;
   - `REVIEW_SYNC_MAX_ITEMS = 50` and `REVIEW_SYNC_MAX_BODY_BYTES = 65536`;
   - `clampReviewedAt(clientTime: Date, now: Date): Date`.
2. clampReviewedAt ORACLE (frozen — `lib/review-sync.test.ts` asserts these exact ms values):
   with `now = new Date(1700000000000)`:
   - client `new Date(1700003600000)` (future +1h) → returns ms `1700000000000` (never future);
   - client `new Date(1700000000000 - 8*86400000)` = `1699308800000` → returns
     `1700000000000 - 7*86400000` = `1699395200000` (floor at now−7d);
   - client `new Date(1699996400000)` (−1h) → returned UNCHANGED, ms `1699996400000`.
3. `submitAnswer` (lib/server/test-engine.ts) accepts optional `reviewedAt?: Date`; when present it
   replaces the `now` passed to `recordReview` (the ReviewLog/FSRS lane ONLY — TestAnswer and session
   bookkeeping keep server wall-clock). Existing callers compile unchanged.
4. `app/api/review-sync/route.ts` POST (runtime nodejs):
   a. reads the raw body and REJECTS > `REVIEW_SYNC_MAX_BODY_BYTES` BEFORE any JSON.parse;
   b. `getCurrentUser()` null → HTTP 200 JSON `{ ok: false }`, zero writes (a beacon-safe ack that
      leaks nothing);
   c. schema-invalid body → `{ ok: false }`, zero writes;
   d. valid: items sorted by `reviewedAt` ASCENDING, each applied via
      `submitAnswer({ ...item, userId: <from session cookie — NEVER from the body>,
      reviewedAt: clampReviewedAt(new Date(item.reviewedAt), now) })`;
   e. per-item try/catch: a throwing item (INVALID_SESSION — incl. foreign/completed sessions —
      INVALID_QUESTION, anything) yields `{ clientEventId, status: "rejected" }` and the batch
      CONTINUES; a successful item yields `{ clientEventId, status: "applied" }` (a replayed no-op
      may report `"applied"` — idempotency makes them indistinguishable to the client, which deletes
      the WAL entry either way);
   f. response: HTTP 200 `{ ok: true, results: [...] }`; a top-level catch returns `{ ok: false }` —
      the route NEVER emits a 500/stack (never leaks internals to a beacon).
5. `npm run typecheck` exits 0; `npm test` exits 0; `npx vitest list` (var-captured) includes
   `lib/review-sync.test.ts`; `npm run test:integration` exits 0 (no regressions).
6. `bash tasks/wave13-10-review-sync-route/verify.sh` exits 0.

## Constraints / decisions
- Foreign-session rejection is INHERITED, not reimplemented: `submitAnswer`'s
  `findFirst({ id, userId })` already fails a session that isn't the caller's — the route just maps
  the throw to a per-item rejection (production-path by construction).
- `sessionId` REQUIRED in this task's schema; wave13-17 relaxes it for the sessionless offline lane —
  export `reviewSyncItemSchema` separately so 17's change is additive.
- A session that COMPLETED before reconnect → items honestly `rejected` (the exam already scored
  without them; silently backfilling a scored exam would be dishonest). Recorded as a decision.
- Idempotency comes from wave13-09's namespaced ids inside submitAnswer's whole-tx guard — the route
  adds NOTHING id-related (single owner).
- Mirror /api/track for structure ONLY; no rate-limit lane here (authed, size-capped, idempotent —
  cheap; revisit if abused). No analytics events this task.
- HIGH-STAKES (Evaluate): auth boundary + clock clamping + batch semantics.

## Plan
- [x] lib/review-sync.ts + clamp oracle unit tests.
- [x] submitAnswer reviewedAt param; the route; suites; verify.sh.

## Done
- [x] lib/review-sync.test.ts (3 frozen clamp vectors + schema whitelist/caps, 15 tests green) +
      pure lib/review-sync.ts (schemas, constants, clampReviewedAt). Typecheck green.
- [x] submitAnswer `reviewedAt?: Date` (feeds `recordReview` ONLY via `params.reviewedAt ?? now`;
      TestAnswer/bumpStudyDay keep wall-clock) + app/api/review-sync/route.ts (size-cap before
      parse, cookie-only auth, ascending-reviewedAt apply, per-item try/catch → applied/rejected,
      always-200 `{ ok }` acks, top-level catch). verify.sh PASS.

## Next
- (none — Goal met; verify.sh green end-to-end.)

## Artifacts
- lib/review-sync.ts / lib/review-sync.test.ts / app/api/review-sync/route.ts

## Log
- 2026-07-02 planner: task authored from spec §D; clamp vectors frozen at plan time.
- 2026-07-02 15:22 UTC ClPcs-Mac-mini: wrote lib/review-sync.test.ts (frozen clamp oracle: future→now,
  −8d→now−7d floor 1699395200000, −1h unchanged; item/batch schema whitelist, strip-unknown-keys,
  caps 50/65536) then lib/review-sync.ts (pure: reviewSyncItemSchema/reviewSyncBatchSchema via
  z.iso.datetime(), REVIEW_SYNC_MAX_ITEMS/MAX_BODY_BYTES/MAX_AGE_MS, clampReviewedAt). 15/15 tests
  pass, typecheck green. Route + submitAnswer param still pending → status stays active.
- 2026-07-02 15:24 UTC ClPcs-Mac-mini: fixed the verify FAIL (route missing) by completing the
  remaining increment: added optional `reviewedAt?: Date` to submitAnswer (lib/server/test-engine.ts,
  replaces `now` for recordReview only — TestAnswer upsert + bumpStudyDay keep server wall-clock) and
  wrote app/api/review-sync/route.ts (mirrors /api/track structure: content-length + read-text body
  cap BEFORE JSON.parse, getCurrentUser cookie auth, zod batch parse, one batch `now`, items sorted
  by reviewedAt ASC, per-item try/catch mapping any throw to {clientEventId, status:"rejected"},
  success →"applied", HTTP-200 `{ ok:false }` on every reject path, top-level catch — never a 500).
  verify.sh full run green: typecheck, 513 unit tests (45 files incl. review-sync.test.ts in vitest
  list), 107 integration tests, PASS wave13-10. Goal §§1–6 all met → Status: done.


## Verify
**Last verify:** PASS (2026-07-02T15:25:43Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T15:27:21Z)
