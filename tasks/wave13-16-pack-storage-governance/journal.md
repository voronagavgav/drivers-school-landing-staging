# Task: wave13-16-pack-storage-governance

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
Storage governance (spec §E): the 50MB cap, an honest usage meter + per-topic delete in Профіль,
and small auto-cached Mistakes/Saved packs. PASS = ALL true:

1. PURE budget check in `lib/offline/pack-budget.ts`:
   `OFFLINE_PACK_BUDGET_BYTES = 52428800` (50 MiB) and
   `canDownload(usageBytes, estimateBytes, budget = OFFLINE_PACK_BUDGET_BYTES): boolean`.
   ORACLE unit test (`lib/offline/pack-budget.test.ts`, frozen literals):
   - `canDownload(51380224, 2097152)` → `false`  (49 MiB used + 2 MiB > 50 MiB)
   - `canDownload(10485760, 2097152)` → `true`   (10 MiB + 2 MiB)
   - `canDownload(50331648, 2097152)` → `true`   (48 MiB + 2 MiB — boundary, sum === budget passes)
   - `canDownload(0, 62914560)` → `false`        (single 60 MiB pack refused)
2. `downloadPack` (lib/offline/packs.ts) refuses when `canDownload` fails, returning
   `{ ok: false, reason: "budget" }`; the /progress dialog surfaces the honest copy containing
   «ліміт 50 МБ» and points at deletion in Профіль.
3. /account gains an «Офлайн-пакети» Card (client): a usage meter with the literal shape «X з 50 МБ»
   (X = real `packsUsageBytes()` rounded to one decimal), one row per stored pack (title, size in МБ,
   a «Видалити» button calling `deletePack`), and the empty state
   «Поки нічого не завантажено — оберіть тему на сторінці Прогрес».
4. Mistakes/Saved auto-cache: a small client effect on /mistakes and /saved silently runs
   `downloadPack("mistakes"|"saved")` when storage is available AND its estimate ≤ 5242880 bytes
   (5 MiB) AND the budget allows; it re-downloads on revisit (same key overwrites — usage never
   double-counts; image entries for keys no longer in the pack are pruned on overwrite); it NEVER
   shows a dialog, blocks paint, or surfaces errors (idle effect, catch-all swallow).
5. Grep gates: `Офлайн-пакети`, `з 50 МБ`, `Видалити`, the empty-state literal, `ліміт 50 МБ`,
   `OFFLINE_PACK_BUDGET_BYTES`.
6. `npm run typecheck` + `npm test` + `npm run build` exit 0; `npx vitest list` (var-captured)
   includes `lib/offline/pack-budget.test.ts`.
7. Browser smoke: login → /account → eval main textContent contains «Офлайн-пакети».
8. `bash tasks/wave13-16-pack-storage-governance/verify.sh` exits 0.

## Constraints / decisions
- The meter counts OUR stored `sizeBytes` (idb truth), not `navigator.storage.estimate()` (which
  includes unrelated origin storage and lies differently per browser) — honest AND deterministic.
- Deletion framing is calm and reversible («можна завантажити знову») — deleting a pack loses no
  learning data (reviews are server-side).
- Auto-cache uses the SAME primitives (downloadPack with the mistakes/saved scopes) — no parallel
  machinery; its packs appear in the meter/rows like any topic pack.
- DESIGN CRAFT: the meter is quiet numbers, not an alarm bar; «Видалити» is a small secondary action
  per row; empty state invites (link to /progress); no red until the budget refusal moment.
- Non-Goals: offline playback (wave13-17); eviction policies beyond manual delete (explicit manual
  control IS the policy this wave).

## Plan
- [x] pack-budget.ts + oracle test; wire refusal into downloadPack + dialog copy.
- [x] /account card (meter/rows/delete/empty state); auto-cache effects; verify.sh.

## Done
- [x] `lib/offline/pack-budget.ts` (pure: `OFFLINE_PACK_BUDGET_BYTES = 52428800`, `canDownload` with
      inclusive boundary) + `lib/offline/pack-budget.test.ts` (all four frozen vectors, 5 tests green).
- [x] Budget refusal wired into `downloadPack` (packs.ts): `canDownload(usage, totalBytes)` before any
      bytes move, `{ ok: false, reason: "budget" }` on refusal; usage EXCLUDES a same-scope stored row
      (overwrite replaces bytes, never adds — Goal §4 no-double-count). Dialog (topic-pack-download.tsx)
      gained the `budget` failure branch: «Не вистачає місця — ліміт 50 МБ. Видаліть непотрібні пакети
      у Профілі…», download button disabled (not retryable until space is freed).
- [x] /account «Офлайн-пакети» Card (Goal §3): `components/offline-packs-card.tsx` (client) — meter
      «X з 50 МБ» from `packsUsageBytes()` (one decimal, Ukrainian comma), one row per pack (title,
      «X,X МБ», ghost «Видалити» → `deletePack` + refresh), empty state «Поки нічого не завантажено —
      оберіть тему на сторінці Прогрес» with a /progress link; mounted on account/page.tsx.
- [x] Mistakes/Saved auto-cache (Goal §4): `components/offline-auto-cache.tsx` (client, renders null) —
      idle-scheduled (requestIdleCallback, setTimeout fallback) effect that feature-detects
      indexedDB+caches, checks `estimatePack(scope).totalBytes ≤ 5242880`, then runs the literal
      `downloadPack("mistakes")`/`downloadPack("saved")` (budget gate + same-key overwrite + image
      pruning all inside the shared primitive); catch-all swallow, no dialog. Mounted on
      /mistakes and /saved only when the set is non-empty (an empty pack would just clutter the meter).
