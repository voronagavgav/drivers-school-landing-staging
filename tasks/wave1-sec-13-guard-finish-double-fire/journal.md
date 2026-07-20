# Task: wave1-sec-13-guard-finish-double-fire

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Prevent the test runner's `finish()` from double-firing (spec section F): the timer `onExpire` and the
manual «Завершити» button must result in a SINGLE finish. The server idempotency (task 12) is the
backstop; this is the client guard.

1. `components/test-runner.tsx` imports `useRef` from React and `finish()` is guarded by a ref flag:
   on entry it returns early if the ref is already set, otherwise it sets the ref BEFORE calling
   `finishTestAction(...)`. A second `finish()` call (e.g. timer `onExpire` firing while the manual
   submit is in flight) is a no-op.
2. The existing `finishing` state is preserved and the «Завершити тест» button is still
   `disabled={finishing}` (visual disabled state unchanged); the «Завершуємо…» pending label still shows.
3. No change to answering/navigation logic or to any server action signature.
4. `npm run typecheck` exits 0 and `npm test` exits 0 (zero failures).

## Constraints / decisions
- Edit ONLY `components/test-runner.tsx`.
- Use a `useRef<boolean>(false)` (e.g. `finishingRef`) as the idempotency latch — `useState` alone is
  insufficient because the two callers can both read stale state before a re-render. The `finishing`
  state stays for the button's disabled/label UX.
- Do not remove the `Timer`'s `onExpire={finish}` wiring or the manual button's `onClick={finish}`;
  both must keep calling `finish()` — the ref makes the second call idempotent.
- Non-Goal: server-side idempotency (task 12, already the backstop); the unanswered/confirm-before-finish
  UX (Wave 2).

## Plan
- [x] Add `useRef` import + a `finishingRef` latch.
- [x] Guard `finish()`: early-return when the latch is set; set it before `finishTestAction`.
- [x] Confirm the button still uses `disabled={finishing}` and the pending label.
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] `useRef` imported; `finishingRef = useRef(false)` latch added next to the `finishing` state.
- [x] `finish()` early-returns when `finishingRef.current` is set; sets it before `finishTestAction(...)`.
- [x] Button UX unchanged (`disabled={finishing}` + «Завершуємо…» label); both `onExpire={finish}` and `onClick={finish}` wirings preserved.
- [x] `npm run typecheck` exits 0; `npm test` = 91 passed; verify.sh PASS.

## Next
- [ ] (none — goal met; verify.sh PASS)

## Artifacts
- components/test-runner.tsx — ref-guarded single finish
- tasks/wave1-sec-13-guard-finish-double-fire/verify.sh — ref guard present + button UX intact + typecheck/test

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T11:45Z ClPcs-Mac-mini: added `useRef` import + `finishingRef` latch; guarded `finish()` with early-return before `finishTestAction`. Button UX & both finish() wirings intact. typecheck 0, npm test 91 passed, verify.sh PASS. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T08:45:37Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:46:08Z)
