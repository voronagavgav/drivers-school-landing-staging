# Task: wave6-01-investigate-image-content-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
INVESTIGATION ONLY — produce a findings doc, change NO product code. Pass = all true:
1. File `tasks/wave6-01-investigate-image-content-surfaces/FINDINGS.md` exists and documents each item
   below with concrete `path:line` references.
2. FINDINGS lists every place a question image is rendered today (at minimum `components/test-runner.tsx`,
   `app/(app)/test/[id]/page.tsx`, and the admin question editor/preview) and how each gets its src
   (currently `safeImageUrl(q.imageUrl)`), plus how `getSessionState`/`lib/server/test-engine.ts` selects
   the per-question fields passed to the renderer.
3. FINDINGS records the current image produce/serve chain: `scripts/import-official.ts` writes
   `imageUrl=/official-images/<file>` AND copies bytes into `public/official-images/`;
   `scripts/restyle/golive.mjs` flips `Question.imageUrl` to `/restyled/<base>.png` via raw sqlite;
   restyled bytes live in `public/restyled/`, approvals in `scripts/restyle/state.json`.
4. FINDINGS records resolver design inputs: the three tiers (override ▸ restyled-live ▸ original), a
   PROPOSED directory name for each tier under `public/` (e.g. override `public/image-overrides/`,
   restyled-live `public/restyled-live/`, original `public/official-images/`), and the actual extension
   set seen across `public/official-images/` and `public/restyled/` (.png/.jpeg/.jpg/.svg).
5. FINDINGS records seed/test constraints: `prisma/seed.ts` is demo-only and prints
   `Done. N demo questions, M topics…`; `lib/server/seed-content.integration.test.ts` currently asserts
   EVERY published question is `isDemo`/`sourceType=DEMO` (note that this WILL break once seed loads
   official content); `SERVE_DEMO_QUESTIONS=false` (`lib/constants.ts`); the engine `demoWhere` filter
   (`lib/server/test-engine.ts`); and the exact 8 lowercase demo topic titles in `prisma/seed.ts`'s `TOPICS`.
6. FINDINGS records the migration directory naming pattern under `prisma/migrations/` and the Prisma-7
   ritual (hand-author `migration.sql` + `prisma migrate deploy`, NEVER `migrate dev`; then `prisma generate`).
7. FINDINGS ends with a short "downstream impact + ordering risks" paragraph naming tasks 02–10.

## Constraints / decisions
- Read-only investigation. Do NOT edit schema, scripts, components, or seed — only write FINDINGS.md.
- Prefer concrete `path:line` citations over prose; later tasks rely on these.
- Surface options + facts; do NOT lock final implementation choices.

## Plan
- [x] Grep `imageUrl`/`safeImageUrl` across `components/`, `app/`, `lib/server/`; record render surfaces.
- [x] Read importer + golive + restyle `state.json`; document produce/serve chain + extensions.
- [x] Read seed + seed-content test + constants + test-engine; document seed/demo constraints.
- [x] Write FINDINGS.md tier-design section (3 tiers + proposed dirs) + migration ritual + downstream-impact paragraph.

## Done
- [x] Grepped `imageUrl`/`safeImageUrl` across `components/`, `app/`, `lib/server/`; wrote FINDINGS.md §1
      (render surfaces) with `path:line` citations for the runner, test page, `getSessionState`, admin
      editor/preview, admin write/list paths, and the tests that pin `imageUrl` semantics.
- [x] Read `scripts/import-official.ts` + `scripts/restyle/golive.mjs` + `scripts/restyle/state.json` and
      listed `public/official-images/` (734: 629 .jpeg/104 .png/1 .svg) + `public/restyled/` (77 .png);
      wrote FINDINGS.md §2 (produce/serve chain) with `path:line` citations — importer image+SVG branch,
      golive apply/revert/status (raw sqlite), state.json shape (60 exact "approved" + freeform notes),
      and the extension set {.png,.jpeg,.jpg(defensive),.svg}. Flagged two downstream gotchas:
      importer's stale "image questions deferred" header comment, and golive's exact `s==='approved'`
      filter skipping note-valued (human-approved) statuses.
