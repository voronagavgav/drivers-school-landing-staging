# Task: wave4-test-11-verify-wave4

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
End-to-end acceptance gate for the whole Wave 4 batch (`specs/wave4-testing.md` A–D). No new feature
code — this task only verifies the spec's acceptance criteria and records the result. It is the wave's
final task and runs `npm run build`.

1. `npm run typecheck` exits 0.
2. `npm test` exits 0 with ZERO failures and the fast suite includes `lib/session-secret.test.ts`.
3. `npm run db:seed` exits 0, then `npm run test:integration` exits 0 with ZERO failures and the run
   INCLUDES all four new Wave-4 integration files —
   `exam-short-pool.integration.test.ts`, `mixed-weak-topics.integration.test.ts`,
   `saved-excludes-unpublished.integration.test.ts`, `progress-volume.integration.test.ts` — plus the
   pre-existing `finish-idempotency.integration.test.ts` (spec-A case 4: idempotent finish / no
   duplicate snapshot).
4. `npm run build` exits 0.
5. C — smoke: `scripts/smoke.sh` exists, is executable, passes `bash -n`, reuses
   `scripts/mint-cookie.ts`, sets the `ds_session` cookie, checks `/dashboard` + `/admin`, and prints
   PASS/FAIL; it is NOT referenced by `package.json` scripts (out of the gate). `README.md` has a smoke
   section naming `scripts/smoke.sh` + `SMOKE_BASE_URL`.
6. D — polish: `lib/session-secret.ts` exports a pure `resolveSessionSecret` (no `server-only`/`@/lib/db`
   /`@prisma/client`/`lib/generated` imports), `lib/auth.ts` imports `@/lib/session-secret` and no
   longer hardcodes its own `"dev-only-insecure-secret"` fallback, and
   `app/(app)/mistakes/page.tsx` interpolates `${MISTAKE_RESOLVE_THRESHOLD}` (no hardcoded "Двічі").
7. No DB schema change: `prisma/schema.prisma` is not dirty/staged and no `wave4-test` commit touched it.

## Constraints / decisions
- Verification ONLY. If a check FAILS, do NOT fix it here — record the failure in `## Log` and set the
  failing upstream task (02–10) back to `active` with a note, then stop. This task passes ONLY when
  every criterion holds.
- Do NOT couple this gate to blocked prior-wave work (e.g. a `seed-content.integration.test.ts` from
  Wave 3 may or may not exist) — assert only the Wave-4 artifacts above.
- HIGH-STAKES (`Evaluate: yes`): this is the wave's authoritative done-claim and runs `npm run build`.
- Non-Goal: implementing or editing any feature/test code, committing, or marking other tasks done.

## Plan
- [x] Run `npm run typecheck`, `npm test`, `npm run db:seed`, `npm run test:integration`, `npm run build`.
- [x] Run the static presence checks for C + D (items 5–6) and the schema-unchanged check (item 7).
- [x] If all pass, set Status: done; else log the first failing item and reopen its task.

## Done
- [x] Ran `tasks/wave4-test-11-verify-wave4/verify.sh` — exit 0, "PASS: wave4-test-11 — Wave 4
      acceptance gate (A–D) green". All 7 criteria hold.

## Next
- [ ] (none — gate green, Status: done)

## Artifacts
- tasks/wave4-test-11-verify-wave4/verify.sh — full Wave 4 acceptance gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T19:35Z ClPcs-Mac-mini: ran verify.sh (full Wave 4 gate). typecheck 0; unit 122 passed
  (incl. lib/session-secret.test.ts); db:seed ok (16 Qs/6 topics/3 cats/3 users); integration 8 files
  /18 passed (incl. all four new Wave-4 files + finish-idempotency); build green; C smoke + D polish
  static checks pass; schema unchanged. Exit 0 → "PASS … (A–D) green". Status: done.

## Verify
**Last verify:** PASS (2026-06-17T16:36:11Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T16:38:47Z)
