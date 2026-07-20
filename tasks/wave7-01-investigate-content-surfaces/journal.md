# Task: wave7-01-investigate-content-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
INVESTIGATION ONLY — write NO production code, change NO schema. Produce a findings note at
`tasks/wave7-01-investigate-content-surfaces/FINDINGS.md` that the implementation tasks (02–08) build on.
Pass = ALL true:
1. `FINDINGS.md` exists and is non-empty.
2. It lists, with `file:line` refs, every DESTRUCTIVE statement in `scripts/import-official.ts`'s current
   `importOfficial` — each `deleteMany`/`delete` of `testAnswer`, `testSessionQuestion`, `userMistake`,
   `savedQuestion`, `question`, `topic`, `contentVersion` (the delete-recreate block task 05 replaces).
3. It records the source→key derivation inputs available per question in `.content-import/import_plan.json`
   (the `label` / `section_title` / `qnum` / `options[].n` / `answer` fields) so 03 can implement
   `questionKey(section,qnum)` and `optionKey(questionKey,n)` from real data, and notes the distinct `label`
   forms present (plain ints AND any sub-label like `8.1`) — include the actual distinct-label count.
4. It enumerates the dependency-graph rows that MUST be preserved on reload (the models keyed off a question:
   `QuestionOption`, `QuestionExplanation`, `TestAnswer.selectedOptionId`, `TestSessionQuestion`, `UserMistake`,
   `SavedQuestion`) with the relevant unique constraints (`TestAnswer @@unique([testSessionId, questionId])`,
   `SavedQuestion`/`UserMistake` uniques, the `QuestionOption onDelete: Cascade`) copied from `prisma/schema.prisma`.
5. It identifies the exact demo-content blocks to remove from `prisma/seed.ts` for task 07 (the `TOPICS` array,
   the `QUESTIONS` array, the demo `contentVersion.create`, the per-question demo `question.create` loop, and
   the demo-topic `updateMany` retire block) with `file:line` ranges, and confirms
   `lib/server/seed-content.integration.test.ts` is the only suite asserting demo content exists.
6. It states the override-file plan: dir path `.content-import/overrides/<questionKey>.json`, the top-level
   fields an override may set (text, options, answer, topic, categories, explanation, imageKey), and confirms
   `.content-import/overrides/` does NOT yet exist.

