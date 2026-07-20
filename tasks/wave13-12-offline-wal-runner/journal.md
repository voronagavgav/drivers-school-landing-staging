# Task: wave13-12-offline-wal-runner

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
IndexedDB write-ahead log in the runner (spec §D): a failed `submitAnswerAction` enqueues the answer
and shows a calm queued state; on reconnect the queue drains to `/api/review-sync`; Background Sync
where available. PASS = ALL true:

1. `lib/offline/wal.ts` — client-safe IndexedDB queue (db name `ds-offline`, object store `wal`,
   keyPath `clientEventId`): `enqueueAnswer(item)`, `listQueued()`, `removeQueued(ids)`,
   `queuedCount()`. EVERY function feature-detects `indexedDB` and resolves harmlessly (never throws)
   when it is absent or opening fails. Grep gate: the file imports NONE of `@/lib/db`, `@/lib/auth`,
   `@/lib/rbac`, `server-only`.
2. PURE `lib/offline/sync-batch.ts`: `buildSyncBatches(items, maxItems = 50)` → items sorted by
   `reviewedAt` ascending, chunked into arrays of ≤ maxItems. ORACLE unit test
   (`lib/offline/sync-batch.test.ts`, frozen): 3 items with reviewedAt ISO strings
   `"2026-07-02T10:00:00.000Z"`, `"2026-07-02T08:00:00.000Z"`, `"2026-07-02T09:00:00.000Z"` and
   maxItems 2 → `[[08:00, 09:00], [10:00]]` (by those timestamps); 0 items → `[]`.
3. Runner (components/test-runner.tsx): the `submit()` catch path now
   (a) enqueues `{ sessionId, questionId, selectedOptionId, latencyMs, clientEventId,
       reviewedAt: new Date().toISOString() }` via `enqueueAnswer` — REUSING the attempt's original
       `clientEventId` (a retry must never mint a new id);
   (b) on successful enqueue shows the calm queued state containing the literal
       «Збережемо, щойно з'явиться мережа» — reassurance styling, NOT the error/warn treatment;
   (c) when IndexedDB is unavailable (enqueue reports failure) falls back to the EXISTING
       submitError + «повторити» behavior unchanged.
4. Drain: `components/offline-sync.tsx` (client), mounted in the `(app)` layout: on mount AND on
   `window` `online` events, reads the queue, POSTs `buildSyncBatches` output to `/api/review-sync`
   (same-origin credentials), removes items whose result status is `applied`/`rejected`, KEEPS items
   when the fetch itself fails (still offline). Concurrent-drain guard (a simple in-flight flag).
5. Background Sync where available: the drain component registers a one-shot sync tag
   `"review-sync"` guarded by `"sync" in registration`; `app/sw.ts` adds a `sync` event handler that
   drains the same IndexedDB queue via fetch. Both lanes may race — safe: server idempotency
   (wave13-09) + both delete after ack. Feature-detected; absence changes nothing.
6. `npm run typecheck`, `npm test`, `npm run build` all exit 0 (build catches client-bundle leaks);
   `npx vitest list` (var-captured) includes `lib/offline/sync-batch.test.ts`.
7. Copy gate: «Збережемо, щойно з'явиться мережа» present in the runner (or its queued-state child).
8. `bash tasks/wave13-12-offline-wal-runner/verify.sh` exits 0.

## Constraints / decisions
- Exactly-once is a SERVER property (namespaced clientEventId idempotency); the client is allowed to
  double-send but never to re-mint an id for the same attempt.
- `reviewedAt` is captured at answer time from the client clock — the server clamps (wave13-10);
  don't pre-clamp client-side.
- All idb work is async and non-blocking; failures are swallowed into the (c) fallback. No idb
  library dependency — raw IndexedDB, ~60 lines, keeps the client bundle light.
- The queued state replaces the inline error for NETWORK-class failures only; server-rejection
  responses (route reachable, item rejected) do not enqueue.
- Behavior-level proof (kill network → queue → reconnect → lands once) is wave13-19's Playwright E2E;
  THIS task's gates are structural + unit oracle + build.
- DESIGN: queued chip is quiet (muted token, no red); the action keeps its name — the option stays
  selected, feedback arrives when it arrives.
- HARD TASK (Model pin): retry semantics + two drain lanes + client-bundle discipline interact.

## Plan
- [x] wal.ts + sync-batch.ts + oracle test.
- [x] Runner catch-path change + queued copy.
- [x] offline-sync.tsx drain + (app) layout mount; sw.ts sync handler.
- [x] typecheck/test/build; verify.sh.

## Done
- [x] `lib/offline/sync-batch.ts` (pure batcher, default cap = REVIEW_SYNC_MAX_ITEMS) +
      `lib/offline/sync-batch.test.ts` (frozen oracle: 08/09/10-o'clock vectors → [[08,09],[10]],
      0→[], no-mutate, 51→50+1) + `lib/offline/wal.ts` (raw IndexedDB `ds-offline`/`wal`
      keyPath clientEventId; enqueueAnswer→boolean, listQueued, removeQueued, queuedCount; every
      export feature-detects indexedDB and resolves to a harmless fallback — never throws/rejects).
      typecheck 0, unit suite 46 files/517 tests green, vitest list includes sync-batch.test.ts,
      wal.ts server-graph grep gates clean.
