# Task: wave23-01-python-oracle

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-14
**Last compute:** mac-mini

**Artifacts:** `scripts/oracles/gen-wave23-oracles.py` (the reference oracle),
`tasks/wave23-01-python-oracle/PREVERIFY-OUTPUT.txt` (captured stdout — static-judge evidence).

ORACLE-AUTHORING — the FIRST task of wave23; runs BEFORE any TypeScript. Deliverable: a committed,
network-free reference script `scripts/oracles/gen-wave23-oracles.py` that INDEPENDENTLY re-encodes
(from `specs/wave23-exam-allocator-spike.md` Design + Deliverable 1, NOT by importing/shelling out to
any TS/JS) the exam-date review-allocator scoring and freezes properties (a)–(e). It prints a
`PREVERIFY-OUTPUT.txt`-style stdout so the static evaluator READS a file rather than running anything.
The later TS oracle test (wave23-03) and impl (wave23-04) MUST match these values; never regenerate
them from TS.

Source of the model (frozen here; later tasks may NOT edit these values):
- `specs/wave23-exam-allocator-spike.md` (Goal + Design + Deliverable 1 (a)–(e)).
- The dial machinery it must reproduce independently: `lib/readiness-release.ts` (`releaseDial`),
  `lib/readiness-seen-unseen.ts` (`blockSplit`, Lahiri–Mukherjee), `lib/readiness-model.ts`
  (`perItemPassProb`, `poissonBinomialAtLeast`), `lib/readiness-factor-mixture.ts` (GH mixture).
  You may CRIB the gen-19d-oracles.py helpers by COPY (PB tail + split + mixture), never by importing TS.
- Baseline (e) cross-check: `lib/test-engine/queue.ts` docstrings + CLAUDE.md queue learnings
  (due-first ranking + weakness weighting + new-item share), re-encoded from the docstring formula,
  NOT by importing the TS.

## The model (frozen here — re-encode from the spec, do NOT import TS)
Dependencies: python stdlib ONLY (`math`, `sys`) OR `numpy` if the GH mixture needs it — mirror the
gen-19d approach (it uses numpy for `hermegauss`). Whatever gen-19d uses is acceptable here since the
mixture nodes must match `readiness-factor-mixture.ts`.

Objective = the REAL dial `releaseDial(input)` reproduced independently:
- Blueprint = the official 4-strata quotas `pdr 10 · safety 4 · build(structure) 4 · medical 2` (=20).
  THRESHOLD = `DEFAULT_EXAM_QUESTION_COUNT − DEFAULT_EXAM_MAX_ERRORS` = 18. UNSEEN_PRIOR = 0.5.
  σ₀, RHO=0.35, GH_NODES=20, EVIDENCE_M0=1 — copy verbatim from gen-19d-oracles.py (wave19d constants).
- `P_pass(states)` = `releaseDial(...).final` (= `min(mixture, independence)`), the probability form.

Allocator score for reviewing item i TODAY (spec §Allocator):
  ΔP_i = E_outcome[ P_pass(states with item i updated) − P_pass(states) ]
