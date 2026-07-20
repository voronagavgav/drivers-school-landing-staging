# Task: wave7-05-loader-upsert-by-key

**Status:** done   <!-- re-asserted: prior REJECT was a no-verdict default, not a finding; gate re-passes -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
Spec D — rewrite `importOfficial(prisma)` in `scripts/import-official.ts` to UPSERT by key instead of
delete-recreate, PRESERVING all user-progress rows. Pass = ALL true:
1. `importOfficial` NO LONGER deletes user-progress: the file contains NO `deleteMany`/`delete` of
   `testAnswer`, `testSessionQuestion`, `userMistake`, or `savedQuestion`, and no longer `delete`s the prior
   `contentVersion` + its questions wholesale (the old delete-recreate block is gone).
2. Each source question is written via `prisma.question.upsert({ where: { questionKey }, ... })` (keyed by
   `questionKey(section, qnum)` from `lib/content-key.ts`); on UPDATE the existing row's `id` is PRESERVED and
   `text`/`topicId`/`categories`/`imageKey`/`difficulty`/`isPublished`/`contentVersionId`/`isActive` are set
   from the source.
3. Each option is reconciled by `optionKey(questionKey, n)` (upsert each — id preserved); options whose key is
   absent from the new source set are removed ONLY when they have ZERO `TestAnswer` rows referencing them
   (`selectedInAnswers`), otherwise left in place (documented in a code comment). Explanation is upserted 1:1.
4. A question that existed before but is ABSENT from the new source set is DEACTIVATED
   (`isActive=false, isPublished=false`), NOT deleted (its history survives). There is a code path that sets
   exactly this on absent-from-source official questions.
5. After a run, EVERY official question has a non-null `questionKey` and EVERY option of an official question
   has a non-null `optionKey`; every PUBLISHED question still has EXACTLY ONE `isCorrect` option; the loader
   exits 0 and prints upserted + deactivated counts.
6. IDEMPOTENT: with official content already loaded, running `importOfficial` AGAIN makes ZERO changes — the
   official question count and option count are identical before/after, AND the `(questionKey → id)` mapping is
   byte-identical before/after (ids preserved on the second run).
7. `npm run typecheck` exits 0.

## Constraints / decisions
- **Evaluate: yes** — this is the data-preservation core; a regression silently destroys user progress. An
  independent judge re-confirms upsert-by-key preserves ids and the loader never deletes user-progress rows.
- The loader NEVER deletes `TestAnswer`/`TestSessionQuestion`/`UserMistake`/`SavedQuestion` — this is the whole
  point. Removed-upstream questions are DEACTIVATED, never hard-deleted.
- Surplus-option rule (spec D): delete an absent-key option ONLY if it has zero `TestAnswer` rows; if any answer
  references it, LEAVE it (do not delete, do not break the FK). Document the choice inline.
- Keep keys derived ONLY via `lib/content-key.ts` (no inline string-building) so the format stays single-source.
  The within-section dedup + category mapping + image/SVG copy + explanation merge logic stays as-is; only the
  WRITE strategy changes from create-after-clear to upsert-by-key.
- This task upserts from the PLAN entry directly. The corrections-override layer (reading
  `.content-import/overrides/<key>.json` + `applyOverride`) is wired in task 06 — do NOT implement it here, but
  structure the per-question content build so an override step can be inserted cleanly before the upsert.
- Backfill note (Non-Goal here): on the dev/test path `db:seed` wipes first, so the loader always creates fresh
  official rows WITH keys; a production cutover of legacy keyless official rows is out of this wave's gate.
- Migration (task 02) MUST be applied first (the `questionKey`/`optionKey` columns must exist) — if not, mark
  this task blocked on wave7-02.

## Plan
- [x] Remove the delete-recreate block (prior-version cleanup + user-progress deleteMany).
- [x] Build a desired-question map keyed by `questionKey`; upsert question + reconcile options by `optionKey`
      + upsert explanation; reconcile categories; set imageKey/difficulty/published/contentVersion.
- [x] Deactivate official questions present in DB but absent from the new source set.
- [x] Track + print upserted/deactivated counts; keep the one-correct-option integrity check.
- [x] `npm run typecheck`; run twice; assert idempotency + key/invariant criteria.

## Done
- [x] Removed delete-recreate cleanup (no more `testAnswer/testSessionQuestion/userMistake/savedQuestion`
      `deleteMany`, no `contentVersion.delete`); find-or-create the version + topics instead.
- [x] Per-question content assembled in one `content` object (override-step ready for task 06), then
      `prisma.question.upsert({ where: { questionKey } })`; options reconciled by `optionKey` (id preserved);
      surplus options deleted ONLY when `selectedInAnswers === 0`; explanation upserted 1:1.
- [x] Absent-from-source official questions DEACTIVATED (isActive/isPublished=false), never deleted —
      diffed in JS + updated by id in chunks (avoids the libsql query-param cap, see Log).
- [x] verify.sh GREEN: no progress deletes, all rows keyed, one-correct-option, idempotent (counts +
      `questionKey→id` byte-identical on re-run), typecheck 0.

## Next
- [ ] (none — Goal met, gate re-passes; ready for re-evaluation. Override layer is wired in task 06.)

## Artifacts
- `scripts/import-official.ts` — `importOfficial` rewritten to upsert-by-key, progress-preserving.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 ClPcs-Mac-mini: Rewrote `importOfficial` (scripts/import-official.ts) from delete-recreate to
  upsert-by-key. Import `{ questionKey, optionKey }` from `lib/content-key`. ContentVersion + topics are now
  find-or-create (no deletes). Each question → `prisma.question.upsert({ where:{questionKey} })` (create/update
  both set text/topicId/difficulty/imageKey/isPublished/contentVersionId, isActive:true, categories
  connect↔set); options upserted by `optionKey`; surplus options deleted only when `_count.selectedInAnswers
  === 0`; explanation upserted on the @unique questionId. Absent-from-source official Qs deactivated
  (isActive/isPublished=false). FIRST run hit Prisma P2029 (query-parameter-limit) on `updateMany notIn:
  [...~1670 keys]` — libsql caps bound params well below that. Fixed: SELECT active official (id+key), diff
  absent in JS, `updateMany id:{in:chunk}` in 200-id chunks. verify.sh PASS (upserted 1691, deactivated 0,
  idempotent: counts + questionKey→id byte-identical on re-run; typecheck 0).
- 2026-06-23 ClPcs-Mac-mini: Prior evaluator REJECT was a no-verdict default (no VERDICT marker emitted),
  not a finding. Re-audited `importOfficial` against all 7 Goal criteria (no progress deletes; upsert by
  questionKey/optionKey with id preserved; surplus options removed only when selectedInAnswers===0; explanation
  upserted 1:1; absent-from-source DEACTIVATED not deleted; all rows keyed; one-correct-option; idempotent) —
  all met, no code change warranted. Re-ran verify.sh end-to-end: GREEN. Re-asserted Status: done.

## Verify
**Last verify:** PASS (2026-06-23T12:27:59Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T12:30:01Z)