- [x] Drain lanes (this tick): shared `lib/offline/drain.ts` (`drainReviewQueue`: listQueued →
      buildSyncBatches → POST /api/review-sync with same-origin credentials → removeQueued of
      `applied`/`rejected` acks; KEEPS everything on fetch failure or route nack `{ok:false}`;
      never rejects) called by BOTH lanes so they can't diverge. `components/offline-sync.tsx`
      (client, renders null): drains on mount + `window` "online", in-flight ref against concurrent
      drains, and when items REMAIN after a drain registers the one-shot Background Sync tag
      `"review-sync"` (guarded `"serviceWorker" in navigator` + `"sync" in registration` — register
      while offline is the point: the UA retries on reconnect even with the tab gone). Mounted in
      `app/(app)/layout.tsx`. `app/sw.ts` adds the `sync` listener (local minimal `SyncEvent`
      interface — Background Sync types absent from lib.webworker) → `event.waitUntil(
      drainReviewQueue())`. verify.sh PASS end-to-end (greps + typecheck + 517 unit tests +
      vitest list + build); eslint clean on all four touched files.
- [x] Runner wiring (components/test-runner.tsx): `submit()` catch now classifies the failure —
      `isNetworkFailure` (offline `navigator.onLine === false` OR fetch-transport `TypeError`) →
      `enqueueAnswer` with the attempt's ORIGINAL clientEventId + client-clock `reviewedAt`; enqueue
      success → calm queued chip «Збережемо, щойно з'явиться мережа» (muted/paper, role=status, cloud
      glyph — NOT the error treatment); enqueue false OR server rejection → existing submitError/
      «повторити» unchanged. Supersede hygiene: a later DIRECT success for the same question
      `removeQueued`s the ids this tab enqueued (walIdsRef), so a stale offline answer can't drain
      over fresher server state. Copy + enqueueAnswer greps green; eslint delta zero (apostrophe copy
      wrapped in a JS string literal to dodge react/no-unescaped-entities while keeping the literal
      greppable); typecheck 0, 517 unit tests green, `npm run build` green (no client-bundle leak —
      wal.ts's only cross-import is `import type` from lib/review-sync).

## Next
- (none — Goal met, verify.sh PASS; behavior-level offline round-trip proof belongs to wave13-19.)

## Artifacts
- lib/offline/sync-batch.ts, lib/offline/sync-batch.test.ts, lib/offline/wal.ts
- components/test-runner.tsx — catch-path WAL wiring + queued chip
- lib/offline/drain.ts — shared drain (both lanes)
- components/offline-sync.tsx — client drain lane (mounted in app/(app)/layout.tsx)
- app/sw.ts — Background Sync `sync` handler

## Log
- 2026-07-02 planner: task authored from spec §D (W10 clientEventId plumbing pays off).
- 2026-07-02 15:37 UTC ClPcs-Mac-mini: wrote lib/offline/sync-batch.ts (+frozen-oracle test) and
  lib/offline/wal.ts. WalItem = `import type { ReviewSyncItem }` from lib/review-sync (type-only,
  client-safe); batcher default cap imports REVIEW_SYNC_MAX_ITEMS so client chunks can never exceed
  the route's reject threshold. Sort uses Date.parse (no `new Date`). typecheck + full unit suite
  green; vitest list includes the test; wal.ts grep gates (4 fns, indexedDB, no server-graph
  tokens) verified. Next tick: runner catch-path wiring.
- 2026-07-02 15:44 UTC ClPcs-Mac-mini: wired the WAL into the runner (fix for the verify FAIL
  "queued-state copy missing"). NETWORK-vs-rejection classifier per Constraints (spec §D says
  "(network)" — a server action transport loss throws TypeError; a server rejection throws plain
  Error, and replaying a rejected item verbatim would be rejected again, so it stays on the retry
  lane). Queued chip mirrors the existing submitError chip's calm styling, muted not red. Added
  direct-success supersede (removeQueued of this tab's earlier queued ids for the question) — server
  eventId idempotency only guards SAME-id replays; a CHANGED-choice queued item draining after a
  newer direct answer would overwrite it otherwise. typecheck/517 tests/build green. verify.sh still
  red as expected at the next gate (offline-sync.tsx missing) — that's the next increment.
- 2026-07-02 15:49 UTC ClPcs-Mac-mini: wrote the drain lanes (fix for verify FAIL
  "components/offline-sync.tsx missing"). One shared `drainReviewQueue` in lib/offline/drain.ts —
  component lane AND sw sync lane call it, so keep/remove policy can't drift; a route nack
  `{ok:false}` (logged out) keeps items, same as transport loss. OfflineSync registers the
  Background Sync tag only when items remain post-drain (registering while offline is what makes
  the UA retry after the tab closes; tag registration is idempotent). TS note: Background Sync
  types are absent from BOTH lib.dom and lib.webworker — client uses a
  `ServiceWorkerRegistration & {sync?}` intersection, sw.ts declares a minimal local
  `interface SyncEvent extends ExtendableEvent`. verify.sh PASS (all 8 goal gates). Status → done.



## Verify
**Last verify:** PASS (2026-07-02T15:51:07Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T15:53:02Z)
