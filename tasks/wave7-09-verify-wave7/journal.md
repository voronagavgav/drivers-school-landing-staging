# Task: wave7-09-verify-wave7

**Status:** done   <!-- 2026-06-23: full Wave-7 gate ran green end-to-end (EXIT=0); see Verify -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec G — Wave-7 acceptance gate. VERIFY-ONLY: write NO new feature code. Pass = ALL true:
1. `npm run typecheck` exits 0.
2. `npm test` exits 0 with ZERO failures AND `npx vitest list` includes the new unit tests
   (`lib/content-key.test.ts` AND `lib/content-override.test.ts`).
3. `npm run db:seed` exits 0 and produces official-only (≥1000 published OFFICIAL questions, 0 demo), THEN
   `npm run test:integration` exits 0 with ZERO failures AND
   `npx vitest list --config vitest.integration.config.ts` includes `content-upsert.integration.test.ts`.
4. `npm run build` exits 0.
5. Migration applied: `prisma/schema.prisma` has `Question.questionKey` AND `QuestionOption.optionKey`
   (each `String? @unique` with an index), and the `prisma/schema.prisma` diff vs the wave base is ONLY those
   two columns + their indexes.
6. Static: `scripts/import-official.ts` uses `upsert` and contains NO `deleteMany`/`delete` of `testAnswer`,
   `testSessionQuestion`, `userMistake`, or `savedQuestion`; `lib/content-key.ts` exports `questionKey`+
   `optionKey` and is pure (no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`/`Math.random`/
   `Date.now`); `lib/server/seed-content.integration.test.ts` no longer exists.

## Constraints / decisions
- **Evaluate: yes** — final correctness gate; an independent judge re-confirms the checks genuinely ran green
  (not stubbed/skipped) before the wave is declared done.
- VERIFY-ONLY. If a check fails: record the failure in the Log, set THIS task `blocked`, and reopen the failing
  UPSTREAM task (02–08) rather than patching here. Fixing a genuinely-broken OWN gate line (e.g. a SIGPIPE/`set
  -e` flake per CLAUDE.md) is allowed and must be documented; weakening a real check is NOT.
- The seed+integration step needs official content present locally (`.content-import/import_plan.json`); if it
  is absent the gate FAILS (criterion 3 unmet) — a real environment gap, not a skip.
- Do NOT wipe loaded official content or the image tiers (`public/official-images`, `public/restyled-live`,
  `public/image-overrides`). Out of scope: `SERVE_DEMO_QUESTIONS`/`demoWhere` removal, admin replace-by-key.
- The optional `npm run audit:browser` (CLAUDE.md REAL-TRANSPORT GATE) may be run informationally against the
  non-localhost origin and noted; the booleans above are the gate.

## Plan
- [x] Run typecheck, `npm test` (+ vitest list for both new unit tests).
- [x] Run `db:seed` (assert ≥1000 official + 0 demo), then `test:integration` (+ vitest list for content-upsert).
- [x] Run `npm run build`.
- [x] Static greps: schema columns + diff scope; importer upsert/no-progress-delete; content-key pure;
      seed-content test gone.
- [x] On any fail: Log it, mark blocked, reopen the upstream task. — NO fail; all six criteria green.

## Done
- [x] Ran `verify.sh` — full Wave-7 gate green end-to-end (EXIT=0, `GATE PASS`).
- [x] Fixed a genuinely-broken OWN gate line: schema-diff-scope `grep -v '^\+\+\+'` (BRE, `\+`=one-or-more →
      `repetition-operator operand invalid` every run, silently bypassed by `|| true`) → `grep -vE '^\+\+\+'`
      (ERE, literal `+`). Same result (empty diff → clean scope) but the line now executes without erroring.
      NOT a weakening — substantive column-presence checks (lines 39–42) unchanged and pass.

## Next
- [ ] (none — Status: done; awaiting judge re-confirm per Evaluate: yes.)

## Artifacts
- `tasks/wave7-09-verify-wave7/verify.sh` — the executable acceptance gate.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 15:48 UTC ClPcs-Mac-mini: ran `verify.sh` — full Wave-7 gate **green end-to-end (EXIT=0)**.
  Fixed one broken OWN gate line (schema-diff-scope `grep -v '^\+\+\+'` BRE repetition-operator error →
  `-vE`; result unchanged, no real check weakened). Re-ran twice: EXIT=0, zero grep errors, `GATE PASS`.
  Set Status: done.

## Verify
**Last verify:** PASS (2026-06-23T15:51:05Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T15:54:51Z)
