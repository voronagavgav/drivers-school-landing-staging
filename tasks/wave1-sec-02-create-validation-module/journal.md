# Task: wave1-sec-02-create-validation-module

**Status:** done   <!-- re-asserted: prior REJECT had no reason (no VERDICT marker); verify re-PASSed -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Create the shared PURE input-validation module (spec section A core). Schemas only — NO action
wiring here (that is tasks 04/05/07). Admin schemas are intentionally OUT of scope (task 07 owns them).

1. A NEW file `lib/validation.ts` exists, imports from `zod`, and is PURE: it MUST NOT import
   `@/lib/db`, `server-only`, `@prisma/client`, or anything under `lib/generated`.
2. It exports these zod schemas, each carrying Ukrainian `.min`/`.regex`/message strings so a failed
   field yields a friendly Ukrainian message:
   - `registerSchema` — `{ name: string ≥2, email: matches the email regex, password: string ≥8 }`.
   - `loginSchema` — `{ email: non-empty string (reasonable max), password: non-empty string (reasonable max) }`.
   - `selectCategorySchema` — `{ categoryId: non-empty string }`.
   - `startTestSchema` — `{ mode: one of TEST_MODES, topicId: optional string | null }`.
   - `submitAnswerSchema` — `{ sessionId: non-empty string, questionId: non-empty string,
     selectedOptionId: string | null, timeSpentSeconds: optional integer ≥ 0 }`.
   - `finishTestSchema` — `{ sessionId: non-empty string }`.
   - `toggleSaveSchema` — `{ questionId: non-empty string, save: boolean }`.
   - `removeSavedSchema` — `{ questionId: non-empty string }`.
3. It exports a pure helper `firstIssueMessage(error)` that takes a `z.ZodError` and returns its first
   issue's message as a `string`, falling back to a generic Ukrainian message (e.g. «Невірні дані.»)
   when there is no issue message. (Used by wiring tasks to turn a parse failure into `{ error }`.)
4. `mode` in `startTestSchema` reuses the `TEST_MODES` union from `@/lib/constants` (type-only or value
   import allowed — `@/lib/constants` is itself pure). The email rule reuses the same email regex shape
   as `app/actions/auth.ts` so register behaviour is unchanged.
5. `npm run typecheck` exits 0. `npm test` exits 0 with the test COUNT UNCHANGED from baseline (this
   task adds no tests — tests land in task 03).

## Constraints / decisions
- ONLY create `lib/validation.ts`. Do NOT modify any action file, do NOT add a test file (task 03),
  do NOT add admin schemas (task 07), do NOT add `safeImageUrl` (tasks 06/08).
- Keep it pure (mirrors `lib/progress.ts` / `lib/test-engine/*` style) so the fast `npm test` gate
  stays DB-free and the schemas are unit-testable in isolation.
- Reuse `EMAIL_RE` semantics from `app/actions/auth.ts` (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) for the email
  field so existing register validation behaviour is preserved exactly.
- Messages MUST be Ukrainian (the app is Ukrainian-only). Do not introduce English user-facing strings.
- Non-Goal: any DB access, FormData parsing helpers tied to a specific runtime, or wiring into actions.

## Plan
- [x] Write `lib/validation.ts`: import `z` from `zod`; define `EMAIL_RE`; define the 8 schemas above.
- [x] Add `firstIssueMessage(err: z.ZodError): string` with a Ukrainian fallback.
- [x] Confirm purity (no DB/server-only import); run `npm run typecheck` && `npm test`.

## Done
- [x] Created pure `lib/validation.ts` with all 8 zod schemas (register/login/selectCategory/startTest/
      submitAnswer/finishTest/toggleSave/removeSaved) + `firstIssueMessage`, Ukrainian messages,
      `EMAIL_RE` reused from auth, `mode` via `z.enum(TEST_MODES)`. Verified: pure (verify.sh grep),
      9 exports present, typecheck exit 0, smoke OK, `npm test` 38 passed (unchanged).

## Next
- [ ] (none — Goal met; schemas consumed by wiring tasks 04/05; admin schemas land in task 07.)

## Artifacts
- lib/validation.ts — shared pure zod schemas + `firstIssueMessage`
- tasks/wave1-sec-02-create-validation-module/verify.sh — export + purity + smoke + typecheck/test gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T11:01Z ClPcs-Mac-mini: wrote pure `lib/validation.ts` (zod v4: `{ error: ... }` param,
  `z.enum(TEST_MODES)`, `EMAIL_RE` from auth.ts). Reworded header comment to drop the literal token
  "server-only" (verify.sh purity grep matches comments, not just imports). typecheck 0, smoke OK,
  `npm test` 38 passed. Status → done.
- 2026-06-17T11:04Z ClPcs-Mac-mini: prior tick's Evaluation was REJECT with no reason
  ("no VERDICT marker emitted — defaulting to REJECT") even though verify PASSed. Re-inspected
  `lib/validation.ts` (all 9 exports present, pure, Ukrainian messages intact) and re-ran verify.sh:
  SMOKE OK, typecheck 0, 38 tests passed (baseline unchanged), final "PASS". No defect found; the
  REJECT was a spurious evaluator default. Status → done (driver re-runs verify + evaluation).

## Verify
**Last verify:** PASS (2026-06-17T08:04:29Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:05:50Z)
