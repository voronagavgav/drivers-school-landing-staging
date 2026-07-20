# Task: wave7-08-content-upsert-integration-test

**Status:** done   <!-- 2026-06-23: full verify.sh green — suite 19 files/66 tests pass, content-upsert.integration.test.ts listed + green -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec F — the headline guarantee, as a real integration test. Pass = ALL true:
1. `lib/server/content-upsert.integration.test.ts` exists.
2. It self-provisions a throwaway USER plus, on a KNOWN already-seeded OFFICIAL question (one with a non-null
   `questionKey` and at least one keyed option): a `UserMistake`, a `SavedQuestion`, and a `TestAnswer` whose
   `selectedOptionId` points at one of that question's options (via a throwaway `TestSession`). It captures the
   question `id` and the chosen option `id` BEFORE re-import.
3. It runs `importOfficial(prisma)` AGAIN, then asserts: the question with that `questionKey` has the SAME `id`;
   the option with that `optionKey` has the SAME `id`; and the `UserMistake`, `SavedQuestion`, and `TestAnswer`
   rows STILL EXIST and still reference valid (existing) question/option ids.
4. It ALSO asserts an EDIT via an override file: writing `.content-import/overrides/<that questionKey>.json`
   with a new `text` and re-running `importOfficial` changes the question's `text` in place (same `id`) while
   the same three user-progress rows still exist and still reference valid ids.
5. `afterAll` CLEANS UP: deletes the throwaway user (FK-safe — user first so its sessions/answers/mistakes/saved
   cascade), removes the throwaway override file, and RESTORES the mutated official question's original `text`
   (so sibling suites and `db:seed` state are unaffected). The KNOWN official question itself is NOT deleted.
6. `npm run test:integration` exits 0 with ZERO failures AND
   `npx vitest list --config vitest.integration.config.ts` includes `content-upsert.integration.test.ts`.

## Constraints / decisions
- **Evaluate: yes** — this is THE data-preservation guarantee. A vacuous/gamed test (e.g. asserting rows it just
  created without ever re-running the import, or not checking id equality) would mask exactly the data loss this
  wave prevents. An independent judge confirms the test genuinely re-imports and checks id stability.
- Reuse the ONE importer: `import { importOfficial }` (relative `../../scripts/import-official` or the `@/` alias
  if it resolves) and pass the suite's `@/lib/db` `prisma` — mirrors how `prisma/seed.ts` reuses it.
- Pick the known question by QUERY (`findFirst` official + `questionKey != null` + has options), not a hard-coded
  key, so the test is robust to content changes.
- Depends on tasks 05 (id-preserving upsert), 06 (override layer), 07 (official-only seed). If `importOfficial`
  still delete-recreates, this test FAILS — that is the point; do NOT weaken it to pass. Block on 05/06 if their
  behavior isn't in place.
- Non-Goal: do NOT modify `importOfficial`, the schema, or other suites. This task ONLY adds the test (+ uses the
  override file path it cleans up). Keep `vitest.integration.config.ts` as-is (the glob already picks up
  `*.integration.test.ts`).

## Plan
- [x] Write the suite: `beforeAll` provisions user + the three progress rows on a queried official question;
      capture ids.
- [x] Test A: re-run `importOfficial`; assert same question id, same option id, all three rows survive + valid.
- [x] Test B: override-edit the text; re-run; assert text changed in place + rows survive.
- [x] `afterAll`: delete user (cascade), remove override file, restore original text.
- [x] `npm run db:seed` then `npm run test:integration`; confirm the file is listed + green.

## Done
- [x] Suite `lib/server/content-upsert.integration.test.ts` written: `beforeAll` fixture, Test A (re-import id +
      progress preserved), Test B (override-edit in place), FK-safe `afterAll` cleanup.
- [x] Full `verify.sh` green: db:seed imports 1691 official questions; `npx vitest list` includes the file;
      `npm run test:integration` → 19 files / 66 tests passed, zero failures.

## Next
- [ ] (none — Goal fully met; Status: done. Driver re-runs verify.sh.)

## Artifacts
- `lib/server/content-upsert.integration.test.ts` — re-import-preserves-progress + override-edit guarantee.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 15:39Z ClPcs-Mac-mini: confirmed the suite was already fully written (beforeAll fixture queries the
  first OFFICIAL question w/ a keyed option, attaches UserMistake+SavedQuestion+TestAnswer via a throwaway
  session; Test A asserts re-import keeps the same question/option ids + all 3 rows valid; Test B writes a
  `.content-import/overrides/<qKey>.json` and asserts edit-in-place + survival; afterAll deletes user (cascade),
  rms override file, restores original text). Ran verify.sh end to end → GREEN: db:seed upserted 1691 official
  Qs; `npx vitest list` includes content-upsert.integration.test.ts; `npm run test:integration` = 19 files /
  66 tests passed, 0 failures. Goal fully met → Status: done.

## Verify
**Last verify:** PASS (2026-06-23T15:41:31Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T15:44:22Z)
