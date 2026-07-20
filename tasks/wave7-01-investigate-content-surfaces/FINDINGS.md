# Wave-7 content-surfaces findings

Investigation-only map of the content load/seed surfaces that tasks 02–08 modify.
READ-ONLY: no production code changed by this task. All `file:line` refs are against the
tree at the time of writing (HEAD `33d6e75`); re-verify before editing.

---

## 1. Destructive statements in `importOfficial` (the delete-recreate block task 05 replaces)

`scripts/import-official.ts` — function `importOfficial(prisma)` opens with an "idempotent
cleanup of any prior official import" block (lines 102–117). It finds the prior
`ContentVersion` by `name === VERSION_NAME` (`import-official.ts:103`), collects that version's
question ids (`:105–106`), and if any exist deletes the dependency rows then the questions,
topics and version. Every `deleteMany`/`delete` in the current function:

| # | file:line | statement | what it destroys |
|---|-----------|-----------|------------------|
| 1 | `scripts/import-official.ts:108` | `prisma.testAnswer.deleteMany({ where: { questionId: { in: ids } } })` | every user's saved answers to prior-import questions |
| 2 | `scripts/import-official.ts:109` | `prisma.testSessionQuestion.deleteMany({ where: { questionId: { in: ids } } })` | session→question link rows (a session's served-question list) |
| 3 | `scripts/import-official.ts:110` | `prisma.userMistake.deleteMany({ where: { questionId: { in: ids } } })` | each user's mistake log entries (drives mistake-practice) |
| 4 | `scripts/import-official.ts:111` | `prisma.savedQuestion.deleteMany({ where: { questionId: { in: ids } } })` | each user's bookmarked/saved questions |
| 5 | `scripts/import-official.ts:112` | `prisma.question.deleteMany({ where: { id: { in: ids } } })` | the questions themselves — **options + explanation cascade** (see §3) |
| 6 | `scripts/import-official.ts:114` | `prisma.topic.deleteMany({ where: { description: OFFICIAL_TOPIC_DESC } })` | all official topics (matched by `description = "Офіційний розділ ПДР (ГСЦ МВС)"`) |
| 7 | `scripts/import-official.ts:115` | `prisma.contentVersion.delete({ where: { id: prior.id } })` | the prior `ContentVersion` row |

Notes:
- Statements 1–4 exist because of the question delete (5): they clear the rows that reference
  the question. NOT all four are the same case (see §3 cascade map): `TestAnswer` (#1) and
  `TestSessionQuestion` (#2) → `Question` have **no** `onDelete` (default Restrict), so deleting a
  referenced question would **FK-fail** — those two manual deletes are FK-forced. `UserMistake`
  (#3) and `SavedQuestion` (#4) → `Question` **are** `onDelete: Cascade`, so the question delete
  would auto-remove them — those two `deleteMany`s are **redundant** but still destroy the data.
  An upsert-by-key write path (task 05) makes all seven unnecessary because the question rows
  survive the reload, so the user data hanging off them survives too.
- The block is guarded by `if (prior)` (`:104`) and the inner deletes by `if (ids.length)`
  (`:107`); the topic delete (6) and version delete (7) run whenever `prior` exists.
- Order matters in the current code: dependents (1–4) → questions (5) → topics (6) → version
  (7). The question delete comment "options+explanation cascade" (`:112`) is the only place
  cascade is relied on (see §3 for the schema confirmation).
- Constants the block keys off: `VERSION_NAME` (`import-official.ts:21`),
  `OFFICIAL_TOPIC_DESC = "Офіційний розділ ПДР (ГСЦ МВС)"` (`import-official.ts:23`).

## 2. Key-derivation inputs in `.content-import/import_plan.json`

`.content-import/import_plan.json` (1.34 MB, gitignored) is a flat **array of 1693 question
objects** — NOT keyed by anything, just first-seen order. The importer's TypeScript shape for a
row is `PlanQ` (`scripts/import-official.ts:25–32`). Each object's keys (union across all 1693):

| field | type | role | example |
|-------|------|------|---------|
| `label` | string | section/topic id — the "section" input to `questionKey` | `"1"`, `"8.1"`, `"16.2"` |
| `section_title` | string | human topic title (1:1 with `label`) | `"ЗАГАЛЬНІ ПОЛОЖЕННЯ"` |
| `qnum` | number | per-section question number — the "qnum" input | `1`, `2`, `4` (gaps exist) |
| `text` | string | question stem | — |
| `options` | `{n:number, text:string}[]` | answer options; `n` is 1-based ordinal | `[{n:1,text:…},…]` |
| `answer` | number | the `n` of the correct option — input to `optionKey`/`isCorrect` | `3` |
| `image` / `image_src` | string (optional) | per-question diagram filename / path | `"1_1_0.jpeg"` |
| `_v6` | (optional) | pipeline-internal provenance marker — **not** a key input | — |

**Key derivation (what 03 implements, grounded in what the importer ALREADY does):**
- The current loader already builds an implicit question key `qkey = `${q.label}:${q.qnum}``
  (`import-official.ts:212`) and uses that exact `<label>:<qnum>` form to look up explanations,
  hand-authored SVGs (`:202`), `reviewedStatus` (`:41`), and the quarantine set (`:55`). So
  task 03's `questionKey(section, qnum)` **formalizes this existing key** — its `section`
  argument is the plan's **`label`** field (NOT `section_title`).
- `(label, qnum)` is **unique across all 1693 rows** (verified: `distinct(label,qnum)=1693`),
  so it is a valid stable identity. `(section_title, qnum)` is also unique (63 titles, 1:1 with
  label), but `label` is the shorter/stabler join key the loader already uses.
- `optionKey(questionKey, n)` keys off each option's `options[].n` (1-based ordinal). The loader
  already treats `o.n === q.answer` as the correct-option test (`:239`) and sorts options by `n`
  (`:192`), so `n` is a stable per-question option identity within a question.

**Distinct `label` forms (Goal item 3):** **63 distinct labels**, all JSON **strings**. Of these,
**61 are plain integers** (`"1"`…`"63"`) and **2 are sub-labels: `"8.1"` and `"16.2"`**. NB the
plain `"8"` and `"16"` are *absent* — they are replaced by `8.1`/`16.2` respectively (so the set
is not a contiguous 1–63). The importer's `categoriesFor(label)` (`:82–83`) maps a label to
category codes by `parseInt(label.split(".")[0], 10)` — i.e. it strips the sub-label for the
**category** lookup (`8.1`→8, `16.2`→16) — but the **full** label string (`"8.1"`) is what flows
into the `<label>:<qnum>` question key. Task 03's normalization must therefore preserve the full
label (including the `.1`/`.2` sub-part), not just the integer prefix.

## 3. Dependency-graph models that hang off a Question (must survive a reload)

Six models reference `Question` and carry user/learning state that an upsert-by-key reload
(task 05) must preserve. Relevant lines copied verbatim from `prisma/schema.prisma`:

**`QuestionOption`** (`prisma/schema.prisma:112–125`) — the answer options; cascades on question delete:
```prisma
questionId   String
question     Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
```
`onDelete: Cascade` (`:115`) is the ONLY cascade the importer's question-delete comment relies on
(`import-official.ts:112` "options+explanation cascade"). Implication for task 05: option IDs are
cuids that change on any delete-recreate — `TestAnswer.selectedOptionId` (below) points at them, so
the upsert must keep options stable by `optionKey` (task 03), not drop+recreate them per reload.

**`QuestionExplanation`** (`prisma/schema.prisma:127–137`) — 1:1 with question; also cascades:
```prisma
questionId     String   @unique
question       Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
```
The `@unique` on `questionId` (`:129`) enforces the 1:1; cascade (`:130`) is the second half of the
"options+explanation cascade" relied on at `import-official.ts:112`.

**`TestSessionQuestion`** (`prisma/schema.prisma:179–189`) — session→question served-list rows:
```prisma
questionId    String
question      Question    @relation(fields: [questionId], references: [id])
@@unique([testSessionId, questionId])
```
Its `question` relation (`:184`) has **NO `onDelete`** → default Restrict, so a question delete
**FK-fails** unless these rows are hand-cleared first (= why `importOfficial` deletes them, §1 #2).
Unique: `@@unique([testSessionId, questionId])` (`:187`).

**`TestAnswer`** (`prisma/schema.prisma:191–206`) — every saved answer, incl. the chosen option:
```prisma
questionId       String
question         Question        @relation(fields: [questionId], references: [id])
selectedOptionId String?
selectedOption   QuestionOption? @relation(fields: [selectedOptionId], references: [id])
@@unique([testSessionId, questionId])
```
Both the `question` (`:196`) and `selectedOption` (`:198`) relations have **NO `onDelete`** →
default Restrict. So a question delete FK-fails on `questionId` (= §1 #1 hand-clear), AND
`selectedOptionId` (`:197`) pins specific option cuids — recreating options would orphan/FK-break
these references. Unique: `@@unique([testSessionId, questionId])` (`:203`). This is the row task 05
most needs to preserve: it is the user's answer history.

**`UserMistake`** (`prisma/schema.prisma:211–229`) — per-user mistake log (drives mistake-practice):
```prisma
questionId        String
question          Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
@@unique([userId, questionId])
```
Unique: `@@unique([userId, questionId])` (`:227`). NB its `question` relation **IS** `onDelete:
Cascade` (`:216`).

**`SavedQuestion`** (`prisma/schema.prisma:231–241`) — per-user bookmarks:
```prisma
questionId String
question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
@@unique([userId, questionId])
```
Unique: `@@unique([userId, questionId])` (`:239`). Its `question` relation **IS** `onDelete:
Cascade` (`:236`).

**Cascade map (corrects §1's "none are cascade" note):**
| dependency → Question | `onDelete` | effect of the §1 question delete |
|---|---|---|
| `QuestionOption` | **Cascade** (`:115`) | auto-deleted with the question |
| `QuestionExplanation` | **Cascade** (`:130`) | auto-deleted with the question |
| `TestSessionQuestion` | none (Restrict) | **FK-fails** → §1 #2 hand-deletes it first |
| `TestAnswer` | none (Restrict) | **FK-fails** → §1 #1 hand-deletes it first |
| `UserMistake` | **Cascade** (`:216`) | would auto-delete → §1 #3 deleteMany is **redundant** but still destroys it |
| `SavedQuestion` | **Cascade** (`:236`) | would auto-delete → §1 #4 deleteMany is **redundant** but still destroys it |

So §1 #1–#2 are FK-forced hand-clears (TestAnswer/TestSessionQuestion are Restrict); §1 #3–#4 are
redundant-but-still-destructive (UserMistake/SavedQuestion would cascade anyway). Either way, all four
sets of user data vanish on a reload today. Task 05's upsert-by-`questionKey` keeps the `Question` row
(and, via stable `optionKey`, its `QuestionOption` IDs) alive across reloads, so nothing referenced by
`@@unique([testSessionId, questionId])` / `@@unique([userId, questionId])` / `selectedOptionId` breaks
— no manual deletes needed.

## 4. Demo-content blocks to remove from `prisma/seed.ts` (task 07)

Task 07 strips the demo content, leaving only the categories, the three users, and the
`importOfficial(prisma)` call. The blocks to REMOVE, with `file:line` ranges (against the tree
at the time of writing):

| # | file:line | block | what it is |
|---|-----------|-------|------------|
| 1 | `prisma/seed.ts:18–27` | `type SeedQuestion = { … }` | the demo-question TS shape — used ONLY by `QUESTIONS`, remove with it |
| 2 | `prisma/seed.ts:29–38` | `const TOPICS = [ … ]` | the 8 demo topic titles/orders |
| 3 | `prisma/seed.ts:40–369` | `const QUESTIONS: SeedQuestion[] = [ … ]` | the 24 hand-written demo questions |
| 4 | `prisma/seed.ts:391–400` | `const version = await prisma.contentVersion.create({ … })` | the demo `ContentVersion` ("Демонстраційний набір ПДР v1") |
| 5 | `prisma/seed.ts:432–439` | `for (const t of TOPICS) { … topicByTitle.set(…) }` | the demo-topic create loop (consumes `TOPICS`) |
| 6 | `prisma/seed.ts:441–475` | `let created = 0; for (const q of QUESTIONS) { await prisma.question.create({ … }) … }` | the per-question demo `question.create` loop (options + explanation nested-create, `contentVersionId: version.id`) |
| 7 | `prisma/seed.ts:477–485` | the demo-topic retire `await prisma.topic.updateMany({ where:{id:{in:[...topicByTitle.values()]}}, data:{isActive:false} })` | deactivates the 8 demo topics (Spec F part 2); moot once they're never created |

Cross-references to update when the blocks above go (NOT separate blocks, but lines that
reference the removed names — task 07 must touch them or the file won't compile):
- `prisma/seed.ts:372` `console.log("Seeding Drivers School (DEMO content)…")` — reword.
- `prisma/seed.ts:433` `topicByTitle` map decl and `prisma/seed.ts:444` `topicByTitle.get(q.topic)!`
  — `topicByTitle` is only used by the demo loops; remove the decl with them.
- `prisma/seed.ts:503–504` the `Done. ${created} demo questions, ${TOPICS.length} topics…`
  summary logs — reference `created`/`TOPICS`, reword/remove.

KEEP (the task's explicit "leaving categories + users + `importOfficial`"):
- `prisma/seed.ts:374–389` the FK-safe `deleteMany` wipe block — still needed before recreating
  categories/users on a reseed (the question/option/explanation clears become no-ops but stay
  FK-safe and harmless). NOT demo content; do not remove.
- `prisma/seed.ts:402–430` the 8 `category.create` calls + `catByCode` map — `importOfficial`
  connects official questions to these via `categoriesFor(label)`.
- `prisma/seed.ts:487–501` the 3 `user.create` calls (admin / content-manager / user) + bcrypt
  hashing at `:488–492`.
- `prisma/seed.ts:506–516` the `await importOfficial(prisma)` call + official-count log — this is
  the official load that becomes the seed's ONLY content source after 07.

**Lone demo-asserting suite (Goal item 5):** `lib/server/seed-content.integration.test.ts` is the
ONLY suite that asserts SEEDED demo content EXISTS — its test "seeds at least 24 published,
clearly-demo questions" (`seed-content.integration.test.ts:36–50`) does
`prisma.question.findMany({ where:{ isPublished:true, isDemo:true } })` and asserts
`demo.length >= 24` plus `isDemo===true`/`sourceType==="DEMO"`. Once 07 removes the demo seed
that count drops to 0 and this test fails — so 07 (or its sibling) must rescope/remove that
assertion. All 13 OTHER test files that mention `isDemo`/`DEMO` do NOT depend on seeded demo
content; verified individually:
- `lib/validation.test.ts` / `lib/server/admin-label-consistency.integration.test.ts` — assert the
  zod/action `sourceType==="DEMO" ⇔ isDemo===true` consistency RULE on literal/own-throwaway
  inputs, never the seed.
- `lib/server/demo-retired.integration.test.ts` — creates its OWN throwaway DEMO+OFFICIAL questions
  and asserts demo is WITHHELD from live pools (`pooled.every(q => q.isDemo === false)`,
  `:96`); the one `isDemo===true` assert (`:124`) is on its OWN created row, not the seed.
- `progress-volume`, `due-mistakes`, `engine`, `access-control`, `exam-short-pool`,
  `exam-blueprint`, `saved-excludes-unpublished`, `mixed-weak-topics`, `finish-idempotency`,
  `analytics-dashboard`, `admin-questions-bulk` — each provisions its OWN `isDemo:false` OFFICIAL
  stand-in (or, for `admin-questions-bulk`, a throwaway demo row for a filter test); none reads the
  seed's demo set.

## 5. Override-file plan (tasks 04 + 06)

Tasks 04/06 add a per-question override layer so a hand-fix can survive a reload without editing
`import_plan.json`:
- **Directory:** `.content-import/overrides/` — one JSON file per question, named
  `<questionKey>.json`, where `<questionKey>` is the §2 key `<label>:<qnum>` (e.g.
  `.content-import/overrides/8.1:4.json`). The loader reads `<questionKey>.json` for each row it
  imports and, if present, merges it via `applyOverride` (task 04) — shallow per-field
  override-wins (see task-04 journal).
- **Top-level fields an override MAY set** (each optional; absent = keep the plan's value):
  - `text` — question stem (replaces `PlanQ.text`).
  - `options` — full replacement option list (`{n, text}[]`); `optionKey` stays keyed off `n`.
  - `answer` — the correct option's `n` (replaces `PlanQ.answer`).
  - `topic` — section/topic id (the `label`); rare, for re-homing a misfiled question.
  - `categories` — explicit category-code list, overriding `categoriesFor(label)`.
  - `explanation` — `{ shortText, detailedText, legalReference }` for `QuestionExplanation`.
  - `imageKey` — diagram filename, overriding `image`/`image_src`.
- **Confirmed:** `.content-import/overrides/` does **NOT** yet exist (verified: `ls` exits non-zero;
  `.content-import/` holds the pipeline artifacts but no `overrides/` subdir). Tasks 04/06 create
  it; the loader must treat a missing dir / missing file as "no override" (not an error), so a
  fresh checkout with zero overrides imports exactly the plan as today.

---

*Investigation complete — all six Goal items covered. Implementers: tasks 02–08.*
