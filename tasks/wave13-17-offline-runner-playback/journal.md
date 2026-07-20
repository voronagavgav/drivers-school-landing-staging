# Task: wave13-17-offline-runner-playback

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
Cached topics playable offline through the WAL path (spec §E last bullet). A client-only runner over
IndexedDB packs; answers sync as SESSIONLESS reviews. PASS = ALL true:

1. `/~offline` (app/~offline/page.tsx) replaces its packs-slot sentence with a client pack list from
   `listPacks()`: each pack links to `/offline-practice?pack=<id>`; zero packs → the existing
   invitational empty state (keep «Завантажені теми» as the list heading).
2. `app/offline-practice/page.tsx` — a client runner OUTSIDE the authed shell (no auth/DB imports;
   grep gate as in wave13-02): reads `?pack=` from searchParams, loads the pack from IndexedDB,
   plays its questions with immediate feedback computed from the cached `isCorrect` +
   `explanationText`, images via `/api/q-image/<key>?w=540` (Cache Storage / SW-served offline).
   Heading literal: «Офлайн-практика». Unknown/missing pack → calm state linking back to `/~offline`.
3. Both `/~offline` and `/offline-practice` are precached (extend the wave13-03 precache entries) so
   the flow works with the network fully dead.
4. Every answered question enqueues a WAL item WITHOUT `sessionId`:
   `{ questionId, selectedOptionId, latencyMs, clientEventId (crypto.randomUUID), reviewedAt }` —
   the SAME `lib/offline/wal.ts` queue, drained by the SAME drain lanes (mount the drain component on
   the offline-practice page — it lives outside the (app) layout).
5. Sessionless lane server-side:
   - `lib/review-sync.ts`: `sessionId` becomes OPTIONAL in `reviewSyncItemSchema`;
   - `app/api/review-sync/route.ts`: an item WITHOUT sessionId is applied via a
     `prisma.$transaction` calling `recordReview(tx, { userId, questionId, topicId, correct,
     latencyMs, mode: "TOPIC_PRACTICE", testSessionId: null, clientEventId }, clampedReviewedAt)` —
     `correct` is computed SERVER-SIDE from the stored options vs `selectedOptionId` (the client's
     cached `isCorrect` is NEVER trusted); the question must be servable (published/active/
     non-archived) else the item is `rejected`. NO TestSession/TestAnswer row is created.
6. Integration coverage (extend `lib/server/review-sync.integration.test.ts` or a sibling file):
   a. sessionless item, correct option → 1 ReviewLog row (namespaced id), ReviewState reps = 1, and
      NO TestAnswer row created;
   b. the SAME item replayed → still 1 row, ReviewState unchanged (whole idempotency guard holds in
      the sessionless transaction too);
   c. sessionless item with a wrong option → ReviewLog row with `correct`/grade reflecting a lapse
      (assert `isCorrect false` on the log or reps/lapses accordingly);
   d. sessionless item for an UNPUBLISHED question → `rejected`, no rows.
7. `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build` all exit 0.
8. `bash tasks/wave13-17-offline-runner-playback/verify.sh` exits 0.

## Constraints / decisions
- NO TestSession is minted for offline practice: fabricating a server session for an offline run
  would pollute exam/practice stats with unverifiable data. Offline reviews land in the SRS lane
  ONLY (ReviewState/ReviewLog → mastery/readiness recompute at next real session). This is the
  honest scope; record it in UI copy if surfaced («зарахується в повторення»).
- The sessionless transaction must apply the SAME namespaced-id idempotency guard BEFORE
  recordReview (mirror submitAnswer's hoisted guard — recordReview's inner guard is the
  belt-and-suspenders second layer).
- Auth still gates sync: the drain POSTs with the session cookie; an expired session → items stay
  queued (`ok:false` keeps the queue) until a login happens. Don't silently drop on 401-shape.
- The offline-practice page reads NOTHING from the server at render (no RSC data): pack, images,
  progress are all client-side. It must never appear in the (app) nav.
- DESIGN CRAFT: reuse the runner's option/feedback visual language (components/ui patterns) so
  offline doesn't feel second-class; queued-sync state reuses the wave13-12 copy; reduced-motion
  respected; focus visible on options.
- HARD TASK (Model pin): client-only runner + precache + sessionless server lane must compose
  without breaking the session lane's semantics.

## Plan
- [x] Schema/route sessionless lane + integration cases (server first — testable without UI).
- [x] offline-practice client runner + /~offline pack list + precache entries.
- [x] Full gates; verify.sh.

## Done
- [x] sessionId optional in `reviewSyncItemSchema` + sessionless route branch
      (`applySessionlessReview`: $transaction, hoisted namespaced-id guard, server-computed
      correctness, servability check, recordReview with testSessionId:null) + unit test
      (sessionless item accepted) + integration case (a) (`(h)` in review-sync.integration.test.ts:
      1 ReviewLog w/ null testSessionId, reps=1, NO TestAnswer). typecheck/test/test:integration/build all green.
- [x] /~offline pack list (Goal §1, fixes the verify FAIL): `app/~offline/pack-list.tsx` client
      component (`listPacks()` post-hydration, uk-sorted, plain `<a>` links to
      `/offline-practice?pack=<id>`, «Завантажені теми» heading, zero/unread → the invitational
      sentence) mounted in the page's packs slot. Gate 1 green; typecheck + 523 unit + build green.
