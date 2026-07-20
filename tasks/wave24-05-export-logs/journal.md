# Task: wave24-05-export-logs

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-15
**Last compute:** mac-mini

The EXPORTER. Reads a user's `ReviewLog` rows → the py-fsrs optimizer's CSV schema
(`card_id,review_time,review_rating`), filtered to ONLY `engine == REVIEW_ENGINE_VERSION`
(`"fsrs6-bkt2"`) rows — grade semantics segmentation is exactly what the `engine` column exists for.
Pre-bkt2 rows (engine null or an older tag) are EXCLUDED, and the script documents why.

Spec: `specs/wave24-weightfit-harness.md` Deliverable 2. Runs under `tsx --conditions=react-server`.

Depends on: (none hard; independent of the python side). Artifacts:
- `scripts/fsrs-fit/export-logs.ts` (CLI + a pure/queryable `exportUserRevlog(prisma, userId)` entry the
  CLI calls — the REAL entry the integration test also drives).
- `lib/server/fsrs-export.integration.test.ts` (seeded-fixture integration test).

## CSV schema
Header exactly `card_id,review_time,review_rating`. One row per exported ReviewLog:
`card_id` = the row's `questionId`; `review_time` = `reviewedAt` (epoch ms, ascending per card);
`review_rating` = `grade` (1..4). Rows sorted by (card_id, review_time). Only `engine == "fsrs6-bkt2"`.

## Goal
PASS = ALL true:

1. `scripts/fsrs-fit/export-logs.ts` exports `exportUserRevlog(prisma, userId): Promise<string>` (or
   returns rows the CLI serialises) whose query filters `where: { userId, engine: REVIEW_ENGINE_VERSION }`
   (imports `REVIEW_ENGINE_VERSION` from `@/lib/fsrs` — NOT a hard-coded `"fsrs6-bkt2"` literal, so a
   future engine bump follows automatically).
2. The emitted CSV's first line is exactly `card_id,review_time,review_rating`.
3. A header comment in `export-logs.ts` states that pre-`fsrs6-bkt2` rows are excluded and why
   (grade-semantics segmentation).
4. `lib/server/fsrs-export.integration.test.ts` seeds ONE fixture user with mixed ReviewLog rows —
   some `engine:"fsrs6-bkt2"`, some `engine:null`, some `engine:"fsrs6-bkt1"` (or any non-current tag) —
   then calls the REAL `exportUserRevlog` and asserts: (a) ONLY the `fsrs6-bkt2` rows appear (count +
   card_ids), (b) rows are ordered by (card_id, review_time), (c) each `review_rating` equals the seeded
   `grade`. Fixture cleanup deletes ReviewLog + user (FK-safe order per CLAUDE.md).
5. `npx vitest list --config vitest.integration.config.ts` collects `fsrs-export` (token-retry capture
   per CLAUDE.md — var-captured, herestring grep).
6. `npm run -s test:integration` exits 0 (run `npm run -s db:seed` FIRST per CLAUDE.md ordering).
7. `npm run -s typecheck` exits 0.

## Constraints / decisions
- PRODUCTION-PATH: the integration test drives `exportUserRevlog` — the SAME function the CLI `main`
  calls — not a private helper, so the engine filter is exercised on the real query path.
- No real users exist yet; this is the future real-data entry, proven on a seeded fixture now.
- Do NOT write fitted weights anywhere; export is read-only over ReviewLog. Touches no scheduling code.
- `card_id` = questionId is sufficient for the optimizer (per-user export ⇒ one card stream per
  question); document that choice in the header.
- Seed ReviewLog rows directly via `prisma.reviewLog.create` (needs userId + questionId + reviewedAt +
  grade + elapsedDays + mode + engine); reuse `createOfficialQuestion` for FK-valid questions.

## Next
- [x] Author export-logs.ts (query + CSV) and the seeded integration test; run integration + typecheck.
- Goal fully met — nothing left. (If re-opened: exporter is read-only; CLI block guards on argv[1].)

## Artifacts
- `scripts/fsrs-fit/export-logs.ts` — `exportUserRevlog(prisma, userId)` + `REVLOG_CSV_HEADER`; CLI main.
- `lib/server/fsrs-export.integration.test.ts` — seeded mixed-engine fixture, drives the real entry.

## Log
- 2026-07-14 planner: task created.
- 2026-07-15 ClPcs-Mac-mini: Authored `scripts/fsrs-fit/export-logs.ts` — `exportUserRevlog` queries
  `where:{ userId, engine: REVIEW_ENGINE_VERSION }` (imported from `@/lib/fsrs`, no hard-coded literal),
  selects questionId/reviewedAt/grade, orderBy `[{questionId asc},{reviewedAt asc}]`, serialises to
  `card_id,review_time,review_rating` (review_time = reviewedAt epoch ms). Header comment documents the
  pre-bkt2 exclusion + grade-semantics-segmentation rationale + card_id=questionId choice. CLI `main`
  guarded on `argv[1].endsWith("export-logs.ts")`, lazy-imports `@/lib/db`. Authored
  `lib/server/fsrs-export.integration.test.ts` — 3-question fixture user with mixed ReviewLog (3 bkt2, 1
  null, 1 null-on-shared-card, 1 fsrs6-bkt1); drives the real `exportUserRevlog` and asserts only bkt2
  rows appear (count+card_ids, card C excluded), (card_id,review_time) ordering, rating==grade, exact
  header. Ran targeted file (1 pass) → `db:seed` → `npm run -s test:integration` (69 files / 285 tests, 0)
  → `npm run -s typecheck` (0) → `vitest list --config vitest.integration.config.ts` collects fsrs-export.
  All 7 Goal criteria green. Status: done.

## Verify
**Last verify:** PASS (2026-07-15T05:58:03Z)

## Evaluation
**Last evaluation:** PASS (2026-07-15T06:04:28Z)
