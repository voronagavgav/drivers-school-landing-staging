# Task: wave8-06-verify-wave8

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec §D — Wave-8 acceptance gate. VERIFY-ONLY: write NO new feature code. PASS = ALL true:
1. `npm run typecheck` exits 0.
2. `npm test` exits 0, ZERO failures.
3. `npm run db:seed` exits 0 (official-only seed), THEN `npm run test:integration` exits 0 with ZERO
   failures, AND `npx vitest list --config vitest.integration.config.ts` (capture-to-var) does NOT include
   `demo-retired.integration.test.ts`.
4. `npm run build` exits 0.
5. `grep -rnE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/ --exclude-dir=generated` finds NOTHING.
6. PRESERVED: `prisma/schema.prisma` still declares the `Question.isDemo` and `Question.sourceType`
   columns; `lib/constants.ts` `SOURCE_TYPES` still contains `"DEMO"`; and `lib/validation.ts` still has the
   `(q.sourceType === "DEMO") === (q.isDemo === true)` refine.

## Constraints / decisions
- **Evaluate: yes** — final correctness gate for the wave; an independent judge re-confirms the checks ran
  GREEN for real (not stubbed/skipped) before the wave is declared done. Mirrors wave7-09.
- VERIFY-ONLY. On any failure: record it in the Log, set THIS task `blocked`, and REOPEN the failing
  upstream task (02–05) rather than patching the code here. Fixing a genuinely-broken OWN gate line (a
  documented SIGPIPE/`set -e`/grep-dialect flake per CLAUDE.md) is allowed and must be logged; weakening a
  real check is NOT.
- The §D-5 grep is scoped to `lib/`+`app/` with the generated client excluded — do NOT widen it (migration
  SQL comments in `prisma/` and the generated client legitimately retain history and are out of scope).
- Behaviour must be UNCHANGED across the wave: the full integration suite stays green, which is the proof the
  removed `isDemo:false` filter was a true no-op (zero demo rows after the official-only seed).
- Out of scope (must NOT have happened): dropping `isDemo`/`sourceType` columns or the `DEMO` enum value; any
  content/image/key change.

## Plan
- [x] Run `verify.sh` (all six §D criteria end-to-end).
- [ ] On a fail: Log + mark blocked + reopen the responsible upstream task; do not patch here.

## Done
- [x] Ran `verify.sh` end-to-end — all six §D criteria GREEN; `GATE PASS` printed.

## Next
- [ ] (none — gate green; wave done. Driver re-runs verify.sh as confirmation.)

## Artifacts
- `tasks/wave8-06-verify-wave8/verify.sh` — the executable Wave-8 acceptance gate.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T19:58Z ClPcs-Mac-mini: ran `verify.sh` end-to-end. ALL six §D criteria GREEN —
  §D-1 typecheck exit 0; §D-2 unit 283 passed / 0 fail; §D-3 `db:seed` upserted 1691 official questions
  (63 topics) then integration 18 files / 63 tests passed, `demo-retired` absent from `vitest list`;
  §D-4 `next build` exit 0; §D-5 no `SERVE_DEMO_QUESTIONS|demoWhere` under lib/ app/; §D-6 schema
  `isDemo`/`sourceType`, constants `"DEMO"`, validation DEMO↔isDemo refine all preserved. `GATE PASS`.
  No code changed (verify-only). Status → done.

## Verify
**Last verify:** PASS (2026-06-23T16:59:36Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T17:01:00Z)