where the outcome expectation blends the CORRECT path (weight p_correct) and the WRONG path
(weight 1−p_correct):
  - p_correct = R_i (retrievability of a SEEN item at review time); for an UNSEEN slot, p = g (the
    item's guess floor). The fixture may fix R_i / g as given numbers (no FSRS scheduling inside the
    oracle — the oracle scores the dial delta from an item's state transition, with the correct/wrong
    next-states supplied as fixture inputs, e.g. "item i's retrievability becomes R_correct on a
    correct review, R_wrong on a wrong review"). Document this fixture convention in the script header.
  - ΔP_i = p_correct·(P_pass(after correct) − P_pass(before)) + (1−p_correct)·(P_pass(after wrong) − P_pass(before)).

## Goal
PASS = ALL true:

1. `scripts/oracles/gen-wave23-oracles.py` exists; `python3 scripts/oracles/gen-wave23-oracles.py`
   exits 0 (stdlib + numpy only, no network); the file header NAMES `specs/wave23-exam-allocator-spike.md`
   and contains verbatim the string
   `reference oracle — the TS impl MUST match this; never regenerate these values from TS`.
2. The script prints, and `verify.sh` captures into
   `tasks/wave23-01-python-oracle/PREVERIFY-OUTPUT.txt`, a labelled `ok <token> got=X exp=X`-style
   line for every frozen quantity in criteria 3–8, with a header line containing
   `static evidence — read, do not run`. No printed line contains the substrings `MISMATCH`,
   `not ok`, or `FAIL`.
3. **(a) ΔP_i values, 6dp** — for a hand-built 6-item / 2-block fixture (document each item's block,
   its `before` retrievability/state, its `after-correct` and `after-wrong` retrievability, and
   p_correct), print `ΔP_i` to 6dp for every one of the 6 items, each labelled
   `ok dP item=<id> dP=<6dp>`. The `P_pass(before)` baseline dial is printed once to 6dp as
   `ok dial_before final=<6dp>`.
4. **(b) allocator ranking (exact order)** — print the exact descending order of the 6 items by ΔP_i
   as a single line `ok rank order=<id>,<id>,<id>,<id>,<id>,<id>` (ties broken by item id ascending,
   documented). This is the golden top-B ranking the TS impl must reproduce.
5. **(c) expected-outcome blend arithmetic** — for ONE chosen item, print the correct-path delta, the
   wrong-path delta, p_correct, and the blended ΔP separately to 6dp:
   `ok blend item=<id> dCorrect=<6dp> dWrong=<6dp> p=<6dp> dP=<6dp>` and assert
   `dP == p·dCorrect + (1−p)·dWrong` to 6dp (`ok blend_identity holds=true`).
6. **(d) budget boundaries** — `ok budget_zero reviewed=0` (B=0 ⇒ allocator selects nothing, total
   gain 0.000000) and `ok budget_saturate reviewed=6 selected=<all 6 ids sorted>` (B ≥ candidate
   count ⇒ all reviewed). Both printed with their selected-id lists.
7. **(e) baseline-policy ranking** — the current queue formula (additive score: `overdue + (1−R) +
   0.3·topicWeakness + 0.01·tiebreak`, due-first) re-encoded from the queue.ts docstring and applied
   to the SAME 6-item fixture (each item given an `overdue`, `R`, `topicWeakness`, `stability`), print
   its descending order `ok baseline order=<id>,...` and note it DIFFERS from the allocator order for
   at least one position (`ok policies_differ differs=true`) OR, if they coincide on this fixture,
   `differs=false` printed HONESTLY (do not re-fixture to force a difference — the honest result is the
   finding).
8. **(f) monotone sanity** — reviewing a below-mean item with `after-correct R > before R` yields
   `ΔP_i ≥ 0` on its correct path (`ok mono correct_delta_nonneg=true`); an item already at the block
   ceiling (before R already high) yields a smaller ΔP than a weak item (`ok mono weak_gt_strong=true`).

## Constraints / decisions
- INDEPENDENT re-encode: crib the PB-tail / split / GH-mixture helpers from gen-19d-oracles.py by
  COPY only — never `import` any TS, never shell out to node/tsx. The whole point is a second,
  independent implementation the TS must agree with (anti self-grading).
- Fixture-supplied state transitions: the oracle does NOT run FSRS scheduling; it scores the dial
  delta from GIVEN before/after retrievabilities per item. The FSRS transition (deriveGrade→schedule)
  is exercised by the SIM (wave23-05), not the allocator-score oracle — keep this oracle a pure dial-
  delta function so its 6dp values are exactly reproducible in TS by importing the real `releaseDial`.
- Directional-oracle discipline (wave19b lesson): if (e) shows the policies coincide, print
  `differs=false` — do NOT reshape the fixture to manufacture a difference.
- No DB, no network, no rng. Deterministic nested loops / hard-coded fixtures only.

## Acceptance
Static-judge evidence: `PREVERIFY-OUTPUT.txt` (verbatim stdout, header `static evidence — read, do
not run`). The judge confirms each criterion by READING that file + the script; it does not run
anything. verify.sh (below) re-runs the script and greps the labelled lines.

## Next
- [x] Copy the PB-tail/split/GH-mixture helpers from gen-19d-oracles.py into a fresh
      gen-wave23-oracles.py; build the 6-item/2-block fixture; implement ΔP_i; print (a)–(f); capture
      PREVERIFY-OUTPUT.txt.
- Task complete. Downstream: wave23-03 authors the TS oracle test reading PREVERIFY-OUTPUT.txt;
  the frozen 6dp values (dial_before=0.624559; dP i1..i6 = .018348/.013055/.007272/.018686/.012259/.005315)
  MUST be reproduced by importing the real `releaseDial`, never regenerated from TS.

## Log
- 2026-07-14 mac-mini: planned.
- 2026-07-14 ClPcs-Mac-mini: authored `scripts/oracles/gen-wave23-oracles.py` — cribbed PB-tail /
  Lahiri–Mukherjee split / GH one-factor mixture helpers by COPY from gen-19d-oracles.py (no TS
  import), re-encoded `p_pass = releaseDial(...).final = min(mixture, independence)` over the full
  4-strata blueprint (pdr10/safety4/build4/medical2, THRESHOLD 18, review_mass 8.0). Built a 6-item /
  2-block fixture (candidates in build+safety, background fixed @0.95) with fixture-supplied
  before/afterCorrect/afterWrong/p_correct per item; ΔP_i = p·dCorrect + (1−p)·dWrong. Emitted all
  (a)–(f) labelled `ok …` lines: dial_before=0.624559; allocator rank i4,i1,i2,i5,i3,i6; blend
  identity holds; budget_zero/saturate boundaries; baseline (queue.ts scoreCandidate re-encoded)
  rank i4,i5,i2,i1,i3,i6 → policies_differ=true (HONEST — not re-fixtured); monotone correct-path
  nonneg (i1 dCorrect=0.064417) + weak_gt_strong (i1 0.018348 > i6 0.005315). Script exits 0,
  9 self-checks pass. Fixed the anti-regeneration string (grep needs it on ONE line, not wrapped).
  `bash verify.sh` → PASS wave23-01; PREVERIFY-OUTPUT.txt captured (26 `ok` lines).

## Verify
**Last verify:** PASS (2026-07-14T13:22:18Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T13:24:18Z)
