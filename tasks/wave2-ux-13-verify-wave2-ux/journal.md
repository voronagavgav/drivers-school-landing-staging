# Task: wave2-ux-13-verify-wave2-ux

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
End-to-end acceptance gate for the whole Wave 2 UX batch (spec sections A–D). No new feature code — this
task only verifies the spec's acceptance criteria and records the result. It is the wave's final task and
runs `npm run build`.

1. `npm run typecheck` exits 0.
2. `npm test` exits 0 with ZERO failures and at least 9 test files (the Wave 1 baseline of 8 plus
   `lib/session-resume.test.ts`).
3. `npm run test:integration` exits 0 (existing engine + finish-idempotency + access-control suites).
4. `npm run build` exits 0.
5. A — resume: `lib/session-resume.ts` exports a pure `selectResumableSession` (no
   `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`); a `lib/server/*` module exports
   `getResumableSession` that uses it; `app/(app)/dashboard/page.tsx` renders «Продовжити тест» linking
   to `/test/${...}`.
6. B — exam behaviour: `components/test-runner.tsx` contains the confirm-before-finish warning
   «Ви відповіли на …», a «Скасувати» control, and still has `finishingRef`; it implements a numbered
   question navigator with client-side flagging; and the test screen surfaces an exam-short notice gated
   on `EXAM_SIMULATION` + `DEFAULT_EXAM_QUESTION_COUNT`.
7. C — robustness: `app/(app)/error.tsx` and `app/admin/error.tsx` both exist, are `"use client"`, and
   use `reset`; `app/(app)/test/[id]/not-found.tsx` exists and links to `/dashboard`;
   `components/submit-button.tsx` uses `useFormStatus` and is used in onboarding, dashboard, and practice.
8. D — accessibility: `components/test-runner.tsx` has `role="radiogroup"`, `role="radio"`,
   `aria-checked`, an `onKeyDown` arrow handler, and ✓/✗ correctness glyphs; the timer is `aria-live`;
   `app/(app)/layout.tsx` has a skip link to `#main-content` and `<main id="main-content">`.
9. No DB schema change: `prisma/schema.prisma` is not modified by this wave (no `wave2-ux` commit touched
   it) and is not dirty/staged.

## Constraints / decisions
- Verification ONLY. If a check FAILS, do NOT fix it here — record the failure in `## Log` and set the
  failing upstream task (02–12) back to `active` with a note, then stop. This task passes ONLY when every
  criterion holds.
- Non-Goal: implementing or editing any feature code, committing, or marking other tasks done.

## Plan
- [x] Run `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build`.
- [x] Run the static presence checks for A–D (items 5–8) and the schema-unchanged check (item 9).
- [x] If all pass, set Status: done; else log the first failing item and reopen its task.

## Done
- [x] Ran the full Wave 2 acceptance gate `verify.sh`; all criteria 1–9 hold (see Verify).

## Next
- [ ] (none — acceptance gate passes end-to-end; awaiting driver re-run.)

## Artifacts
- tasks/wave2-ux-13-verify-wave2-ux/verify.sh — full Wave 2 UX acceptance gate (check #2 now proves
  session-resume inclusion via `npx vitest list`)

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17 11:48Z ClPcs-Mac-mini: first run of verify.sh failed only on check #2's `grep -q "session-resume"`
  against `npm test` output — vitest's default reporter omits filenames on all-pass (documented CLAUDE.md
  gotcha), so the gate's own detection was buggy (feature present: 9 files incl. session-resume.test.ts).
  Fixed the gate to prove inclusion via `npx vitest list` (capture-then-grep). Re-ran: full gate PASSES
  end-to-end (typecheck, unit, integration, build, A–D, schema). Set Status: done.

## Verify
**Last verify:** PASS (2026-06-17T11:49:12Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T11:51:21Z)