## Constraints / decisions
- READ-ONLY: no edits to `scripts/import-official.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, or any lib.
  The only file this task writes is its own `FINDINGS.md`.
- Map what IS, with `file:line` — not a redesign. Implementers (02–08) make the changes.
- Out of scope (do NOT investigate): removing `SERVE_DEMO_QUESTIONS`/`demoWhere`, admin replace-by-key UI,
  remote/CDN, image-pipeline changes (per spec "Out of scope").

## Plan
- [x] Grep `importOfficial` for `deleteMany`/`delete`; capture each `file:line`.
- [x] Read `.content-import/import_plan.json` shape; tabulate distinct `label` forms + counts.
- [x] Copy the relevant `@@unique`/relation lines from `schema.prisma` for the 6 dependency models.
- [x] Pin the seed.ts demo blocks + confirm the lone demo-asserting integration suite.
- [x] Write `FINDINGS.md`.

## Done
- [x] §1 of `FINDINGS.md` written: all 7 destructive statements in `importOfficial`
  (`import-official.ts:108–115`) tabulated with `file:line`, what each destroys, why 1–4 are
  hand-deletes (not cascade), and that upsert-by-key (task 05) makes all 7 unnecessary.
- [x] §2 of `FINDINGS.md` written: `import_plan.json` is a flat array of **1693** question objects;
  per-question fields tabulated (`label`/`section_title`/`qnum`/`text`/`options[].n`/`answer`/
  optional `image`/`image_src`/`_v6`). Recorded that the loader ALREADY uses `<label>:<qnum>`
  (`import-official.ts:212`) as the implicit question key → 03's `questionKey(section,qnum)`
  formalizes it with `section`=the plan's `label`; `(label,qnum)` verified unique across all 1693.
  Distinct labels = **63** (61 plain ints + 2 sub-labels `8.1`,`16.2`; plain `8`/`16` absent).
- [x] §3 of `FINDINGS.md` written: the 6 dependency models that hang off a Question, with their
  relevant lines copied from `prisma/schema.prisma` (`QuestionOption` `onDelete: Cascade` `:115`;
  `QuestionExplanation` `questionId @unique`+cascade `:129–130`; `TestSessionQuestion`
  `@@unique([testSessionId,questionId])` `:187`, NO cascade `:184`; `TestAnswer`
  `@@unique([testSessionId,questionId])` `:203` + `selectedOptionId` `:197`, NO cascade `:196,:198`;
  `UserMistake` `@@unique([userId,questionId])` `:227` + cascade `:216`; `SavedQuestion`
  `@@unique([userId,questionId])` `:239` + cascade `:236`). Added a cascade map and CORRECTED the
  §1 note: only `TestAnswer`/`TestSessionQuestion` are non-cascade (FK-forced hand-deletes);
  `UserMistake`/`SavedQuestion` ARE `onDelete: Cascade` → their `deleteMany`s are redundant but
  still destructive. The `@@unique` verify gate now PASSES.
- [x] §4 + §5 of `FINDINGS.md` written → deliverable COMPLETE, all 6 Goal items covered.
  §4: pinned the 7 demo blocks to remove from `prisma/seed.ts` with `file:line` ranges
  (`SeedQuestion` type :18–27, `TOPICS` :29–38, `QUESTIONS` :40–369, demo `contentVersion.create`
  :391–400, demo-topic create loop :432–439, per-question `question.create` loop :441–475, retire
  `updateMany` :477–485) + cross-refs to reword (:372,:433/:444,:503–504) + the KEEP list
  (categories :402–430, users :487–501, `importOfficial` :506–516, FK-safe wipe :374–389).
  Confirmed `lib/server/seed-content.integration.test.ts:36–50` is the ONLY suite asserting SEEDED
  demo exists (≥24 published `isDemo:true`); verified the 13 other `isDemo`/`DEMO` test files
  individually (rule-only, own-throwaway, or withheld-from-pool — none reads the seed's demo set).
  §5: stated the override-file plan (dir `.content-import/overrides/<questionKey>.json`, 7 optional
  top-level fields, missing-dir/file = no-op) and confirmed `.content-import/overrides/` does NOT
  yet exist (`ls` exits non-zero). Ran `verify.sh` → PASS (all 6 gates + read-only check green).

## Next
- [ ] NONE — task done. Deliverable `FINDINGS.md` complete and `verify.sh` PASSES. Implementation
  is tasks 02–08 (separate journals); 09 runs the full Wave-7 gate. Nothing further here.

## Artifacts
- `tasks/wave7-01-investigate-content-surfaces/FINDINGS.md` — the dependency/keys/seed map for tasks 02–08.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T00:00Z ClPcs-Mac-mini: grepped `scripts/import-official.ts` — 7 destructive
  statements in `importOfficial` at lines 108–115 (testAnswer/testSessionQuestion/userMistake/
  savedQuestion/question deleteMany, topic deleteMany, contentVersion.delete). Read the full
  function (lines 1–278) for context: cleanup block 102–117 guarded by `if (prior)`/`if (ids.length)`;
  keys off `VERSION_NAME` (:21) + `OFFICIAL_TOPIC_DESC` (:23). Wrote `FINDINGS.md` §1 (table +
  notes); §2–§5 stubbed as TODO comments. Investigation continues next tick.
- 2026-06-23T14:45Z ClPcs-Mac-mini: §2 written. Analyzed `.content-import/import_plan.json`
  via `jq`: flat array of 1693 question objects, 9 union fields. Tabulated the per-question
  key-derivation inputs + recorded that the loader ALREADY uses `<label>:<qnum>` as its implicit
  key (`import-official.ts:212`, also explanations/svgs/quarantine/reviewedStatus) → 03's
  `questionKey(section,qnum)` formalizes it with `section`=`label`. Verified `(label,qnum)` is
  unique across all 1693 and `label`→`section_title` is 1:1 (63 pairs). Distinct labels = 63:
  61 plain ints + 2 sub-labels (`8.1`,`16.2`); plain `8`/`16` absent (replaced). Noted
  `categoriesFor` strips the sub-label (`parseInt(label.split(".")[0])`) for CATEGORY lookup but
  the full label flows into the question key. Re-ran verify: the `label/qnum` gate that failed
  last tick now PASSES; verify advances to the `@@unique` gate (= §3, next tick).
- 2026-06-23T15:30Z ClPcs-Mac-mini: §3 written. Read `prisma/schema.prisma:65–241` for the 6
  question-dependent models; copied each model's `questionId` relation + `@@unique` lines verbatim
  with `file:line`. Built a cascade map and found §1's blanket "none are cascade" claim was WRONG —
  only `TestAnswer`/`TestSessionQuestion` lack `onDelete` (FK-forced hand-deletes); `UserMistake`
  (`:216`)/`SavedQuestion` (`:236`) ARE `onDelete: Cascade` (their `deleteMany`s redundant-but-
  destructive). Corrected the §1 note accordingly. Re-ran verify: the `@@unique` gate that failed
  last tick now PASSES; verify advances to gate 5 (`seed-content.integration.test.ts` = §4, next).
- 2026-06-23T16:20Z ClPcs-Mac-mini: §4 + §5 written → FINDINGS.md COMPLETE. Read `prisma/seed.ts`
  (1–528) and pinned the 7 demo blocks to remove with `file:line` ranges + the cross-refs to reword
  + the KEEP list (categories/users/importOfficial/wipe). Read `seed-content.integration.test.ts`
  and grepped all 15 `isDemo`/`DEMO` test files: confirmed it (`:36–50`, asserts ≥24 published demo)
  is the ONLY suite depending on SEEDED demo; the other 13 are rule-only / own-throwaway / withheld.
  Confirmed `.content-import/overrides/` is absent (`ls` non-zero) and wrote the override-file plan
  (dir + 7 optional fields + missing=no-op). Ran `verify.sh` → PASS (6 gates + read-only check).
  Set Status: done.



## Verify
**Last verify:** PASS (2026-06-23T11:52:49Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T11:55:18Z)