- [x] `app/offline-practice` client runner (Goal §2, fixes the verify FAIL «page.tsx missing»):
      static server page.tsx (metadata + local SvitlykSprite + OfflineSync drain mount + Wordmark
      header) + "use client" runner.tsx (`?pack=` via window.location.search post-hydration,
      `listPacks()` lookup, missing/unknown → calm state linking /~offline, .opt radiogroup with
      roving tabindex + cached-isCorrect feedback + explanationText, sessionless `enqueueAnswer`
      WAL items, wave13-12 queued chip, images resolved via `caches.match` from ds-pack-images
      with network-URL fallback). Purity greps clean; typecheck + 523 unit + build green;
      /offline-practice prerenders Static (○).
- [x] Integration cases (i)/(j)/(k) = Goal §6 (b)/(c)/(d) in review-sync.integration.test.ts:
      (i) byte-identical sessionless batch replayed → still 1 ReviewLog, reps/stability unchanged,
      no TestAnswer; (j) wrong option on a fresh question → grade-1 (Again) log, lastGrade 1,
      state "learning", lapses 0 (first-ever Again is not a lapse per lib/fsrs/schedule.ts);
      (k) unpublished question → `rejected`, zero ReviewLog/ReviewState rows. Fixture bumped
      7→8 questions + a separate unpublished single-question fixture. verify.sh PASS.
- [x] Precache both routes (Goal §3, fixes the verify FAIL «/offline-practice not precached»):
      `/offline-practice` added to `additionalPrecacheEntries` in next.config.ts (same git-HEAD
      revision as `/~offline`). Gate green; typecheck + build green; emitted public/sw.js
      contains the /offline-practice precache entry.

## Next
- (none — Goal fully met; verify.sh PASS)

## Artifacts
- lib/review-sync.ts — sessionId now optional in the item schema
- app/api/review-sync/route.ts — sessionless lane (`applySessionlessReview`)
- lib/server/study.ts — RecordReviewParams.testSessionId widened to `string | null`
- lib/review-sync.test.ts, lib/server/review-sync.integration.test.ts — coverage
- app/~offline/pack-list.tsx — client pack list; app/~offline/page.tsx — mounts it in the packs slot
- app/offline-practice/page.tsx — static shell (metadata, OfflineSync drain mount)
- app/offline-practice/runner.tsx — the client runner (pack load, playback, sessionless WAL)
- next.config.ts — /offline-practice added to additionalPrecacheEntries (Goal §3)

## Log
- 2026-07-02T17:16Z ClPcs-Mac-mini: added the last three sessionless integration cases (Goal §6
  b/c/d) as (i)/(j)/(k) in review-sync.integration.test.ts — (i) replay no-op (shared batchH
  string, mirrors the (a)/(b) pattern), (j) wrong option → server-computed lapse (grade 1 on the
  log, lastGrade 1, state "learning", lapses 0 — a first-ever Again on a new card is not a lapse,
  per lib/fsrs/schedule.ts isLapse), (k) unpublished question → rejected + zero rows (own
  isPublished:false fixture). Fixture count 7→8. typecheck green; integration 122 passed (was
  119); full verify.sh PASS (typecheck + unit + integration + build). Goal fully met → Status: done.
- 2026-07-02 planner: task authored from spec §E; DECISION: no fabricated TestSession — SRS lane only.
- 2026-07-02T17:09Z ClPcs-Mac-mini: fixed the verify FAIL (gate «/offline-practice not precached»):
  next.config.ts `additionalPrecacheEntries` now lists BOTH `/~offline` and `/offline-practice`
  under the same git-HEAD revision. Gate grep green; typecheck + `npm run build` green; confirmed
  the emitted public/sw.js precache manifest contains "/offline-practice" (1 match). Remaining:
  integration cases (b)/(c)/(d) in review-sync.integration.test.ts.
- 2026-07-02T17:07Z ClPcs-Mac-mini: offline-practice runner landed (Goal §2, the verify FAIL).
  page.tsx = static server shell OUTSIDE (app) (metadata + SvitlykSprite + OfflineSync — the (app)
  layout's drain doesn't cover this route); runner.tsx = client runner. KEY: pack images live in
  the app-owned ds-pack-images cache which the SW's CacheFirst("q-images") lane never consults —
  a plain <img> would 404 offline, so PackImage resolves `caches.match(url)` (searches ALL caches)
  → blob objectURL, falling back to the network URL; failure → the runner's sign-silhouette
  placeholder. Answers lock practice-style, enqueue sessionless WAL items (guarded randomUUID
  ladder), queued chip reuses wave13-12 copy; done-state shows client tally + «зарахується в
  повторення». typecheck + 523 unit + build green; page builds Static (○). Next: precache entry.
- 2026-07-02T20:00Z ClPcs-Mac-mini: sessionless server lane landed — schema sessionId `.optional()`;
  route branches per item (`item.sessionId != null` → submitAnswer, else `applySessionlessReview`
  inline in route.ts so the verify $transaction/recordReview greps hit the gated file); correctness
  from stored options (skip/null = lapse, foreign optionId = rejected), unservable question = rejected;
  fixture bumped 6→7 questions, case (h) added. typecheck + 523 unit + 119 integration + build green.
- 2026-07-02T17:00Z ClPcs-Mac-mini: fixed the verify FAIL (gate 1 «/~offline must render the pack
  list»): new `app/~offline/pack-list.tsx` ("use client", `listPacks()` in a mount effect per the
  SSR-mismatch rule, uk `localeCompare` sort, plain `<a href="/offline-practice?pack=…">` rows —
  full document nav so the precached runner loads offline; null/empty → the original invitational
  sentence) replacing the PACKS SLOT paragraph in page.tsx. Gate 1 + typecheck + 523 unit + build
  green; verify.sh now stops at gate 2 (offline-practice missing — the next increment).





## Verify
**Last verify:** PASS (2026-07-02T17:17:42Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T17:19:52Z)
