# Exam-allocator spike — measurement report (2026-07-14)

**Spec:** `specs/wave23-exam-allocator-spike.md`, Deliverable 4 (decision gate).
**Instrument:** `scripts/spikes/exam-allocator-sim.ts` → pure engine `lib/exam-allocator-sim.ts`
(wave23-05), determinism pinned by `lib/exam-allocator-sim.determinism.test.ts` (wave23-06).
**Raw evidence:** `tasks/wave23-07-measurement-report/PREVERIFY-OUTPUT.txt` (verbatim stdout).

## What was measured

A greedy dial-delta **allocator** (`lib/exam-allocator.ts`, wave23-04) vs the **current production
queue baseline** (`selectReviewQueue`, `lib/test-engine/queue.ts`), each run at **equal daily budget**
through the shipped FSRS pipeline (`schedule`/`retrievability`/`deriveGrade`/`gradePosterior`/
`slipAdjustedLapse`) and scored on exam day by the **same** release dial (`releaseDial.final`). Both
arms share each replica's t=0 student; they differ only in how the daily seen-review lane is ranked.

- **Grid:** {weak, median, strong} priors × {14, 30, 60} day horizons × {15, 30} items/day budget
  = **18 cells**, **50 replicas** each, seed 42 (byte-deterministic).
- **Below-threshold population** = cells whose baseline exam pass-prob < 0.90 (`BELOW_THRESHOLD_PASS`);
  the app exists to help these students. The gate aggregates lift over exactly these cells.
- **Lift** = allocator − baseline exam pass-prob, in percentage points (pp).

## Per-cell results

Transcribed verbatim from `PREVERIFY-OUTPUT.txt`. `pop` = below (baseline < 90%) or ready.

| profile | horizon | budget | baseline | allocator | lift (pp) | 95% CI (pp)      | pop   |
|---------|--------:|-------:|---------:|----------:|----------:|------------------|-------|
| weak    |      14 |     15 |   14.92% |    14.86% |    −0.06  | [−0.37, +0.26]   | below |
| weak    |      14 |     30 |   81.89% |    82.46% |    +0.58  | [−0.03, +1.18]   | below |
| weak    |      30 |     15 |   88.44% |    87.24% |    −1.20  | [−1.88, −0.53]   | below |
| weak    |      30 |     30 |   99.99% |    99.99% |    −0.00  | [−0.00, +0.00]   | ready |
| weak    |      60 |     15 |   99.99% |    99.98% |    −0.00  | [−0.01, −0.00]   | ready |
| weak    |      60 |     30 |  100.00% |   100.00% |    −0.00  | [−0.00, −0.00]   | ready |
| median  |      14 |     15 |   57.30% |    56.92% |    −0.38  | [−1.12, +0.37]   | below |
| median  |      14 |     30 |   99.12% |    99.12% |    −0.00  | [−0.10, +0.09]   | ready |
| median  |      30 |     15 |   99.31% |    99.09% |    −0.22  | [−0.36, −0.07]   | ready |
| median  |      30 |     30 |   99.99% |    99.99% |    −0.00  | [−0.00, +0.00]   | ready |
| median  |      60 |     15 |   99.99% |    99.99% |    −0.00  | [−0.00, −0.00]   | ready |
| median  |      60 |     30 |  100.00% |   100.00% |    −0.00  | [−0.00, −0.00]   | ready |
| strong  |      14 |     15 |   96.62% |    96.10% |    −0.52  | [−0.82, −0.21]   | ready |
| strong  |      14 |     30 |   99.94% |    99.93% |    −0.00  | [−0.01, +0.00]   | ready |
| strong  |      30 |     15 |   99.90% |    99.90% |    −0.00  | [−0.01, +0.01]   | ready |
| strong  |      30 |     30 |  100.00% |   100.00% |    −0.00  | [−0.00, −0.00]   | ready |
| strong  |      60 |     15 |  100.00% |   100.00% |    −0.00  | [−0.00, +0.00]   | ready |
| strong  |      60 |     30 |  100.00% |   100.00% |    −0.00  | [−0.00, −0.00]   | ready |

## Gate verdict

<!-- verbatim mirror in tasks/wave23-07-measurement-report/FINDINGS.md -->

**VERDICT: NO-GO**

Numeric basis (from the captured `VERDICT:` line):

- **Below-threshold mean lift = −0.27pp** (4 below-threshold cells) — **target ≥ 2.00pp. FAILS.**
  The allocator does not clear the +2pp bar; it is slightly *negative* on the very population the
  gate cares about.
- **Worst-cell lift = −1.20pp** (weak · h=30 · B=15) — **harm gate ≥ −0.50pp. FAILS.**
  That cell's whole 95% CI is [−1.88, −0.53]pp, i.e. a statistically-significant *loss*, breaching the
  "no profile harmed by > 0.5pp" guardrail.

Both gate conditions fail, so the decision is **NO-GO** — reported honestly per the spike's
directional-oracle discipline (the allocator loses; that is the finding). The population was NOT
re-fixtured to chase a positive result.

### Why the allocator does not win here

The measurable exam-day dial is dominated by two regimes where a smarter seen-review ranking has almost
no room to help:

1. **Saturation.** In 14 of 18 cells the baseline already sits at ≥ 99% pass-prob (median/strong at any
   B=30, and everyone by 30–60 days), so both arms are pinned at the ceiling and lift ≈ 0. The dial's
   honesty clamp also holds both arms down identically when unseen coverage is thin.
2. **Coverage-bound, not ordering-bound.** In the genuinely below-threshold cells (short horizon /
   tight budget), pass-prob is limited by how many blueprint slots are *covered at all*, not by which
   seen card is refreshed first. Both arms spend the identical unseen-coverage budget
   (`round(B × DEFAULT_NEW_ITEM_SHARE)`), so the allocator's dial-delta re-ranking of the seen lane
   moves the needle by only fractions of a point — and in the weak·h30·B15 cell it slightly *mis*-spends
   review effort relative to the queue's weakness-weighted pick, producing the −1.20pp loss.

## Product-wave recommendation

**STOP — do not proceed to wire the allocator into the production queue.** The spike's purpose was to
measure whether a dial-delta allocator beats the current queue by a margin worth a product wave; it does
not. On the below-threshold students it is flat-to-negative (mean −0.27pp) and it significantly *harms*
one realistic profile (−1.20pp), so shipping it would trade complexity and risk for no expected pass-rate
gain. The current `selectReviewQueue` baseline stands.

Cheaper follow-ups, if the exam-allocator idea is revisited later, would target the actual binding
constraint the sim exposed — **blueprint coverage under a tight budget** (e.g. a coverage-first unseen
lane), not seen-review re-ranking. That is out of scope here and would need its own spike + gate; this
report closes the wave23 allocator investigation as NO-GO.

---

*Reproduce:* `npx tsx scripts/spikes/exam-allocator-sim.ts` (deterministic, ~2.5 min, seed 42). The
headline numbers above are transcribed from `tasks/wave23-07-measurement-report/PREVERIFY-OUTPUT.txt`.
