# Task: wave19a-02-fsrs6-engine-port

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-07
**Last compute:** laptop

IMPLEMENTATION. Port the pure FSRS engine (`lib/fsrs/*`) from FSRS-5 (19 weights, fixed `DECAY=-0.5`) to
**FSRS-6** (21 weights + a trainable forgetting decay `w20`), matching the FSRS-6 reference implementation.
Depends on wave19a-01 (the frozen golden oracle). Spec Part 1 §B–F. Do NOT invent formulas — port them from
the reference impl (read the ts-fsrs v6 / py-fsrs v6.3.1 source; the FSRS-6 difficulty init/update and
stability formulas differ from FSRS-5).

## Goal
PASS = ALL true:

1. `lib/fsrs/constants.ts`: `FSRS_DEFAULT_WEIGHTS` is the 21-length FSRS-6 vector
   `[0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542]`
   with documented provenance (py-fsrs v6.3.1 default). `FSRS_DEFAULT_WEIGHTS.length === 21`.
2. `lib/fsrs/retrievability.ts`: the decay and FACTOR are DERIVED from `w20` (`= FSRS_DEFAULT_WEIGHTS[20]`),
   NOT hardcoded `-0.5`/`19/81`. Decay `= -w20`; `FACTOR = 0.9^(-1/w20) - 1`. `retrievability()` stays pure
   with injected `now`. A test asserts `R(S,S) === 0.9` (elapsed === stability) to ≥6 decimal places for the
   shipped `w20` (holds by construction of FACTOR).
3. `lib/fsrs/schedule.ts`: the DSR update (initial stability `w0..w3`; FSRS-6 initial difficulty; FSRS-6
   difficulty update with linear-damping + mean-reversion; successful-recall stability; lapse stability) is
   ported to match the reference. `schedule(state, grade, now)` signature and `ReviewMemoryState` return shape
   are UNCHANGED (callers must not need edits). `MIN_STABILITY` stays aligned to the reference (`0.001`).
4. `lib/fsrs/reference-vectors.test.ts` (the wave19a-01 oracle) is UN-skipped (skip→run) and GREEN. The golden
   LITERAL VALUES and tolerances from 01 are UNCHANGED — if the engine cannot match them, fix the engine, never
   the oracle.
5. `npm run -s typecheck` exits 0. `npm run -s test` exits 0 with the reference-vectors oracle RUNNING (assert
   inclusion+run via `npx vitest list` capturing to a var, not piping into grep).
6. PURITY preserved: no `lib/fsrs/*` file imports `server-only` / `@/lib/db` / `@prisma/client` / `lib/generated`,
   and none contains `Math.random` / `Date.now` / `new Date` (the Date-construction idiom stays
   `Reflect.construct(now.constructor, [ms])`). Grep over `lib/fsrs/*.ts` for these tokens returns nothing.
7. `lib/fsrs/CLAUDE.md` updated: says FSRS-6, 21 weights, trainable decay derived from `w20`; corrects the old
   "implement FSRS-5, not FSRS-6" learning.

## Constraints / decisions
- **Model: claude-opus-4-8** — subtle numerical algorithm port; a mediocre first pass (wrong difficulty
  mean-reversion form, wrong prior-vs-updated-difficulty order, or FSRS-5-vs-6 formula mixups) is expensive to
  catch downstream. **Evaluate: yes** — core correctness with an external oracle; an independent judge confirms
  the engine matches the FSRS-6 reference, not that self-written tests merely pass.
- The reference-vectors.test.ts golden values are FROZEN (authored in 01). This task may flip skip→run and
  implement the engine to match; it may NOT edit any golden literal or loosen a tolerance.
- `retrievability.test.ts` and `schedule.test.ts` unit expectations that pinned FSRS-5 magic numbers (e.g.
  `FSRS_FACTOR === 19/81`, specific R values, first-Good `S = w[2] = 3.173`) are SELF-CONSISTENCY tests and
  MUST be re-derived to the FSRS-6 values — updating THESE is expected and correct; they are not the oracle.
  Prefer relational/identity assertions (`R(S,S)=0.9`, monotonicity) over fresh magic numbers where possible.
- Keep `enable_short_term=false` (long-term variant): the `w17/w18` short-term same-day path stays UNUSED, and
  the 21-slot index alignment is preserved. Document w19/w20 roles in the constants comment.
- `FSRS_TARGET_RETENTION` stays a free `intervalDays` parameter (0.9); the curve FACTOR is derived from `w20`
  and decoupled from the target knob (as in the FSRS-5 design). Preserve `R(S,S)=0.9` regardless of target.
