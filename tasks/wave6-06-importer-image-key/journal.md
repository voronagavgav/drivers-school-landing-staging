# Task: wave6-06-importer-image-key

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec D — importer sets stable keys, never owns the served path. Pass = all true:
1. `scripts/import-official.ts` sets `imageKey` on every imported question that has an image (or SVG) — the
   key is the image BASENAME WITHOUT extension (e.g. `16_2_1_0.jpeg` → `16_2_1_0`; `foo.svg` → `foo`).
   Questions with no image leave `imageKey` null.
2. The importer NO LONGER writes a served `/official-images/...` path into `Question.imageUrl` — it either
   leaves `imageUrl` null or drops that write entirely (grep: no `imageUrl = `/official-images/` assignment
   into the created Question; the resolver + `imageKey` now own serving).
3. The importer STILL copies the original image/SVG bytes into the original tier `public/official-images/`
   (that dir IS the resolver's "original" tier — files must be present for `/api/q-image/<key>` to resolve).
4. Re-running the importer is idempotent: a second run exits 0, reports counts, and leaves the same final
   DB state (no dup ContentVersion/topics/questions) — verified by running it twice.
5. Re-import does NOT touch `public/restyled-live/` or `public/image-overrides/` (the importer must not
   `rm`/write those tier dirs). Prove a restyle go-live survives a re-import: with a file present in
   `public/restyled-live/<key>.png`, run the importer and confirm that file still exists afterward and the
   resolver still prefers it for `<key>` (the original-tier reset must be scoped to `public/official-images/`).
6. `npm run typecheck` exits 0; the importer exits 0 and prints its imported-count summary line.

## Constraints / decisions
- **Evaluate: yes** — the whole point of Wave 6 is that re-import can NEVER again clobber the restyle
  go-live or an override. The judge must confirm: (a) no `imageUrl` write to the served path, (b) the
  idempotent-cleanup `rmSync`/reset only ever touches `public/official-images/`, never the override or
  restyled-live tiers, and (c) re-import leaves a planted `restyled-live` file intact.
- Keep the existing official-content semantics: `sourceType=OFFICIAL`, `isDemo=false`, dedup, quarantine,
  explanations, category mapping, one-correct integrity check — change ONLY the image-reference behaviour.
- The importer must remain runnable under `tsx` with its OWN PrismaClient (never import `lib/db`).
- Set `imageKey` for BOTH the photo path (`q.image`) and the hand-authored SVG path (`questionSvgs[...]`).

## Plan
- [x] Replace the `imageUrl` computation with an `imageKey` computation (basename minus extension) for
      both the photo and SVG branches; keep the `copyFileSync` into `public/official-images/`.
- [x] Set `data.imageKey` (drop `data.imageUrl` served-path write) in `prisma.question.create`.
- [x] Re-run twice for idempotency; plant a `public/restyled-live/<key>.png` and re-run to prove survival.
- [x] typecheck.

## Done
- [x] Compute `imageKey` via `path.parse(...).name` (basename w/o ext) for BOTH the photo (`q.image`)
      and hand-authored SVG (`questionSvgs[...]`) branches; original bytes still `copyFileSync`'d into
      `public/official-images/`.
- [x] Write `imageKey` (not the served `/official-images/...` path) into `prisma.question.create`; no
      served-path `imageUrl` assignment remains.
- [x] Verified runtime: importer prints `imported 1691 official questions`; ran twice (1691 == 1691,
      idempotent); planted `public/restyled-live/__wave6probe__.png` survived BOTH imports (tier reset is
      scoped to `IMG_DEST_DIR`/`public/official-images` only). DB: 734 OFFICIAL questions carry an
      `imageKey`, 957 imageless stay null, 0 carry a served `imageUrl`; sample keys are basenames w/o ext
      (`1_1_0`, …). `npm run typecheck` exit 0; static grep gates pass.

## Next
- [ ] (none — Goal met; driver re-runs verify.sh, then the judge evaluates per Evaluate: yes.)

## Artifacts
- scripts/import-official.ts — sets imageKey (basename w/o ext, both photo + SVG branches), no longer
  writes served imageUrl; original-tier reset stays scoped to public/official-images/.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T00:00Z ClPcs-Mac-mini: replaced served `imageUrl` computation with `imageKey`
  (`path.parse(name).name`) for the photo + SVG branches; switched `question.create` to write `imageKey`.
  typecheck exit 0. Ran importer twice (1691==1691 idempotent), planted restyled-live probe survived both
  runs (tier-safe), DB shows 734 keyed / 0 served-imageUrl. Goal fully met → Status: done.

## Verify
**Last verify:** PASS (2026-06-23T09:59:16Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T10:01:21Z)
