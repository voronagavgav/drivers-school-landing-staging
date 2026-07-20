# Task: wave6-09-retire-demo-topics

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
Spec F (part 2) — retire the 8 redundant lower-case demo topics WITHOUT losing the demo questions. Pass = all true:
1. After `npm run db:seed`, the 8 lower-case demo topics (the titles in `prisma/seed.ts`'s `TOPICS`:
   "Загальні положення", "Дорожні знаки", "Дорожня розмітка", "Сигнали світлофора та регулювальника",
   "Проїзд перехресть", "Швидкість руху, обгін, зупинка", "Розташування транспортних засобів та маневрування",
   "Безпека руху та обов'язки водія") do NOT surface as separate ACTIVE topics in any learner window —
   implemented by either deactivating them (`isActive=false`) OR re-homing their questions under the official
   CAPS-topic equivalents. Recommended: deactivate (lower risk).
2. The 25 demo questions are PRESERVED: after seed there are still ≥24 published questions with `isDemo=true`,
   `sourceType=DEMO`, each with exactly one correct option (the `seed-content` invariant still holds).
3. The demo-retirement behaviour of the engine is unchanged: `demo-retired.integration.test.ts` still passes
   (demo questions remain seeded + published, merely withheld from live pools by `SERVE_DEMO_QUESTIONS=false`).
4. `npm run db:seed` is still idempotent (re-run → same demo + official counts, exits 0).
5. `npm run typecheck` exits 0; `npm run test:integration` exits 0 with ZERO failures.

## Constraints / decisions
- **Evaluate: yes** — this is a data-preservation step (must NOT delete or unpublish the 25 demo questions,
  which several integration suites depend on). Judge confirms the demo questions survive and stay published.
- Prefer DEACTIVATING the 8 demo topics (`isActive=false`) over re-homing — re-homing rewrites `topicId`
  and risks colliding with official topics/counts. If deactivating, the demo questions keep their `topicId`
  pointing at the now-inactive topic; that is fine because `SERVE_DEMO_QUESTIONS=false` already withholds
  them from every pool, and the practice page (wave6-10) lists only ACTIVE topics with servable questions.
- Whatever the approach, keep the demo questions `isPublished=true`, `isDemo=true`, `sourceType=DEMO`,
  one-correct — do NOT change their content/answer.
- Idempotency: the retirement must be re-applied cleanly each seed (e.g. set `isActive=false` every run),
  not a one-shot that breaks on the second seed.
- Order after wave6-08 (seed must already load official + the invariant test already scoped to demo subset).

## Plan
- [x] In `prisma/seed.ts`, after creating demo topics+questions, mark the 8 demo topics `isActive=false`
      (idempotent on re-seed).
- [x] Confirm ≥24 published `isDemo` questions remain (seed-content) and demo-retired still green.
- [x] Seed twice; run `test:integration`; typecheck.

## Done
- [x] Added an `prisma.topic.updateMany({ where: { id: { in: [...topicByTitle.values()] } }, data: { isActive: false } })`
      step to `prisma/seed.ts` right after the questions loop — deactivates the 8 demo topics while their
      questions keep `topicId`/`isPublished`/`isDemo`/`sourceType=DEMO`. Idempotent (full reseed recreates+deactivates).
- [x] Verified: after seed → 0 ACTIVE demo topics, 8 inactive, 25 published demo questions; re-seed stable (25→25);
      typecheck 0; `test:integration` 19 files / 67 tests all pass (demo-retired + seed-content green).
- [x] Fixed a verify.sh SQL-escaping bug (NOT a code regression): the title with an apostrophe
      (`Безпека руху та обов'язки водія`) mangled the `esc="${t//\'/\'\'}"` doubling (kept backslashes →
      `обов\'\'язки` → malformed SQL → sqlite3 empty → `set -e` aborted with no FAIL line). Changed to
      double-quoted pattern/replacement `esc="${t//"'"/"''"}"`. Full verify.sh now exits 0.

## Next
- [ ] (none — Goal met; verify.sh PASSES end-to-end)

## Artifacts
- prisma/seed.ts — retires the 8 demo topics while preserving demo questions
- tasks/wave6-09-retire-demo-topics/verify.sh — fixed apostrophe SQL-escaping (line 25)

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T13:27Z ClPcs-Mac-mini: Added the demo-topic deactivation `updateMany` to `prisma/seed.ts`
  (after the questions loop). Confirmed the official importer uses CAPS titles + `OFFICIAL_TOPIC_DESC`,
  so no title collision and it never touches the demo topics. Verified all 5 Goal items: 0 active demo
  topics / 8 inactive / 25 published demo Qs; idempotent re-seed (25→25); typecheck 0;
  `npm run test:integration` = 19 files, 67 tests, 0 failures. Status → done.
- 2026-06-23T13:32Z ClPcs-Mac-mini: Diagnosed the verify FAIL — NOT a code regression. Re-ran each
  sub-check: seed exits 0, 0 active demo topics, 25 published demo Qs, typecheck 0, integration 67/67.
  `bash -x verify.sh` showed the script died silently (no FAIL line) at the `n="$(…)"` for the only title
  with an apostrophe (`Безпека руху та обов'язки водія`): `esc="${t//\'/\'\'}"` kept backslashes inside the
  double quotes (`обов\'\'язки`) → malformed SQL → sqlite3 returned empty/non-zero → `set -e` aborted.
  Fixed the escape to `esc="${t//"'"/"''"}"` (double-quoted pattern/replacement → correct `обов''язки`).
  Full verify.sh now PASSES (exit 0). Status → done.


## Verify
**Last verify:** PASS (2026-06-23T10:33:43Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T10:35:23Z)
