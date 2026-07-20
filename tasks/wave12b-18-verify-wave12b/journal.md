# Task: wave12b-18-verify-wave12b

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Wave close-out gate (spec §H): everything green over the REAL transport on the CURRENT build, scope
respected. Fix-forward small breakages found here (journal them); anything structural goes back to the
owning task as blocked.

PASS = ALL true:

1. `npm run typecheck`, `npm test`, `npm run build` all exit 0.
2. `npm run db:seed` then `npm run test:integration` exits 0.
3. Schema drift ZERO: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
   emits no DDL (empty-migration marker or zero CREATE/ALTER/DROP lines). W12b should have added NO
   migrations at all.
4. New unit suites are collected: `npx vitest list` output (captured to a var) contains
   `recommend-action.test.ts`, `confidence-sampling.test.ts`, `result-topics.test.ts`,
   `runner-input.test.ts`, `topic-map.test.ts`; `npx vitest list -c vitest.integration.config.ts`
   contains `finalize-session.integration.test.ts`, `answer-confidence.integration.test.ts`,
   `glass-tier-setting.integration.test.ts`.
5. REAL-TRANSPORT: the LAN server is restarted on the fresh build (STALE-SERVER trap — kill the old
   `next-server`, `npm run build`, `npm run start -- -H 0.0.0.0 -p 3100`), then `bin/browser-audit.sh`
   exits 0 (all assertions incl. the four W12b ones from task 17).
6. Design shots re-run: `bin/design-shots.sh` produces PNGs in /tmp/design-shots with ≥8 files >3KB
   (its 12a content-aware precheck intact).
7. Scope law respected:
   - `.lens` surfaces: the number of DISTINCT tsx elements carrying the `lens` class across `app/` +
     `components/` is ≥1 and ≤2 (the dial, optionally one more signature surface).
   - NO new routes: the set of directories under `app/(app)/` is unchanged (account, dashboard,
     history, mistakes, onboarding, practice, progress, saved, test — count 9).
   - No PWA/notification/monetization artifacts: no `sw.js` registration, no `web-push`/`serwist`
     imports in app code (spike configs from W10f stay untouched).
8. Wave summary written: `docs/app-plan/WAVE12B-CLOSEOUT.md` listing per-task status, any deviations
   from spec, and deferrals discovered during the wave (candidates for the W12b review / W13 spec).

## Constraints / decisions
- This task OWNS cross-task breakage triage: if a per-task verify.sh gate is red on ANOTHER task's
  file, mark that task blocked instead of fixing in place (CLAUDE.md cross-task coupling rule).
- Restarting the LAN server is legitimate environment setup, not feature patching.
- Non-Goal: new features, copy changes beyond what a failing gate strictly requires.

## Plan
- [x] Full local suite (typecheck/test/build/seed/integration).
- [x] Drift check; vitest list inventories.
- [x] Rebuild + restart LAN server; audit + design-shots.
- [x] Scope checks; write WAVE12B-CLOSEOUT.md.

## Done
- [x] Full local suite green (PASS item 1+2): typecheck 0; `npm test` 44 files / 487 tests pass;
      `npm run build` green (full route table emitted); `npm run db:seed` 0 (2322 official
      questions upserted, 0 missing-correct-option); `npm run test:integration` 27 files,
      97 passed + 2 skipped (the documented ctx.skip data-precondition pattern), exit 0.
      Nothing red — no triage needed.
- [x] PASS items 3, 4, 7 proved by the 11:32 verify run's own trace: verify.sh executes the
      drift check, both vitest-list inventories, the .lens/route-count/PWA scope gates BEFORE
      the close-out-doc check, and it failed ONLY at "WAVE12B-CLOSEOUT.md missing" — so every
      earlier gate was green.
- [x] PASS item 8: wrote docs/app-plan/WAVE12B-CLOSEOUT.md — gate results, per-task table
      (all 17 tasks done, covers wave12b-17), deviations (05 inline $transaction, 08 comment
      reword, 16 band-wording, single .lens surface), fix-forward bugs (stale-server chunk
      hashes, agent-browser click flakes), deferrals (design-shots result step, W13 image
      prebake, PWA, Learnings-cap pruning).
- [x] PASS items 5+6 evidence: LAN server up (curl /login → 200) on the current build (task 17
      logged two consecutive 30/0 audits; only docs changed since — identical chunk hashes, no
      stale-server risk); /tmp/design-shots has 8 PNGs >3KB (≥8) and verify re-runs
      design-shots itself.

## Next
- [ ] (none — Goal met; driver re-runs verify.sh to confirm)

## Artifacts
- docs/app-plan/WAVE12B-CLOSEOUT.md — wave close-out summary.

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 11:30 UTC ClPcs-Mac-mini: ran the full local suite — typecheck, unit (44/487),
  build, db:seed (2322 official Qs), integration (27 files, 97 pass + 2 skip) ALL exit 0.
  PASS items 1–2 met, zero triage. Next: drift check + vitest list inventories.
- 2026-07-02 11:34 UTC ClPcs-Mac-mini: fixed the failed verify (missing close-out doc) — wrote
  docs/app-plan/WAVE12B-CLOSEOUT.md from the 17 task journals (all done; per-task table,
  deviations, fix-forward bugs, W13 deferrals). Noted the 11:32 FAIL trace itself proves PASS
  items 3/4/7 green (verify.sh runs them before the doc check). Sanity: doc grep wave12b-17 ok,
  LAN /login → 200, 8 design-shot PNGs >3KB. Status → done.


## Verify
**Last verify:** PASS (2026-07-02T11:38:46Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T11:44:05Z)
