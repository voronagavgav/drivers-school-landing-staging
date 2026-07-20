# Task: wave12b-11-runner-input-behaviors

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §D bullets 3–5 + 7: digit keys, swipe navigation, explanation auto-scroll, and reload-resume of
the question index. The decision logic is PURE and unit-tested (audit tools can't synthesize
keys/swipes — spec §H says unit/component level).

PASS = ALL true:

1. `lib/runner-input.ts` exists, is PURE (no React/JSX, no `@/lib/db`/`server-only`, no
   `Math.random`/`Date.now`/`new Date`), and exports with FROZEN semantics (verify.sh probes; do NOT
   edit verify.sh):
   - `digitToOptionIndex(key: string, optionCount: number): number | null` — "1".."9" → 0-based index
     when `index < optionCount`, else null; any other key (incl. "0", "Enter", "12") → null.
   - `swipeAction(deltaX: number, deltaY: number, threshold?: number): "prev" | "next" | null` —
     default threshold 48px; `deltaX <= -threshold` → "next", `deltaX >= threshold` → "prev";
     null when `|deltaX| < threshold` OR `|deltaY| > |deltaX|` (vertical scroll wins).
   - `clampResumeIndex(saved: unknown, total: number): number` — parses int; returns 0 for
     null/NaN/negative/>= total; else the saved index.
2. `lib/runner-input.test.ts` covers those semantics; `npm test` exits 0; file listed by
   `npx vitest list` (captured to a var).
3. `components/test-runner.tsx` wires them:
   - a keydown listener maps digit keys via `digitToOptionIndex` to SELECT that option for the current
     question (ignores events targeting input/textarea/select elements; does not re-answer an already
     submitted practice question) — arrow-key roving (`onOptionsKeyDown`) preserved.
   - pointer/touch handlers (onTouchStart/onTouchEnd or onPointerDown/onPointerUp) compute deltas and
     call `swipeAction` to navigate prev/next — no gesture library (package.json gains NO new dependency).
   - after a practice (non-exam) answer is submitted, the feedback/explanation block is scrolled into
     view: `scrollIntoView({ behavior: ... })` where behavior is `"auto"`/instant under
     `prefers-reduced-motion: reduce`, smooth otherwise.
   - the current question index is persisted to `sessionStorage` under key `` `ds_test_idx:${sessionId}` ``
     on change and restored through `clampResumeIndex` on mount (guarded `typeof window`/try-catch —
     sessionStorage can throw in private modes).
4. `npm run typecheck`, `npm test`, `npm run build` exit 0.

## Constraints / decisions
- sessionStorage over URL hash (planner DECISION): survives reload without polluting history/back
  behavior; per-tab scope matches a test session.
- Digit selection SELECTS only (does not auto-submit) — one deliberate tap/keypress to confirm stays.
- Swipe must not fire on option drag: only when the gesture is predominantly horizontal (the pure
  helper's |deltaY| > |deltaX| guard).
- Do not edit this task's verify.sh (frozen probe).
- Non-Goal: sticky chrome (task 10), confidence chips (task 12).

## Plan
- [x] Write lib/runner-input.ts + tests.
- [x] Wire digits/swipe/auto-scroll/resume into test-runner.tsx.
- [x] typecheck/test/build + verify.sh.

## Done
- [x] Write `lib/runner-input.ts` (three pure helpers) + unit tests.
- [x] Wire digits/swipe/auto-scroll/resume into `components/test-runner.tsx`.
- [x] verify.sh end-to-end: PASS wave12b-11 (typecheck + 466 tests + build green).

## Next
- (none — goal met, verify.sh passes)

## Artifacts
- lib/runner-input.ts, lib/runner-input.test.ts, components/test-runner.tsx

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 ~12:48 UTC ClPcs-Mac-mini: wrote `lib/runner-input.ts` (digitToOptionIndex /
  swipeAction / clampResumeIndex, pure, exported SWIPE_THRESHOLD=48) + `lib/runner-input.test.ts`
  (30 table-driven vitest cases mirroring glass-tier.test.ts style). Verified: frozen probe replica
  prints ok; `npm test` 466/466 green; `npx vitest list` collects the file; `npm run typecheck`
  clean. Next: wire into test-runner.tsx.
- 2026-07-02 ~12:53 UTC ClPcs-Mac-mini: wired all four behaviors into `components/test-runner.tsx`:
  window-keydown → `digitToOptionIndex` (skips INPUT/TEXTAREA/SELECT targets, modifier keys, the
  confirm dialog; `choose()` already refuses locked/pending so answered practice Qs can't re-answer;
  `onOptionsKeyDown` arrow roving untouched); root-div onTouchStart/onTouchEnd deltas →
  `swipeAction` prev/next (no new dependency); `scrollIntoView` on the feedback block once per
  question, `behavior:"auto"` under `prefers-reduced-motion: reduce` else `"smooth"`;
  `sessionStorage` persist under `ds_test_idx:${sessionId}` + mount-effect restore via
  `clampResumeIndex` (typeof window + try-catch guarded; effect not lazy-useState — SSR HTML always
  shows Q1, restoring pre-hydration would mismatch). verify.sh: PASS wave12b-11 (probe ok, vitest
  list collects, all wiring greps, typecheck + npm test 466/466 + build green). Status → done.


## Verify
**Last verify:** PASS (2026-07-02T09:52:53Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T09:54:05Z)
