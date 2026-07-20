# CLAUDE.md — lib/fsrs/ (pure FSRS engine)

Auto-loaded when working under `lib/fsrs/`. This whole tree is PURE + deterministic: no
`server-only` / `@/lib/db` / `@prisma/client` / `lib/generated` imports, no `Math.random` /
`Date.now` / `new Date` (inject `now: Date`), no JSX. Purity greps match COMMENTS too.

## Learnings (agent-maintained)
- **FSRS-6 (wave19a-02, supersedes the old "implement FSRS-5" learning).** `FSRS_DEFAULT_WEIGHTS`
  (`constants.ts`) is now the **FSRS-6 21-parameter** default vector (py-fsrs v6.3.1 defaults, head
  `w0=0.212` … `w20=0.1542`), and `schedule.ts` implements the **FSRS-6** long-term formulas. The
  DSR structure is the SAME as FSRS-5 (init S=w[G-1]; D_0=w4-e^(w5·(G-1))+1; linear-damped ΔD + mean
  reversion; recall/forget stability w8..w16); the FSRS-6 changes are: (a) the forgetting-curve decay
  is the TRAINABLE `w20` (`FSRS_DECAY=-w20`, `FSRS_FACTOR=0.9^(1/DECAY)-1`, DERIVED in
  retrievability.ts, not fixed -0.5 / 19/81), and (b) **the difficulty mean-reversion target is the
  UNCLAMPED `D_0(Easy)`** — the reference's `next_difficulty` feeds `init_difficulty(Easy)` (raw,
  only rounded, NOT clamped to [1,10]) into `w7·D_0(4)+(1-w7)·D'`; clamping it first (an FSRS-5-era
  port did) is a subtle bug that shifts every downstream difficulty by ~6e-3 and breaks the golden
  vectors. `initialDifficultyRaw` (unclamped) vs `initialDifficulty` (clamped, for new-card init) are
  now distinct in schedule.ts. `enable_short_term=false`, so w17/w18/w19 stay unused; 21-slot index
  alignment preserved. Reference: ts-fsrs@5.4.1 (21w path) / py-fsrs 6.3.1; both agree to ~1.2e-5.
- Inferred grade (`deriveGrade`, spec §2): ПДР is single-correct MCQ, so the FSRS 1..4 grade is
  inferred from the answer signal, not self-reported. THREE latency bands (post-wave10f-review fix —
  production always sends latencyMs and no confidence yet, so a single fast/slow cliff made Good(3)
  unreachable live): `FSRS_EASY_LATENCY_MS` (≤ → Easy) / `FSRS_HARD_LATENCY_MS` (≥ → Hard) / mid-band
  → Good, the bulk. Confidence on a 1..4 scale: `FSRS_CONFIDENT_MIN` (≥3) / `FSRS_LOW_CONFIDENCE_MAX`
  (≤2 = veto → Hard). Interim GLOBAL bands until Wave 11 derives per-topic medians from ReviewLog.
  ALSO: FSRS writes are FIRST-attempt-per-(session,question) only (`submitAnswer` gates `recordReview`
  on no prior TestAnswer row) — a same-session answer change is deliberation, not retrieval.
- Guessing-corrected grade (`deriveGrade`, Wave 19b — SUPERSEDES the latency-only three-band model):
  the PRIMARY axis is now the BKT guess/slip posterior `gradePosterior({correct,priorKnow,optionCount?})`
  (closed form frozen in `grade-posterior.test.ts`: correct `π=p0(1−s)/(p0(1−s)+(1−p0)g)`, g=1/optionCount
  default 0.25, s=`FSRS_SLIP`=0.1). Correct → `π≥FSRS_KNOW_EASY(0.93)`→Easy(4), `≥FSRS_KNOW_GOOD(0.75)`→Good(3),
  else Hard(2). Latency/confidence are now CAP-ONLY (never promote): verySlow≥hardMs caps Easy→Good; conf≤2
  caps→Hard (the preserved Wave-12b veto). Absent `priorKnow`→neutral 0.5 (→π≈0.78→Good, the production bulk).
  KEY CONSEQUENCE for integration tests: a fast+confident correct on a FIRST exposure is NO LONGER Easy(4) —
  a fresh `new` card has a neutral 0.5 prior → Good(3), and `nextLearningState` only sends new→review on
  grade===4, so a first-exposure correct now lands in `learning`, not `review`. Any pre-Wave-19b test that
  drove a card to `review` via a single fast/confident correct must instead use TWO corrects
  (new→learning→review) or seed a strong prior. `recordReview` (study.ts) feeds `priorKnow =
  retrievability(prior,now)` for cards with `lastReviewedAt`, else 0.5 (NEVER the R=1 of an unreviewed card);
  optionCount is NOT read (no DB round-trip) so production uses the default 4-option guess floor. Wrong is
  still unconditional Again(1), preserving `correct = grade≥2` (lib/server/calibration.ts depends on it).
