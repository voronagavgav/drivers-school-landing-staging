# Task: wave9-04-server-content-stats

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-24
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §C — server aggregation. Add `lib/server/content-stats.ts` that turns recorded `TestAnswer` data
into per-question rich stats + flags + a topic rollup, COMPUTE-ON-READ (no schema change). Depends on
tasks 02 + 03. PASS = ALL true:

1. `lib/server/content-stats.ts` exists and exports an async `getContentHealth` function returning an
   object with (a) a `questions` array and (b) a `topics` rollup array.
2. It REUSES the pure helpers — imports `summarizeQuestion` from `@/lib/content-stats` and `flagQuestion`
   from `@/lib/content-flags` (does not re-derive accuracy or flag logic).
3. It reads `TestAnswer` via prisma and joins the picked option's `optionKey` + `isCorrect` and the
   `Question`'s `questionKey`, `text`, and `topicId` (these identifiers appear in the source).
4. Each `questions[i]` carries the `summarizeQuestion` stat fields PLUS `questionKey`, `text`, a topic
   label, and a `flags` array (from `flagQuestion`).
5. The `topics` rollup has, per topic, an answered count and a mean accuracy.
6. The `questions` array is ordered FLAGGED-first (questions carrying an actionable flag —
   `WRONG_KEY_SUSPECTED`/`LOW_DISCRIMINATION` — before the rest) THEN hardest-first
   (accuracy ascending, ties by most-answered) — documented in the source and asserted by task 07.
7. `prisma/schema.prisma` is UNCHANGED by this task (`git diff --quiet HEAD -- prisma/schema.prisma`).
8. `npm run typecheck` exits 0.

## Constraints / decisions
- This is a SERVER module: it SHOULD `import "server-only"` and use `@/lib/db` (mirror `lib/server/admin.ts`).
  Purity rules do NOT apply here — they apply to the pure libs (tasks 02/03).
- `requireContentManager()` is NOT called here; the calling page (task 06) enforces it. This helper is a
  read-only query (mirrors the other `lib/server/admin.ts` read helpers).
- EFFICIENCY / correctness of the option set: fetch answers with the joined `selectedOption`
  (`{ optionKey, isCorrect }`) in a bounded query, then fetch the FULL option set per question and MERGE
  never-picked options in as `picks: 0` so `optionCount` and the WRONG_KEY comparison (keyed-correct vs a
  distractor) are accurate even when the correct option was never chosen.
- libsql query-parameter cap (CLAUDE.md, P2029): never pass a ~1k+ id list to a single `where: { id: { in } }`
  — chunk `in` lists to ≤200 when enriching questions/options. Prisma does NOT auto-chunk.
- `getContentHealth` accepts an OPTIONAL `{ minSample }` argument (defaulting to a documented constant,
  e.g. 30) that it forwards to `flagQuestion`. This lets the integration test (task 07) pass a small
  threshold and size its fixture with a handful of answers instead of dozens. The page (task 06) calls it
  with no args (default). Do NOT add a new `ANALYTICS_EVENTS`-style constant unless needed.
- NO PII: select only `optionKey`/`isCorrect`/`timeSpentSeconds`/`questionKey`/`text`/topic — never user
  ids, raw answer text beyond the question stem, emails, etc.
- Non-Goals: a `QuestionStat` DB table, new recorded signals, the page/UI (tasks 05/06), the integration
  test (task 07). NO schema change.

## Plan
- [x] Write `getContentHealth` in `lib/server/content-stats.ts`: fetch+join answers, group per question,
      run `summarizeQuestion` + merge full option set + `flagQuestion`, build topic rollup, order the list.
- [x] `npm run typecheck`; confirm schema untouched.

## Done
- [x] Implemented `getContentHealth` (+ `DEFAULT_MIN_SAMPLE`, `ContentHealth*` types). verify.sh PASS.

## Next
- [ ] (none — Goal met; consumed by tasks 05/06; behaviour asserted by task 07's integration test.)

## Artifacts
- `lib/server/content-stats.ts` — server aggregation (questions + flags + topic rollup).
- `tasks/wave9-04-server-content-stats/verify.sh` — executable gate.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-24 ClPcs-Mac-mini: implemented `getContentHealth` in `lib/server/content-stats.ts`
  (`import "server-only"` + `@/lib/db`, mirrors `lib/server/admin.ts`). One bounded `testAnswer.findMany`
  joins `selectedOption.optionKey` + `isCorrect`/`timeSpentSeconds` (content cols only — no userId/session/PII);
  groups per question, enriches via chunked (≤200) `question.findMany` for `questionKey`/`text`/topic + FULL
  option set, merges never-picked options as `picks:0` so `optionCount`/WRONG_KEY stay accurate, then reuses
  `summarizeQuestion` + `flagQuestion`. Topic rollup = answered count + weighted mean accuracy. Order =
  actionable-flag-first (WRONG_KEY/LOW_DISCRIMINATION; INSUFFICIENT_DATA excluded) then accuracy asc, ties by
  most-answered. `npm run typecheck` exits 0; `prisma/schema.prisma` untouched. verify.sh → PASS.

## Verify
**Last verify:** PASS (2026-06-23T21:03:10Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T21:04:15Z)
