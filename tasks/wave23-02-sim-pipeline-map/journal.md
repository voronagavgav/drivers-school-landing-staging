# Task: wave23-02-sim-pipeline-map

**Status:** done
**Driver:** auto
**Updated:** 2026-07-14
**Last compute:** mac-mini

**Artifacts:** `tasks/wave23-02-sim-pipeline-map/FINDINGS.md` (the pipeline contract the sim wires).

INVESTIGATION-ONLY (deliverable = a written FINDINGS.md, NO code change). Before the sim harness
(wave23-05) is built, pin the EXACT real-pipeline contract it must compose, so the sim runs the
SHIPPED pipeline (spec: "the sim must run the SHIPPED pipeline, not an idealization"), not a
re-derivation. This de-risks the two most expensive-to-get-wrong wiring decisions.

## Goal
PASS = ALL true (each answer is a concrete function signature + file:line, verified against the repo):

1. `tasks/wave23-02-sim-pipeline-map/FINDINGS.md` exists and contains an `## Acceptance` block mapping
   each numbered question below to the exact `file:line` symbol it cites.
2. **State init**: FINDINGS documents the `ReviewMemoryState` shape (`lib/fsrs/types.ts`) and the exact
   fields the sim seeds for (a) an UNSEEN item (never reviewed: `lastReviewedAt` null, no stability)
   and (b) a SEEN item with a given retrievability at a given `now` — including how to derive a
   `stability`/`lastReviewedAt` pair yielding a target R (invert the forgetting curve via
   `intervalDays`/`retrievability`, `lib/fsrs/retrievability.ts`).
3. **Answer sampling**: FINDINGS states the sim samples `correct ~ Bernoulli(p)` with `p = R_i`
   (retrievability, `retrievability(state, now)`) for a SEEN item and `p = g` (guess floor
   `min(1/optionCount, FSRS_GUESS_MAX)`) for an UNSEEN item, citing `retrievability` and the guess
   constant in `lib/fsrs/constants.ts`.
4. **State update path**: FINDINGS gives the exact call chain a review takes —
   `deriveGrade`/`gradePosterior` (`lib/fsrs/grade.ts`, with `priorKnow = R` prior) → grade 1..4 →
   `schedule(prevState, grade, now)` (`lib/fsrs/schedule.ts`) → next `ReviewMemoryState` — including
   which arg carries the wave20 honest-guess/slip-adjusted grading and the lapse adjustment
   (`lib/fsrs/lapse-adjust.ts`) if applicable. Note where the correct/wrong outcome enters
   (`correct: boolean`).
5. **Objective call**: FINDINGS documents how to assemble a `ReleaseInput` (`lib/readiness-release.ts`)
   from a student's per-item states at the exam date — the 4-strata blueprint quotas
   (`pdr 10 · safety 4 · build 4 · medical 2`), per-block `seenR` = retrievabilities of that block's
   seen items at exam `now`, `nUnseen` per block, `reviewMass` = mean per-item review count — and that
   the reported pass-prob is `releaseDial(input).final`. Anchors OMITTED (m=0 ⇒ identity; spec).
6. **Baseline policy**: FINDINGS documents how the sim invokes the CURRENT production policy —
   `selectReviewQueue(candidates, opts)` (`lib/test-engine/queue.ts`): the `QueueCandidate` shape
   (`questionId, topicId, topicWeakness, state`), the `QueueOptions` (`now, size=B, newItemShare,
   backfillWithNew`), and that it returns an ordered `questionId[]` of length ≤ B. It notes the
   baseline picks the SAME budget B items per day via this call.
7. FINDINGS ends with a `## Sim contract` pseudocode block: the per-day loop (both policies pick B,
   answers sampled, states updated) + the exam-date scoring, referencing ONLY real exported symbols
   (each name greppable in the repo).

## Constraints / decisions
- READ-ONLY investigation: no code, no test, no lib change. Every cited symbol must currently EXIST
  (grep before citing — CLAUDE.md recall-verification rule).
- Materialize the deliverable as an on-disk `FINDINGS.md` with an `## Acceptance` table (the
  investigation-task evaluator learnings: a static judge inspects a real file, not journal prose).
- This maps the contract; it does NOT decide the allocator math (that is wave23-01's frozen oracle).

## Acceptance
Deliverable is `FINDINGS.md`; verify.sh asserts its existence + that every cited symbol name it
references is a real export in the repo (greppable). The judge READS FINDINGS.md.

## Next
- [x] Grep the fsrs/queue/readiness modules for the exact signatures; write FINDINGS.md with the
      `## Acceptance` table + `## Sim contract` pseudocode.
- Goal fully met (verify.sh PASS). No further increments; wave23-05 consumes FINDINGS.md.

## Log
- 2026-07-14 mac-mini: planned.
- 2026-07-14 ClPcs-Mac-mini: grepped fsrs/queue/readiness modules for exact signatures+lines
  (ReviewMemoryState types.ts:17, retrievability.ts:28, gradePosterior/deriveGrade grade.ts:52/85,
  schedule.ts:119, slipAdjustedLapse lapse-adjust.ts:37, releaseDial/ReleaseInput readiness-release.ts:88/50,
  selectReviewQueue/QueueCandidate/QueueOptions queue.ts:150/99/108, CATEGORY_B_BLUEPRINT exam-blueprint.ts:70).
  Wrote FINDINGS.md (§2 state init + forgetting-curve inversion via intervalDays; §3 sampling p=R/p=g;
  §4 grade→schedule/slipAdjustedLapse update path; §5 ReleaseInput assembly, quotas pdr10/safety4/
  structure(build)4/medical2, pass-prob=.final; §6 baseline selectReviewQueue; ## Acceptance table;
  ## Sim contract pseudocode over real symbols). verify.sh PASS. Status→done.

## Verify
**Last verify:** PASS (2026-07-14T13:27:19Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T13:29:05Z)
