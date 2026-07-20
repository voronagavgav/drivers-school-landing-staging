# Task: mvp-finish-01-investigate-stats-and-trend-wiring

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
INVESTIGATION ONLY — no source/schema changes. Establish the ground truth both features
(A: admin per-question stats; B: dashboard readiness trend) depend on, recorded in
this journal's `## Findings`. Each numbered item is a boolean check the findings must answer.

1. `## Findings` records the CURRENT baseline: `npm test` exits 0 with the exact passing
   count + file count printed by vitest (today: 4 files / 33 tests — re-confirm and record).
2. `## Findings` records the pure-function + test conventions in `lib/`: pure modules use
   named `export function` + a `/** */` JSDoc and import only from `@/lib/constants` (no DB);
   `lib/*.test.ts` uses vitest `describe/it/expect` and imports from `./<module>` relatively.
3. `## Findings` records the `TestAnswer` shape and aggregation convention: `TestAnswer` has
   `questionId`, `isCorrect`, relation `question` (with `text`, `topicId`, `isDemo`, relation
   `topic.title`). Confirm `lib/server/progress.ts` does `prisma.testAnswer.findMany` + in-memory
   grouping, then calls pure functions in `lib/progress.ts` — the DB→pure pattern task 04 must follow.
4. `## Findings` confirms `lib/server/admin.ts` is the home for the admin aggregation helper
   (read-only query module; pages import from it) and records how `app/admin/questions/page.tsx`
   renders questions today (it imports `DemoBadge` from `@/components/ui` and renders it when
   `q.isDemo`) — so task 05 can add a stats section there preserving the DemoBadge requirement.
5. `## Findings` confirms `readinessTrend(scores: number[])` is ALREADY implemented and exported
   from `lib/progress.ts` and unit-tested in `lib/progress.test.ts` (Part B is wiring only, no
   re-implementation), and records the three required Ukrainian trend labels verbatim:
   IMPROVING→«Динаміка: вгору», DECLINING→«Динаміка: вниз», STABLE→«Динаміка: стабільно».
6. `## Findings` records the `ProgressSnapshot` shape (`userId`, `categoryId?`, `readinessScore: Float`,
   `createdAt`, `@@index([userId, createdAt])`) and the decision for task 06: load the signed-in
   user's recent snapshots scoped by selected category, ordered oldest→newest, mapped to
   `readinessScore` numbers — mirroring the module-local window const (`RECENT_EXAM_WINDOW`)
   already in `lib/server/progress.ts`.
7. `## Findings` confirms NO file `lib/question-stats.ts` exists yet and `grep -rn
   "summarizeQuestionPerformance" lib/` returns nothing (no collision), and that
   `prisma/schema.prisma` needs NO change for either feature.

## Constraints / decisions
- Read-only. Do NOT edit any source, test, or schema file. Only write `## Findings` in THIS journal.
- Non-Goal: designing the exact algorithm/SQL — that is tasks 02/04. Here we confirm conventions,
  data shapes, render locations, and baseline only.
- This is a BATCH of two independent features; one investigation covers both so the implementation
  tasks share a single grounding reference.

## Plan
- [x] Run `npm test`; capture file + passing counts.
- [x] `ls lib/question-stats.ts` (expect missing) and `grep -rn "summarizeQuestionPerformance" lib/` (expect none).
- [x] Read `lib/progress.ts`, `lib/progress.test.ts`, `lib/server/progress.ts`, `lib/server/admin.ts`,
      `app/(app)/dashboard/page.tsx`, `app/admin/questions/page.tsx`, and the `TestAnswer`/`ProgressSnapshot`/`Question`
      models in `prisma/schema.prisma`; write `## Findings`.

## Done
- [x] Captured baseline: `npm test` (vitest run) exits 0 — 4 files / 33 tests passing.
- [x] Confirmed no collision (no `lib/question-stats.ts`, no `summarizeQuestionPerformance`) and no schema change needed (item 7).
- [x] Read all seven source/schema references and wrote `## Findings` items 2–7 (conventions, `TestAnswer`/DB→pure pattern, admin helper home + `DemoBadge`, `readinessTrend` already done + trend labels, `ProgressSnapshot` + task 06 decision).

## Next
- [ ] Investigation complete — all `## Findings` items 1–7 recorded, all verify anchors present.
      Proceed to task `mvp-finish-02-create-question-stats-pure` (create `lib/question-stats.ts`).

## Findings
### 1. Baseline (item 1)
`npm test` → `vitest run` exits 0. vitest prints: **Test Files 4 passed (4)**, **Tests 33 passed (33)**
(captured 2026-06-17). No failures. This is the green baseline tasks 02–07 must preserve.

### 2. Pure-function + test conventions in `lib/` (item 2)
Pure modules (`lib/progress.ts`) use named `export function`, each preceded by a `/** … */` JSDoc,
and import ONLY from `@/lib/constants` (constants + the `ReadinessLevel` type) — no DB, no
`server-only`. Co-located interfaces (`TopicStat`, `ReadinessInput`, …) are `export interface`.
Tests (`lib/progress.test.ts`) `import { describe, it, expect } from "vitest"` and import the
functions under test from `"./progress"` (relative). Layout: one `describe("progress.<fn>", …)`
per function, `it(...)` cases asserting with `expect(...).toBe/.toEqual`. → task 02 creates
`lib/question-stats.ts` (named `export function` + JSDoc, `@/lib/constants`-only); task 03 mirrors
this in `lib/question-stats.test.ts` (`describe("question-stats.summarizeQuestionPerformance", …)`,
import from `"./question-stats"`).

