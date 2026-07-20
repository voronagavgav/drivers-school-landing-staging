# Task: wave11-10-streak-policy-pure

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
PURE detoxified-streak calculator `lib/streak-policy.ts` — a single missed day auto-consumes a freeze
token instead of resetting; never punitive. Behaviour is pinned by a FROZEN oracle. DONE when
(verify.sh exits 0):

1. Exports `nextStreakState(prev, todayKey, tokens)` where
   `prev: { current: number; best: number; lastDay: string | null }`, `todayKey: "YYYY-MM-DD"`,
   `tokens: number`, returning `{ current, best, lastDay, freezeTokens, usedFreeze }`. Day gap is
   computed by parsing the ISO day keys to UTC day indices (deterministic; NOT a clock read).
2. Transition contract (gap = todayIndex − lastIndex):
   - `lastDay === null` → first day: `current=1`, `best=max(prev.best,1)`, tokens unchanged, no freeze;
   - gap `0` (same day) → idempotent: unchanged current/best, tokens unchanged, no freeze;
   - gap `1` (consecutive) → `current+1`, `best=max`, tokens unchanged, no freeze;
   - gap `2` (one missed day) & `tokens>0` → auto-freeze: `current+1`, `best=max`, `freezeTokens-1`,
     `usedFreeze=true`;
   - gap `2` & `tokens===0` → reset: `current=1`, `best` unchanged, tokens unchanged, no freeze;
   - gap `≥3` (multiple missed days) → reset: `current=1`, `best` unchanged, tokens unchanged, no freeze.
   `lastDay` in the result is always `todayKey` (except a same-day / no-op which keeps it `todayKey`).
3. FROZEN ORACLE (result === exactly, fields {current,best,freezeTokens,usedFreeze}):
   - prev{5,7,"2026-07-01"}, "2026-07-02", 2 → {6, 7, 2, false}   (consecutive)
   - prev{5,7,"2026-07-01"}, "2026-07-01", 2 → {5, 7, 2, false}   (same day)
   - prev{5,5,"2026-07-01"}, "2026-07-03", 2 → {6, 6, 1, true}    (gap2 + token → freeze)
   - prev{5,9,"2026-07-01"}, "2026-07-03", 0 → {1, 9, 0, false}   (gap2 + no token → reset)
   - prev{5,5,"2026-07-01"}, "2026-07-05", 2 → {1, 5, 2, false}   (gap4 → reset, tokens kept)
   - prev{0,0,null},        "2026-07-02", 2 → {1, 1, 2, false}   (first day)
   - prev{7,7,"2026-07-01"}, "2026-07-02", 1 → {8, 8, 1, false}   (consecutive sets new best)
4. `lib/streak-policy.test.ts` covers consecutive / gap+token / gap+no-token / same-day / best / reset;
   `npm test` exits 0; `npm run typecheck` exits 0.

## Constraints / decisions
- PURE: no clock/DB/randomness/JSX; NO `@/…` imports (self-contained) so the oracle smoke resolves via
   a relative import. The date-key parse is deterministic (Date.UTC of parsed Y-M-D), not a `now` read.
- Never emit punitive messaging — this fn returns STATE only (copy is a W12 concern).

## Plan
- [x] Implement nextStreakState + the transition contract.
- [x] Add unit cases; run oracle.

## Next
- [ ] Done — verify.sh green (oracle OK, typecheck clean). No further increments.

## Artifacts
- lib/streak-policy.ts — pure nextStreakState (UTC day-index gap; freeze-token policy).
- lib/streak-policy.test.ts — 7 unit cases (consecutive/gap+token/gap+no-token/same-day/best/reset).

## Log
- 2026-07-02 planner: task authored; transition oracle frozen.
- 2026-07-02T00:00Z ClPcs-Mac-mini: wrote lib/streak-policy.ts (self-contained pure fn, Date.UTC day-index gap) + lib/streak-policy.test.ts (mirrors mastery.test.ts style). verify.sh green: frozen oracle OK, npx vitest list finds suite, typecheck clean. Status → done.

## Verify
**Last verify:** PASS (2026-07-01T23:27:43Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T23:28:21Z)