- [x] Read `prisma/seed.ts` + `lib/server/seed-content.integration.test.ts` + `lib/constants.ts` +
      `lib/server/test-engine.ts`; wrote FINDINGS.md §3 (seed/demo constraints) with `path:line` cites:
      demo-only seed (`isDemo:true`/`DEMO`, no `imageUrl`; 25 Qs/8 topics/8 cats/3 users; `Done.` print
      `prisma/seed.ts:492`); the seed-content test asserting EVERY published Q is demo (`:35-36`) and WHY
      task 08 breaks invariant (c); `SERVE_DEMO_QUESTIONS=false` (`lib/constants.ts:46`) + `demoWhere`
      (`lib/server/test-engine.ts:60`) ⇒ live pools empty without official content; and the exact 8
      Title-Case demo topic titles (`prisma/seed.ts:28-37`) task 09 retires (vs official ALL-CAPS).

## Next
- DONE — investigation complete. FINDINGS.md §1–§6 all carry real content + `path:line` citations; verify.sh
  PASSES (9 terms + path:line check). Goal items 1–7 all met. No further increment for this task.
  Handoff for wave6 tasks 02–10: see FINDINGS.md §6 (downstream impact + ordering risks) — esp. 02 must land
  before 03/04/05/06 (schema+migration+generate); 08 must update seed-content test (c) in the same change;
  07 must decide on note-valued approvals; 10 must apply demoWhere to the per-topic count.

## Artifacts
- tasks/wave6-01-investigate-image-content-surfaces/FINDINGS.md — the investigation output

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T00:00Z ClPcs-Mac-mini: grepped imageUrl/safeImageUrl across components/, app/, lib/server/;
  read test-runner, test page, getSessionState (lib/server/test-engine.ts), admin question-editor +
  actions + list, and lib/sanitize. Created FINDINGS.md §1 (render surfaces) with path:line citations.
  Next ticks fill §2–§6 (produce/serve chain, seed constraints, tier design, migration ritual, downstream).
- 2026-06-23T09:04Z ClPcs-Mac-mini: read import-official.ts, restyle/golive.mjs, restyle/state.json;
  listed public/official-images/ (734 files: 629 .jpeg/104 .png/1 .svg) + public/restyled/ (77 .png).
  Wrote FINDINGS.md §2 (produce/serve chain + extension set) with path:line citations. All 9 verify-gate
  terms now grep PRESENT (official-images/restyled were the two missing → fixes the prior FAIL); path:line
  check passes. Status stays active: §3–§6 substance still owed (gate is shallow — required terms also
  appear inside the §3–§6 placeholder comment).
- 2026-06-23T09:40Z ClPcs-Mac-mini: read prisma/seed.ts, lib/server/seed-content.integration.test.ts,
  lib/constants.ts, lib/server/test-engine.ts (demoWhere). Wrote FINDINGS.md §3 (seed/demo constraints)
  with path:line cites: demo-only seed (25 Qs/8 topics/8 cats/3 users, no imageUrl, `Done.` print at :492);
  the seed-content test asserting every published Q is demo (:35-36) + WHY task 08 breaks invariant (c);
  SERVE_DEMO_QUESTIONS=false (constants:46) + demoWhere (test-engine:60) ⇒ live pools empty without official;
  the 8 Title-Case demo topic titles (seed:28-37) task 09 retires. Status stays active: §4–§6 owed next tick
  (the last content tick).
- 2026-06-23T10:18Z ClPcs-Mac-mini: read prisma/migrations/ (4 entries + migration_lock.toml) and two
  example migration.sql (test_answer_unique CREATE INDEX; analytics_granular_events nullable ADD COLUMN +
  CREATE INDEX). Wrote FINDINGS.md §4 (three tiers override▸restyled-live▸original + proposed dirs
  public/image-overrides//public/restyled-live//public/official-images/; extension set ref §2d; pure/server
  resolver split for tasks 03–05), §5 (migration dir naming `<14-digit ts>_<name>/migration.sql`, sqlite lock,
  the ADD COLUMN+CREATE INDEX template for task 02, Prisma-7 migrate-deploy ritual), §6 (downstream impact
  paragraph naming tasks 02–10 + 6 ordering risks). verify.sh PASS (9 terms + path:line). Goal 1–7 met →
  Status: done. Added one CLAUDE.md learning (SQLite one-ADD-COLUMN-per-ALTER + migration dir-naming format).


## Verify
**Last verify:** PASS (2026-06-23T09:12:51Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T09:14:37Z)
