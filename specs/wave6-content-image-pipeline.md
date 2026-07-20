# Wave 6 — Official content + image pipeline (stable keys, swappable images, scoped windows)

Make official ПДР content + images load **properly and repeatably** into every learner window, with an
image-reference layer that is **re-import-safe and easy to swap**. Replace the brittle status quo where
`scripts/import-official.ts` rewrites every `imageUrl` (which silently reverted the restyle go-live) and
where `app/(app)/practice/page.tsx` lists off-category/withheld-demo topics as empty cards.

ARCHITECTURE (decided with the owner):
- Questions carry a STABLE `imageKey` (e.g. `1_7_0`), set once at import and never used as a file path.
- Images resolve through `GET /api/q-image/[key]` with precedence **manual-override ▸ approved-restyled ▸
  original**. Swapping an image = drop a file in the override tier (no DB change, no re-import). Re-import
  only sets `imageKey`, so it can NEVER clobber overrides or the restyle go-live again.
- Official content auto-loads on `db:seed` (idempotent); the 8 redundant lower-case demo topics are retired.

RULES (non-negotiable, from PLAN.md / CLAUDE.md):
- Keep new core logic PURE + UNIT-TESTED (no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`,
  no `Math.random`/`Date.now` in the pure fns); DB/fs orchestration lives in `lib/server/*` or route/seed.
- SCHEMA CHANGE → hand-author `prisma/migrations/<ts>_question_image_key/migration.sql` and apply with
  `prisma migrate deploy` (NEVER `migrate dev` — non-interactive-broken here), then `prisma generate`.
  The only change is an ADDITIVE nullable column; no data loss.
- Preserve Ukrainian copy, mobile-first design, the demo/legal positioning, and the pure/`lib/server` split.
- Idempotent: re-running `db:seed` / the loader yields the same final state, no dup rows, no unique errors.
- Tests on every valuable change; the final task runs `npm run build`.

## A. Schema — stable image key
- Add `Question.imageKey String?` (+ `@@index([imageKey])`) via an additive migration applied with
  `prisma migrate deploy`; regenerate the client. `prisma/schema.prisma` change is ONLY this column/index.
- `npm run typecheck` exits 0; the migration directory exists and `prisma migrate status` is up to date.

## B. Image resolver + API route
- PURE helper (e.g. `lib/image-resolve.ts` — `imageCandidatePaths(key)`) → the ORDERED candidate file list
  for a key across the three tiers (override ▸ restyled-live ▸ original), with extension handling
  (.png/.jpeg/.jpg/.svg) and key sanitization (reject `/`, `..`, backslash, empty → no path traversal).
  Pure; UNIT-TESTED (precedence order; extension variants; traversal/garbage key rejected).
- Server resolver (`lib/server/*`) picks the first candidate that exists on disk.
- `app/api/q-image/[key]/route.ts`: returns the best-available image (serve bytes or redirect to the static
  path) with the correct content-type and a cache header; **404** when no tier has the key. Node runtime.
- INTEGRATION/route TEST: a key present only as original resolves to it; adding an override tier file wins
  over original; an unknown/garbage key → 404; a traversal key (`..%2f`) is rejected.
- typecheck + `npm test` + `npm run test:integration` pass.

## C. Render integration
- A single helper `resolveImageSrc(question)` (pure): returns `/api/q-image/${imageKey}` when `imageKey` is
  set, else `safeImageUrl(imageUrl)`, else null. Unit-tested for all three branches.
- Wire it wherever a question image renders (at least `components/test-runner.tsx`; check admin preview).
  `safeImageUrl` already permits root-relative `/api/...` — confirm, no weakening.
- typecheck + `npm test` pass.

## D. Importer — set keys, never clobber served files
- `scripts/import-official.ts` sets `imageKey` (the image basename without extension, e.g. `1_7_0`; SVG keys
  likewise) on every imported question. It NO LONGER needs to own the served `imageUrl` path — drop (or
  leave null) the hardcoded `/official-images/...` write in favour of `imageKey` + the resolver.
- Re-running the importer is idempotent and changes NEITHER the override tier NOR the restyle-live tier.
- A re-import after a restyle go-live leaves restyled images still live (proven in a test or a documented
  check). `npm run typecheck` passes; importer exits 0 and reports counts.

## E. Restyle go-live → resolver tier (no DB mutation)
- Rework `scripts/restyle/golive.mjs apply` to publish an APPROVED restyled image by placing it in the
  resolver's restyled-live tier (a dedicated dir the resolver checks, e.g. `public/restyled-live/<key>.png`),
  NOT by flipping `Question.imageUrl`. `revert` removes it from that tier. `status` reports tier contents.
- Only `state.json`-APPROVED images go live (the approval gate is preserved); unapproved restyled PNGs in
  `public/restyled/` are NOT served.
- After `apply`, the resolver serves the restyled image for those keys; after `revert`, the original. A
  re-import does not change this. (Manual/script task — no app unit test required, but leave it working.)

## F. Seed — auto-load official + retire demo topics
- `npm run db:seed` loads the demo scaffold AND the official content (idempotent; reuse the importer), so a
  fresh DB has official questions+images with `imageKey` set. Re-seed is idempotent (same counts twice).
- Retire the 8 redundant lower-case demo topics so they do NOT surface as separate topics in any learner
  window — re-home the demo questions under their official CAPS-topic equivalents OR deactivate the demo
  topics. PRESERVE the 25 demo questions themselves (the wave3 `seed-content.integration.test.ts` invariant
  still needs ≥24 published `isDemo` questions, exactly-one-correct, `sourceType=DEMO`) and keep one-correct.
- `npm run db:seed` exits 0 reporting official load (≥1000 official Qs) + ≥24 demo Qs; `npm run typecheck` 0;
  `npm run test:integration` 0 (the seed-content invariant + all suites still green).

## G. Windows — category-scoped, servable-only
- `app/(app)/practice/page.tsx`: list ONLY topics that have ≥1 SERVABLE question for the user's selected
  category — apply the engine's demo rule (`SERVE_DEMO_QUESTIONS ? {} : { isDemo:false }`) to the per-topic
  count so it matches what `TOPIC_PRACTICE` will actually serve. Off-category and withheld-demo topics no
  longer render. The per-topic count equals the startable pool size (no "N пит" that then starts empty).
- Apply the same servable+category scoping to any other theme/topic picker (topic exam if present). Images
  on these surfaces resolve via `resolveImageSrc`.
- A category-B run shows only its real topics (each with count > 0 and startable); MIXED_PRACTICE still works.
- typecheck + `npm test` + `npm run test:integration` pass.

## H. Wave-6 acceptance gate (verify-only, final task)
- No new feature code. PASS only if all hold; on any failure record it and reopen the failing upstream task:
  1. `npm run typecheck` exits 0.
  2. `npm test` exits 0, ZERO failures, includes the new resolver/render unit tests.
  3. `npm run db:seed` exits 0 (official ≥1000 + demo ≥24), then `npm run test:integration` exits 0, ZERO
     failures, includes the new q-image route test.
  4. `npm run build` exits 0.
  5. Migration applied: `Question.imageKey` exists; `prisma/schema.prisma` diff is ONLY the column+index.
  6. Static: `imageCandidatePaths` + `resolveImageSrc` exported and PURE; `app/api/q-image/[key]/route.ts`
     exists; `practice/page.tsx` filters topics by servable+category; importer sets `imageKey`.

## Out of scope
- No payments/auth/redesign; no new test MODE; no change to other modes' selection behaviour.
- No new image GENERATION / restyling work (the `.content-import` and restyle pipelines stay as-is; we only
  change how already-produced images are REFERENCED/served).
- No remote/CDN storage migration (the resolver leaves room for it later, but tiers stay local `public/`).
