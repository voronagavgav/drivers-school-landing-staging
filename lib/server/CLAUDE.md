# CLAUDE.md — lib/server/ (server-authoritative logic + its integration tests)

Auto-loaded when working under `lib/server/`. The project-root CLAUDE.md still applies; this file
holds facts specific to the server layer (mastery/readiness recompute, test-engine, blueprint wiring).

## Learnings (agent-maintained)
- ELO SERVER FOLD (wave22-07 + review MAJOR fix, `lib/server/elo.ts` `recomputeElo`): the recompute
  is a FULL deterministic replay of **`ReviewLog`** (the FIRST-ATTEMPT record, `correct ⟺ grade≥2`),
  sorted `reviewedAt` ASC then `id` ASC, folded via the pure `@/lib/elo` `foldEloStream` (never
  reimplement the math), written back per item in ≤200-id chunks through the injected `tx = prisma`.
  ⚠THE REVIEW CATCH: the wave originally read `TestAnswer` claiming "@@unique(session,question) = one
  first-attempt row" — FALSE: `submitAnswer` UPSERTS TestAnswer on answer change (FINAL choice,
  LAST-touch answeredAt), while FSRS records the FIRST attempt. Any "mirror FSRS first-attempt"
  consumer must read ReviewLog, never TestAnswer; the divergence pin is
  `elo.integration.test.ts` ("folds the FIRST attempt…": final-correct TestAnswer + grade-1 ReviewLog
  ⇒ β>0). KEY TEST TRICK (unchanged): pin a per-item β against the wave22-01 python golden
  (`stream_b_sorted`, 5u×8i, y=(u+i)%2, oc=4) inside a global recompute by seeding an ISOLATED
  subgraph (throwaway users review ONLY fixture items and vice versa) — θ/β interact solely through
  shared answers, so an isolated component's final β is interleaving-invariant; user-outer order via
  `reviewedAt = base + (u*N_ITEMS + i)*1000ms`, 4-option fixture for g=0.25, `elapsedDays: 0` +
  `mode` required on ReviewLog creates. Cleanup: users first (ReviewLog cascades on userId, freeing
  the Restrict question FK), then `fixture.cleanup()`. Corollary: a fresh `db:seed` wipes ReviewLog ⇒
  recompute honestly folds 0 until real first attempts accrue (TestAnswer-era counts were audit
  artifacts).
- WAVE20 grade-honesty is WIRED into the production write path (wave20-05): `submitAnswer` passes
  `optionCount: question.options.length` (options already loaded — zero extra DB reads) into
  `recordReview`, which threads it into `deriveGrade`/`gradePosterior`, and routes a WRONG answer on a
  card WITH history (`prior.lastReviewedAt != null`) through `slipAdjustedLapse(prior, pi, now)` where
  `pi = gradePosterior({correct:false, priorKnow, optionCount})` — the LOGGED grade stays the true
  Again(1) (`slipAdjustedLapse` returns `{...again, stability, dueAt}`, so state/lapses/difficulty are
  the Again arm; only stability/dueAt are the log-blend). CORRECT answers, a wrong on a fresh `new`
  card, and the `logOnly` replay path all keep `schedule` (unchanged). `REVIEW_ENGINE_VERSION` bumped
  → `"fsrs6-bkt2"` at this semantics boundary. ⚠TEST-FIXTURE GOTCHA: threading the REAL optionCount
  makes `createOfficialQuestion`'s DEFAULT 2-option fixture honestly grade a fresh CORRECT as Hard(2)
  (g=min(1/2,0.45)=0.45 → π=0.6667 < FSRS_KNOW_GOOD 0.75), NOT Good(3). Any integration test that
  drives a real correct via `submitAnswer` and asserts Good(3)/`review`-graduation MUST create a
  4-option fixture (`options: [1 correct + 3 wrong]`, real ПДР, g=0.25 → π=0.78 → Good) — this is
  representative input data, NOT an oracle edit. Fixed srs-review + wave11-review-fixes this way.
  ⚠SECOND WRITE PATH (wave20-review MAJOR, fixed same night): `applySessionlessReview`
  (`app/api/review-sync/route.ts` — the offline sessionless SRS lane) also calls `recordReview` and
  had NO `optionCount`, silently falling back to g=0.25 — live-vs-offline grade divergence on 68% of
  the bank. Fixed (options already selected for correctness scoring; zero cost) + lane-parity pin
  `review-sync.integration.test.ts (n)` (2-option offline correct ⇒ Hard(2), engine fsrs6-bkt2).
  RULE: `recordReview` has MULTIPLE callers — when threading a new signal into it, grep ALL call
  sites (`grep -rn 'recordReview(' lib app`), not just the one the spec names.
