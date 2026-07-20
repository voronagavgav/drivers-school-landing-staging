# Wave 7 — Question keys + idempotent upsert + easy replacement (official-only)

Implements `docs/CONTENT-ARCHITECTURE.md`. Give every question a STABLE key so content reloads UPSERT in
place (same id, dependencies reconciled, USER PROGRESS PRESERVED) instead of today's destructive
delete-recreate. Delete demo content (official-only). Add a corrections-override layer so local fixes
survive an upstream re-import. Folds in the already-shipped `imageKey` model.

RULES (from PLAN.md / CLAUDE.md — non-negotiable):
- New core logic PURE + UNIT-TESTED (no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`,
  no `Math.random`/`Date.now` in pure fns). DB orchestration in `lib/server/*` / the loader / the seed.
- SCHEMA CHANGE → hand-author `prisma/migrations/<14-digit ts>_<snake>/migration.sql`, ONE `ADD COLUMN`
  per `ALTER TABLE` (SQLite), additive nullable columns (data-preserving), apply via `prisma migrate
  deploy`, then `prisma generate`. NEVER `migrate dev` (non-interactive-broken here).
- Idempotent: re-running the loader / `db:seed` yields the same state, no dup rows, no unique errors.
- Preserve Ukrainian copy, legal positioning, the pure/`lib/server` split. Tests on every change; final
  task runs `npm run build`. Do NOT wipe the already-loaded official content or the image tiers
  (`public/official-images`, `public/restyled-live`, `public/image-overrides`).

## A. Schema — stable keys
- Add `Question.questionKey String? @unique` (+ index) and `QuestionOption.optionKey String? @unique`
  (+ index) via an additive migration applied with `prisma migrate deploy`; regenerate the client.
- `schema.prisma` change is ONLY these two columns + their indexes. `npm run typecheck` exits 0.

## B. Pure key helpers
- `lib/content-key.ts` (PURE): `questionKey(section, qnum)` → `q_<section>_<qnum>` (section keeps its
  sub-label form, e.g. `8.1`→`q_8_1` or a documented normalization), and `optionKey(questionKey, n)` →
  `<questionKey>__<n>` (1-based). Deterministic, no I/O. UNIT-TESTED (format, sub-section labels,
  collisions impossible for distinct inputs).
- typecheck + `npm test` pass.

## C. Corrections override (source-of-truth precedence)
- A PURE merge helper `applyOverride(planEntry, overrideEntry|null)` → the effective content, where a
  present override field WINS over the plan field (shallow per top-level field: text, options, answer,
  topic, categories, explanation, imageKey). UNIT-TESTED (override wins; absent override = plan unchanged;
  partial override merges).
- The loader reads `.content-import/overrides/<questionKey>.json` when present and applies it. Document the
  override file shape in `docs/CONTENT-ARCHITECTURE.md` (already drafted) — keep in sync if it changes.
- typecheck + `npm test` pass.

## D. Idempotent upsert loader (the core)
- Rewrite `importOfficial(prisma)` in `scripts/import-official.ts` to UPSERT by `questionKey` instead of
  clearing the prior ContentVersion + its questions:
  - Question: `upsert` by `questionKey` — existing row's `id` is PRESERVED (so all `TestAnswer`/
    `TestSessionQuestion`/`UserMistake`/`SavedQuestion` rows stay valid); set text/topic/categories/
    imageKey/difficulty/published/contentVersion from the (override-applied) source.
  - Options: reconcile by `optionKey` — upsert each option (id preserved → `TestAnswer.selectedOptionId`
    stays valid); DELETE only options whose key is no longer present (after re-pointing/removing answers
    is NOT needed because surplus options are ones nobody could have selected in the new set — but guard:
    only delete an option with no `TestAnswer` rows, else deactivate by leaving it; document the choice).
  - Explanation: upsert 1:1.
  - A question present before but absent from the new source set is DEACTIVATED (`isActive=false`,
    `isPublished=false`), NOT deleted — its history survives.
  - The loader NEVER deletes `TestAnswer`/`TestSessionQuestion`/`UserMistake`/`SavedQuestion`.
- Idempotent: running it twice in a row makes zero changes on the second run (assert counts identical).
- `npm run typecheck` 0; loader exits 0 and reports upserted/deactivated counts; every question still has
  exactly one correct option; `questionKey` + `optionKey` set on all official rows.

## E. Delete demo content (official-only)
- Remove the demo `TOPICS`/`QUESTIONS` from `prisma/seed.ts`; `db:seed` now creates categories + users +
  runs `importOfficial` ONLY (no demo questions/topics). Delete any orphaned demo topics from the DB path.
- Delete `lib/server/seed-content.integration.test.ts` (it guarded demo content, which no longer exists).
- Re-seed is idempotent; `db:seed` exits 0 reporting official-only (≥1000 questions, 0 demo questions).
- `npm run typecheck` 0; `npm run test:integration` 0 (no suite depends on demo questions existing — the
  self-provisioning suites create their own fixtures and are unaffected).

## F. Re-import-preserves-progress integration test (headline guarantee)
- New `lib/server/content-upsert.integration.test.ts`: seed/throwaway a user who has a `UserMistake` and a
  `SavedQuestion` and a `TestAnswer` (with a `selectedOptionId`) on a known official question; run
  `importOfficial` again; assert the question keeps the SAME id, the option keeps the SAME id, and all
  three user-progress rows STILL EXIST and still reference valid ids. Also assert an EDIT via an override
  file changes the question text in place while preserving those rows.
- `npm run test:integration` includes and passes this file.

## G. Wave-7 acceptance gate (verify-only, final)
- No new feature code. PASS only if all hold; on failure record + reopen the failing upstream task:
  1. `npm run typecheck` exits 0.
  2. `npm test` exits 0, ZERO failures, includes the new content-key/override/merge unit tests.
  3. `npm run db:seed` exits 0 (official-only, ≥1000 questions, 0 demo), then `npm run test:integration`
     exits 0, ZERO failures, includes `content-upsert.integration.test.ts`.
  4. `npm run build` exits 0.
  5. Migration applied: `Question.questionKey` + `QuestionOption.optionKey` exist; `schema.prisma` diff is
     ONLY those columns/indexes.
  6. Static: `importOfficial` uses `upsert` (no `deleteMany` of `testAnswer`/`userMistake`/`savedQuestion`/
     `testSessionQuestion`); `lib/content-key.ts` exported + pure; `seed-content.integration.test.ts` gone.

## Out of scope
- Removing `SERVE_DEMO_QUESTIONS`/`demoWhere` + de-duplicating the self-provisioning tests (follow-up).
- Admin-UI replace-by-key; remote/CDN storage; cross-question refs; per-edit history beyond ContentVersion.
- No new image work; the image pipeline (`imageKey` + `/api/q-image` + tiers) stays as shipped.
