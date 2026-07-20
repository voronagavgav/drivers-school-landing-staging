# Task: wave4-test-07-readme-smoke-docs

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Spec C: README documents how to run the smoke script (task 06). Docs-only change. Depends on task 06.

1. `README.md` contains a dedicated smoke-test section (a heading whose text contains "smoke", case-
   insensitive, e.g. `## HTTP smoke test`).
2. That section names `scripts/smoke.sh`, shows the command to run it, and documents the
   `SMOKE_BASE_URL` env var (default `http://localhost:3000`).
3. The section states the prerequisites the script needs: the dev/prod server running, a seeded DB
   (`npm run db:seed`), and that the server must use the SAME `SESSION_SECRET` the script mints cookies
   with.
4. The section explicitly notes the smoke is NOT part of the automated verify gate / `npm test`
   (so a reader knows it is a manual/optional check).
5. `npm run typecheck` exits 0 and `npm test` exits 0 (a README edit must not break either).

## Constraints / decisions
- Docs only — edit `README.md` only. Do NOT modify `scripts/smoke.sh`, `package.json`, or any source.
- Place the section near the existing "Run locally" / scripts area so it reads naturally; keep it short.
- Non-Goal: documenting every smoke check line-by-line — just how to RUN it and its prerequisites.

## Plan
- [x] Add a "HTTP smoke test" section to README.md (command, `SMOKE_BASE_URL`, prereqs, out-of-gate note).
- [x] Run `npm run typecheck` + `npm test`; run verify.sh.

## Done
- [x] Added "## HTTP smoke test" section to README.md (after "Test / build"): names `scripts/smoke.sh`,
  shows the run command, documents `SMOKE_BASE_URL` (default `http://localhost:3000`), lists prereqs
  (server running, `npm run db:seed`, matching `SESSION_SECRET`), and notes it is NOT in the verify
  gate / `npm test`.
- [x] Verified gate locally: all 4 grep checks pass; `npm run typecheck` exits 0; `npm test` 114 passed, no failures.

## Next
- [ ] (none — goal met; driver re-runs verify.sh)

## Artifacts
- README.md — smoke-test run instructions.
- tasks/wave4-test-07-readme-smoke-docs/verify.sh — README presence + typecheck/test gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T19:24Z ClPcs-Mac-mini: added "## HTTP smoke test" section to README.md (script name,
  run command, `SMOKE_BASE_URL` default, prereqs incl. `db:seed` + `SESSION_SECRET`, out-of-gate note);
  verified all 4 README greps + typecheck (exit 0) + `npm test` (114 passed, no fails). Status: done.

## Verify
**Last verify:** PASS (2026-06-17T16:24:00Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T16:24:28Z)