- Purity greps match comments too — keep the literal strings `Math.random`/`Date.now`/`new Date` out of doc
  comments (write "the injected clock", "Reflect.construct on now's constructor", etc.).
- Non-goals: weight OPTIMIZATION on ReviewLogs, isotonic/Platt, any downstream consumer edit beyond what
  typecheck forces (that verification is wave19a-03), any Part 2 file.

## Next
- [x] Read the ts-fsrs v6 / py-fsrs 6.3.1 DSR source; update constants (21w) + retrievability (w20-derived) +
      schedule (FSRS-6 DSR); un-skip the oracle; re-derive unit expectations; update CLAUDE.md; run typecheck+test.
- [x] Fix the purity FAIL: the verify purity grep covers `lib/fsrs/*.ts` (test files too); three test files
      used the banned `new Date` literal. Replaced with `Reflect.construct(Date, [...]) as Date` (and kept the
      literal out of the accompanying comments). Full verify now PASS.
- Goal fully met. Nothing left; downstream verification is wave19a-03.

## Artifacts
- `lib/fsrs/constants.ts` — 21-length FSRS-6 `FSRS_DEFAULT_WEIGHTS` (py-fsrs v6.3.1 defaults) + w19/w20 doc.
- `lib/fsrs/retrievability.ts` — `FSRS_DECAY=-w20`, `FSRS_FACTOR=0.9^(1/DECAY)-1` derived from `FSRS_DEFAULT_WEIGHTS[20]`.
- `lib/fsrs/schedule.ts` — FSRS-6 DSR; `initialDifficultyRaw` (UNCLAMPED) feeds the difficulty mean-reversion target.
- `lib/fsrs/reference-vectors.test.ts` — oracle un-skipped (skip→run), golden literals UNCHANGED, GREEN.
- `lib/fsrs/retrievability.test.ts` — self-consistency block re-derived to FSRS-6 (DECAY=-w20, R(S,S)=0.9 identity).
- `lib/fsrs/CLAUDE.md` — corrected the old "implement FSRS-5" learning to FSRS-6 / 21w / trainable-decay.
- `lib/fsrs/{reference-vectors,retrievability,schedule}.test.ts` — test clocks built via `Reflect.construct(Date, …)`
  (the purity gate greps test files too); golden literals/tolerances UNCHANGED.

## Log
- 2026-07-07 laptop: planned.
- 2026-07-07 ClPcs-Mac-mini: Ported lib/fsrs FSRS-5→FSRS-6. Read the pinned reference in
  node_modules/ts-fsrs@5.4.1 (computeDecayFactor: decay=-w20, factor=0.9^(1/decay)-1; next_difficulty feeds the
  UNCLAMPED init_difficulty(Easy) into mean-reversion; recall/forget stability structurally identical to FSRS-5).
  Swapped the 19-weight vector for the 21-weight FSRS-6 vector; derived DECAY/FACTOR from w20 in retrievability.ts;
  fixed schedule.ts's difficulty mean-reversion to use `initialDifficultyRaw(4)` (the FSRS-5-era clamp was the one
  real correctness bug — verified by hand: G,G,G,G step2 D=2.11121 matches golden only unclamped). Un-skipped the
  reference-vectors oracle (golden literals untouched) and re-derived the retrievability self-consistency block to
  the w20-derived values (schedule.test.ts needed no edits — all relational). `npm run -s typecheck`=0;
  `npm run -s test`=618 passed incl. the 4 FSRS-6 oracle sequences (confirmed running via `npx vitest list`);
  purity grep over the 7 source modules CLEAN. Updated lib/fsrs/CLAUDE.md.

- 2026-07-07T09:50Z ClPcs-Mac-mini: Fixed the purity FAIL. The verify purity grep is over `lib/fsrs/*.ts` —
  the glob includes the `.test.ts` files, which held the banned `new Date` literal (reference-vectors:121,
  retrievability:6-7, schedule:6). Replaced each with `Reflect.construct(Date, [...]) as Date` (retrievability
  via a `mkDate(...args)` helper) and reworded the accompanying comments so the literal string "new Date" is
  gone from the files too (grep matches comments). typecheck=0; `npx vitest run lib/fsrs/`=37 passed incl. the
  4 FSRS-6 oracle sequences; full `verify.sh`=PASS (618 tests, purity CLEAN). No golden literal/tolerance touched.


## Verify
**Last verify:** PASS (2026-07-07T06:51:24Z)

## Evaluation
**Last evaluation:** PASS (2026-07-07T06:53:09Z)
