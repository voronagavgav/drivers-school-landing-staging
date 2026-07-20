# Task: wave24-06-param-engine-oracle

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-15
**Last compute:** mac-mini

ORACLE + IMPLEMENTATION of the WEIGHT-INJECTABLE FSRS-6 engine the synthetic generator (wave24-07) runs.
Our shipped `lib/fsrs/schedule.ts` hard-wires `FSRS_DEFAULT_WEIGHTS` and is OUT OF SCOPE (must stay
byte-untouched). To simulate the REAL engine under a PERTURBED weight vector, the generator needs a
schedule/retrievability that TAKES the 21-weight vector as a parameter. This task authors that
parametrized engine and PINS it to the shipped engine: at the DEFAULT vector it must reproduce
`lib/fsrs` `schedule`/`retrievability` exactly. That equivalence is the external oracle — the shipped
engine is itself golden-vector-pinned to ts-fsrs@5.4.1 / py-fsrs 6.3.1 (`reference-vectors.test.ts`).

⚠ WHY THIS MATTERS FOR THE WAVE ORACLE: the generator MUST be INDEPENDENT of the fitter (py-fsrs). If we
generated logs with py-fsrs, recovering them with py-fsrs would be trivially self-consistent. Generating
with OUR TS engine and recovering with py-fsrs is the "external end-to-end oracle no self-consistent bug
can fake" (spec Goal). So the generator uses THIS TS engine, never py-fsrs.

Spec: `specs/wave24-weightfit-harness.md` Deliverable 3 (generator half) + Synthetic-data validation (a).

Depends on: (none hard). Artifacts:
- `scripts/fsrs-fit/param-engine.ts` — `scheduleW(state, grade, now, weights)`, `retrievabilityW(state, now, w20)`.
- `scripts/fsrs-fit/param-engine.oracle.test.ts` — the default-weights equivalence + golden-vector pins.

## Goal
PASS = ALL true:

1. `scripts/fsrs-fit/param-engine.ts` exports `scheduleW(state, grade, now, weights)` and
   `retrievabilityW(state, now, w20)`; the ONLY numeric parameters come from the passed `weights`
   argument — no `import ... FSRS_DEFAULT_WEIGHTS` used INSIDE the formulas (grep: the default vector may
   be imported only as a convenience default arg, never read mid-formula). Pure (no Date.now/new Date via
   `Reflect.construct` idiom, no Math.random, no db/server-only imports).
2. `scripts/fsrs-fit/param-engine.oracle.test.ts` drives the SAME four grade sequences + 10-day gap as
   `lib/fsrs/reference-vectors.test.ts` and asserts, for EACH step:
   (a) `scheduleW(state, g, now, FSRS_DEFAULT_WEIGHTS)` equals `lib/fsrs` `schedule(state, g, now)` to
       ≤ 1e-9 on `stability` AND `difficulty`, same `state` string; AND
   (b) `scheduleW(...).stability`/`.difficulty` match the FROZEN external golden LITERALS (copied from
       `reference-vectors.test.ts`: G,G,G,G S=2.30650000/25.10871981/59.24043798/91.79172483; E,E,E
       S=8.29560000/75.34793403/142.27029195; etc.) via `toBeCloseTo(_, 4)`.
3. `retrievabilityW(state, now, FSRS_DEFAULT_WEIGHTS[20])` equals `lib/fsrs` `retrievability(state, now)`
   to ≤ 1e-12 on the wave24-02 grid (import `retrievability` from `@/lib/fsrs`).
4. A PERTURBATION sanity check (not correctness, just wiring): `retrievabilityW` under
   `w20 = 0.1542·1.2 = 0.18504` DIFFERS from the default-w20 value at some grid point by > 1e-4
   (proves w20 actually flows through the formula).
5. `npm test` exits 0; `npx vitest list` collects `param-engine.oracle` (var-captured, herestring
   token-retry per CLAUDE.md).
6. `npm run -s typecheck` exits 0.

