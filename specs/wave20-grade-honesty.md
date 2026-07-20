# SIGNAL — Wave 20: Grade-side honesty (slip-adjusted lapses + honest guess floors)

Source: `docs/research/GRADE-SIDE-DEEP-DIVE-2026-07-13.md` (risk table) → numeric confirmation
`docs/research/GRADE-SIDE-PROBES-2026-07-13.md` (ALL numbers pinned on the real engine) →
adversarially-verified external grounding `docs/research/GRADE-MECHANISM-RESEARCH-2026-07-13.md`
(the mechanism verdict + the locally-settled blend space). Read all three before planning; the
mechanism doc's "Wave20 mechanism shape" section is the design.

## Goal
Fix the two confirmed grade-side instrument defects WITHOUT touching the frozen FSRS-6 scheduler:
(R4/D2) one mis-click on a well-known item destroys ~95% of its interval (s=50: 50d → 61h) even
though the system's own posterior says P(knows|wrong)=0.72–0.79; (D1) the guess floor is hardcoded
g=0.25 but only 20% of the bank is 4-option (21% 2-opt, 47% 3-opt, 11.5% 5-opt) — evidence
strength is mis-stated for 80% of questions.

## The settled design (do not re-litigate; research-grounded + direction-checked)
1. **Logged grade = truth.** Wrong stays Again(1) in `deriveGrade` AND in ReviewLog — the FSRS
   docs confirm mislabeled Hard-on-fail corrupts the optimizer corpus, and this preserves
   `correct ⟺ grade≥2` (calibration.ts:40, learning-health.ts:78) — NO migration needed.
2. **Slip-adjusted lapse layer** (new pure module, `lib/fsrs/`): on a wrong answer the APPLIED
   memory state is the full Again path (state→relearning, lapses++, difficulty from the Again
   branch) with ONLY stability replaced by the capped geometric blend
   `S' = min(prior.stability, exp(π·ln S'_hard + (1−π)·ln S'_again))`, dueAt recomputed from S'.
   π = `gradePosterior({correct:false, priorKnow:R, optionCount})` (exists). Linear blend is
   EXCLUDED (probe: it GROWS stability 5→8 on a half-forgotten item at π=0.135). The min-cap makes
   never-grow-on-wrong structural. `schedule()` itself is UNTOUCHED — the layer composes outside;
   FSRS-6 reference vectors stay byte-identical.
3. **Honest guess floor**: thread `optionCount = question.options.length` through
   submitAnswer→recordReview→deriveGrade/gradePosterior (options already loaded at
   test-engine.ts:370 — zero extra DB reads). Cap g: `g = min(1/optionCount, FSRS_GUESS_MAX)` with
   `FSRS_GUESS_MAX = 0.45` — Baker et al. degeneracy bound P(G)<0.5 (2-option honest 0.5 sits ON
   the boundary; shade below).
4. **Thresholds keep fixed posterior semantics** (Good≥0.75, Easy≥0.93 unchanged): honest-g
   posteriors at neutral prior land 2-opt 0.667(capped-g)/3-opt 0.730 → Hard(2) — the production
   bulk for 68% of the bank becomes Hard on FIRST exposure. This is the honest direction (a
   coin-flip-correct IS weak evidence; earlier first reviews are the point) — but it is the wave's
   biggest behavior shift: EVERY task touching it must carry the direction gate (same prior ⇒
   2-opt grade ≤ 3-opt ≤ 4-opt ≤ 5-opt) and the shift must be pre-verified live and documented,
   not discovered.
5. **Engine tag**: `REVIEW_ENGINE_VERSION` → `"fsrs6-bkt2"` (applied-state semantics changed);
   the pinned literal in `srs-review.integration.test.ts` updates CONSCIOUSLY in the same task.

## Deliverables (priority order)

### 1. Python reference oracle FIRST (`scripts/oracles/gen-wave20-oracles.py`)
Network-free, stdlib-only (math only — no scipy needed), committed BEFORE any TS. Reimplements
FSRS-6 forget/recall stability + the capped geometric blend + the BKT posterior INDEPENDENTLY and
freezes, at 6dp, properties (a)–(g):
- (a) blend values on the probe fixtures (s=50/100/20/5 grid, g∈{0.45,1/3,0.25,0.2}, the
  GRADE-MECHANISM doc's table numbers reproduced);
- (b) never-grow-on-wrong: S' ≤ prior S for ALL grid points INCLUDING π>0.926 (the cap binding
  region — 2-option R=0.99);
- (c) crush preserved on weak: prior R≤0.55 grid ⇒ S' ≤ S'_again × 1.6 (dampening bounded near
  the Again arm when π is small);
- (d) monotone in π at fixed prior state;
- (e) repeated-wrong convergence: three successive wrongs at recomputed R ⇒ strictly decreasing S';
- (f) boundary census: priorKnow ∈ {0,1}, optionCount ∈ {0 (→default), 1 (degenerate, g capped),
  2, 100}, latency null, confidence null/set, both caps stacking — every row from
  GRADE-SIDE-PROBES §boundary census pinned;
