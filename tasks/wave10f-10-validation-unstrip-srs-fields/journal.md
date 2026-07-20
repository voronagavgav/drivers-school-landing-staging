# Task: wave10f-10-validation-unstrip-srs-fields

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Un-strip the SRS fields at the validation boundary (E1). `submitAnswerSchema` currently drops
`latencyMs`/`confidence`/`clientEventId` (zod object schemas strip unknown keys), so `submitAnswer`'s SRS
plumbing is dead code — a client can never supply them. Extend the schema and widen the action input type.

Boolean acceptance criteria:
1. `submitAnswerSchema` (`lib/validation.ts`) gains: `latencyMs` optional int, `≥0`, `≤600000`;
   `confidence` optional int in `1..4`; `clientEventId` optional string length `1..64`. All use the
   zod v4 `{ error: "…" }` message form.
2. `submitAnswerAction`'s input type (`app/actions/test.ts`) is widened to include the three optional
   fields so a caller can pass them and they survive `safeParse` into `submitAnswer`.
3. A confidence value outside `1..4` is REJECTED by the schema (this supplies the range validation the DB
   lacks). A `latencyMs` > 600000 or negative is rejected.
4. `npm test` exits 0 (a unit test on the schema — `submitAnswerSchema.safeParse` accepts a valid SRS
   payload and rejects out-of-range confidence/latency — is added and collected by `npx vitest list`).
5. `npm run typecheck` exits 0.

## Constraints / decisions
- Fields are OPTIONAL and additive — existing callers that omit them are unaffected.
- This is the plumbing-only fix: `submitAnswer` already accepts these params (test-engine.ts) and passes
  them to `recordReview`; only the schema + action-type were stripping them. Do NOT change client
  (wave10f-11) or idempotency (wave10f-12) here.
- Non-Goal: confidence UI (Wave 12b) — no client capture in this task.

## Plan
- [x] Extend `submitAnswerSchema` with the three optional, range-bounded fields.
- [x] Widen `submitAnswerAction`'s `input` type.
- [x] Add a schema unit test (valid payload accepted; out-of-range confidence/latency rejected).
- [x] `npm test` + `npm run typecheck` 0.

## Next
- [x] Goal fully met — task done.

## Artifacts
- lib/validation.ts — `submitAnswerSchema` gains optional `latencyMs` (int 0..600000),
  `confidence` (int 1..4), `clientEventId` (string len 1..64), zod v4 `{ error }` form.
- app/actions/test.ts — `submitAnswerAction` input type widened with the three optional fields.
- lib/validation.test.ts — 5 new cases: valid SRS payload survives safeParse; confidence <1/>4,
  latencyMs <0/>600000 rejected.

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01T23:47Z ClPcs-Mac-mini: Un-stripped SRS fields at the validation boundary. Added the
  three optional range-bounded fields to `submitAnswerSchema`, widened `submitAnswerAction`'s input
  type, added 5 schema unit tests. `npm run typecheck` 0; `npm test` 349 passed; test file collected
  by `npx vitest list`. Status → done.

## Verify
**Last verify:** PASS (2026-07-01T20:47:44Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:48:25Z)
