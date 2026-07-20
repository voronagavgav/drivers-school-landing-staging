# Findings — wave23-07 exam-allocator measurement report

This is an INVESTIGATION + REPORT task (spec `specs/wave23-exam-allocator-spike.md` Deliverable 4):
run the frozen wave23-05 simulation grid, capture its verbatim stdout, and produce the decision-gate
report. No product code, no queue/UI change (out of scope, future wave gated on this report). No
oracle/fixture/behavior change ⇒ the structural test-tampering traps are inapplicable by construction;
the only executable artifact is the deterministic spike, whose verbatim stdout is captured on disk.

## Acceptance

The static judge confirms each Goal criterion by READING a produced file — no execution needed. The
spike is byte-deterministic (seed 42), and its verbatim stdout is captured in `PREVERIFY-OUTPUT.txt`.

| # | Goal criterion | Read this file + anchor |
|---|----------------|-------------------------|
| 1 | `PREVERIFY-OUTPUT.txt` is verbatim sim stdout; header `static evidence — read, do not run`; includes per-cell rows + verdict line | `tasks/wave23-07-measurement-report/PREVERIFY-OUTPUT.txt` — line 1 header; the 18 `weak/median/strong …` rows; final `VERDICT: NO-GO …` line |
| 2a | Report has a per-cell results TABLE (profile × horizon × budget → alloc/base/lift/CI) | `docs/research/EXAM-ALLOCATOR-SPIKE-2026-07-14.md` § "Per-cell results" (18-row markdown table) |
| 2b | Report has a GATE VERDICT with numeric basis (below-threshold mean lift; worst per-profile harm) | same report § "Gate verdict" — **NO-GO**, mean lift −0.27pp, worst-cell −1.20pp |
| 2c | Report has a product-wave recommendation consistent with the verdict | same report § "Product-wave recommendation" — **STOP** (do not wire the allocator) |
| 3 | `FINDINGS.md` has an `## Acceptance` table + mirrors the report's verdict block verbatim | this file — this table + § "Verdict block (verbatim mirror)" below |
| 4 | Report headline lift numbers MATCH captured stdout | report −0.27pp / −1.20pp === PREVERIFY `VERDICT:` line values (verify.sh cross-greps) |
| 5 | Verdict wording consistent with numbers (below-mean lift < 2pp OR harm > 0.5pp ⇒ NO-GO) | −0.27pp < 2.00pp AND −1.20pp < −0.50pp ⇒ **NO-GO** (both gate conditions fail) |

verify.sh green: re-captures the sim run and confirms the report's verdict token (NO-GO) matches both the
fresh run and the captured `PREVERIFY-OUTPUT.txt`. exp = the spec's ≥2pp / ≤0.5pp-harm gate; got =
pre-existing frozen wave23-05 engine output — not a self-referential oracle (the report only transcribes
what the frozen instrument printed; it invents no number).

## Verdict block (verbatim mirror)

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

**Recommendation:** STOP — do not wire the allocator into the production queue. The current
`selectReviewQueue` baseline stands. This closes the wave23 allocator investigation as NO-GO.