## Constraints / decisions
- Do NOT edit `lib/fsrs/` — this file is a weight-parametrized MIRROR of the FSRS-6 formulas
  (init S/D, recall/forget stability, damped ΔD + mean-revert to unclamped D_0(Easy), curve DECAY=-w20 /
  FACTOR=0.9^(1/DECAY)-1). Read `schedule.ts`/`retrievability.ts` and generalize the constant reads to
  `weights[i]`. The 1e-9 equivalence to `schedule()` at defaults GUARANTEES the generalization is faithful.
- The golden literals are EXTERNAL (ts-fsrs/py-fsrs) — copying them from reference-vectors.test.ts is a
  legitimate external pin, NOT self-grading (they are not our impl's output).
- Perturbation vector convention (used by wave24-07/08): default with `w8×1.2, w11×1.2, w20×1.2`.
  Document it in the header so downstream tasks share one definition.
- `param-engine.ts` lives under `scripts/` (NOT `lib/fsrs/`) so it cannot pollute the shipped engine and
  is caught by the wave24-10 "no lib/fsrs change" gate.

## Next
- [x] Author param-engine.ts (weight-injectable schedule/retrievability) + the equivalence oracle test;
      run npm test + typecheck.
- (none — Goal fully met; ready for wave24-07 to consume `scheduleW`/`retrievabilityW`.)

## Artifacts
- `scripts/fsrs-fit/param-engine.ts` — `scheduleW(state, grade, now, weights?, retention?)`,
  `retrievabilityW(state, now, w20)`, `intervalDaysW(S, retention, w20)`. Weight-injectable mirror of
  `lib/fsrs` schedule/retrievability; every formula constant reads `weights[i]`; `FSRS_DEFAULT_WEIGHTS`
  imported ONLY as the default arg. Perturbation convention documented in the header (w8/w11/w20 ×1.2).
- `scripts/fsrs-fit/param-engine.oracle.test.ts` — 6 tests: (1) 4 grade-sequence equivalence to
  `schedule()` ≤1e-9 on S/D + state, plus frozen external golden literals via toBeCloseTo(4); (2)
  retrievabilityW default-w20 equivalence to `retrievability()` ≤1e-12 on the wave24-02 grid; (3) w20
  ×1.2 perturbation shifts R by >1e-4.

## Log
- 2026-07-14 planner: task created.
- 2026-07-15T09:10Z ClPcs-Mac-mini: Fixed verify FAIL — the purity grep
  (`Math.random|Date.now|new Date|server-only|@/lib/db|@prisma/client`, whole-file) matched the literal
  `server-only` inside the header comment ("no DB / server-only imports"). Reworded that comment to
  "no imports from the DB or server-scoped runtime layer" (no code change, no token). Re-ran
  verify.sh: purity grep CLEAN, `param-engine.oracle` collected, `npm test` 805 pass, typecheck 0 →
  `PASS wave24-06`. Status: done.
- 2026-07-15T09:07Z ClPcs-Mac-mini: Authored param-engine.ts (weight-parametrized FSRS-6 mirror of
  lib/fsrs schedule.ts + retrievability.ts — generalised every `w[i]`→`weights[i]`, w20 threaded into
  retrievabilityW/intervalDaysW; pure, no time/rng tokens, Reflect.construct for dueAt) and
  param-engine.oracle.test.ts (default-vector equivalence + external golden literals + retrievability
  grid ≤1e-12 + w20 perturbation wiring). Verified: `npx vitest run` 6/6 pass; `npm test` 805 pass;
  `npm run -s typecheck` exit 0; `npx vitest list` collects param-engine.oracle; purity grep clean
  (no Math.random/Date.now/new Date, FSRS_DEFAULT_WEIGHTS only as default arg). Goal 1–6 all met →
  Status: done. Reworded two comment mentions of the banned time idioms to plain prose per the lib/fsrs
  keep-tokens-out-of-comments convention (future purity-grep insurance).


## Verify
**Last verify:** PASS (2026-07-15T06:10:42Z)

## Evaluation
**Last evaluation:** PASS (2026-07-15T06:12:48Z)
