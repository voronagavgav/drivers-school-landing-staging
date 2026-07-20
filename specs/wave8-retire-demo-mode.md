# Wave 8 — Retire the demo-serving dual-mode (official-only cleanup)

Demo content is gone (Wave 7). This removes the now-VESTIGIAL `SERVE_DEMO_QUESTIONS` / `demoWhere`
withholding mechanism and the test scaffolding it forced, leaving the live pools to simply serve all
published+active questions. Mechanical cleanup — behaviour is UNCHANGED (with zero demo rows, `isDemo:false`
filtering is already a no-op), so the whole suite must stay green.

RULES (from CLAUDE.md):
- Tests on every change; final task runs `npm run build`. No schema change. Preserve Ukrainian copy + legal.
- KEEP the `Question.isDemo` / `sourceType` COLUMNS and the `lib/validation.ts` `sourceType==="DEMO" ⇔
  isDemo` consistency refine (harmless data guard) — this wave removes only the SERVING-GATE, not the fields.
- Verify gates: prove inclusion/removal with greps; use `npx vitest list` for file-presence (capture to a
  var first — SIGPIPE/pipefail trap).

## A. Remove the serving gate
- Delete `SERVE_DEMO_QUESTIONS` from `lib/constants.ts` (and its comment block).
- In `lib/server/test-engine.ts`: remove the `SERVE_DEMO_QUESTIONS` import, the `demoWhere` constant and
  its two spreads (`startSession` base pool ~L66 and the MISTAKE_PRACTICE `where` ~L125), and the
  saved-pool `(SERVE_DEMO_QUESTIONS || !q.isDemo)` clause (~L148) → a saved question is served when
  published+active (drop the demo sub-condition). Passing `isDemo` through in the returned shape (~L294)
  may stay (harmless data) or go — driver's choice.
- `app/(app)/practice/page.tsx`: drop the `SERVE_DEMO_QUESTIONS` branch in the per-topic servable count
  (Wave 6 added it) → count is just published+active+category; topic-scoping behaviour unchanged.
- After this, `grep -rE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/` returns NOTHING (generated client +
  historical migration SQL comments excluded).
- `npm run typecheck` exits 0; `npm test` + `npm run test:integration` green.

## B. Delete the obsolete withholding test
- Delete `lib/server/demo-retired.integration.test.ts` (it asserts the withholding that no longer exists).
- `npx vitest list --config vitest.integration.config.ts` no longer lists it; the suite is green without it.

## C. De-duplicate the self-provisioning fixtures
- The ~10 integration suites that hand-roll a throwaway OFFICIAL question (`isDemo:false` + category connect
  + topic + options) did so to work around withheld demo. Extract ONE shared helper (e.g.
  `lib/server/__testutils__/official-question.ts` — `createOfficialQuestion(prisma, {...})` returning the
  created ids, plus a FK-safe `cleanup`) and ADOPT it in the suites where the swap is mechanical
  (engine, finish-idempotency, access-control, exam-short-pool, mixed-weak-topics, saved-excludes,
  progress-volume, due-mistakes, exam-blueprint, analytics-dashboard — whichever apply cleanly).
- The bar is: the helper EXISTS and is used by ≥4 suites, NO suite regresses, the full integration suite is
  green. Do NOT force a risky rewrite of a suite that doesn't map cleanly — leave it self-contained.
- `npm run test:integration` green; the helper is imported by ≥4 `*.integration.test.ts` files.

## D. Wave-8 acceptance gate (verify-only, final)
- No new feature code. PASS only if all hold; on failure record + reopen the failing task:
  1. `npm run typecheck` exits 0.
  2. `npm test` exits 0, ZERO failures.
  3. `npm run db:seed` (official-only) exits 0, then `npm run test:integration` exits 0, ZERO failures,
     and does NOT list `demo-retired.integration.test.ts`.
  4. `npm run build` exits 0.
  5. `grep -rE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/` finds nothing (generated client excluded).
  6. The `isDemo`/`sourceType` columns and the validation refine still exist (NOT removed this wave).

## Out of scope
- Dropping the `isDemo`/`sourceType` columns or the `DEMO` value from the sourceType enum (data fields stay).
- The deeper-statistics work (separate wave).
- Any content, image, or key changes (Waves 6/7 stay as shipped).
