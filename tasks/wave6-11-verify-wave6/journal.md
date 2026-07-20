# Task: wave6-11-verify-wave6

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec H — Wave-6 acceptance gate. VERIFY-ONLY: write NO new feature code. Pass = ALL true:
1. `npm run typecheck` exits 0.
2. `npm test` exits 0 with ZERO failures AND `npx vitest list` includes the resolver/render unit tests
   (`lib/image-resolve.test.ts`).
3. `npm run db:seed` exits 0 reporting official ≥1000 + demo ≥24, THEN `npm run test:integration` exits 0
   with ZERO failures AND `npx vitest list --config vitest.integration.config.ts` includes the q-image route
   test (`lib/server/q-image-route.integration.test.ts`).
4. `npm run build` exits 0.
5. Migration applied: `Question.imageKey` exists (grep `prisma/schema.prisma` for `imageKey` + an
   `@@index([imageKey])`); the `prisma/schema.prisma` diff vs the wave's base is ONLY the column+index.
6. Static presence: `imageCandidatePaths` AND `resolveImageSrc` are exported from `lib/image-resolve.ts` and
   PURE (purity grep clean); `app/api/q-image/[key]/route.ts` exists; `app/(app)/practice/page.tsx` filters
   topics by servable+category (greps for the demo rule + category filter); `scripts/import-official.ts`
   sets `imageKey` and no longer writes a served `/official-images/` `imageUrl`.

## Constraints / decisions
- **Evaluate: yes** — this is the wave's final correctness gate; an independent judge re-confirms the
  checks genuinely ran green (not stubbed/skipped).
- NO new feature code. If a check fails: record the failure in the Log, set this task `blocked`, and reopen
  the failing UPSTREAM task (02–10) rather than patching here.
- The seed+integration step needs official content present locally; if `.content-import/import_plan.json`
  is missing the gate FAILS (criterion 3 cannot be met) — that is a real fail, not a skip.
- Run the optional `npm run audit:browser` against the non-localhost origin if practicable (CLAUDE.md
  REAL-TRANSPORT GATE) and note the result; it is informational here, the booleans above are the gate.

## Plan
- [x] Run typecheck, `npm test` (+vitest list), `db:seed`, `test:integration` (+vitest list), `build`.
- [x] Run the static greps for criteria 5–6.
- [x] On any fail: Log it, mark blocked, reopen the upstream task. (Only failure was a flaky gate bug, not upstream code — fixed in-place per CLAUDE.md.)

## Done
- [x] Ran `verify.sh` — full gate now PASSES end-to-end (exit 0): `GATE PASS: Wave 6 acceptance — official=1691 demo=25, all checks green`.

## Next
- [ ] (none — Wave-6 acceptance gate is green; task done.)

## Artifacts
- `tasks/wave6-11-verify-wave6/verify.sh` — fixed flaky SIGPIPE lines 13 & 24 (capture `vitest list` to a var, then `grep -q`); no real check weakened.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 10:47 UTC ClPcs-Mac-mini: First gate run FAILED at H.2 on `npx vitest list | grep -q "lib/image-resolve.test.ts"` — but the resolver unit test DOES exist and IS in the suite (266 unit + 67 integration tests all green; both `lib/image-resolve.test.ts` and `lib/server/q-image-route.integration.test.ts` confirmed present via captured `vitest list`). Root cause = the documented SIGPIPE trap (bit wave2-ux-02): `grep -q` closes the pipe on first match, SIGPIPE-killing vitest → non-zero under `set -o pipefail` (timing-dependent; 5/5 PASS in isolation). NOT an upstream code failure. Fixed the gate's OWN lines 13 & 24 to capture the list to a var first (`vlist=$(… || true); echo "$vlist" | grep -q …`) — preserves the exact "test file in suite" check, removes flakiness (CLAUDE.md sanctions fixing a broken own-gate). Re-ran full gate → exit 0, all six criteria met: typecheck 0; npm test 266/266; db:seed official=1691≥1000 + demo=25≥24; integration 67/67; build 0; schema has `imageKey String?` + `@@index([imageKey])` + migration dir; static presence + purity all green. `audit:browser` is optional/informational (booleans are the gate) — not run this tick. Status → done.

## Verify
**Last verify:** PASS (2026-06-23T10:49:10Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T10:51:02Z)
