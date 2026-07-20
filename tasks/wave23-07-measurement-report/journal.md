# Task: wave23-07-measurement-report

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** mac-mini

**Artifacts:**
- `docs/research/EXAM-ALLOCATOR-SPIKE-2026-07-14.md` (the committed GO/NO-GO report),
- `tasks/wave23-07-measurement-report/FINDINGS.md` (verbatim mirror of the report's verdict block),
- `tasks/wave23-07-measurement-report/PREVERIFY-OUTPUT.txt` (verbatim sim stdout — static-judge evidence).

INVESTIGATION + REPORT (spec Deliverable 4). Run the full simulation grid, capture its verbatim
stdout, and produce the decision-gate report. The evaluator learnings about investigation tasks apply
in full: materialize on-disk artifacts (report + FINDINGS.md + captured stdout) and an `## Acceptance`
table so the STATIC judge READS produced files rather than running anything. Depends on: wave23-05.

## The decision gate (spec Goal)
Mean lift ≥ 2 percentage points of pass-prob on the BELOW-THRESHOLD population, with NO profile harmed
by > 0.5pp. The report states GO (gate met) or NO-GO (gate not met) — whatever the sim actually
measured. ⚠ DIRECTIONAL-ORACLE DISCIPLINE: if the allocator LOSES, that is the finding — report NO-GO
honestly; never re-run against a re-fixtured population where it wins.

## Goal
PASS = ALL true:

1. `tasks/wave23-07-measurement-report/PREVERIFY-OUTPUT.txt` exists and is the VERBATIM stdout of a
   single `npx tsx scripts/spikes/exam-allocator-sim.ts` run (its header contains
   `static evidence — read, do not run`, and the captured content includes the per-cell rows + verdict
   line the sim prints).
2. `docs/research/EXAM-ALLOCATOR-SPIKE-2026-07-14.md` exists with: (a) a per-cell results TABLE
   (profile × horizon × budget → allocator mean, baseline mean, lift pp, CI) transcribed from the
   captured stdout; (b) an explicit GATE VERDICT section stating GO or NO-GO and the numeric basis
   (mean below-threshold lift in pp; worst per-profile harm in pp); (c) a product-wave recommendation
   (proceed / stop, and why), consistent with the verdict.
3. `tasks/wave23-07-measurement-report/FINDINGS.md` exists, contains an `## Acceptance` table mapping
   each Goal criterion → the exact file+anchor the judge READS, and mirrors the report's verdict block
   verbatim.
4. The report's headline lift numbers MATCH the captured `PREVERIFY-OUTPUT.txt` (verify.sh cross-greps
   the verdict line's numbers into the report — the report cannot claim a number the sim did not print).
5. The verdict wording is CONSISTENT with the numbers: if mean below-threshold lift < 2pp OR any
   profile harmed by > 0.5pp, the report says NO-GO; otherwise GO. (verify.sh does a coarse
   consistency check: the string `NO-GO` XOR `GO:` present, matching the captured verdict token.)

## Constraints / decisions
- NO re-fixturing to chase a favorable result. The sim (wave23-05) is frozen; this task RUNS it and
  transcribes. If GO is not reached, NO-GO is the correct, shippable deliverable — the spike's value is
  the measurement, not a positive result.
- The report is a docs/research artifact only — NO product wiring, NO queue/UI change (out of scope,
  future wave gated on this report).
- Compress the journal Log; keep the `## Acceptance` table near the top (investigation-task static-judge
  learnings — avoid a glitch-fighting meta-narrative that buries the Goal→evidence mapping).

## Acceptance
Static-judge evidence: the three on-disk artifacts. The judge confirms each criterion by READING the
report + FINDINGS.md + PREVERIFY-OUTPUT.txt; verify.sh re-captures the sim run and cross-checks the
numbers into the report.

## Next
- [x] Run `npx tsx scripts/spikes/exam-allocator-sim.ts`, capture stdout to PREVERIFY-OUTPUT.txt, write
      the report + FINDINGS.md with the honest verdict.
- Goal fully met (NO-GO reported honestly). Nothing further; verify.sh green.

## Result
**VERDICT: NO-GO.** Below-threshold mean lift = −0.27pp (4 below-threshold cells; target ≥ 2.00pp) and
worst-cell lift = −1.20pp (weak·h30·B15, CI [−1.88,−0.53]; harm gate ≥ −0.50pp) — both gate conditions
fail. Recommendation: STOP, do not wire the allocator; current `selectReviewQueue` stands. Reported
honestly per directional-oracle discipline; population NOT re-fixtured.

## Log
- 2026-07-14 mac-mini: planned.
- 2026-07-14 ClPcs-Mac-mini: ran `npx tsx scripts/spikes/exam-allocator-sim.ts` (deterministic, ~2.5min,
  seed 42; earlier empty background reads were just the run still in flight). Captured verbatim stdout →
  `PREVERIFY-OUTPUT.txt` (with `static evidence — read, do not run` header). Wrote
  `docs/research/EXAM-ALLOCATOR-SPIKE-2026-07-14.md` (18-cell table + NO-GO gate verdict + STOP
  recommendation) and `FINDINGS.md` (## Acceptance table + verbatim verdict mirror). Verdict NO-GO:
  allocator loses on the below-threshold population — reported honestly, no re-fixturing. Status→done.

## Verify
**Last verify:** PASS (2026-07-14T14:39:42Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T14:45:58Z)
