# Readiness-instrument risk notes — 2026-07-13 (feeds the wave19d spec)

Prompted by Danil's "maybe it's the math?" after the 19c ceiling defect. Systematic pass over
UNPINNED PROPERTIES of the readiness instrument. Statuses: CONFIRMED (numerically), SUSPECT
(code-read, needs pinning), EXTERNAL (fact check in flight).

## R1 — RESOLVED 2026-07-13: exam IS stratified, but OUR QUOTAS ARE WRONG
Official sources (see OFFICIAL-EXAM-STRUCTURE-2026-07-13.md): the ТСЦ exam is a stratified random
draw — **10 ПДР · 4 безпека руху · 4 будова/експлуатація · 2 домедична** (ГСЦ МВС official comms,
2017→2025; the legal Instruction codifies only «випадкова генерація»; NO per-section quotas exist
below the 4 strata). Our shipped CATEGORY_B_BLUEPRINT (2/2/2/1/2/11) does NOT match → wave19d
re-derives the blueprint as the official 4 strata + topic→stratum mapping (fine sections fold into
ПДР-10). Also confirmed: unanswered-at-timeout = fail (our unanswered≡wrong treatment consistent);
bank ~800+ for B, public (pdr.infotech.gov.ua), current edition наказ ГСЦ №225 від 29.10.2025.

## R2 — CONFIRMED PERVERSE: answering a NEW question correctly LOWERS the dial
Numerically: strong block (10 seen @ R=0.95), student answers a new item correctly (fresh card,
R≈0.6 next day) → dial 31% → 26%. Root cause: per-block meanProb is the mean over SEEN states,
extrapolated to ALL quota slots — an unseen item is implicitly credited at the seen-mean (0.95);
actually learning it "reveals" it at 0.6. The student objectively knows MORE (0.6 > any honest prior
for an unseen item) yet the instrument drops. Fix direction (19d): per-block pool-weighted mean —
`(Σ seen p + unseenInBlock·clampedPrior)/blockPool` (the honesty clamp the GLOBAL pool already has,
never applied per-block). ORACLE for 19d: learning a new item at R ≥ the prior it displaced must
never lower the dial; the current code FAILS this (frozen counterexample above).

## R3 — SUSPECT: calibrationSlope × 19c-shrink discount stacking
`perItemPassProb(R, slope)` applies per item (mastery-readiness.ts:238) BEFORE the 19c block-mean
shrink — two sequential discounts from different error models (confidence miscalibration vs
correlation) compound multiplicatively. Dormant today (slope defaults 1; learned slope clamped
[0.6,1]), but at slope 0.6 + shrink the stack could reproduce a 19c-style floor. 19d spec must pin a
SINGLE uncertainty-budget policy and include slope in the release property (evidence→∞ AND
calibration→1 ⇒ dial→raw independence).

## R4 — SUSPECT: slip/Again grade inconsistency (grade side, not dial side)
BKT says P(wrong|knows)=slip=0.1, but `deriveGrade` maps wrong → Again(1) UNCONDITIONALLY →
`forgetStability` crushes S on every mis-click of a well-known item; the grade model contradicts its
own slip parameter ~10% of the time for strong students. Consequences: queue churn + dial jitter.
Candidate fix (needs its own oracle work — NOT part of 19d's dial scope): posterior-weighted wrong
grade (π_wrong ≥ threshold → Hard instead of Again), preserving `correct = grade≥2` invariant
(lib/server/calibration.ts depends on it) — that invariant makes this NON-trivial; investigate before
touching.

## R5 — MITIGATED BY EXISTING LINK: calibration-pair timing skew + self-report bias
A user may report an exam taken weeks after their last practice — the paired prediction is the
CURRENT (decayed) dial, not the dial at exam time. The `PassOutcome.readinessSnapshotId` link
(2026-07-13) makes pair age DERIVABLE (`outcome.createdAt − snapshot.createdAt`) — the admin
calibration fit must FILTER/flag stale pairs (add when the view next gets touched; zero schema work).
Failure under-reporting bias (embarrassed silence) is NOT code-fixable — note for fit methodology
(sensitivity analysis once rows accrue).

## R6 — DEFERRED (needs real usage): inactivity decay rate feel
Dial correctly decays with idleness; whether the RATE feels right (a week off → how many points?) is
unjudgeable without real users. Revisit with the first cohort.
