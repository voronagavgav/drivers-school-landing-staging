# Task: wave10f-13-gate-adaptive-review

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Gate `ADAPTIVE_REVIEW` out of startable modes (E4). It is client-startable today but unwired — it serves
an unshuffled first-20 labelled «Розумне повторення». Add a `STARTABLE_MODES` subset and validate
`startTestSchema` against it; `ADAPTIVE_REVIEW` stays in `TEST_MODES` for labels/config.

Boolean acceptance criteria:
1. `lib/constants.ts` exports `STARTABLE_MODES` = `TEST_MODES` minus `ADAPTIVE_REVIEW` (i.e. the other 5
   modes), as a typed readonly tuple/array.
2. `startTestSchema` (`lib/validation.ts`) validates `mode` against `STARTABLE_MODES` (not `TEST_MODES`),
   so a POST with `mode=ADAPTIVE_REVIEW` fails validation.
3. `ADAPTIVE_REVIEW` REMAINS in `TEST_MODES` and `MODE_LABEL` (labels/config unaffected).
4. A unit test asserts `startTestSchema.safeParse({ mode: "ADAPTIVE_REVIEW" }).success === false` and that
   a normal mode (e.g. `EXAM_SIMULATION`) still parses; collected by `npx vitest list`.
5. `npm test` exits 0; `npm run typecheck` exits 0.

## Constraints / decisions
- Do NOT remove `ADAPTIVE_REVIEW` from `TEST_MODES` — the mode label/config must survive for Wave 11 to
  flip it into `STARTABLE_MODES` once the queue is wired.
- The integration-level rejection (POST to the start action → rejected) is asserted by wave10f-14; this
  task owns the constant + schema + unit test.
- Non-Goal: wiring the adaptive queue (Wave 11).

## Plan
- [x] Add `STARTABLE_MODES` to `lib/constants.ts`.
- [x] Point `startTestSchema.mode` at `STARTABLE_MODES`.
- [x] Add the schema unit test.
- [x] `npm test` + `npm run typecheck` 0.

## Next
- [x] Define STARTABLE_MODES and repoint startTestSchema. — DONE.

## Artifacts
- `lib/constants.ts` — new `STARTABLE_MODES` (TEST_MODES minus ADAPTIVE_REVIEW) + `StartableMode` type.
- `lib/validation.ts` — `startTestSchema.mode` now `z.enum(STARTABLE_MODES)`.
- `lib/validation.test.ts` — 2 new cases: ADAPTIVE_REVIEW rejected, EXAM_SIMULATION accepted.

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01T23:57Z ClPcs-Mac-mini: Added `STARTABLE_MODES` = TEST_MODES.filter(≠ADAPTIVE_REVIEW)
  (typed via `is Exclude<TestMode,"ADAPTIVE_REVIEW">`) + `StartableMode` in lib/constants.ts;
  repointed `startTestSchema.mode` to `z.enum(STARTABLE_MODES)`; ADAPTIVE_REVIEW stays in
  TEST_MODES/MODE_LABEL. Added 2 unit cases to the existing startTestSchema block. zod v4 `z.enum`
  accepts the filtered (non-`as const`) array fine; typecheck 0, `npm test` 351 passed, `npx vitest
  list` collects both new cases. Status → done.

## Verify
**Last verify:** PASS (2026-07-01T20:57:42Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:58:22Z)