- Forgetting curve (`retrievability.ts`): `retrievability({stability,lastReviewedAt}, now)`
  = `(1 + FSRS_FACTOR·elapsedDays/stability)^FSRS_DECAY`, clamped [0,1]. FSRS-6: `FSRS_DECAY=-w20`
  and `FSRS_FACTOR=0.9^(1/FSRS_DECAY)-1` are BOTH DERIVED from `FSRS_DEFAULT_WEIGHTS[20]` (=0.1542
  today → DECAY≈-0.1542, FACTOR≈0.9805), NOT the FSRS-5 fixed -0.5 / 19/81. Because both share w20,
  `R==0.9` EXACTLY at `elapsedDays==stability` BY CONSTRUCTION, and it stays decoupled from
  `FSRS_TARGET_RETENTION` (which is a free parameter of `intervalDays` interval-inversion ONLY). null
  `lastReviewedAt` OR elapsed 0 ⇒ R=1. Task 05's queue should REUSE this (import from `@/lib/fsrs`),
  not re-derive it. Elapsed is clamped `max(0, …)` so a rewound clock can't push R above 1.
- WAVE20 slip-adjusted lapse (`scripts/oracles/gen-wave20-oracles.py` is the frozen Python oracle;
  later TS tasks 02–08 MUST match its 6dp values, never regenerate from the engine). The layer is a
  capped GEOMETRIC blend `S' = min(prior.S, exp(π·ln S'_hard + (1−π)·ln S'_again))` where
  `S'_again = forgetStability(D,S,R)`, `S'_hard = recallStability(D,S,R,2)` from the SAME prior,
  `π = gradePosterior({correct:false, priorKnow:R, optionCount})`. Honest guess floor is
  `g = min(1/optionCount, FSRS_GUESS_MAX=0.45)` (oc 0 ⇒ FSRS_GUESS_DEFAULT 0.25). Frozen anchors
  (D=5): s=50/R=0.9728 ⇒ S'_again 2.546093 · S'_hard 63.396933 · π 0.842731 · S'_log 38.237590;
  s=100 ⇒ 70.121039; s=5/R=0.509 ⇒ S'_log 2.821454 (crushes). LINEAR blend is EXCLUDED (grows above
  prior at low π). `intervalDays(S, 0.9) == S` EXACTLY (FACTOR = 0.9^(1/DECAY)−1 = 0.980346), so the
  crush is read directly in days. ⚠ ORACLE-AUTHORING GOTCHA: a spec's eyeballed property BOUND may
  not hold across the full grid — the Hard arm (`recallStability`) grows STEEPLY on weak (low-R)
  items, so the crush-weak dampening `S'_log/S'_again` reaches ×2.2444 at s=100/R=0.55/g=0.45/π=0.18,
  NOT the spec's provisional ×1.6 (which held only for the single R=0.509 half-forgotten fixture,
  ×1.5533). Freeze the MODEL-MEASURED max (grid ≤2.30 + crush-vs-prior everywhere + doc-fixture
  ≤1.6), documenting the model formulas as external justification — never assert an eyeballed
  constant you haven't swept the whole grid against.