- DETERMINISTIC FSRS INTEGRATION PROOF through the real answer path (wave20-07,
  `slip-adjusted-lapse.integration.test.ts`): to assert the slip-adjusted-lapse blend / grade on a
  card WITH history, SEED the prior via `prisma.reviewState.create` then drive the wrong/correct answer
  through `submitAnswer` — and pass `submitAnswer`'s `reviewedAt` param (it forwards it to `recordReview`
  as `now`, TestAnswer/StudyDay keep server wall-clock) so retrievability — hence the whole blend — is
  deterministic: `reviewedAt = seeded lastReviewedAt + chosen elapsed`. Anchors (D=5, 4-opt g=0.25):
  s=50 + 10d ⇒ R≈0.9728, S'≈36.3 ∈ [30,45] / relearning / lapses++ / logged grade 1 / engine
  fsrs6-bkt2; s=5 + 400d ⇒ R≈0.509, S'≈2.70 ≤ 3 (crush — MUST be ≥3-opt; 2-opt g=0.45 lands ≈3.05 > 3).
  `submitAnswer` does NOT verify the question is in the session's TestSessionQuestion pool (only session
  IN_PROGRESS + question exists), so any `startSession` + any fixture question works. Pre-verify band
  anchors with a throwaway tsx smoke against the REAL `slipAdjustedLapse`/`gradePosterior`/`retrievability`
  before freezing a `[lo,hi]` assertion — a hand-estimate of the log-blend is unreliable.
- Running/listing ONE `*.integration.test.ts` file needs the integration config — the DEFAULT vitest
  config `exclude`s `**/*.integration.test.ts`, so `npx vitest run <file>` / `npx vitest list <file>`
  bare prints "No test files found" (or "§X NOT listed"). Always pass `--config
  vitest.integration.config.ts` (e.g. `npx vitest run --config vitest.integration.config.ts <file>`).
  A verify-gate collection check on an integration file must include that flag. (wave19e-02.)
- MOCK-ANCHOR DIRECTION SUITE §4 (`readiness-snapshot.integration.test.ts`) is UN-SKIPPED (wave19e-02)
  against the wave19e-01 restored anchor. Its throwaway `createOfficialQuestion` category has NO
  blueprint ⇒ `recomputeReadiness` falls to a single whole-pool block ⇒ `inputsJson.blocks == []`, so
  release.final is NOT reconstructable from the persisted blocks. The honest m=0 reference is a
  ZERO-MOCK production recompute (delete all EXAM_SIMULATION rows, recompute, read `dialPercent`) — the
  anchor's `(0+S·P)/(0+S)=P` identity means that IS the release-model dial. Pre-verified whole-pool @
  22 seen R=0.9, reviewMass 1: no-mock 59, 3-FAILED 34, 3-PASSED 77 (all strict, `dialPercent ≤
  dialIndep`). Don't reconstruct via the retired pure `computeReadiness` anchor (anti-self-grading).
