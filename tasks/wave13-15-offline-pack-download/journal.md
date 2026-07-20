# Task: wave13-15-offline-pack-download

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
«Завантажити тему для офлайн» (spec §E client half): per-topic download with an honest size-confirm
dialog, pack JSON into IndexedDB, images into Cache Storage. PASS = ALL true:

1. `lib/offline/packs.ts` (client-safe: grep — no `@/lib/db`, `@/lib/auth`, `@/lib/rbac`,
   `server-only`) exports:
   - `estimatePack(scope)` → fetches `/api/offline-pack/<scope>` and returns
     `{ pack, totalBytes }` where totalBytes = `estimatedImageBytes` + the JSON byte length;
   - `downloadPack(scope)` → stores images FIRST (each distinct imageKey fetched as
     `/api/q-image/<key>?w=540` into `caches.open("ds-pack-images")`), writes the IndexedDB `packs`
     row LAST (db `ds-offline`, store `packs`, key = scope id; value = questions, title, scope type,
     `sizeBytes`, `savedAt`) — an interrupted download never leaves a listed-but-broken pack;
   - `listPacks()`, `deletePack(id)` (removes the idb row AND its cached image entries),
     `packsUsageBytes()` (sum of stored `sizeBytes`);
   - every export feature-detects `indexedDB` + `caches` and no-ops safely when absent.
2. /progress «Карта тем» topic rows gain a quiet per-topic affordance with
   `aria-label` containing «Завантажити для офлайн» (icon-button scale, never competing with the
   practice action). Tapping it opens a confirm dialog showing the size as «≈X МБ» (computed from
   `estimatePack` — REAL bytes, one decimal) with actions «Завантажити» / «Скасувати».
3. After a completed download the row affordance reflects the state (e.g. aria-label/title switches
   to «Доступно офлайн»), derived from `listPacks()` on mount — the action keeps its name through its
   flow.
4. Download failure → calm inline retry copy (no half-written pack — guaranteed by the
   images-then-index write order), never an unlabeled spinner death.
5. Grep gates: `Завантажити для офлайн`, `МБ`, `Скасувати`, `ds-pack-images`, `w=540` present in the
   new client files; `estimatePack` reads `estimatedImageBytes`.
6. `npm run typecheck` + `npm test` + `npm run build` exit 0.
7. Browser smoke: `$DRIVER_BROWSER_CMD` login → /progress → eval
   `!!document.querySelector('[aria-label*="Завантажити для офлайн"]')` → true (seeded user sees
   topic rows).
8. `bash tasks/wave13-15-offline-pack-download/verify.sh` exits 0.

## Constraints / decisions
- Images at w=540 only (spec: negotiated 540 variants; the browser's Accept picks avif/webp — the SW
  CacheFirst lane may also hold them; `ds-pack-images` is the durability guarantee independent of SW
  eviction).
- The 50MB budget gate is wave13-16 — this task ships download mechanics; keep `downloadPack`'s
  return shape extensible (`{ ok, reason? }`).
- Dialog = the ONE bold moment on the row's flow; the size number is the headline (honest sizes are
  the feature). Use the existing modal/dialog pattern from the runner's finish-confirm if present —
  match, don't invent.
- Mistakes/Saved auto-cache lands in wave13-16 on top of these primitives (scope strings already
  supported by the API).
- FRONTEND CRAFT: visible focus on the affordance + dialog actions; `prefers-reduced-motion`
  respected (no dialog animation needed); Ukrainian active verbs; errors direct («Не вдалося
  завантажити — спробуйте ще раз»), never vague.

## Plan
- [x] lib/offline/packs.ts primitives.
- [x] Row affordance + confirm dialog on /progress; states; verify.sh.

## Done
- [x] `lib/offline/packs.ts`: estimatePack (totalBytes = estimatedImageBytes + JSON byte length),
  downloadPack (images→`ds-pack-images` at `w=540` with an explicit avif/webp Accept header FIRST,
  idb `packs` row LAST; `{ok, reason?}` extensible), listPacks, deletePack (row first, then cached
  images minus keys other packs still reference), packsUsageBytes. All feature-detect + never throw.
- [x] Extracted `lib/offline/idb.ts` — shared `ds-offline` opener (DB_VERSION 1→2, creates `wal` +
  `packs` stores) + generic `withStore(storeName, …)`; wal.ts refactored onto it. Required: wal.ts's
  pinned `open(name, 1)` would throw VersionError the moment packs.ts upgraded the shared db to v2.

## Next
- (none — Goal met; verify.sh + browser smoke green)

## Artifacts
- lib/offline/packs.ts — pack storage primitives (estimate/download/list/delete/usage)
- lib/offline/idb.ts — shared ds-offline opener + withStore (v2: wal + packs stores)
- lib/offline/wal.ts — refactored onto idb.ts (no behavior change)
- components/topic-pack-download.tsx — icon-button + size-confirm dialog + states
- app/(app)/progress/page.tsx — TopicRow gains the trailing download affordance

## Log
- 2026-07-02 planner: task authored from spec §E (opt-in, honest sizes).
- 2026-07-02 16:19 UTC ClPcs-Mac-mini: wrote lib/offline/packs.ts (5 exports, images-first/idb-last
  durability order, per-pack image GC on delete keeps shared keys) + lib/offline/idb.ts (shared
  ds-offline v2 opener; wal.ts migrated off its pinned v1 open to avoid VersionError). Typecheck,
  517 unit tests, build all green; packs.ts grep gates (fn names, ds-pack-images, w=540,
  estimatedImageBytes, no server-graph tokens) dry-run clean. verify.sh stays red on the UI-copy
  greps until the /progress half lands (next increment).

- 2026-07-02 16:28 UTC ClPcs-Mac-mini: /progress UI half — components/topic-pack-download.tsx
  (icon-button, aria-label «Завантажити для офлайн: <тема>» → «Доступно офлайн: <тема>» after
  download / listPacks() on mount; confirm dialog on the runner's finish-confirm modal shell, honest
  «≈X,X МБ» headline (comma decimal, floor 0,1 so tiny packs never read 0,0), «Завантажити»/
  «Скасувати», reason-aware failure copy — retryable «Не вдалося завантажити — спробуйте ще раз» vs
  permanent «Цей браузер не підтримує офлайн-збереження»); TopicRow now flex row (practice form
  flex-1 + trailing icon-button). verify.sh PASS (greps+typecheck+517 tests+build). Browser: Goal-7
  smoke green on LAN origin; FULL flow proven on http://localhost:3100 (Cache Storage is
  secure-context-gated → LAN http origin has no `caches`, downloadPack correctly returns
  unsupported there): dialog size real, download ok, dialog closes, state flips + survives reload,
  ds-pack-images cache present. Status → done.


## Verify
**Last verify:** PASS (2026-07-02T16:30:15Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T16:31:46Z)
