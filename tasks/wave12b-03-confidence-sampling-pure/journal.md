# Task: wave12b-03-confidence-sampling-pure

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §D: deterministic ~1-in-5 confidence sampling — a PURE hash helper (no `Math.random` in lib/),
so the same (session, question) pair always samples the same way on every render/reload.

PASS = ALL true:

1. `lib/confidence-sampling.ts` exists, is PURE and deterministic (no `Math.random`/`Date.now`/`new Date`,
   no `@/lib/db`/`server-only`/`@/lib/auth` anywhere in the file), and exports:
   - `function fnv1a32(s: string): number` — FNV-1a 32-bit: basis 0x811c9dc5, prime 0x01000193, per
     char `h ^= charCode; h = Math.imul(h, 0x01000193) >>> 0`, returns unsigned 32-bit.
   - `function isConfidenceSampled(sessionId: string, questionId: string): boolean` —
     `fnv1a32(sessionId + ":" + questionId) % CONFIDENCE_SAMPLE_RATE === 0`.
2. `CONFIDENCE_SAMPLE_RATE = 5` is added to `lib/constants.ts` and imported by the helper.
3. FROZEN golden vectors (planner-computed with the reference FNV-1a above; verify.sh probes them —
   do NOT edit verify.sh):
   - `fnv1a32("sess-a:q-4") === 2401225625` → `isConfidenceSampled("sess-a","q-4") === true`
   - `fnv1a32("abc:def") === 3584721650` → `isConfidenceSampled("abc","def") === true`
   - `fnv1a32("sess-a:q-1") === 2451558482` → sampled false
   - sampled("sess-a","q-2") === false; sampled("sess-a","q-5") === false;
     sampled("sess-a","q-10") === false; sampled("clx1","clq9") === false
   - rate sanity: over pairs ("s"+i, "q"+i) for i in 0..9999, sampled count is between 1700 and 2300.
4. `lib/confidence-sampling.test.ts` exists covering the vectors above; `npm test` exits 0; the file
   appears in `npx vitest list` output (captured to a var).
5. `npm run typecheck` exits 0.

## Constraints / decisions
- FNV-1a 32-bit chosen for zero-dependency determinism across server/client; the `":"` separator
  prevents ("ab","c")/("a","bc") collisions.
- Do not edit this task's verify.sh — the vectors are the plan-time oracle.
- Non-Goal: any UI or server action (tasks 05/12).

## Plan
- [x] Add CONFIDENCE_SAMPLE_RATE to lib/constants.ts.
- [x] Write lib/confidence-sampling.ts + unit test with the golden vectors.
- [x] npm test + typecheck + verify.sh.

## Done
- [x] Full increment in one tick: `CONFIDENCE_SAMPLE_RATE = 5` (lib/constants.ts, own section),
      `lib/confidence-sampling.ts` (fnv1a32 + isConfidenceSampled, pure), and
      `lib/confidence-sampling.test.ts` (frozen vectors + u32 range + determinism + rate band).

## Next
- [ ] Nothing — Goal met; verify.sh printed `PASS wave12b-03` locally.

## Artifacts
- lib/confidence-sampling.ts, lib/confidence-sampling.test.ts, lib/constants.ts (CONFIDENCE_SAMPLE_RATE)

## Log
- 2026-07-02 laptop: task scaffolded by planner; FNV vectors computed and frozen at plan time.
- 2026-07-02 07:58 UTC ClPcs-Mac-mini: wrote lib/confidence-sampling.ts (fnv1a32 + isConfidenceSampled),
  added CONFIDENCE_SAMPLE_RATE=5 to lib/constants.ts, wrote lib/confidence-sampling.test.ts
  (frozen golden vectors, empty-string=offset-basis, u32 range, determinism, 10k rate band).
  verify.sh green end-to-end: probe "vectors ok, rate 0.197", typecheck 0, npm test 40 files /
  422 tests passed, `PASS wave12b-03`. Kept forbidden tokens out of the module's comments
  (purity gate greps the whole file). Status → done.

## Verify
**Last verify:** PASS (2026-07-02T07:58:57Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T07:59:43Z)
