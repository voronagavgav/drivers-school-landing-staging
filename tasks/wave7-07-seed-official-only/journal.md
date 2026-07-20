# Task: wave7-07-seed-official-only

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec E — make `db:seed` official-only (delete demo content) + drop the now-obsolete demo guard test.
Pass = ALL true:
1. `prisma/seed.ts` no longer defines or creates demo questions/topics: the `QUESTIONS` array, the `TOPICS`
   array, the demo `contentVersion.create`, the per-question demo `question.create` loop, and the demo-topic
   retire `updateMany` block are REMOVED. The seed creates categories + users + runs `importOfficial` ONLY.
2. The seed still clears the DB in FK-safe order at the start (a dev reseed) and still creates the 8 category
   rows + the 3 users (admin/content/user) the rest of the app + integration suites rely on.
3. `lib/server/seed-content.integration.test.ts` is DELETED (it guarded seeded demo content, which no longer
   exists). No other file imports it.
4. `npm run db:seed` exits 0 and the resulting DB has ZERO demo questions
   (`Question where sourceType='DEMO'` count == 0, `where isDemo=1` count == 0) and ≥1000 published OFFICIAL
   questions.
5. Re-seed is IDEMPOTENT: a second `npm run db:seed` exits 0 with the same official count and still 0 demo.
6. `npm run typecheck` exits 0; `npm run test:integration` exits 0 with ZERO failures (the self-provisioning
   suites create their own throwaway fixtures, so none depends on seeded demo content).

## Constraints / decisions
- Official-only is the locked decision (CONTENT-ARCHITECTURE.md §Decisions). Demo questions/topics are gone for
  good — NOT merely deactivated.
- Confirmed safe to remove: `demo-retired.integration.test.ts` and the admin label/bulk suites SELF-PROVISION
  their own throwaway demo+official rows (they do NOT read seeded demo content); only
  `seed-content.integration.test.ts` asserted seeded demo, and it is deleted here.
- KEEP `SERVE_DEMO_QUESTIONS`/`demoWhere` in place (removing them is an explicit Non-Goal/follow-up). With no
  demo rows seeded, the flag is simply inert.
- KEEP the categories + users + the `importOfficial` call + its official-count report line. Update the final
  `console.log` so it no longer claims "N demo questions" (report official-only).
- Non-Goal: do NOT touch `scripts/import-official.ts` logic (tasks 05/06 own it), the schema, or any
  self-provisioning suite. Do NOT delete official content or image tiers.
- The `importOfficial` THROWS if `.content-import/import_plan.json` is absent — so a missing plan makes db:seed
  fail loudly (criterion 4 cannot be met); that is a real environment gap, not a code bug.

## Plan
- [x] Remove the demo `TOPICS`/`QUESTIONS` arrays + the `SeedQuestion` type + the demo version/topic/question
      creation + the retire `updateMany` from `prisma/seed.ts`; keep categories + users + `importOfficial`.
- [x] Update the closing `console.log` to report official-only.
- [x] `git rm lib/server/seed-content.integration.test.ts`.
- [x] `npm run db:seed` (x2 for idempotency) + `npm run typecheck` + `npm run test:integration`.

## Done
- [x] Stripped demo content from `prisma/seed.ts` → official-only: removed `SeedQuestion` type, `TOPICS`,
      `QUESTIONS`, demo `contentVersion.create`, demo topic-creation loop, per-question demo `question.create`
      loop, and the topic-retire `updateMany`. Kept FK-safe clear + 8 categories + 3 users + `importOfficial`;
      updated both closing `console.log`s to report official-only. `npm run typecheck` exits 0.
- [x] `git rm lib/server/seed-content.integration.test.ts` (confirmed no other file imports it). Ran
      `npm run db:seed` x2 (idempotent: 1691→1691 official published, demo=0 both passes), `npm run typecheck`
      (0), `npm run test:integration` (18 files / 64 tests passed, 0 failures). All 6 criteria met.

## Next
- [ ] None — Goal fully met. Status: done. (Verify gate re-run by driver.)

## Artifacts
- `prisma/seed.ts` — official-only seed (categories + users + importOfficial).
- `lib/server/seed-content.integration.test.ts` — DELETED.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T15:46Z ClPcs-Mac-mini: confirmed no file imports the guard test, then
  `git rm lib/server/seed-content.integration.test.ts`. Ran `npm run db:seed` x2 — official-only result is
  demo=0 / official_published=1691 both passes (idempotent). `npm run typecheck` exits 0;
  `npm run test:integration` = 18 files / 64 tests passed, 0 failures. All 6 Goal criteria satisfied → done.
- 2026-06-23T00:00Z ClPcs-Mac-mini: rewrote `prisma/seed.ts` official-only — dropped `SeedQuestion` type +
  `TOPICS`/`QUESTIONS` arrays + demo `contentVersion.create` + demo topic loop + demo `question.create` loop +
  topic-retire `updateMany`. Kept FK-safe clear, 8 categories, 3 users, `importOfficial` + official-count report;
  rewrote both closing `console.log`s (no more "N demo questions"). Verified `importOfficial` find-or-creates its
  own ContentVersion + section topics and only needs the category rows, so removals are safe. `npm run typecheck`
  exits 0.


## Verify
**Last verify:** PASS (2026-06-23T12:47:31Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T12:48:47Z)