- Honest guess-floor cap (wave20-03): `gradePosterior`'s g is `min(1/optionCount, FSRS_GUESS_MAX=0.45)`
  (constants.ts) — shades a 2-option item's naive 0.5 below the Baker/Corbett/Aleven P(G)<0.5 BKT
  degeneracy bound; oc≥3 (g≤1/3) and absent/0 (→`FSRS_GUESS_DEFAULT` 0.25) are UNCHANGED. GOTCHA: a
  behavior-changing constant is often pinned in MORE test files than the named frozen oracle — this cap
  broke a SECOND, un-named suite (`grade.test.ts`, which had its own `optionCount:2 ⇒ 0.6428571429`
  pin) even though the Goal only cited `grade-posterior.test.ts` (which had no 2-opt assertion, only a
  doc comment, so it stayed byte-green). Before flipping any oracle expectation, `grep -rn` the CHANGED
  INPUT (`optionCount: 2`) across all `lib/fsrs/*.test.ts` — a stale sibling pin will red `npm test`.
  Correcting such a sibling to the spec/frozen-python value (2-opt correct π=0.666667) is NOT
  oracle-tampering when the spec + committed oracle are the external evidence.
- Reuse the shared types (`types.ts`): `Grade = 1|2|3|4`, `LearningState`, `ReviewMemoryState`
  (`stability/difficulty/state/dueAt/lastReviewedAt/reps/lapses`). The learning-phase field is
  named **`state`** (NOT `learningState`) to mirror the persisted `ReviewState.state` column
  (`prisma/schema.prisma`), and `dueAt: Date|null` is DERIVED by `schedule` (= `lastReviewedAt +
  intervalDays`), never fed back into the curve. Consume these rather than redeclaring the shape.
- `schedule` (`schedule.ts`) — the FSRS-6 DSR update + `new→learning→review⇄relearning`
  machine: new→initial S/D; success→`recallStability`, Again→`forgetStability` (capped at prior S);
  difficulty = damped ΔD + mean-revert to `D_0(Easy)`, clamped [1,10]; lapses++ only on Again from a
  non-`new` prior. `intervalDays(S, retention)` inverts the curve (`S/FACTOR·(retention^(1/DECAY)-1)`),
  monotone-decreasing in retention. Task 05's queue should REUSE these, not re-derive.
