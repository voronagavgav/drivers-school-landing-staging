# Content architecture — stable keys, idempotent upsert, easy replacement

Status: design adopted 2026-06-23 (owner-approved: official-only, source-derived keys, upsert + override).
This is the durable blueprint; the build is driven from `specs/wave7-content-keys.md`.

## Goal
Make every question a **stable, keyed entity** whose content can be replaced/reloaded **without breaking
its dependencies or losing user progress** — the same pattern we shipped for images (stable `imageKey` +
`/api/q-image` resolver + override tier), now applied to the question itself.

## Decisions (locked)
1. **Official-only.** Demo questions/topics are DELETED. No dual demo/official content model going forward.
   (The vestigial `SERVE_DEMO_QUESTIONS`/`demoWhere` flag is left in place this wave and removed in a small
   follow-up — see Non-goals.)
2. **Source-derived keys.** A question's stable key is its ПДР source position: `q_<section>_<qnum>`
   (e.g. `q_11_7`). Options are keyed `<questionKey>__<n>` (n = 1-based position). Keys are assigned once,
   never reused, and are the join between source files and DB rows.
3. **Source of truth = keyed files.** Canonical content lives in `.content-import/import_plan.json`
   (keyed by source position) + a **corrections override** dir (`.content-import/overrides/<key>.json`)
   that WINS over the upstream plan on load — so a local fix survives an upstream re-import (mirrors the
   image override tier).
4. **Idempotent upsert-by-key load.** The loader reconciles the DB to the source by key; it never
   delete-recreates. Re-running it is a no-op when nothing changed.

## Data model (the dependency graph)
A question is a hub. On reload we classify every relation:

| Relation | Kind | On reload |
|---|---|---|
| `QuestionOption` (cascade child) | owned content | **upsert by `optionKey`** — same id kept, text/isCorrect/order updated; surplus options removed |
| `QuestionExplanation` (1:1) | owned content | upsert in place |
| `Topic` (`topicId`) | classification | re-point to the key's topic |
| `Category` (m2m) | classification | reconcile the set |
| `ContentVersion`, `imageKey`, difficulty, published | classification | set from source |
| `TestAnswer` (`selectedOptionId` → option) | **USER DATA** | **preserved** (kept because question id AND option ids are stable) |
| `TestSessionQuestion`, `UserMistake`, `SavedQuestion` | **USER DATA** | **preserved** (kept because question id is stable) |
| exam / blueprint / mistake-practice / mastery / progress | **derived** | auto-follow; nothing stored, nothing to do |

The win: because `questionKey`→same row id and `optionKey`→same option id, **upsert touches content in
place and every user-progress row stays valid.** Removed-upstream questions are **deactivated**
(`isActive=false`, unpublished), never hard-deleted, so their history survives.

## Replace workflows (day-to-day "easiness")
- **Fix one question** (text/answer/options/explanation/topic/categories): edit (or add) its
  `.content-import/overrides/<key>.json`, run the loader → that one question upserts in place; everything
  else untouched; user progress intact.
- **Swap its image**: drop a file in `public/image-overrides/<imageKey>.*` (already shipped) — no reload.
- **Re-pull upstream**: re-run the loader; corrections override layer means local fixes are NOT clobbered.

## Corrections overrides (`.content-import/overrides/<questionKey>.json`)
One JSON file **per question**, named by its stable `questionKey` (e.g. `q_11_7.json`). On every import the
loader reads the file for each question (if present) and merges it with the derived plan entry via the pure
`applyOverride` (`lib/content-override.ts`) BEFORE building the upsert — so an override field WINS over the
plan field. The committed dir marker is `.content-import/overrides/README.md` (the path is real on a fresh
checkout even though `.content-import/` is otherwise gitignored).

**Overridable top-level fields** — kept in sync with `OVERRIDABLE_FIELDS` in `lib/content-override.ts` and
the README in that dir. An override file may carry **any subset** of these:

| field         | shape                                                        | replaces                                       |
| ------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| `text`        | string                                                       | the question text                              |
| `options`     | `[{ "n": number, "text": string }]`                          | the WHOLE option set (1-based `n`)             |
| `answer`      | number                                                       | the 1-based correct option `n` (pair w/`options`) |
| `topic`       | string                                                       | the topic title (find-or-created on import)    |
| `categories`  | `string[]` of category codes, e.g. `["A","B","C"]`           | the category set (codes must be seeded)        |
| `explanation` | `{ shortText, detailedText, legalReference, reviewedStatus }`| the WHOLE explanation object                   |
| `imageKey`    | string \| null                                               | the image basename (`null` clears it)          |

**Semantics (shallow, per-field, override-wins):** the merge keys on whether the field's KEY is **present**
in the override object (own property), not on the value's truthiness:
- key **absent** → the plan's value is kept unchanged.
- key **present** → the override's value REPLACES the plan's value **wholesale** (no deep-merge: an override
  that supplies `options` replaces the entire array, it does not patch one option).
- an explicit `null` value is a **deliberate clear** (e.g. `{ "imageKey": null }`), distinct from omitting
  the key. Fields outside the table above are ignored by the merge.

**Load rules:** a **missing** override file = plan unchanged (the loader passes `null` to `applyOverride`).
A **malformed** JSON file fails the import LOUDLY (throws naming the offending `questionKey`) — a corrections
file that doesn't load is a bug, not a silent no-op.

## Migration / cutover (no data loss)
- Additive migration: `Question.questionKey` (unique, nullable) + `QuestionOption.optionKey` (unique,
  nullable) + indexes. SQLite: one `ADD COLUMN` per `ALTER TABLE`; apply via `prisma migrate deploy`.
- Backfill keys onto the already-loaded official rows (derive from source position) BEFORE the first
  upsert, so the loader matches existing rows instead of duplicating them. Existing `restyled-live` /
  `image-overrides` tiers and `imageKey`s are untouched.

## Non-goals (this wave)
- Removing `SERVE_DEMO_QUESTIONS`/`demoWhere` and de-duplicating the ~10 self-provisioning integration
  tests — a safe mechanical follow-up once demo data is gone (the flag is harmless meanwhile).
- Admin-UI "replace by key" surface (the override-file path covers replacement now; admin edit already
  exists and writes the DB directly).
- Remote/CDN content storage; cross-question references; per-edit version history beyond `ContentVersion`.