### 3. `TestAnswer` shape + DB→pure pattern task 04 must follow (item 3)
`model TestAnswer` fields: `id`, `testSessionId`, `testSession`, `questionId`, `question`
(relation→`Question`), `selectedOptionId`, `selectedOption`, `isCorrect` (Boolean), `answeredAt`,
`timeSpentSeconds`; `@@unique([testSessionId, questionId])`, `@@index([questionId])`. The
`question` relation exposes `text`, `topicId`, `isDemo`, and relation `topic` → `topic.title`.
`lib/server/progress.ts` `computeProgress` does `prisma.testAnswer.findMany({ where: { testSession:
sessionWhere }, include: { question: { include: { topic: true } } } })`, then GROUPS rows in-memory
into a `Map<topicId, {title, answered, correct}>`, then calls the PURE `topicStats` /
`detectWeakTopics` / `estimateReadiness` from `@/lib/progress`. → task 04's `getQuestionPerformance`
follows this fetch→group→pure pattern, grouping by `questionId` (carrying `text`/`isDemo`) and
calling the pure `summarizeQuestionPerformance`.

### 4. Admin helper home + question render location (item 4)
`lib/server/admin.ts` is the read-only query module (`import "server-only"`, `prisma` from
`@/lib/db`; header comment: "Queries only — mutations live in app/admin/actions.ts"). Pages import
from it — `app/admin/questions/page.tsx` does `import { listQuestions } from "@/lib/server/admin"`.
→ task 04's `getQuestionPerformance` belongs here under the existing "Questions" section.
`app/admin/questions/page.tsx` is a server component (`const questions = await listQuestions(active)`)
rendering a `<ul>` of `<Card>`s; it imports `{ Badge, Card, DemoBadge, LinkButton } from
"@/components/ui"` and renders `{q.isDemo && <DemoBadge />}` per question. → task 05's stats section
must keep that `DemoBadge` for demo questions.

### 5. `readinessTrend` already implemented; Part B is wiring only (item 5)
`readinessTrend(scores: number[]): "IMPROVING" | "DECLINING" | "STABLE"` is already implemented &
exported in `lib/progress.ts` (compares latest vs mean of the earlier scores; band =
`READINESS_TREND_THRESHOLD` = 5; `<2` scores → STABLE; pure — does not mutate `scores`). Already
unit-tested in `lib/progress.test.ts` under `describe("progress.readinessTrend")` (empty/single →
STABLE, rising → IMPROVING, falling → DECLINING, flat → STABLE). NO re-implementation needed.
Required Ukrainian trend labels (verbatim) for the dashboard label map:
- IMPROVING → «Динаміка: вгору»
- DECLINING → «Динаміка: вниз»
- STABLE → «Динаміка: стабільно»

### 6. `ProgressSnapshot` shape + task 06 decision (item 6)
`model ProgressSnapshot`: `id`, `userId`, `user`, `categoryId?` (String?), `totalAnswered`,
`uniqueAnswered`, `accuracy` (Float), `readinessLevel`, `readinessScore` (Float), `weakTopicsJson`,
`createdAt`; `@@index([userId, createdAt])`. → task 06's `getRecentReadinessScores` in
`lib/server/progress.ts`: load the signed-in user's recent snapshots scoped by selected category
(`where: { userId, categoryId }`), ordered oldest→newest, mapped to `readinessScore` numbers
(ready to feed `readinessTrend`). Mirror the existing module-local window const pattern
(`RECENT_EXAM_WINDOW = 5` at top of `lib/server/progress.ts`) — add an analogous
`RECENT_READINESS_WINDOW`.

### 7. No collision; no schema change (item 7)
`ls lib/question-stats.ts` → "No such file or directory" (file does NOT exist). `grep -rn
"summarizeQuestionPerformance" lib/` → no matches. No collision — task 02 creates the file/function
fresh. `prisma/schema.prisma` needs NO change for either feature: `TestAnswer`+`Question` already
expose everything Part A needs, and `ProgressSnapshot.readinessScore` already exists for Part B.

## Artifacts
- tasks/mvp-finish-01-investigate-stats-and-trend-wiring/verify.sh — baseline + findings-populated gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T09:05Z ClPcs-Mac-mini: ran `npm test` → 4 files / 33 tests passing, exit 0. Recorded baseline (Findings item 1). Next: ls/grep no-collision check.
- 2026-06-17T09:20Z ClPcs-Mac-mini: fixed prior verify FAIL (Findings missing anchors). Ran ls/grep no-collision check; read progress.ts/.test.ts, server/progress.ts, server/admin.ts, dashboard + admin/questions pages, and TestAnswer/ProgressSnapshot/Question models. Wrote Findings items 2–7 (anchors TestAnswer, readinessTrend, ProgressSnapshot, DemoBadge, question-stats + the three trend labels). Investigation complete → Status: done.


## Verify
**Last verify:** PASS (2026-06-17T06:09:00Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T06:10:23Z)