- [x] Goal §7 browser smoke: login (user@drivers.school) → /account → eval main textContent contains
      «Офлайн-пакети» AND «з 50 МБ» → true (localhost:3100, fresh-build server).
- [x] Evaluation-REJECT fix (Goal §4 pruning): `downloadPack` now prunes ds-pack-images entries for
      keys the OLD same-scope row referenced that the new pack no longer contains — after the row
      write (durability: a failed overwrite never strands the still-listed old pack), keeping keys
      any OTHER stored pack references (scope overlap), catch-all swallow.

## Next
- (none — Goal fully met; verify.sh PASS after the §4 pruning fix. Offline playback is
  wave13-17; deeper offline E2E is wave13-19.)

## Artifacts
- lib/offline/pack-budget.ts — budget law
- lib/offline/pack-budget.test.ts — frozen oracle vectors
- lib/offline/packs.ts — downloadPack budget gate (`reason: "budget"`) + overwrite image pruning (§4)
- components/topic-pack-download.tsx — «ліміт 50 МБ» refusal copy in the /progress dialog
- components/offline-packs-card.tsx — «Офлайн-пакети» card (meter/rows/delete/empty state)
- app/(app)/account/page.tsx — mounts OfflinePacksCard
- components/offline-auto-cache.tsx — silent idle auto-cache effect (Goal §4)
- app/(app)/mistakes/page.tsx, app/(app)/saved/page.tsx — mount OfflineAutoCache when non-empty

## Log
- 2026-07-02 planner: task authored from spec §E (50MB cap, honest meter, small auto-cache).
- 2026-07-02 16:32 UTC ClPcs-Mac-mini: wrote lib/offline/pack-budget.ts (52428800 cap, canDownload
  with `<=` boundary) + pack-budget.test.ts mirroring sync-batch.test.ts (frozen literals, @/lib
  import per gate style). `npx vitest run lib/offline/pack-budget.test.ts` → 5 passed; typecheck green.
- 2026-07-02 16:36 UTC ClPcs-Mac-mini: fixed the verify FAIL (downloadPack must consult canDownload) —
  packs.ts now gates on `canDownload` after estimate/before image writes, new `"budget"` reason in
  DownloadResult; deviated from the planned `packsUsageBytes()` call: usage is summed via listPacks()
  EXCLUDING the same-scope row, so a re-download of a stored pack isn't double-counted against the cap.
  topic-pack-download.tsx surfaces the «ліміт 50 МБ» copy + disables the confirm on budget refusal.
  Gates 15/16 grep green; typecheck OK; `npm test` 47 files passed. Remaining reds are unbuilt items
  (account card, auto-cache).
- 2026-07-02 16:39 UTC ClPcs-Mac-mini: fixed the verify FAIL (`account card heading missing`) — built
  `components/offline-packs-card.tsx` (client, post-hydration IndexedDB read per components/CLAUDE.md;
  meter «X з 50 МБ» via packsUsageBytes(), one-decimal Ukrainian comma; rows sorted localeCompare "uk"
  with ghost «Видалити» → deletePack→refresh; empty state links «Прогрес»→/progress; no alarm bar, no
  red) and mounted it on app/(app)/account/page.tsx after Конфіденційність. Card greps (verify lines
  18–21) green; typecheck + 522 unit tests + `npm run build` green. Remaining red: auto-cache gates
  (downloadPack("mistakes"/"saved") effects) — next increment.
- 2026-07-02 16:44 UTC ClPcs-Mac-mini: fixed the verify FAIL (`mistakes auto-cache missing`) — built
  components/offline-auto-cache.tsx (idle effect: requestIdleCallback w/ setTimeout fallback, cancel
  on unmount; estimatePack ≤ 5 MiB gate; literal per-scope downloadPack("mistakes")/("saved") dispatch
  so the verify grep matches real code, not a comment; catch-all swallow) and mounted it on
  /mistakes + /saved gated on set non-emptiness. `bash verify.sh` → PASS wave13-16 (greps, typecheck,
  test, vitest list, build). Then Goal §7: killed the stale next-server (build had replaced .next
  under it, per CLAUDE.md stale-server trap), relaunched `npm run start -- -H 0.0.0.0 -p 3100`,
  agent-browser login → /account → main.textContent.includes("Офлайн-пакети") === true. All Goal
  items met → Status: done.
- 2026-07-02 16:49 UTC ClPcs-Mac-mini: fixed the evaluator REJECT (§4 overwrite pruning absent) —
  packs.ts `downloadPack` captures the previous same-scope StoredPack while summing usage, and after
  a successful row put deletes cached image URLs for keys in the OLD pack but absent from the new
  one AND from every other stored pack (mirrors deletePack's keep-set; pruned post-write so a failed
  overwrite can't strand a listed pack without images; try/catch swallow). verify.sh → PASS wave13-16
  (greps, typecheck, 522 unit tests, vitest list, build). Restarted the :3100 next-server against the
  fresh build (stale-server trap). Status: done.




## Verify
**Last verify:** PASS (2026-07-02T16:51:24Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T16:52:48Z)
