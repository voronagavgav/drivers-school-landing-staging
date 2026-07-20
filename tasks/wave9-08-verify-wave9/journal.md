# Task: wave9-08-verify-wave9

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec §F — Wave-9 acceptance gate. VERIFY-ONLY: write NO new feature code. PASS = ALL true:

1. `npm run typecheck` exits 0.
2. `npm test` exits 0 with ZERO failures, AND `npx vitest list` (capture-to-var) INCLUDES BOTH
   `lib/content-stats.test.ts` AND `lib/content-flags.test.ts`.
3. `npm run db:seed` exits 0, THEN `npm run test:integration` exits 0 with ZERO failures, AND
   `npx vitest list --config vitest.integration.config.ts` INCLUDES
   `lib/server/content-stats.integration.test.ts`.
4. `npm run build` exits 0.
5. Static:
   - `lib/content-stats.ts` exports `summarizeQuestion` and is PURE (none of `server-only`/`@/lib/db`/
     `@prisma/client`/`lib/generated`/`Math.random`/`Date.now`/`new Date`);
   - `lib/content-flags.ts` exports `flagQuestion` and is PURE (same token set);
   - `app/admin/content-health/page.tsx` exists and contains a `requireContentManager` call;
   - the nav link `/admin/content-health` (label «Якість контенту») is present in `app/admin/layout.tsx`;
   - NO schema change: `prisma/schema.prisma` is identical to the wave base
     (`git diff --quiet "$WAVE9_BASE" -- prisma/schema.prisma`, base default `470cc83`).

## Constraints / decisions
- **Evaluate: yes** — final correctness gate for the wave; an independent judge re-confirms the checks ran
  GREEN for real (not stubbed/skipped) before the wave is declared done. Mirrors wave7-09 / wave8-06.
- VERIFY-ONLY. On ANY failure: record it in the Log, set THIS task `blocked`, and REOPEN the responsible
  upstream task (02–07) rather than patching the code here. Fixing a genuinely-broken OWN gate line (a
  documented SIGPIPE / `set -e` / grep-dialect flake per CLAUDE.md) is allowed and must be logged;
  weakening a real check is NOT.
- The "NO schema change" check pins the wave base SHA (`WAVE9_BASE`, default `470cc83` — the wave-9 spec
  commit). If that ref is unavailable in the environment, set `WAVE9_BASE` to the pre-wave commit; a
  missing base FAILS loudly (it must not silently pass).
- Behaviour must be additive: the FULL integration suite stays green (proof the new read-only aggregation
  did not disturb existing flows). Out of scope: any new recorded signal, a `QuestionStat` table,
  learner-facing surfacing, analytics-dashboard changes.

## Plan
- [x] Run `verify.sh` (all §F criteria end-to-end).
- [ ] On a fail: Log + mark blocked + reopen the responsible upstream task; do not patch here.

## Done
- [x] Ran `verify.sh` end-to-end — GATE PASS (exit 0), all §F-1…§F-5 green.

## Next
- [ ] (none — gate green; awaiting judge re-confirmation per Evaluate: yes).

## Artifacts
- `tasks/wave9-08-verify-wave9/verify.sh` — the executable Wave-9 acceptance gate.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 21:25 UTC ClPcs-Mac-mini: ran `verify.sh` end-to-end → GATE PASS (exit 0).
  §F-1 typecheck 0; §F-2 unit 292/292 pass, `npx vitest list` includes BOTH
  lib/content-stats.test.ts + lib/content-flags.test.ts; §F-3 db:seed OK (upserted 1691
  official questions / 63 topics), integration 65/65 pass across 19 files, integration list
  includes content-stats.integration.test.ts; §F-4 build 0; §F-5 static surface present
  (summarizeQuestion + flagQuestion pure; content-health page calls requireContentManager;
  nav link «Якість контенту» → /admin/content-health) and NO schema change vs WAVE9_BASE=470cc83.
  No fixes needed; Status → done. Wave-9 acceptance gate is green.

## Verify
**Last verify:** PASS (2026-06-23T21:26:27Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T21:27:59Z)
