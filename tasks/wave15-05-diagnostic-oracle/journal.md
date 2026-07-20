# Task: wave15-05-diagnostic-oracle

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-03T09:40Z
**Last compute:** mac-mini

## Goal
ORACLE AUTHORING ONLY: write the FROZEN reference tests for the NEW pure fn `selectDiagnostic`
(spec §B DIAGNOSTIC selection) BEFORE implementation. The golden apportionment vectors below were
hand-computed at PLAN time from `CATEGORY_B_BLUEPRINT` (lib/exam-blueprint.ts, the named source) and
may NOT be re-derived by calling the implementation. wave15-06 implements against these tests and may
not edit them. PASS = ALL true:

1. `lib/test-engine/diagnostic.ts` exists as a CONTRACT STUB ONLY:
   ```ts
   export interface DiagnosticCandidate { id: string; displayOrder: number | null; difficulty: number }
   export function selectDiagnostic(
     blueprint: ExamBlueprint,
     candidates: readonly DiagnosticCandidate[],
     opts: { count?: number; rng?: () => number },   // count defaults to DIAGNOSTIC_COUNT (15)
   ): string[]
   ```
   body: `throw new Error("NOT_IMPLEMENTED_WAVE15_06")`. `ExamBlueprint` is a type-import from
   `../exam-blueprint` (or `@/lib/exam-blueprint`). NOTE the signature takes NO ReviewState and no
   `now` — DIAGNOSTIC works with zero prior state BY CONSTRUCTION (spec requirement).
2. The NORMATIVE ALGORITHM is quoted verbatim in diagnostic.ts's doc comment (in prose — no JSX/no
   forbidden tokens) so wave15-06 implements exactly what the vectors assume:
   (i)   Group candidates by block via `groupCandidatesByBlock` (reuse lib/exam-blueprint.ts — never
         reimplement the §↔displayOrder mapping).
   (ii)  Nominal per-block counts: fixed `count` blocks as-is; ranged blocks at their range MIN (no
         rng for counts); remainder block = blueprint.total − Σ others.
   (iii) Scale to opts.count by LARGEST-REMAINDER (Hamilton): quota_i = nominal_i × count /
         blueprint.total; allocate floor(quota_i); hand out the remaining seats one each by
         DESCENDING fractional remainder; ties → earlier block in blueprint.blocks order.
   (iv)  Underfill: a block with fewer candidates than its allocation contributes all it has; each
         unfilled seat is redistributed by cycling blocks in blueprint.blocks order, one seat per
         pass, skipping blocks with no unpicked candidates, until `count` reached or candidates
         exhausted (take what exists — no invention).
   (v)   Within a block: Fisher–Yates shuffle with the injected rng, then STABLE sort by difficulty
         ascending, take the allocated number.
   (vi)  Output: all picked ids STABLE-sorted by difficulty ascending globally (stability over
         blueprint block order ⇒ deterministic under a fixed rng).
3. `lib/test-engine/diagnostic.test.ts` exists — frozen oracle (house seeded-LCG mkRng idiom)
   asserting AT MINIMUM, against CATEGORY_B_BLUEPRINT and count 15:

   PLAN-TIME HAND COMPUTATION (the frozen truth): safety at range-min 2 ⇒ nominals
   structure 2 · medicine 2 · law 2 · general 1 · safety 2 · pdr 11 (total 20). Quotas ×15/20:
   1.5 · 1.5 · 1.5 · 0.75 · 1.5 · 8.25 → floors 1,1,1,0,1,8 (=12); 3 leftover seats by remainder:
   general (.75), then structure and medicine (.5 ties, earlier blocks win over law/safety).
   - V1 (ample pool, ≥5 candidates per block): per-block pick counts are EXACTLY
     **structure 2 · medicine 2 · law 1 · general 1 · safety 1 · pdr 8** (sum 15).
   - V2 (medicine has only 1 candidate, others ample): **structure 3 · medicine 1 · law 1 ·
     general 1 · safety 1 · pdr 8** (the deficit seat cycles to structure, the first block with
     spare candidates).
   - V3 (total pool of 9 candidates < 15): result is ALL 9 ids — no invention, no duplicates.
   - V4 (determinism): same seeded rng + inputs twice → identical arrays.
   - V5 (ordering): the result mapped to difficulties is globally NON-DECREASING.
   - V6 (sanity): no duplicates; every returned id ∈ candidates.
   Fixture block membership via displayOrder (= official § + 99): structure §31→130 / §45→144;
   medicine §37→136; law §36/38/39/46→135/137/138/145; general §44→143; safety §35/47→134/146;
   pdr (remainder) = any unclaimed section, e.g. §8→107, §33→132, §34→133.
4. `npx tsc --noEmit` exits 0.
5. `npx vitest run lib/test-engine/diagnostic.test.ts` exits NON-ZERO (red against the stub — binds).
6. verify.sh has recorded the sha256 of diagnostic.test.ts into
   `tasks/wave15-05-diagnostic-oracle/oracle.sha256`.
7. Purity: diagnostic.ts contains NO `server-only`, `@/lib/db`, `lib/generated`, `Math.random`,
   `Date.now`, `new Date(` tokens (comments included; describe fixtures in prose, no JSX examples).

## Constraints / decisions
- FROZEN: no later task edits diagnostic.test.ts (wave15-06 goes green without touching it;
  wave15-14 puts its finish-screen tests in a SEPARATE file; wave15-16 re-checks the sha).
- Ranged blocks resolve to MIN deterministically (no rng in counts) — keeps the 15-question spread
  stable and the vectors exact. rng is used ONLY for within-block tie-shuffling (v).
- Unit board red on this file until wave15-06 — deliberate; do not weaken.
- The test file may use fixed literals freely; expected counts above are written as LITERALS in the
  asserts (never derived by re-running any apportionment helper — that would be self-grading).

## Next
- [x] Write the stub with the normative algorithm comment, then the oracle tests V1–V6 with the
      literal vectors above.
- [ ] (wave15-06) Implement selectDiagnostic against this frozen oracle; do not edit the test file.

## Artifacts
- lib/test-engine/diagnostic.ts (stub) · lib/test-engine/diagnostic.test.ts (frozen oracle)
- tasks/wave15-05-diagnostic-oracle/oracle.sha256

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T09:40Z ClPcs-Mac-mini: wrote lib/test-engine/diagnostic.ts (contract stub, throws
  NOT_IMPLEMENTED_WAVE15_06, normative algorithm (i)–(vi) in prose doc comment, no forbidden tokens)
  and lib/test-engine/diagnostic.test.ts (frozen oracle V1–V6). V1 amplePool(10) so pdr has ≥8 for
  its allocation-8 (the "≥5 per block" wording is a floor, but pdr needs 8). Ids encode block via
  `${key}-${i}` prefix + a representative displayOrder so per-block picks are counted by prefix
  (not by re-running apportionment). tsc green; oracle red against stub (6/6 fail); verify.sh green,
  oracle.sha256 recorded (31897876…). Goal fully met → Status done.

## Verify
**Last verify:** PASS (2026-07-03T06:39:48Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T06:40:58Z)