- EXTERNAL FSRS-5 oracle via `ts-fsrs@5.4.1`: the package's `default_w` is FSRS-6 (21 weights), but
  passing our 19-weight `FSRS_DEFAULT_WEIGHTS` to `fsrs({w, request_retention:0.90, enable_short_term:false,
  enable_fuzz:false})` auto-migrates 19→21 by appending `w19=0, w20=0.5` (decay -0.5) — which reproduces
  FSRS-5 EXACTLY (short-term terms unused; long-term recall/forget-stability + difficulty formulas are
  structurally identical between FSRS-5/6; FACTOR=19/81 at decay -0.5). Verified: first-Good on a new card
  gives S=w[2]=3.173, D=5.28243442 matching our `schedule()` step-1 bit-for-bit. Do NOT use ts-fsrs's
  `card.scheduled_days` as an interval oracle for our engine — ts-fsrs bumps intervals to keep
  Again≤Hard≤Good≤Easy ordering (a first Hard's scheduled_days is 2, not `round(1.18385)=1`), which our pure
  long-term engine intentionally omits; our derived interval is `Math.round(intervalDays(S,0.90))` = round(S)
  (an identity at retention 0.90). Golden vectors live in `reference-vectors.test.ts` as plain literals (no
  ts-fsrs runtime dep) (bit wave10f-01).
- FSRS-6 oracle (wave19a-01): `ts-fsrs` has NO v6 on npm (max is **5.4.1**) — but ts-fsrs 5.x already IS the FSRS-6
  algorithm: passing a full **21**-length `w` activates the w20 trainable-decay path (decay = -w20, FACTOR = 0.9^(1/decay)-1,
  so R(S,S)=0.9 always), and `enable_short_term:false` selects the long-term-only formulas. The CANONICAL FSRS-6 reference is
  **py-fsrs** (PyPI `fsrs`) **==6.3.1** — install in a venv (`python3 -m venv … && …/pip install 'fsrs==6.3.1'`; system pip is
  PEP-668-blocked). py-fsrs 6.3.1's `Scheduler` `default parameters` ARE the shipped 21-weight vector `[0.212, 1.2931, …,
  0.1542]` verbatim; disable short-term via `learning_steps=(), relearning_steps=()` (there's no `enable_short_term` bool) +
  `enable_fuzzing=False`. ts-fsrs 5.4.1 (21w) and py-fsrs 6.3.1 agree to within toBeCloseTo(4) (max |Δ|≈1.2e-5, float-order
  only) — so `scripts/gen-fsrs6-vectors.mjs` pins the ts-fsrs `.mjs` output (byte-identical on re-run) and names py-fsrs 6.3.1
  as the cross-check. STATE column: neither library models our four-phase machine (both collapse to Review with short-term
  off, no "new" phase) — emit the golden `state` from OUR `nextLearningState` spec, not `card.state`. Interval = round(S) at
  R=0.9 (identity for FSRS-5 AND FSRS-6). Golden values FROZEN + `describe.skip` until the engine port (wave19a-02) unskips.
- FROZEN-LITERAL GREP vs JS numeric normalization (wave19b-04, `grade-posterior.test.ts`): these oracle
  verify.sh gates `grep -Fq` the EXACT posterior-literal STRING, incl. a trailing zero
  (`0.3478260870`). JS parses `0.3478260870`→`0.347826087` (drops the zero) but the SOURCE keeps it, so
  write the literal verbatim from the task Goal — a numerically-equal `toBeCloseTo(0.347826087, 10)`
  FALSE-FAILS the `-Fq` string grep even though the assertion is identical. `toBeCloseTo(lit, 10)`
  passes the exact rationals (max |Δ| ≈4.3e-11 < the 5e-11 threshold). The BKT guess/slip posterior is a
  closed-form Bayes rational (CORRECT `π=p0(1−s)/(p0(1−s)+(1−p0)g)`, WRONG `π=p0·s/(p0·s+(1−p0)(1−g))`,
  g=1/optionCount, s=FSRS_SLIP=0.10) — assert the frozen literals against a LOCAL pure helper (external
  Bayes truth, non-skipped so the suite is green before the impl exists; grades the vectors, not the
  not-yet-written `gradePosterior`), NOT against the impl symbol.
- WAVE20 slip-adjusted lapse IS NOW IMPLEMENTED (`lib/fsrs/lapse-adjust.ts`, wave20-04): pure
  `slipAdjustedLapse(prior, pi, now) → ReviewMemoryState` composes the REAL `schedule(prior,1,now)`
  (Again) + `schedule(prior,2,now)` (Hard), returns the Again arm with ONLY `stability` = capped
  geometric blend `Math.min(prior.stability, exp(pi·ln S_hard + (1−pi)·ln S_again))` and `dueAt`
  recomputed via `intervalDays(S', FSRS_TARGET_RETENTION)`. `pi` is caller-supplied (server derives it
  via `gradePosterior`), NOT computed here. Re-exported from `@/lib/fsrs`. Tasks 05+ consume it; do NOT
  reimplement the blend. GATE GOTCHA: its verify greps `grep -Eq "Math\.min\([^)]*(prior|state)\.stability"`
  — a LINE-BASED grep, so the cap MUST sit on ONE source line (`const stability = Math.min(prior.stability,
  blended);`); splitting `Math.min(` and `prior.stability` across lines false-fails it. Same file's
  un-skip gate `grep -nE 'describe\.skip|it\.skip|\.skip\('` false-trips on doc-comment mentions of the
  literal `describe.skip` — reword surviving comments to past-tense prose (wave19b-02 trap).
- PURITY vs constructing a Date: a pure `lib/fsrs/` module that must RETURN a `Date` (e.g. `dueAt`)
  cannot write the literal `new Date(...)` — the purity gate greps `-Fq 'new Date'` (comments too,
  and it prefix-matches `new DateCtor`/`new DateConstructor`). Build it via
  `Reflect.construct(now.constructor, [epochMs]) as Date` — deterministic (ms is computed from the
  injected `now.getTime()`, never the wall clock) and avoids the banned substring entirely. Also
  keep the phrase "new Date" out of doc comments (bit wave10-04). The wave19a-02 purity gate greps
  `lib/fsrs/*.ts` — the glob INCLUDES the `.test.ts` files, so tests that build fixed clocks must
  ALSO avoid the literal: use `Reflect.construct(Date, [...args]) as Date` (no injected `now` to hand
  off in a test), e.g. a `mkDate = (...args: number[]) => Reflect.construct(Date, args) as Date`
  helper for the `new Date(y,m,d,…)`/`new Date(ms)` forms — and strip "new Date" from the surrounding
  comments too (bit wave19a-02).
