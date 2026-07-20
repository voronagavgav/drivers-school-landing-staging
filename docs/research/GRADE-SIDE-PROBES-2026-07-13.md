# Grade-side numeric confirmation probes (2026-07-13, playbook step 2)

Run with the REAL code (`npx tsx` probes against `lib/fsrs/schedule.ts`/`grade.ts`, sqlite3 over
`prisma/dev.db`). These numbers supersede the deep-dive report's estimates where they differ.

## R4 — one Again on a strong item (real `schedule()`, D=5)

| prior s | elapsed | R      | interval before | s' after Again | interval after | state |
|---------|---------|--------|-----------------|----------------|----------------|-------|
| 50      | 10d     | 0.9728 | 50d             | **2.546**      | 2.55d (61h)    | relearning, lapse++ |
| 50      | 50d     | 0.9000 | 50d             | 2.871          | 2.87d (69h)    | relearning |
| 100     | 20d     | 0.9728 | 100d            | 3.324          | 3.32d (80h)    | relearning |
| 20      | 5d      | 0.9668 | 20d             | 1.741          | 1.74d (42h)    | relearning |
| 10      | 2d      | 0.9728 | 10d             | 1.235          | 1.23d (30h)    | relearning |

⚠ CORRECTS THE DEEP-DIVE REPORT: the claimed s≈0.3 / ~7h was WRONG — the real crush on s=50 is
s'≈2.55 / ~61h. Still a ~95% interval destruction (50d→2.5d) from a single mis-click. Recovery:
**5 Good-at-due reviews over ~86 days** to regain s≥50.

Slip-consistency check — the model's own posterior after a WRONG answer at strong priors
(s=FSRS_SLIP=0.1): p0=0.90→P(knows|wrong)=0.55–0.64; p0=0.95→0.72–0.79; p0=0.99→0.93–0.95
(rising with option count). So the system crushes items it still believes are 72–95% known.

## The fix space is BINARY-BROKEN (the central design problem)
`schedule()` is oracle-locked (FSRS-6 vectors byte-identical; grade is the only input). On
s=50/R=0.9728 the full grade menu:

| grade fed | s'    | next interval | state      | lapses |
|-----------|-------|---------------|------------|--------|
| Again(1)  | 2.55  | 2.5d          | relearning | +1     |
| Hard(2)   | 63.40 | 63.4d         | review     | +0     |
| Good(3)   | 72.28 | 72.3d         | review     | +0     |

There is NO mild-penalty grade: a wrong answer either crushes the memory (Again) or GROWS it
(Hard — stability 50→63, wrong answer makes the item come back LATER). Any posterior-weighted
"wrong→Hard" fix is direction-INVERTED on the stability axis. The correct mechanism (skip-update?
blended stability outside schedule()? shortened due without state change?) needs external
research grounding BEFORE speccing — this is the wave20 deep-research question.

## D1 — real option counts (sqlite3 over the 2322 published questions)

| options | questions | share |
|---------|-----------|-------|
| 2       | 491       | 21.1% |
| 3       | 1091      | 47.0% |
| 4       | 474       | 20.4% |
| 5       | 266       | 11.5% |

⚠ UPGRADES D1 vs the report's "negligible": only 20% of the bank is actually 4-option (the
hardcoded g=0.25). Posterior at neutral prior 0.5 for a CORRECT answer: n=2→0.643, n=3→0.730,
n=4→0.783, n=5→0.818 vs thresholds Good≥0.75 / Easy≥0.93. So honest g flips the production-bulk
grade Good→Hard for the 68% of the bank with 2–3 options. Threading optionCount is NOT a
transparent cheap fix — it interacts with the KNOW_GOOD/KNOW_EASY thresholds (calibrated
implicitly for g=0.25) and with new-card graduation speed. Threshold re-derivation belongs in the
same research question.

## D4 — latency data (dev.db)
ReviewLog: 44 rows total, 0 null latency, ALL <2s (test artifacts, no real user data).
Per-topic latency bands stay DATA-GATED — defer, nothing to ground them on.

## Invariant map — `correct ⟺ grade≥2` dependents (grep-confirmed)
- `lib/server/calibration.ts:40` — `correct: r.grade >= 2` (calibration corpus).
- `lib/server/learning-health.ts:78` — same reconstruction (content-health accuracy).
- ReviewLog has **NO `correct` column** (PRAGMA-confirmed) — the D2/R4 fix MUST lead with an
  additive `ReviewLog.correct Boolean?` migration + switch both readers to
  `correct ?? (grade >= 2)` before any wrong answer can be graded ≥2 (if that mechanism is even
  chosen — see fix-space note above).
- `ReviewState.lastGrade` is write-only (study.ts:171) — no readers, no migration risk.
- Engine tag: `REVIEW_ENGINE_VERSION="fsrs6-bkt1"` (lib/fsrs/constants.ts:69), written at
  study.ts:201, pinned in srs-review.integration.test.ts — any grade-semantics change bumps it
  (→"fsrs6-bkt2") and consciously updates the pin.

## Grade distribution in dev.db (context)
44 ReviewLog rows: grade 1 ×36, grade 3 ×8. Test artifacts only — no production corpus to
validate against yet; all direction checks must be synthetic/analytic.
