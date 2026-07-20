# Task: wave13-06-qimage-negotiation

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
Content negotiation INSIDE the existing `/api/q-image/[key]` resolver (spec §C): `?w=` + Accept-driven
format, serving the wave13-04 prebaked variants, graceful per-key degradation, the stable key
sacrosanct. PASS = ALL true:

1. PURE part in `lib/image-resolve.ts` (module stays runtime-agnostic — no fs/server imports; mind
   the whole-file purity greps: never write the forbidden tokens even in comments):
   exports `IMAGE_VARIANT_WIDTHS` = `[360, 540, 720] as const` and
   `negotiateImageVariant(accept: string | null, w: string | null): { width: 360|540|720, format: "avif"|"webp" } | null`.
2. ORACLE (frozen at plan time — `lib/image-resolve.test.ts` asserts EXACTLY these eight vectors,
   hand-computed from the negotiation rules):
   - `negotiateImageVariant("image/avif,image/webp,image/*,*/*;q=0.8", "540")` → `{ width: 540, format: "avif" }`
   - `negotiateImageVariant("image/webp,image/apng,image/*,*/*;q=0.8", "540")` → `{ width: 540, format: "webp" }`
   - `negotiateImageVariant("*/*", "540")` → `null`  (no explicit avif/webp support → original)
   - `negotiateImageVariant(null, "540")` → `null`
   - `negotiateImageVariant("image/avif", "541")` → `null`  (width not in the whitelist)
   - `negotiateImageVariant("image/avif", null)` → `null`  (no w param → original, unchanged behavior)
   - `negotiateImageVariant("image/avif,image/webp", "360")` → `{ width: 360, format: "avif" }`
   - `negotiateImageVariant("text/html,image/webp", "720")` → `{ width: 720, format: "webp" }`
3. Server part in `lib/server/image-resolve.ts`: `resolveVariantDiskPath(key, width, format)` returns
   the absolute path of `public/img-cache/<key>-<width>.<format>` IFF the file exists AND the resolved
   path passes the same PUBLIC_DIR containment re-check; `null` otherwise.
4. Route behavior (`app/api/q-image/[key]/route.ts`): when negotiation is non-null AND the variant
   exists AND the base key still resolves via the UNCHANGED `resolveImageDiskPath` tier walk (a
   variant is never served for a key whose original has been retired), respond with the variant bytes,
   `Content-Type: image/avif` or `image/webp`, and
   `Cache-Control: public, max-age=31536000, immutable`. In EVERY other case (no w, invalid w, no
   Accept support, variant missing) the existing original path runs byte-identically
   (`max-age=3600`, no `immutable`) — a missing variant NEVER 404s a valid key.
5. Traversal/garbage keys still 404 exactly as before (`isSafeKey` path untouched; `?w`/`Accept`
   cannot bypass it).
6. `npm test` exits 0 AND `npx vitest list` (captured to a var first — SIGPIPE trap) includes
   `lib/image-resolve.test.ts`.
7. `npm run typecheck` exits 0.
8. `bash tasks/wave13-06-qimage-negotiation/verify.sh` exits 0.

## Constraints / decisions
- Accept parsing is deliberate token containment (`accept.includes("image/avif")`), NOT full RFC-9110
  q-value parsing — browsers that send `image/avif` accept it; `q=0` edge cases are ignored
  (documented in the module comment). avif wins over webp when both are present.
- `?f=` explicit format param (mentioned in 05-tech-architecture §4.5) is NOT implemented — Accept
  covers real browsers; smaller surface (Non-Goal; revisit only if packs need it — they don't:
  the browser sends Accept on `fetch` too).
- Variants are immutable BY CONSTRUCTION (content-addressed key + fixed width/format from a bake);
  the ORIGINAL stays `max-age=3600` because overrides can change a key's image (existing comment).
  Note the asymmetry: an override change means a STALE baked variant can be served for up to a
  redeploy — acceptable; the prebake (idempotent, mtime-based) refreshes variants on the next run.
  Record this in the route comment honestly.
- Do NOT touch the loader, DB, or `resolveImageSrc` (srcset is wave13-08).

## Plan
- [x] Pure negotiate fn + the 8 oracle vectors as unit tests (write tests FIRST from the table).
- [x] resolveVariantDiskPath + route wiring; typecheck; verify.sh.

## Done
- [x] Eight frozen oracle vectors appended to the EXISTING `lib/image-resolve.test.ts` (file predates
      this task — extended, not created) + an `IMAGE_VARIANT_WIDTHS` whitelist assertion; tests run
      red first, then `IMAGE_VARIANT_WIDTHS`/`negotiateImageVariant` implemented in
      `lib/image-resolve.ts` (token-containment Accept parse, avif > webp, exact-string width match).
      31/31 file tests, 496/496 full unit suite, typecheck green. Purity kept (no forbidden tokens).
- [x] `resolveVariantDiskPath(key, width, format)` added to `lib/server/image-resolve.ts`
      (`public/img-cache/<key>-<width>.<format>`, PUBLIC_DIR containment re-check + existsSync);
      route wires `negotiateImageVariant(accept, ?w)` AFTER the unchanged `resolveImageDiskPath`
      tier walk (retired key ⇒ 404 before any variant lookup), serves variant bytes with
      `image/<format>` + `max-age=31536000, immutable`, and falls through to the byte-identical
      original path (`max-age=3600`) on ANY miss incl. a read race. verify.sh PASS
      (496/496 tests, typecheck green, vitest list includes image-resolve.test.ts).

## Next
- [ ] Nothing — Goal met (verify.sh PASS 2026-07-02 13:37 UTC). Route-level integration coverage
      is the separate task wave13-07-qimage-negotiation-itest.

## Artifacts
- lib/image-resolve.ts — `IMAGE_VARIANT_WIDTHS` + `negotiateImageVariant` added (pure)
- lib/image-resolve.test.ts — 8 frozen oracle vectors + whitelist assertion appended
- lib/server/image-resolve.ts — `resolveVariantDiskPath` added
- app/api/q-image/[key]/route.ts — negotiation wired; variant branch + unchanged original path

## Log
- 2026-07-02 planner: task authored from spec §C; oracle vectors frozen before implementation exists.
- 2026-07-02 16:35 UTC ClPcs-Mac-mini: increment 1 — appended the 8 frozen vectors to the
  pre-existing lib/image-resolve.test.ts (red first), implemented IMAGE_VARIANT_WIDTHS +
  negotiateImageVariant in lib/image-resolve.ts. 31/31 file, 496/496 suite, typecheck green.
  Note: `*/*` can't appear inside a TS block comment (closes it) — wrote "star-slash-star" in the
  doc comment; the literal lives only in the test string, which verify.sh greps.
- 2026-07-02 13:37 UTC ClPcs-Mac-mini: increment 2 (fixes last verify FAIL "resolveVariantDiskPath
  missing" — that gate WAS the pending increment) — added resolveVariantDiskPath to
  lib/server/image-resolve.ts and wired negotiation into app/api/q-image/[key]/route.ts: base tier
  walk first (isSafeKey/404 path untouched), variant branch only on non-null negotiation + existing
  file, immutable Cache-Control on variants, original serve path byte-identical, variant read race
  falls through to original. verify.sh PASS. Status → done.


## Verify
**Last verify:** PASS (2026-07-02T13:38:13Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T13:39:25Z)