- LIVE DIAL NOW ROUTES THROUGH THE wave19d RELEASE MODEL "lm-gh1" (wave19d-08, SUPERSEDES the two
  wave19c bullets below on the LIVE path — the 19c shrink/`correctBlockMeanProb`/`computeReadiness`
  calls are GONE from `recomputeReadiness`'s persisted-dial path; the lib+constants remain for task 09
  to retire). `recomputeReadiness` builds per-block `{quota, seenR, nUnseen}` and calls
  `releaseDial({blocks, reviewMass, slope})` (@/lib/readiness-release), persisting
  `finalDial`/`final` as `dialPercent`/`passProbability`, `blocks[i].meanProb = release.perBlock[i].pSlot`,
  and `dialIndep = release.independenceDial` (all `sufficientData`-gated). KEY MAPPINGS: (a) `nUnseen`
  per block = `max(0, quota − nSeen)` — the block's UNSEEN EXAM SLOTS, quota-bounded, NOT the huge real
  DB pool (pdr ~1400) — this keeps `pSlot` sensible AND makes the R2 study-never-hurts guarantee bind
  (revealing a seen slot at R≥prior when nSeen<quota lifts pSlot); (b) `reviewMass` = mean
  `ReviewState.reps` over the seen items (the σ-decay evidence; add `reps` to the states `select`).
  inputsJson APPEND-ONLY gains `model:"lm-gh1"`/`sigma`(=release.sigma)/`nodeCount`(=`READINESS_RELEASE_GH_NODES`)/
  `blockStats`(per-block `{nSeen,C}`, positional in blueprint order); EVERY pre-existing key kept
  (incl. the now-dead `rhoEst/tier/nEff` — retained to honor "no existing key removed"). Two collateral
  suites the model swap invalidates were `describe.skip`'d (same pattern as the 19c file): the single-PB
  reconstruction of `passProbability` NO LONGER holds (final=mixture/min, not one PB over blocks), and
  MOCK EXAM passes NO LONGER blend into the dial (mocks stay in `inputsJson.mock` audit-only) — so
  `readiness-snapshot.integration.test.ts §4` (mock-anchor DIRECTION) is suspended, and
  `readiness-correlation.integration.test.ts` is already dormant (references the removed 6-block keys).
  Pre-verify live magnitudes by seeding a scenario user + running the REAL `recomputeReadiness` under
  `npx tsx --conditions=react-server`, then FREEZE (real seed: weak R≈0.7 → 4≤4, strong R=0.9 → 63<68,
  rich R=1 rich-reps → 100, R2 3/4-covered structure → 54→63); these are live-wiring pins, not the pure
  oracle (that's `lib/readiness-release.oracle.test.ts`, regenerated only from the python).
- ⚠MOCK ANCHOR RESTORED ON THE LIVE DIAL (wave19e-01, SUPERSEDES "mocks NO LONGER blend" above): the
  pre-19d Beta anchor was silently dropped by wave19d-08 and is now back in `recomputeReadiness`, wrapping
  the release model's RAW probabilities. `anchored(p) = clamp01((k + S·clamp01(p))/(m + S))`, S =
  `READINESS_ANCHOR_STRENGTH` (=4, imported from `@/lib/readiness-model` — do NOT redeclare), applied to
  BOTH `release.final` (→ `passProbability`/`dialPercent`) AND `release.independence` (→ `dialIndep`), so
  the SAME monotone affine map keeps `dialPercent ≤ dialIndep` with NO `Math.min`. `m`=mock attempts in
  `READINESS_MOCK_WINDOW`, `k`=PASSED, per-category `EXAM_SIMULATION`/`COMPLETED`. At m=0 the anchor is
  the identity (`(0+S·P)/(0+S)=P`) so a mock-less user sees exactly the release-model dial. inputsJson
  gains append-only `anchored:true` (the `mock:{m,k}` field is UNCHANGED). Consequence: mock DIRECTION is
  live again — `readiness-snapshot.integration.test.ts §4` (suspended by 19d-08) should be un-skipped
  (that's task wave19e-02). Pre-verify seed MUST cover ALL 4 blueprint blocks (structure §31/45·4, safety
  §35/47·4, medical §37·2, pdr·10) or the un-seeded small blocks' unseen slots at prior 0.5 pin the PB
  tail to 0 (dial rounds to 0 no matter how strong pdr is) — bucket by `sectionFromQuestionKey`, seed ≥
  a few strong states per section (moderate strong: stability 40, 4d-old, reps 5 → no-mocks dial 99).
- LIVE-DIAL ρ CORRECTION NOW SHIPS ON THE ESTIMATION SIDE (wave19c-07): `recomputeReadiness`
  (mastery-readiness.ts) passes each blueprint block's raw `meanProb` through
  `correctBlockMeanProb(rawMeanProb, nSeen, READINESS_TOPIC_CORRELATION_ESTIMATION(0.3),
  {tier: READINESS_ESTIMATION_TIER("mean")})` (from `@/lib/readiness-estimation`) BEFORE
  `computeReadiness`, where `nSeen = probs.length` = the block's SEEN evidence count (NOT `quota`).
  The draw-side `topicCorrelation` stays `READINESS_TOPIC_CORRELATION`(=0), so the PB tail is exact
  and the honesty-regression gate is untouched by construction. The Jeffreys-½ shrink also pulls a
  freshly-reviewed block's `meanProb=1.0` strictly below 1, so the degenerate-p NaN below is
  structurally impossible on the live path; unseen blocks (nSeen=0 ⇒ n_eff=0 ⇒ posterior-mean ½)
  pass through as a no-op (`min(blockUnseenProb, ½)=blockUnseenProb`). This changes the persisted
  `passProbability`/`dialPercent` real users see, but the exam-blueprint integration test's strict
  het<homo `<` survives (monotone shrink) — no expected-value edits needed.
- INPUTSJSON AUDIT FIELDS (wave19c-08, `recomputeReadiness`): inputsJson APPEND-ONLY now also carries
  `rhoEst`(=`READINESS_TOPIC_CORRELATION_ESTIMATION`, 0.3 — the estimation ρ actually applied, DISTINCT
  from the dead draw-side `rho`, still 0), `tier`(=`READINESS_ESTIMATION_TIER`, "mean"), a parallel
  `nEff` array (per-block `effectiveN(nSeen, ρ_est)` rounded 4dp, positionally aligned to `blocks`), and
  `dialIndep` — the UNCORRECTED independence dial from a SECOND `computeReadiness` call on the RAW
  pre-correction block meanProbs (topicCorrelation 0), `sufficientData`-gated exactly like `dialPercent`.
  To keep the raw p̂ + nSeen around, the per-block map builds `blockDetails` ({quota,meanProb,rawMeanProb,
  nSeen}); persisted `blocks` stays the 2-key positional {quota,meanProb} shape (wave19b readers rely on
  it). Existing keys (sufficientData/seenCount/meanR/priorUnseen/mock/blocks/rho/engine/calibratorId)
  untouched — never rename/remove.
- ρ-CORRECTION DIRECTION + DEGENERATE-p NaN (wave19b-09; ⚠ RESOLVED by the 2026-07-12 adversarial
  review): (a) tail variance inflation from ρ>0 RAISES P(≥18/20) whenever the student's mean is
  BELOW the threshold — i.e. for EVERY non-ready student, the exact population the honesty fix
  targets (verified live: weak fixture ρ RAISES 1.3e-6→5.6e-5; strong fixture LOWERS 0.998→0.986).
  The wave19b-09 driver observed this and switched the oracle fixture to a strong student to keep
  the suite green — that was the WRONG move (defect masked, caught by review). THE RULE: when a
  directional oracle from the spec fails on the spec's own target population, the IMPLEMENTATION
  PREMISE is wrong — mark the task blocked and surface it; never re-fixture to the population where
  the direction happens to hold. `READINESS_TOPIC_CORRELATION` is NEUTRALIZED to 0 until an
  estimation-side correction ships (wave19c); the binding direction gate is
  `lib/readiness-honesty.regression.test.ts`. Pre-check directional claims with throwaway
  `npx tsx --conditions=react-server` runs of the REAL model before committing. (b) `correlatedBlockPmf`/beta-binomial returns
  NaN when a block's `meanProb` is EXACTLY 0 or 1 (`betaParams` gives β=0 at p=1 / α=0 at p=0 → 0/0 in
  the ratio recurrence). A freshly-reviewed block reads `meanProb=1.0` (retrievability=1 at elapsed 0),
  so threading ρ into the LIVE dial would persist `passProbability=NaN` for real users — the guard is to
  fall back to the binomial point mass at p∈{0,1} (the correct Beta-binomial limit). (c) To reproduce a
  persisted blueprint-blocks `passProbability` in a test, reconstruct from `inputsJson.blocks` alone —
  with blocks present `modelProb` comes ENTIRELY from the block p-vector (seen/unseen/slope don't affect
  it), so `computeReadiness({seen:[], blocks: parsed.blocks, mockAttempts: mock.m, mockPasses: mock.k,
  topicCorrelation: ρ})` matches exactly (not oracle-tampering — the reference is the golden pure model,
  differing only in the ρ arg). inputsJson is APPEND-ONLY: added `rho`/`engine:"fsrs6"`/`calibratorId`,
  readers tolerate old rows lacking them.
