# Task: wave19d-10-verify-wave19d

**Status:** done
**Driver:** auto
**Evaluate:** yes

WAVE GATE — the whole-wave green bar for wave19d (spec §House rules): typecheck + unit + integration +
build + browser audit all pass together, the frozen oracle files are collected + un-skipped, the honesty
gate + draw-side ρ are byte-untouched, and the two binding invariants the wave exists to fix are proven on
the LIVE path (release: top band reachable; study-never-hurts: R2 non-decreasing). This task adds NO
feature code — it runs the aggregate gate and records the result; it may make small, documented
env-setup/ordering fixes (reseed ordering, restart the stale LAN server) but must NOT weaken any check.

## Goal
PASS = ALL true:

1. `npm run -s typecheck` exits 0.
2. `npm run -s test` (pure unit set) exits 0, and includes the three wave19d oracle files un-skipped
   (`readiness-seen-unseen.oracle`, `readiness-factor-mixture.oracle`, `readiness-release.oracle`) — proven
   via a `npx vitest list` token-retry capture — plus the superseded `readiness-estimation.oracle` still
   green.
3. `npm run -s db:seed` then `npm run -s test:integration` exits 0 (seed BEFORE integration, per the
   CLAUDE.md self-heal ordering rule) — including `exam-blueprint.integration.test.ts` (4-strata
   composition), `readiness-release.integration.test.ts` (live never-above + release + study-never-hurts),
   and the rewritten `readiness-estimation.integration.test.ts` (wave19d model). No suite left red or
   force-skipped by wave19d changes (the official-content guards may still skip on a bare DB — that is
   expected, not a failure).
4. `npm run -s build` exits 0 (Next 16 Turbopack default).
5. BROWSER AUDIT green: `"$DRIVER_BROWSER_CMD"`-driven audit (`npm run audit:browser` / `bin/browser-audit.
   sh`) passes against the served app — readiness dial + exam-simulation surfaces reachable and rendering
   (no UI copy changed this wave, so the existing assertions stand). If the LAN server is stale (started
   before this wave's build), restart it per the stale-server learning before auditing.
6. INVARIANTS BYTE-UNTOUCHED: `git diff --quiet HEAD~<wave> -- lib/readiness-honesty.regression.test.ts`
   equivalently — the honesty regression gate file has NOT changed across the wave, and
   `READINESS_TOPIC_CORRELATION` is still `0` in lib/constants.ts (draw-side inert). Both asserted in
   verify.sh.
7. LIVE-PATH FIX PROVEN (aggregate check, not new code): the readiness integration run demonstrates a
   rich/near-perfect student reaches `dialPercent ≥ 80` (top band reachable — the 19c ceiling is gone) and
   the R2 study-never-hurts scenario is non-decreasing on the persisted dial. (These live in tasks 08's
   integration file; task 10 just confirms the suite is green.)

## Constraints / decisions
- NO feature code here. Only run the aggregate gate + record PASS/FAIL. Any fix must be env-setup/ordering
  (reseed, restart stale LAN server, retry a flaky vitest-list capture) — never a weakened assertion or a
  masked failure. If a real defect surfaces, mark the OWNING task blocked and surface it; do not patch here.
- Browser audit must run against a NON-localhost origin for the cookie class (per the REAL-TRANSPORT gate);
  SW/offline classes (if touched) run against localhost — but this wave changes no SW/cookie surface, so
  the standard `audit:browser` run suffices.
- Cross-task verify coupling: this gate runs the WHOLE integration suite, so it is red if ANY wave19d task
  is incomplete — that is the point. Run it LAST, after tasks 01–09 are done.
- Non-goals: implementing anything; changing oracles or magnitudes.

## Next
- [x] Run typecheck → unit (+oracle collection) → db:seed → integration → build → browser audit; capture
      the summary; flip Status when all green. — ALL GREEN, Status:done.
- (none — wave gate PASS; see PREVERIFY-OUTPUT.txt)

## Artifacts
- tasks/wave19d-10-verify-wave19d/PREVERIFY-OUTPUT.txt — captured aggregate gate output (static evidence)

## Log
- 2026-07-13 laptop: planned. Aggregate wave gate; runs after 01–09.
- 2026-07-13T17:42Z ClPcs-Mac-mini: ran full aggregate gate. Invariants: honesty regression untouched,
  READINESS_TOPIC_CORRELATION=0. typecheck EXIT 0. Unit `npm test` 727 passed (68 files); all four wave19d
  oracle files collected + un-skipped (seen-unseen/factor-mixture/release + superseded estimation). db:seed
  OK (2322 official questions), then integration 272 passed / 3 skipped (65 files) incl. the three wave19d
  integration files (exam-blueprint, readiness-release, readiness-estimation; 12 tests). build EXIT 0
  (Turbopack). Restarted stale LAN server against fresh build → browser audit 82 passed, 0 failed over
  http://100.110.64.90:3100 (readiness dial + exam surfaces reachable). Live-path fix confirmed: release
  oracle (b′) top band ≥95 reachable, (d) study-never-hurts non-decreasing. Wave19d gate PASS. Status:done.

## Verify
**Last verify:** PASS (2026-07-13T14:47:48Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T15:08:10Z)
