# Wave 4 — Testing depth & polish

Deepen automated coverage and tidy rough edges. Keep new logic PURE + unit-tested; final task runs
`npm run build`. No schema change; no security/UX regressions.

## A. Engine edge-case integration tests
- Integration tests (real DB) cover: an exam with FEWER published questions than the configured count
  (runs short, completes correctly); MIXED_PRACTICE prioritises weak topics; SAVED_QUESTIONS excludes
  unpublished/archived; finishing an already-COMPLETED session stays idempotent (no duplicate snapshot).
- `npm run test:integration` passes.

## B. Progress aggregation at volume
- A test seeds many answers across topics/sessions for one user and asserts `computeProgress` totals,
  per-topic accuracy, weak-topic detection, and readiness are correct and stable. typecheck + tests pass.

## C. Lightweight HTTP e2e smoke
- A documented script `scripts/smoke.sh` (not part of the verify gate) starts/uses the running server,
  mints a session cookie (reuse scripts/mint-cookie.ts), and curls the core routes asserting status +
  key markers (dashboard renders readiness; admin guarded; user blocked from /admin). It prints PASS/FAIL.
- README documents how to run it. typecheck + tests + build pass.

## D. Polish
- Address remaining AUDIT.md Low items that are cheap and safe (per its Wave column). Each change keeps
  the suite green.
- typecheck + tests + build pass.

## Out of scope
- No schema change, no redesign, no new external services.