- (g) posterior direction: same prior ⇒ π_correct strictly decreasing in g; grade(2-opt) ≤
  grade(5-opt).
Emit `PREVERIFY-OUTPUT.txt`-style verbatim stdout ("ok <label> got=X exp=X") per the house
evaluator learnings (static judge reads files, never runs).

### 2. Constants + oracle test file (declaration + tests-only tasks, house pattern)
`FSRS_GUESS_MAX=0.45`, `REVIEW_ENGINE_VERSION="fsrs6-bkt2"` in `lib/fsrs/constants.ts` (+ any
blend-layer constants). TS oracle file freezing the python values against a LOCAL pure helper
(non-skipped self-consistency subset) + dynamic-import `.skip` block for the unbuilt module
(wave19b-01 pattern: at least one non-skipped test so `vitest list` collects the file).

### 3. The pure layer: `lib/fsrs/lapse-adjust.ts`
`slipAdjustedLapse(prior: ReviewMemoryState, pi: number, now: Date): ReviewMemoryState` — calls
the REAL `schedule(prior,1,now)` and `schedule(prior,2,now)`, returns the Again result with the
capped log-blend stability and dueAt recomputed via `intervalDays`. Pure (injected clock, no
`new Date` literal — Reflect.construct idiom), no redeclared types. Un-skips the oracle.
Purity gates: standard lib/fsrs greps (comments included — never write the banned tokens in doc
comments). Reference vectors + wave19b honesty gate must stay byte-green.

### 4. Server wiring (`lib/server/study.ts` + `lib/server/test-engine.ts`)
`RecordReviewParams` gains `optionCount?`; submitAnswer passes `question.options.length`; the
queue-driven paths (study.ts start*/session flows) pass it where options are loaded, else omit
(default preserves today's behavior). `recordReview`: compute π for wrong answers and route the
state update through `slipAdjustedLapse`; grade/ReviewLog unchanged (grade=1). Engine tag bump +
integration pin update in the SAME task. lastGrade stays the true grade.

### 5. Threshold direction gates + live population pre-verification
Unit property tests for design point 4 (option-count grade monotonicity at fixed prior; bulk-shift
table frozen from the python oracle). Pre-verify LIVE magnitudes (tsx --conditions=react-server
against the real seeded bank): grade distribution over the real 2322-question option-count mix at
neutral prior BEFORE/AFTER, captured as a committed artifact; a `docs/` note documenting the
shift (queue volume direction, first-interval change w[1] vs w[2]).

### 6. Integration proof (`grade-inference.integration.test.ts` extension or sibling)
Drive real answers through submitAnswer/startSession fixtures: (i) wrong-on-strong (seeded
ReviewState s=50, elapsed 10d) ⇒ persisted stability in [30,45] (log-blend band, NOT ≤3 crush,
NOT ≥50 growth), state relearning, lapses+1, ReviewLog grade=1, engine="fsrs6-bkt2"; (ii)
wrong-on-weak ⇒ crush (stability ≤ 3); (iii) 2-option vs 5-option correct at fresh prior ⇒
grade 2 vs 3 persisted; (iv) `correct ⟺ grade≥2` still holds across all rows (calibration reader
unchanged). Fixture via `createOfficialQuestion` (options override for counts); mind
`@@unique(testSessionId,questionId)` and cleanup order (users before questions).

### 7. D6 boundary tests (confidence veto) — tests-only
The probes' census pins as unit tests: conf≤2 caps to Hard AFTER posterior; both caps stack;
conf null/latency null no-ops. No code change expected — if behavior diverges from the census doc,
STOP and surface (do not adjust the pin to match).

### 8. Verify-wave task
typecheck 0 · full unit · db:seed THEN test:integration (0 skipped) · build · RESTART :3100 ·
audit:browser green. Reference-vectors + readiness-release oracles + wave19b honesty regression
byte-untouched (gate greps).

## Out of scope (do NOT plan)
- D4 latency-band population (data-gated: 44 ReviewLog rows, all <2s), D3 confidence-bias audit
  (data-gated), D5 answer-change capture (defer).
- Everything in `docs/research/BEYOND-CURRENT-RESEARCH-2026-07-13.md` (Elo difficulty, weight
  fitting, exam-date allocator) — separate future waves, data-gated or spike-first.
- Same-session-retry disambiguation (optimizer same-day behavior UNRESOLVED in research — do not
  build on unknowns).
- Any `schedule()` / weights / retrievability change; any readiness-dial change; any migration
  (none needed — log-true-grade preserves the invariant).

## House rules that bind every task
Pure logic in lib/fsrs (purity greps match comments; injected clock; Reflect.construct for
Dates). Oracle rule: expected values from the PYTHON reference, never from the TS impl. Evaluator
artifacts: Acceptance table + PREVERIFY-OUTPUT.txt for numeric criteria (static judge). Verify
gates: herestring grep for >64KB vitest lists; integration file ops need
`--config vitest.integration.config.ts`. Model: bulk on Opus (driver default), evaluator Haiku.
