# Task: wave7-06-loader-reads-overrides

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec C (loader part) — wire the corrections-override layer into the upsert loader + document the file shape.
Pass = ALL true:
1. `scripts/import-official.ts` reads `.content-import/overrides/<questionKey>.json` (per question, when the
   file exists) and applies it via `applyOverride` from `lib/content-override.ts` BEFORE building the upsert
   data — so a present override field WINS over the plan field.
2. The override directory exists in-repo with a committed marker so the path is real on a fresh checkout
   (`.content-import/overrides/.gitkeep`, or a `README.md` documenting the shape — committed even though
   `.content-import/` is otherwise gitignored; add an un-ignore rule if needed).
3. `docs/CONTENT-ARCHITECTURE.md` documents the override file: the path
   `.content-import/overrides/<questionKey>.json` and the overridable top-level fields
   (`text`, `options`, `answer`, `topic`, `categories`, `explanation`, `imageKey`) with the SHALLOW
   replace-whole-field semantics — kept in sync with `applyOverride`.
4. BEHAVIORAL: after `db:seed`, writing `.content-import/overrides/<an existing official questionKey>.json`
   with `{"text":"<new text>"}` and re-running the loader changes THAT question's `text` to the new text while
   keeping the SAME question `id`; removing the override file and re-running restores the plan text. (verify.sh
   performs this and cleans up the throwaway override.)
5. `npm run typecheck` exits 0; `npm test` exits 0 (no unit-test regressions).

## Constraints / decisions
- The override READ is the only new I/O; the MERGE is the pure `applyOverride` (task 04). Loader reads the JSON,
  calls `applyOverride(planEntry, overrideEntry)`, upserts the result — no merge logic duplicated in the loader.
- A missing override file = plan unchanged (pass `null`/`undefined` to `applyOverride`). Malformed JSON should
  fail LOUDLY (throw with the offending key) rather than silently ignore — a corrections file that doesn't load
  is a bug, not a no-op. Document this.
- Keep the override dir un-ignored ENOUGH to commit the marker/README, but do NOT commit actual `<key>.json`
  correction files in this task (none exist yet) — only the directory + its documentation.
- Non-Goal: NO admin UI to author overrides; NO override for fields outside the documented set; NO schema
  change. Depends on task 04 (`applyOverride`) and task 05 (upsert loader) — block on them if absent.

## Plan
- [x] Add the override read+apply step to `importOfficial`'s per-question build (before upsert).
- [x] Create `.content-import/overrides/` with a committed marker/README + an un-ignore rule if needed.
- [x] Document the override shape in `docs/CONTENT-ARCHITECTURE.md`.
- [x] `npm run typecheck` + `npm test`; run the behavioral override smoke in verify.sh.

## Done
- [x] Loader reads `.content-import/overrides/<questionKey>.json` (per question, missing=plan unchanged,
      malformed=throws with the key) and merges it via the pure `applyOverride` BEFORE building the upsert
      data. Implemented in plan-vocabulary so ALL 7 documented fields actually win: built `planEntry`
      {text, options[{n,text}], answer, topic, categories, explanation, imageKey}, `applyOverride(planEntry,
      readOverride(qKey))`, then derived the upsert (text/imageKey/options+isCorrect/explanation/topicId/
      categoryConnect) from `merged`. Override `topic` find-or-creates the official topic; override
      `categories` with an unseeded code throws loudly.
- [x] `.content-import/overrides/README.md` committed (marker + shape table) — confirmed NOT git-ignored.
- [x] `npm run typecheck` exits 0; `npm test` 283/283 pass (no regressions).

## Next
- (none — Goal fully met; Status: done.) If re-opened: the override layer + docs + behavioral smoke all
  pass via `tasks/wave7-06-loader-reads-overrides/verify.sh`.

## Artifacts
- `scripts/import-official.ts` — `OVERRIDE_DIR`+`readOverride` + `applyOverride(planEntry, …)` per question,
  upsert derived from `merged` (DONE this tick).
- `.content-import/overrides/README.md` — committed dir marker + override shape table (DONE this tick).
- `docs/CONTENT-ARCHITECTURE.md` — new `## Corrections overrides` section: 7-field table synced with
  `OVERRIDABLE_FIELDS`, shallow/override-wins/present-key (explicit-null clear) semantics, and the
  missing-file=unchanged / malformed=throws-with-key load rules (DONE this tick).

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 12:36 UTC ClPcs-Mac-mini: wired the corrections-override layer into `scripts/import-official.ts`
  — added `OVERRIDE_DIR` + `readOverride(qKey)` (missing→null, malformed→throws with key) and an
  `applyOverride(planEntry, readOverride(qKey))` call on a plan-vocabulary entry, deriving the whole upsert
  (text/imageKey/options+isCorrect via merged.answer/explanation/topicId/categoryConnect) from `merged` so
  every documented field wins; override `topic` find-or-creates a topic, bad override `categories` throw.
  Created committed marker+shape doc `.content-import/overrides/README.md` (verified not git-ignored).
  `npm run typecheck` exit 0; `npm test` 283/283. Did NOT run the heavy db:seed+import behavioral smoke
  (driver re-runs verify.sh). Remaining: docs §3 explicit synced field section.

- 2026-06-23 15:40 UTC ClPcs-Mac-mini: added the explicit `## Corrections overrides` section to
  `docs/CONTENT-ARCHITECTURE.md` — a 7-field table (`text, options, answer, topic, categories, explanation,
  imageKey`) synced with `OVERRIDABLE_FIELDS`, the shallow/per-field/override-wins + present-key (explicit
  `null` = deliberate clear) semantics, and the missing-file=plan-unchanged / malformed=throws-with-key load
  rules (Goal §3 substance, beyond verify's coarse grep). Ran the full `verify.sh` end to end: db:seed →
  probe override → loader → text changed in place + SAME id → removal restores plan text; typecheck exit 0;
  `npm test` 283/283. PASS. Goal fully met → Status: done.


## Verify
**Last verify:** PASS (2026-06-23T12:40:42Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T12:42:32Z)
