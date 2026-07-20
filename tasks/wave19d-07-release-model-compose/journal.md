# Task: wave19d-07-release-model-compose

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8

IMPLEMENTATION (PURE lib) — assemble the end-to-end evidence-releasing readiness model from the two
sub-modules and enforce the outer guarantee. New pure entrypoint `lib/readiness-release.ts` exporting one
function that, given the blueprint blocks' seen per-item probabilities + unseen counts + quotas + slope +
per-item review-mass evidence, computes:
1. per block: `p_slot` + `C` via `@/lib/readiness-seen-unseen` (task 05);
2. `independenceDial` = exact PB (`poissonBinomialAtLeast`) over the raw per-slot p-vector (quota copies of
   each block's `p_slot`), NO factor;
3. `mixtureDial` via `@/lib/readiness-factor-mixture` (task 06) with `σ = σ₀·sqrt(w(evidence))`;
4. **`finalDial = min(mixtureDial, independenceDial)`** — the never-above-independence guarantee, by
   construction (spec property a; the 19b lesson, now structural).

Also add the new model CONSTANTS to `lib/constants.ts` (values PINNED by task 02's oracle): `σ₀` (the
successor of `READINESS_TOPIC_CORRELATION_ESTIMATION`, mapped from ρ=0.35), the GH `nNodes`, the decay-form
constant(s), and a model key `"lm-gh1"`. This task un-skips `lib/readiness-release.oracle.test.ts` and
matches its frozen end-to-end (a)–(f) dials ≥8dp. It does NOT touch the DB/live recompute (task 08).

## Goal
PASS = ALL true:

1. `lib/readiness-release.ts` exists and exports a pure function returning at least
   `{ finalDial, mixtureDial, independenceDial, perBlock: [{ pSlot, C, nSeen }] }` (0..100 or 0..1 scale —
   document which; the release oracle pins it). It composes tasks 05 + 06 (imports them; does NOT
   reimplement the split or the mixture) and applies `finalDial = min(mixtureDial, independenceDial)`.
2. FROZEN END-TO-END ORACLE MATCH (`lib/readiness-release.oracle.test.ts`, ≥8dp) for ALL of:
   - **(a)** weak fixture ⇒ `finalDial === independenceDial` (min-clamp no-op); strong fixture ⇒
     `finalDial ≤ independenceDial`. Frozen dials.
   - **(b)** `p̂=0.95` across blocks + rich evidence ⇒ `|finalDial − independenceDial| ≤ 2` AND
     `finalDial ≥ 80`. Frozen dials.
   - **(b′)** `p̂=1.0, nSeen=1000` ⇒ `finalDial ≥ 95` (releases; NOT the 19c ~59% ceiling). Frozen value.
   - **(c)** n_seen=2 @0.95 in an 11-slot block ⇒ frozen `C < 0.7`; the block does not certify (finalDial
     well below the perfect-block dial). Frozen.
   - **(d)** R2 counterexample (10 seen @0.95 then +1 new @0.6) ⇒ `finalDial(after) ≥ finalDial(before)`
     (non-decreasing — the current code drops; new model must not). Frozen both dials.
   - **(e)** perfect+rich ⇒ `finalDial ≥ 95`; hopeless (all R≈0, rich) ⇒ `finalDial ≤ 2`. Frozen.
   - **(f)** slope=1 rich ⇒ `finalDial` within 2pp of `independenceDial`; slope=0.6 rich ⇒ strictly lower
     `finalDial` (slope participates in release, discounted ONCE per-item, no block-level re-discount).
     Frozen dials for both slopes.
3. NEVER-ABOVE-INDEPENDENCE is enforced BY CONSTRUCTION: a property/fuzz-style unit test over a spread of
   random-but-seeded p-vectors + σ asserts `finalDial ≤ independenceDial + 1e-9` for EVERY case (the outer
   `min`), covering weak AND strong populations (not just the frozen fixtures).
4. `lib/constants.ts` gains the new model constants with values equal to task 02's pinned oracle outputs:
   the σ₀ constant (documented as the successor of `READINESS_TOPIC_CORRELATION_ESTIMATION`, with the
   ρ=0.35→σ₀ mapping in the doc comment), `nNodes`, the decay constant(s), and the model key literal
   `"lm-gh1"`. A unit test pins each constant equals the oracle's frozen value.
5. `lib/readiness-release.oracle.test.ts` is UN-SKIPPED (remove `describe.skip`/`it.skip` + the
   `// @ts-expect-error` dynamic import) and passes; its NON-skipped self-consistency test still passes;
   `npx vitest list` lists the file with a non-skipped test.
6. PURITY: `lib/readiness-release.ts` has no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`/
   `Math.random`/`Date.now`/`new Date` (grep whole file). The property test's rng is a SEEDED injectable
   default (scope any determinism grep to it). `npm run -s typecheck` exits 0; `npm run -s test` exits 0.

## Constraints / decisions
- ORACLE IS FROZEN (task 02): match the (a)–(f) literals; never regenerate them from this impl. The
  end-to-end oracle is the binding correctness proof — a mediocre compose that passes only self-written
  asserts is exactly the failure mode the oracle rule exists to catch.
- Compose ONLY: import tasks 05 (`readiness-seen-unseen`) + 06 (`readiness-factor-mixture`) + the existing
  `poissonBinomialAtLeast`. Do NOT reimplement the split, the mixture, or the PB DP.
- The `min(mixtureDial, independenceDial)` clamp is LOAD-BEARING and structural — it protects weak students
  regardless of the mixture's direction (the research proves honesty only for threshold-above-mean; the
  clamp covers the rest). Property test #3 guards it can never be bypassed.
- Constants live in `lib/constants.ts` (single source); the model reads them (or takes them as params with
  those defaults) — the recompute (task 08) passes the same constants.
- Non-goals: live wiring into `recomputeReadiness` + inputsJson (08); retiring the 19c shrink (09).

## Next
- [x] Read the frozen (a)–(f) dials + constants from the release oracle; implement the compose + min-clamp;
      add constants; add the property test; un-skip the oracle; typecheck + `npm test`.
- Goal fully met. Handoff to task 08 (live wiring): the recompute block-builder feeds `releaseDial`
  (lib/readiness-release.ts) — same constants (READINESS_RELEASE_* in lib/constants.ts), same
  UNSEEN_PRIOR=0.5, THRESHOLD=18. persist finalDial + new inputsJson there.

## Artifacts
- lib/readiness-release.ts — end-to-end release model (compose + min-clamp), pure
- lib/constants.ts — σ₀ / nNodes / decay / model-key "lm-gh1" (values from task 02 oracle)
- lib/readiness-release.oracle.test.ts — un-skipped (frozen literals owned by task 02)
- lib/readiness-release.test.ts — never-above-independence property/fuzz + constants pins

## Log
- 2026-07-13 laptop: planned. Depends on tasks 02/05/06. This is the composition that (a)–(f) bind on.
- 2026-07-13 ClPcs-Mac-mini: implemented `releaseDial` in lib/readiness-release.ts — pure compose of
  blockSplit(05) + mixtureDial/sigmaFromEvidence(06) + poissonBinomialAtLeast, final=min(mixture,indep),
  THRESHOLD=18 (=DEFAULT_EXAM_QUESTION_COUNT−DEFAULT_EXAM_MAX_ERRORS), UNSEEN_PRIOR=0.5. Added
  READINESS_RELEASE_{MODEL_KEY="lm-gh1",RHO=0.35,SIGMA0≈1.33096485927,GH_NODES=20,EVIDENCE_M0=1} to
  lib/constants.ts. Un-skipped lib/readiness-release.oracle.test.ts (removed describe.skip + the 6
  @ts-expect-error dynamic imports → one static top import). Added lib/readiness-release.test.ts (mulberry32
  seeded never-above-independence fuzz over weak+strong regimes, ×200 each; constants pins). Verified vs
  the reference `python3 scripts/oracles/gen-19d-oracles.py` (a)–(f) literals match ≥8dp. typecheck 0;
  `npm test` 727 passed; oracle+property suites 16 passed; purity grep clean; `npx vitest list` collects the
  file with 6 non-skipped end-to-end impl tests. Status→done.

## Verify
**Last verify:** PASS (2026-07-13T13:53:44Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T13:56:12Z)
