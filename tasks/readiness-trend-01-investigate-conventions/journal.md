# Task: readiness-trend-01-investigate-conventions

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-16
**Last compute:** cloud-agent

## Goal
INVESTIGATION ONLY — no source code changes. Establish the ground truth the
implementation tasks depend on, and record it in this journal's `## Findings`.

1. Baseline `npm test` exits 0 with exactly 29 passing tests across 4 test files
   (the spec's stated baseline). The exact count printed by vitest is recorded in
   `## Findings`.
2. `## Findings` records the pure-function export pattern in `lib/progress.ts`
   (named `export function`, JSDoc comment, NO DB import — it only imports from
   `@/lib/constants` plus types).
3. `## Findings` records the test pattern in `lib/progress.test.ts`
   (vitest `describe`/`it`/`expect`, importing the functions under test from `./progress`).
4. `## Findings` records the decision that the trend threshold will be a named
   constant `READINESS_TREND_THRESHOLD` (value 5) added to `lib/constants.ts` under
   the "Readiness / progress tuning" section — matching the project convention that
   tuning assumptions are NOT buried in code.
5. `## Findings` confirms `grep -rn "readinessTrend" lib/` returns NO matches
   (no naming collision before implementation).

## Constraints / decisions
- Read-only. Do NOT edit `lib/progress.ts`, `lib/progress.test.ts`, `lib/constants.ts`,
  or any source/schema. Only write findings into THIS journal.
- Non-Goal: designing the algorithm in detail — that is task 03's concern. Here we
  only confirm conventions + threshold placement + baseline.
- The function will accept `number[]` (no DB), so `ProgressSnapshot.readinessScore`
  schema is out of scope; confirm it exists for context only, never modify it.

## Plan
- [x] Run `npm test`; capture the passing count.
- [x] `grep -rn "readinessTrend" lib/` (expect no hits).
- [x] Read `lib/progress.ts`, `lib/progress.test.ts`, `lib/constants.ts`; write `## Findings`.

## Done
- [x] Confirmed baseline: `npm test` exits 0, 4 test files, 29 passing tests.
- [x] Confirmed no `readinessTrend` collision in `lib/` (grep exit 1, no output).
- [x] Recorded export, test, and threshold-placement conventions in `## Findings`.

## Next
- [ ] (none — investigation complete; downstream task 02 adds the constant.)

## Findings
**1. Baseline test count.** `npm test` (= `vitest run`) exits 0:
`Test Files  4 passed (4)` / `Tests  29 passed (29)` — matches the spec's stated
baseline of 29 passing across 4 files.

**2. Export pattern in `lib/progress.ts`.** Pure functions, no DB. The file imports
ONLY from `@/lib/constants` (named value + type imports) — e.g.
`READINESS_MIN_ANSWERS`, `WEAK_TOPIC_ACCURACY_THRESHOLD`, `WEAK_TOPIC_MIN_ANSWERS`,
and `type ReadinessLevel`. A header comment block declares "No DB." Functions are
declared as `export function name(...): ReturnType { ... }` (e.g. `accuracyOf`,
`topicStats`, `detectWeakTopics`, `estimateReadiness`), each preceded by a `/** ... */`
JSDoc one-liner. `readinessTrend` should follow this: `export function readinessTrend`
with a JSDoc comment, importing its threshold from `@/lib/constants`.

**3. Test pattern in `lib/progress.test.ts`.** Vitest: `import { describe, it, expect } from "vitest";`
then `import { ... } from "./progress";` (relative, not `@/`). One `describe("progress.<fn>", ...)`
block per function, named `progress.<functionName>`; `it("...")` cases with `expect(...)`
assertions (`.toBe`, `.toEqual`, `.toBeGreaterThanOrEqual`, `.toBeLessThan`). The new
tests for task 04 should add a `describe("progress.readinessTrend", ...)` block and
import `readinessTrend` from `./progress`.

**4. Threshold-placement decision.** The trend threshold will be a named constant
`READINESS_TREND_THRESHOLD = 5` added to `lib/constants.ts` under the existing
`// ---- Readiness / progress tuning ----` section (lines ~68-74), alongside
`READINESS_MIN_ANSWERS`, `WEAK_TOPIC_ACCURACY_THRESHOLD`, `WEAK_TOPIC_MIN_ANSWERS`.
This matches the project convention (CLAUDE.md): tuning assumptions are configurable
constants, NOT buried in code. It must carry an explanatory `//` comment like its
neighbors. `lib/progress.ts` will import it (named import from `@/lib/constants`).

**5. Collision check.** `grep -rn "readinessTrend" lib/` returns NO matches (exit 1,
empty output) — no naming collision before implementation.

**Context (not in scope to modify):** `ReadinessLevel` is a string-union in
`lib/constants.ts`; `estimateReadiness` returns a `score: number` (0..100). The trend
function takes `number[]` directly (no DB / no `ProgressSnapshot` schema dependency).

## Artifacts
- tasks/readiness-trend-01-investigate-conventions/verify.sh — baseline + findings gate

## Log
- 2026-06-16 cloud-agent: scaffolded by planner.
- 2026-06-16T23:37Z ClPcs-Mac-mini: ran `npm test` (4 files, 29 passed); `grep -rn "readinessTrend" lib/` empty (exit 1); read progress.ts / progress.test.ts / constants.ts; wrote `## Findings` (export + test + threshold-placement conventions, collision check). Investigation complete → Status: done.

## Verify
**Last verify:** PASS (2026-06-16T20:37:28Z)

## Evaluation
**Last evaluation:** PASS (2026-06-16T20:38:05Z)