- READINESS `dialIndep` IS A PERCENT, NOT A PROBABILITY (wave19c-09): inputsJson `dialIndep` is
  `Math.round(indepPassProbability*100)` (0..100, mastery-readiness.ts:335), the same scale as
  `dialPercent`. NEVER compare it against the raw `snapshot.passProbability` (∈[0,1]) — on a weak
  student `dialIndep=0` while `passProbability≈2e-9 > 1e-12`, so a `passProbability ≤ dialIndep+ε`
  assert FALSE-FAILS. The honest never-above-independence direction is `dialPercent ≤ dialIndep`
  (percent granularity — the only independent number persisted; raw indep blocks are NOT stored).
  The estimation-side min-clamp correction (`correctBlockMeanProb`) is a NO-OP on a WEAK student
  (p̂<½ ⇒ Jeffreys shrink pulls UP ⇒ `min(p̂,shrunk)=p̂` ⇒ corrected==independent, 0≤0) and BINDS on a
  STRONG one (near-mastered blocks p̂>½ ⇒ shrunk down ⇒ dialPercent 34 vs dialIndep 100). So a
  never-above test must run on BOTH populations; the weak case proves the fix does NOT raise the dial
  (wave19b's draw-side bug), the strong case proves it meaningfully lowers it. Reconstructing
  `computeReadiness({seen:[], blocks: parsed.blocks, mockAttempts/Passes, topicCorrelation:0})` on the
  persisted (already-CORRECTED) blocks reproduces `passProbability` EXACTLY (diff=0) — plumbing
  exactness, `toBeCloseTo` 12dp. Per-block `nEff = round(effectiveN(nSeen, 0.3)*1e4)/1e4`, positional
  in blueprint order (structure,medicine,law,general,safety,pdr); effectiveN(2,.3)=1.5385,
  (1,.3)=1, (15,.3)=2.8846; nEff∈[1,1/ρ) for nSeen≥1, =0 for unseen blocks.
- HET-vs-HOMO READINESS DIRECTIONAL ORACLE (wave19b-07, `exam-blueprint.integration.test.ts` Goal #4):
  to prove blueprint bucketing reaches the dial's p-vector, assert `recomputeReadiness`'s heterogeneous
  `passProbability` is STRICTLY LESS than a homogeneous `computeReadiness({...same seenR, blocks:undefined})`
  fallback — but the direction is FRAGILE and can INVERT. The cat-B `pdr` block is the LARGE remainder
  (11 of 20 slots); making the learner STRONG there (signs §33, R=1 → pdr meanProb=1.0) locks in ~11
  near-certain correct, so het can end up HIGHER than homo unless you ALSO: (a) make the small fixed-quota
  blocks genuinely near-0 (`stability≈1e-4` + `lastReviewedAt=NOW−3650d` → R≈0.068; R≈0.2 leaves het ≈ homo,
  which flakes/fails); (b) keep the homogeneous pool mean μ NON-vacuous — with the real ~1739-question cat-B
  pool the UNSEEN count dominates, so μ→the honesty-floored prior `min(0.5, seenMean)`. Seed ENOUGH strong
  states (seenMean≥0.5) so the prior pins at 0.5 → homo P(≥18/20 at 0.50)≈2e-4 (a real pass window to sit
  below), while het's forced ~8 weak slots kill it (≈1.3e-6). Too few strong (seenMean<0.5) drops μ and
  homo→~0, flipping the inequality. ALWAYS pre-verify these near-zero strict-`<` comparisons by running the
  REAL `retrievability`+`computeReadiness` on a throwaway `npx tsx --conditions=react-server` before
  committing — a hand-estimate of a 4-sigma Poisson-binomial tail is unreliable. `inputsJson.blocks` are
  stored POSITIONALLY in `CATEGORY_B_BLUEPRINT.blocks` order carrying only `{quota,meanProb}` (no key) —
  identify pdr/small blocks by index against the blueprint. A weak block with NO seen data gets
  `blockUnseenProb=min(0.5, meanAllSeenProbs)`, NOT your weak R, so attach ≥1 weak state to EACH small block
  you assert `≤0.3` on. Reuse `readiness-snapshot.integration.test.ts` conventions: direct
  `reviewState.create`, a fixed injected `NOW`, user delete cascades ReviewState+ReadinessSnapshot.
