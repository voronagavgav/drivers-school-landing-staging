# Task: wave19a-01-fsrs6-oracle-vectors

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-07
**Last compute:** laptop

ORACLE-AUTHORING (not implementation). Regenerate the EXTERNAL golden reference vectors for the pure
FSRS engine from the **FSRS-6 reference implementation**, and pin them as plain numeric literals. This
task establishes the frozen oracle that wave19a-02 must make our engine match. It does NOT edit
`lib/fsrs/{constants,retrievability,schedule}.ts` (that is 02's job). See spec Part 1 §A and
`docs/research/FSRS-READINESS-STRATEGY-2026-07-07.md` (finding 33 = the 21-weight default vector).

## Goal
PASS = ALL true:

1. A generator script `scripts/gen-fsrs6-vectors.mjs` (or `.ts`) exists and, when run, produces the golden
   S/D/state/interval rows. It drives a PINNED FSRS-6 reference implementation — **ts-fsrs v6+**
   (`npm i -D ts-fsrs@^6`) or **py-fsrs v6.3.1** (`pip install fsrs==6.3.1`) — configured
   `enable_short_term: false`, `enable_fuzz: false`, `request_retention: 0.9`, and passes the EXACT 21-length
   FSRS-6 weight vector we ship (below), NOT the library's own `default_w` (so golden == our constants).
2. The script's header comment names the exact reference package + version it was run against, and states it is
   a dev/throwaway tool — NOT a runtime dependency of the app (the golden values are vendored as literals; the
   reference lib is not imported at runtime).
3. `lib/fsrs/reference-vectors.test.ts` is rewritten to assert our `schedule()` reproduces the FSRS-6 golden
   `stability`, `difficulty`, **learning-`state`**, and derived integer `interval` for ≥4 grade sequences that
   collectively cover the `new`, `learning`, `review`, and `relearning` phases and all four grades (1..4).
   Values are plain numeric/string LITERALS copied from the generator output; tolerance stays tight
   (`toBeCloseTo(..., 4)` for S/D, exact `toBe` for interval + state), matching the existing file's discipline.
   The header comment states these are FSRS-6 (ts-fsrs/py-fsrs vX.Y.Z) golden vectors, replacing the FSRS-5 set.
4. The 21-length vector pinned in the generator AND documented in the test header is EXACTLY:
   `[0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542]`
5. `reference-vectors.test.ts` is wrapped in `describe.skip(...)` (or every `it` is `it.skip`) with a one-line
   comment: `UNSKIP in wave19a-02 once the FSRS-6 engine lands.` — because our engine is still FSRS-5 at this
   task's completion, so an un-skipped test would be RED. The GOLDEN LITERAL VALUES authored here are FROZEN:
   wave19a-02 may only flip skip→run and MUST NOT alter any golden number.
6. `npm run -s typecheck` exits 0 and `npm run -s test` exits 0 (the skipped oracle file does not fail the suite;
   no other test is touched).

## Constraints / decisions
- **Purity is not this task's concern** — the generator lives under `scripts/` and may import the reference
  library and construct real Dates; it is a build/throwaway tool, never shipped. Only `lib/fsrs/*` stays pure
  (that invariant is enforced in 02/03).
- Re-run the generator at least twice and confirm byte-identical output before pinning (FSRS updates are pure
  deterministic; use whole-day UTC-midnight timestamps + a fixed inter-review gap as in the existing file).
- Capture `learning-state` this wave (the existing FSRS-5 file omitted it) — spec §A requires state coverage.
- Interval oracle: keep the existing file's convention — derived integer interval = `Math.round(intervalDays(S, 0.9))`
  (NOT ts-fsrs `scheduled_days`, which applies cross-grade ordering our pure long-term engine omits). Because the
  FSRS-6 decay/FACTOR will be derived from `w20` (02) to preserve `R(S,S)=0.9`, `round(intervalDays(S,0.9)) == round(S)`
  still holds — so the interval literal equals `round(S)`, asserted against our `intervalDays`.
- Do NOT leave `ts-fsrs`/`fsrs` in the committed runtime dependency set. Installing it as a devDependency to run the
  generator is acceptable (mirrors how wave10f-01 used ts-fsrs@5.4.1); the test imports ONLY `@/lib/fsrs`.
- Non-goal: touching the engine source, the weight optimizer, isotonic/Platt, any Part 2 file.

## Next
- [x] Install ts-fsrs (dev), write `scripts/gen-fsrs6-vectors.mjs` passing the pinned 21-weight vector, run it
      twice, confirm identical output, then paste literals into a rewritten (skipped) `reference-vectors.test.ts`.
- (wave19a-02, NOT this task) flip `describe.skip`→`describe` after the FSRS-6 engine lands; MUST NOT alter any golden number.

## Artifacts
- `scripts/gen-fsrs6-vectors.mjs` — dev/throwaway FSRS-6 oracle generator (ts-fsrs@5.4.1 21-weight FSRS-6 path, cross-checked vs py-fsrs 6.3.1).
- `lib/fsrs/reference-vectors.test.ts` — rewritten, FSRS-6 golden literals + learning-state column, `describe.skip` until 02.
- `package.json` — `ts-fsrs@^5.4.1` added to devDependencies.

## Log
- 2026-07-07 laptop: planned.
- 2026-07-07T06:16Z ClPcs-Mac-mini: ts-fsrs has NO v6 on npm (max 5.4.1) — but ts-fsrs 5.x IS the FSRS-6 algorithm: a full
  21-length `w` activates the w20 trainable-decay path (`enable_short_term:false` = long-term-only). Verified py-fsrs
  (PyPI `fsrs`) ==6.3.1 in a venv: its Scheduler `default parameters` ARE the pinned 21-weight vector verbatim, and with
  `learning_steps=()/relearning_steps=()`+`enable_fuzzing=False` it reproduces ts-fsrs 5.4.1 to within toBeCloseTo(4)
  (max |Δ|≈1.2e-5). Wrote `scripts/gen-fsrs6-vectors.mjs`, ran twice → byte-identical. Rewrote `reference-vectors.test.ts`
  with FSRS-6 golden S/D/state/interval literals (4 sequences: new/learning/review/relearning + grades 1..4), `describe.skip`
  + UNSKIP-in-wave19a-02 marker. typecheck 0, `npm test` green (4 skipped), verify.sh → PASS. Status: done.

## Verify
**Last verify:** PASS (2026-07-07T06:16:55Z)

## Evaluation
**Last evaluation:** PASS (2026-07-07T06:19:14Z)
