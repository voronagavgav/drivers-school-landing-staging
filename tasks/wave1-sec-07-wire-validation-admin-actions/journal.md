# Task: wave1-sec-07-wire-validation-admin-actions

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Validate the admin create/update mutations via the shared zod approach (spec section A: "all admin
create/update mutations"). Preserve the exact Ukrainian `FormState` error copy and server-side RBAC.
`imageUrl` scheme validation is intentionally DEFERRED to task 08 (this task leaves `imageUrl` as a
plain optional string).

1. `lib/validation.ts` gains and exports admin schemas with Ukrainian messages:
   `adminQuestionSchema` (text ≥3, 2–5 options with exactly/at-least one correct, optional topicId /
   contentVersionId, difficulty int, sourceType ∈ SOURCE_TYPES, isDemo boolean, imageUrl optional
   string — NO scheme check here), `adminCategorySchema` (code non-empty, title non-empty),
   `adminTopicSchema` (title non-empty), `adminContentVersionSchema` (name non-empty).
2. `app/admin/actions.ts` imports these schemas and the create/update mutations parse with them BEFORE
   any `prisma.*` write: `createQuestion`/`updateQuestion` → `adminQuestionSchema`;
   `createCategory`/`updateCategory` → `adminCategorySchema`; `createTopic`/`updateTopic` →
   `adminTopicSchema`; `createContentVersion`/`updateContentVersion` → `adminContentVersionSchema`.
   On a failed parse each returns `{ error: <Ukrainian message> }` (FormState) and writes nothing.
3. RBAC is unchanged: every mutation still calls `requireContentManager()` first (the count of
   `requireContentManager()` invocations in the file is ≥ 12, same as before).
4. The existing Ukrainian validation messages are preserved (these literal strings still appear in the
   file or schemas): «щонайменше 3 символи», «щонайменше 2 варіанти», «Позначте правильну відповідь»,
   «Вкажіть код категорії», «Вкажіть назву теми», «Вкажіть назву версії».
5. Admin schemas are unit-tested: `lib/validation.test.ts` references `adminQuestionSchema` with at
   least one valid and one invalid case.
6. This task does NOT reference `safeImageUrl` in `app/admin/actions.ts` (imageUrl scheme validation is
   task 08). `npm run typecheck` exits 0 and `npm test` exits 0 (zero failures).

## Constraints / decisions
- Edit `lib/validation.ts` (add admin schemas), `app/admin/actions.ts` (wire them), and
  `lib/validation.test.ts` (admin schema tests). Do not touch other files.
- Mirror the CURRENT messages and acceptance rules exactly so admin behaviour does not regress — the
  inline checks (`text.length < 3`, `options.length < 2/ > 5`, `some(isCorrect)`, code/title/name
  required) become schema rules with the same Ukrainian strings.
- FormData multi-value fields (`categoryIds` via `getAll`) must still be read correctly — parse them
  before/alongside the schema (e.g. validate the scalar fields with zod and keep the existing
  `getAll("categoryIds")` handling). Keep `parseOptions` for option extraction; the schema validates
  the resulting option array (count + has-correct).
- Keep `requireContentManager()` as the FIRST statement of every mutation (RBAC server-side; never
  trust the client). Validation is added AFTER the RBAC gate, BEFORE the DB write.
- Non-Goal: imageUrl scheme rejection (task 08); the publish/unpublish/archive/toggle id-only actions
  keep their existing `if (!id) return` guard (no schema required).

## Plan
- [x] Add the four admin schemas to `lib/validation.ts` (reuse SOURCE_TYPES; keep Ukrainian messages).
- [x] Wire each create/update mutation to parse → `{ error }` on failure, after `requireContentManager()`.
- [x] Add `adminQuestionSchema` valid/invalid cases to `lib/validation.test.ts`.
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] Added `adminQuestionSchema`, `adminCategorySchema`, `adminTopicSchema`, `adminContentVersionSchema`
  to `lib/validation.ts` (imports `SOURCE_TYPES`; mirrors inline rules + exact Ukrainian copy;
  imageUrl left a plain optional string per non-goal). typecheck=0, test=76 pass.
- [x] Wired all 8 create/update mutations in `app/admin/actions.ts`: imported the four schemas +
  `firstIssueMessage`; each mutation computes its field vars then `schema.safeParse({...})` AFTER
  `requireContentManager()` (and after the id-only guards) and BEFORE any `prisma.*` write, returning
  `{ error: firstIssueMessage(parsed.error) }` on failure. Question fields are computed once and reused
  in the write (no duplicate `intOr`/`sourceTypeOr` calls). `getAll("categoryIds")`, id/clash/existing
  guards, and the 12 `requireContentManager()` calls are intact. imageUrl left optional (task 08).
  typecheck=0, test=76 pass.

## Next
- (none — goal met; verify.sh PASS) Task complete: admin schemas added, all 8 mutations wired after
  RBAC and before the DB write, Ukrainian copy preserved, and `adminQuestionSchema` is unit-tested
  (1 valid + 4 invalid cases). typecheck=0, test=81 pass, verify.sh EXIT=0.

## Artifacts
- lib/validation.ts — admin schemas added
- app/admin/actions.ts — admin mutations validated via zod
- lib/validation.test.ts — admin schema cases
- tasks/wave1-sec-07-wire-validation-admin-actions/verify.sh — schemas + wiring + RBAC-intact + typecheck/test

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T11:21Z ClPcs-Mac-mini: added the four admin schemas to lib/validation.ts
  (adminQuestionSchema + adminCategory/Topic/ContentVersion schemas), importing SOURCE_TYPES.
  Reused exact Ukrainian messages; option array validated for 2–5 count + ≥1 correct via
  z.array().min/.max/.refine; imageUrl kept optional string (scheme check deferred). `npm run
  typecheck` exit 0; `npm test` 76 pass.
- 2026-06-17T11:25Z ClPcs-Mac-mini: fixed the prior verify FAIL (actions.ts not importing
  @/lib/validation) by wiring all 8 create/update mutations in app/admin/actions.ts. Imported the
  four admin schemas + firstIssueMessage; each mutation now `schema.safeParse({...})` after the RBAC
  gate (and after id-only guards) and before the prisma write, returning
  `{ error: firstIssueMessage(parsed.error) }` on failure. Followed the app/actions/auth.ts pattern.
  Question fields computed once and reused in the write. RBAC (12 calls), categoryIds getAll, and the
  clash/existing guards untouched; no safeImageUrl reference. `npm run typecheck` exit 0; `npm test`
  76 pass. Remaining: add the adminQuestionSchema test case (verify step 5).
- 2026-06-17T11:27Z ClPcs-Mac-mini: fixed the verify FAIL (test file did not reference
  adminQuestionSchema). Imported `adminQuestionSchema` into lib/validation.test.ts and added a
  `describe("validation.adminQuestionSchema")` block mirroring the existing describe/it/safeParse
  style: 1 valid case (text≥3, 2 options w/ one isCorrect, difficulty int, sourceType DEMO, isDemo)
  → success; 4 invalid cases (text<3, <2 options, no correct option, bad sourceType) → fail.
  `npm run typecheck` exit 0; `npm test` 81 pass (was 76). Ran verify.sh → EXIT=0 PASS. Status: done.



## Verify
**Last verify:** PASS (2026-06-17T08:27:27Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:28:27Z)
