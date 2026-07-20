// Central constants & string-union "enums" (SQLite has no native enums; see schema.prisma).
// Legal/exam settings are CONFIGURABLE here on purpose — do not bury legal assumptions in code.

// ---- Roles ----
export const ROLES = ["USER", "ADMIN", "CONTENT_MANAGER"] as const;
export type Role = (typeof ROLES)[number];

// ---- Auth form limits ----
// Single source of truth for the password minimum: the register/change-password
// zod schemas (lib/validation.ts) AND the client-side Ukrainian validity
// messages (lib/client/form-validation.ts) both import it, so the number quoted
// to the user can never drift from what the server enforces.
export const PASSWORD_MIN_LENGTH = 8;

// ---- Test modes ----
export const TEST_MODES = [
  "EXAM_SIMULATION",
  "TOPIC_PRACTICE",
  "MISTAKE_PRACTICE",
  "MIXED_PRACTICE",
  "SAVED_QUESTIONS",
  "ADAPTIVE_REVIEW",
  "SPACED_REVIEW",
  // ---- Wave 15 practice modes (canonical names per MASTER-PLAN C2 — no aliases) ----
  "QUICK",
  "MARATHON",
  "SIGN_TRAINER",
  "DIAGNOSTIC",
] as const;
export type TestMode = (typeof TEST_MODES)[number];

// Modes a client may actually START a session in. As of Wave 11 the adaptive/SRS
// queue lands (wave11-05 branches `startSession` on these modes), so both
// `ADAPTIVE_REVIEW` and `SPACED_REVIEW` are now STARTABLE — every TEST_MODE is
// a valid start mode and accepted by `startTestSchema`.
export const STARTABLE_MODES = TEST_MODES;

export const MODE_LABEL: Record<TestMode, string> = {
  EXAM_SIMULATION: "Екзаменаційна симуляція",
  TOPIC_PRACTICE: "Практика за темою",
  MISTAKE_PRACTICE: "Робота над помилками",
  MIXED_PRACTICE: "Змішана практика",
  SAVED_QUESTIONS: "Збережені питання",
  ADAPTIVE_REVIEW: "Розумне повторення",
  SPACED_REVIEW: "Інтервальне повторення",
  QUICK: "Швидка сесія",
  MARATHON: "Марафон",
  SIGN_TRAINER: "Знаки",
  DIAGNOSTIC: "Стартова перевірка",
};

// ---- Wave 15 practice-mode presets (spec §A + mode-contract table) ----
// CONFIGURABLE preparation tuning — presets live here, never buried in selection code.
// QUICK: a short 10-question warm-up with a soft time hint (NOT a countdown — spec Non-goal).
export const QUICK_COUNT = 10;
export const QUICK_NEW_BUDGET = 4;
export const QUICK_SOFT_TIME_SEC = 300; // soft textual hint threshold (wave15-12), not a timer
// MARATHON: paged endless practice — questions served MARATHON_PAGE at a time.
export const MARATHON_PAGE = 20;
// SIGN_TRAINER: road-signs drill.
export const SIGN_TRAINER_COUNT = 20;
export const SIGN_TRAINER_NEW_BUDGET = 8;
// SIGN_TRAINER pool: a question is eligible when its topic's displayOrder is one of these road-signs
// sections OR the question carries an imageKey (image-bearing). CONFIGURABLE. Live-seed ground truth
// (wave15 review, verified against prisma/dev.db): 134 = §33 ДОРОЖНІ ЗНАКИ, 135 = §34 ДОРОЖНЯ
// РОЗМІТКА. 132/133 are technical-state/procedural topics — NOT signs; 131 mentions «ЗНАКИ» but
// means plate/ID markings, also excluded.
export const SIGN_TRAINER_TOPIC_ORDERS = [134, 135] as const;
// DIAGNOSTIC: a one-shot start-of-journey spread across the blueprint.
export const DIAGNOSTIC_COUNT = 15;

// ---- Session status / result ----
export const SESSION_STATUS = ["IN_PROGRESS", "COMPLETED", "ABANDONED"] as const;

export const SESSION_RESULT = ["PASSED", "FAILED"] as const;
export type SessionResult = (typeof SESSION_RESULT)[number];

// ---- Mistake status ----
export const MISTAKE_STATUS = ["ACTIVE", "RESOLVED"] as const;
export type MistakeStatus = (typeof MISTAKE_STATUS)[number];

// ---- Content ----
export const SOURCE_TYPES = ["DEMO", "OFFICIAL", "CUSTOM"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

// ---- Monetization scaffold (Wave 16, spec T1/T2/T3) ----
// CONFIGURABLE pricing/access knobs. NOTE: the entitlements master flag is deliberately
// NOT a module-scope constant here — constants.ts is imported CLIENT-side, and a module-scope
// `process.env` read freezes at import. The flag reader lives server/pure-side as a CALL-TIME env
// read in lib/entitlements.ts (`isEntitlementsEnabled()`, wave16-04/05) so tests can `vi.stubEnv` it.

// One-time price (UAH) for exam access. Market research (3-round WTP study, 2026-07-04) closed at 399.
export const PRICE_UAH = 399;

// Access tiers a user can hold. FREE is the default; EXAM_ACCESS unlocks the gated surfaces.
export const ENTITLEMENT_TIERS = ["FREE", "EXAM_ACCESS"] as const;

// How an entitlement was granted (audit provenance). MANUAL = admin grant; PROMO = promo/coupon.
export const ENTITLEMENT_SOURCES = ["MANUAL", "PROMO"] as const;

// Retake win-back window: whole days after a reported FAILED exam during which the win-back nudge
// is eligible (inclusive day-8..day-9 band; Kyiv-day math in lib/entitlements/nudge policy, wave16-11).
export const WINBACK_WINDOW_START_DAY = 8;
export const WINBACK_WINDOW_END_DAY = 9;

// JTBD onboarding — how the learner is preparing (drives the prep-mode step, wave16-12).
export const PREP_MODES = ["SCHOOL", "SELF", "BOTH"] as const;
export type PrepMode = (typeof PREP_MODES)[number];

// Self-reported exam outcome (account exam-outcome capture, wave16-10; feeds the win-back window).
export const EXAM_OUTCOMES = ["PASSED", "FAILED"] as const;

export const REVIEW_STATUS = ["UNREVIEWED", "REVIEWED", "NEEDS_FIX"] as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[number];

// ---- Exam rules (CONFIGURABLE — not legal truth, just preparation defaults) ----
// These approximate a typical theory-exam shape for PREPARATION purposes only. They are not
// an official rule set and must be easy to update if/when official content is imported.
export const DEFAULT_EXAM_QUESTION_COUNT = 20;
export const DEFAULT_EXAM_TIME_LIMIT_MINUTES = 20;
export const DEFAULT_EXAM_MAX_ERRORS = 2;

// Default number of questions for practice modes (topic/mixed/mistake/saved).
export const DEFAULT_PRACTICE_QUESTION_COUNT = 20;

// ---- Readiness levels (internal preparation indicator — NOT a guarantee of passing) ----
export const READINESS_LEVELS = [
  "NOT_ENOUGH_DATA",
  "NEEDS_PRACTICE",
  "IMPROVING",
  "ALMOST_READY",
  "READY_FOR_EXAM_STYLE_PRACTICE",
] as const;
export type ReadinessLevel = (typeof READINESS_LEVELS)[number];

// ---- Login throttling (brute-force mitigation) ----
// Failed-login attempts allowed per source within the rolling window before logins are throttled.
// NOTE: the limiter is an in-memory, PER-INSTANCE store for the MVP (see lib/server/login-throttle.ts) —
// it does NOT coordinate across multiple server instances. Tune these freely; they are just constants.
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_SECONDS = 900; // 15 minutes

// ---- Mistake resolution rule ----
// Number of consecutive correct answers required to mark a mistake RESOLVED.
export const MISTAKE_RESOLVE_THRESHOLD = 2;

// ---- Spaced review of mistakes (SM-2-lite spacing ladder) ----
// Hours to wait before a mistake becomes "due" for review again, indexed by the mistake's
// correct-streak (`correctRepeatCount`): index 0 ⇒ due immediately, index 1 ⇒ after 24h, etc.
// Streaks beyond the last index CLAMP to the last entry. This is the tunable interval ladder for
// the pure `dueMistakes` predicate (lib/test-engine/selection.ts) — just preparation tuning, not
// legal truth. CONFIGURABLE: lengthen/shorten the ladder freely.
export const REVIEW_INTERVALS_HOURS = [0, 24, 72, 168, 336, 720] as const;

// ---- Study streak / daily goal ----
// CONFIGURABLE: answers-per-day that counts as a full day of study (drives the
// daily-goal indicator on the dashboard). Just a preparation target — tune freely.
// Rough seconds a learner spends on one question — turns the plan's daily quota
// into the «≈N питань · M хв» estimate on the dashboard. CONFIGURABLE.
export const PLAN_SECONDS_PER_QUESTION = 25;

// ---- Adaptive / spaced review (Wave 11) ----
// Target number of questions pulled into an ADAPTIVE_REVIEW / SPACED_REVIEW session from the
// due/weak queue. CONFIGURABLE — just preparation tuning.
export const ADAPTIVE_REVIEW_SIZE = 15;
// Minimum distinct questions a learner must have SEEN before the mastery-readiness recompute
// produces an estimate beyond NOT_ENOUGH_DATA. This is the SINGLE source for the readiness-min
// threshold: the legacy duplicate twin (same value, used only by the 3-band estimator in
// lib/progress.ts) was consolidated into this constant in wave19b-08 to remove the redundant
// `= 20` literal.
export const READINESS_MIN_SEEN = 20;
// Rolling window (most-recent exam-style mock sessions) the readiness snapshot averages over.
export const READINESS_MOCK_WINDOW = 10;

// ---- Readiness / progress tuning ----
// A topic counts as "weak" below this accuracy (0..1), once it has enough answers.
export const WEAK_TOPIC_ACCURACY_THRESHOLD = 0.6;
// Minimum answers in a topic before its accuracy is trusted for weak-topic detection.
export const WEAK_TOPIC_MIN_ANSWERS = 4;
// Accuracy (0..1) at/above which a sufficiently-answered topic is classified "strong"
// (mastered) by the pure topic-mastery classifier (lib/mastery.ts). Below this — but still
// at/above WEAK_TOPIC_ACCURACY_THRESHOLD — a topic is "learning". Just preparation tuning.
export const MASTERY_STRONG_ACCURACY_THRESHOLD = 0.85;
// Point-difference threshold above which a readiness trend counts as IMPROVING / DECLINING
// (a change within this band is treated as STABLE).
export const READINESS_TREND_THRESHOLD = 5;
// Within-topic intraclass correlation ρ used by the beta-binomial variance-inflation correction
// (lib/readiness-correlation.ts). ⚠ NEUTRALIZED to 0 (wave19b adversarial review, 2026-07-12):
// mean-preserving TAIL variance inflation lowers P(≥threshold) only when threshold ≤ block mean,
// but the real exam regime (need 18/20) puts every NON-ready student's mean BELOW the threshold —
// there ρ>0 RAISES their dial (verified live: mean 14/20 → 3.5%→16.7% at ρ=0.35), the exact
// inverse of the honesty goal. The correct correlation penalty acts on the per-item p ESTIMATE
// (effective-sample-size shrinkage toward the prior), not on the draw tail — wave19c.
// Do NOT raise this above 0 for the live dial until an estimation-side correction ships; the
// direction gate in lib/readiness-honesty.regression.test.ts pins this.
export const READINESS_TOPIC_CORRELATION = 0;

// ESTIMATION-side within-topic intraclass correlation ρ (wave19c). Distinct from the draw-side
// READINESS_TOPIC_CORRELATION above (which stays NEUTRALIZED at 0). RETIRED from the live dial
// (wave19d-09): the persisted readiness dial now routes through the release model "lm-gh1"
// (lib/readiness-release.ts), whose LOGIT-scale one-factor mixture SUPERSEDES this effective-sample-
// size shrink (n_eff = n / (1 + (n − 1)·ρ)). Its SUCCESSOR is READINESS_RELEASE_RHO (0.35, below).
// This constant + READINESS_ESTIMATION_QUANTILE_ALPHA now feed ONLY the superseded-but-kept
// lib/readiness-estimation.ts + its oracle, plus the append-only `nEff`/`rhoEst` audit fields in
// recomputeReadiness's inputsJson — they no longer influence the number a real user sees.
export const READINESS_TOPIC_CORRELATION_ESTIMATION = 0.3;
// Live estimation tier. RETIRED to "off" (wave19d-09): the wave19c n_eff shrinkage no longer feeds
// the persisted dial (the release model "lm-gh1" replaced it wholesale). "mean" would apply the
// n_eff shrinkage to each block's mean probability; "quantile" (parked) would additionally take a
// lower-tail quantile of the per-block posterior at READINESS_ESTIMATION_QUANTILE_ALPHA. Kept as an
// append-only `tier` audit field only.
export const READINESS_ESTIMATION_TIER: "mean" | "quantile" | "off" = "off";
// Parked quantile lower-tail level α for the "quantile" tier (unused; the estimation tier is "off").
export const READINESS_ESTIMATION_QUANTILE_ALPHA = 0.2;

// ---- Evidence-releasing readiness model "lm-gh1" (wave19d; lib/readiness-release.ts) ----
// The wave19d model replaces the 19c estimation-side shrink with an honest COMPOSE: per-block
// Lahiri–Mukherjee seen/unseen split → exact Poisson-binomial independence dial → one-factor
// Gauss–Hermite ICC mixture → finalDial = min(mixture, independence). Every constant below is
// PINNED by the wave19d-02 reference oracle (scripts/oracles/gen-19d-oracles.py); the model reads
// them (or takes them as params defaulting to them). Do NOT edit without regenerating that oracle.
export const READINESS_RELEASE_MODEL_KEY = "lm-gh1";
// Within-topic intraclass correlation ρ — the SUCCESSOR of READINESS_TOPIC_CORRELATION_ESTIMATION
// (the 19c ~0.3–0.35 within-topic ICC), now consumed on the LOGIT scale by the shared latent factor
// instead of the effective-sample-size shrink. The research's 3-0-voted 0.35.
export const READINESS_RELEASE_RHO = 0.35;
// Latent factor scale at zero evidence, from the standard logistic-normal ICC map
// ρ = σ₀²/(σ₀² + π²/3) ⇒ σ₀ = √(ρ/(1−ρ)·π²/3) (π²/3 = Var of the standard logistic). ρ=0.35 ⇒
// ≈ 1.33096485927. This is the ρ→σ₀ mapping named in the doc above.
export const READINESS_RELEASE_SIGMA0 = Math.sqrt(
  (READINESS_RELEASE_RHO / (1 - READINESS_RELEASE_RHO)) * ((Math.PI * Math.PI) / 3),
);
// Gauss–Hermite node count for the shared-factor quadrature (research: "~20 nodes").
export const READINESS_RELEASE_GH_NODES = 20;
// Evidence-decay reference review mass m₀ in σ(M) = σ₀·√(m₀/(m₀+M)) — the O(M^−1/2) Cai-2005
// credible-gap decay: as review mass M grows the shared nuisance shrinks and the mixture releases
// back to the independence baseline.
export const READINESS_RELEASE_EVIDENCE_M0 = 1;

// ---- Learner-facing exam-readiness estimate (lib/readiness.ts) ----
// A SIMPLE, additive 0..100 estimate with a 3-band Ukrainian label — distinct from the internal
// 5-level READINESS_LEVELS above. It is a PREPARATION indicator, NOT a guarantee of passing.
// The score is a weighted blend of two signals (weights sum to 1):
//   - the mean of recent exam-simulation scores (each 0..100; empty history ⇒ 0 contribution), and
//   - the share of practised topics that are NON-weak (mastered/learning; empty ⇒ 0), scaled to 100.
// Tune freely — these are preparation knobs, not legal truth.
export const EXAM_READINESS_EXAM_WEIGHT = 0.6;
export const EXAM_READINESS_MASTERY_WEIGHT = 0.4;
// Band cutoffs on the 0..100 score (monotonic): below ALMOST ⇒ "не готовий"; at/above ALMOST but
// below READY ⇒ "майже"; at/above READY ⇒ "готовий".
export const EXAM_READINESS_ALMOST_CUTOFF = 50;
export const EXAM_READINESS_READY_CUTOFF = 80;

// ---- Analytics event names ----
export const ANALYTICS_EVENTS = [
  "user_registered",
  "user_logged_in",
  "user_logged_out",
  "onboarding_completed",
  "category_selected",
  "dashboard_viewed",
  "test_started",
  "question_answered",
  "test_completed",
  "exam_simulation_passed",
  "exam_simulation_failed",
  "topic_practice_started",
  "mistake_practice_started",
  "diagnostic_completed",
  "calm_ritual_started",
  "calm_ritual_skipped",
  "question_saved",
  "question_unsaved",
  "admin_question_created",
  "admin_question_updated",
  "admin_question_published",
  "admin_question_archived",
  // Wave 16 monetization scaffold — recordEvent rejects unknown names, so the names must exist
  // here BEFORE the events are actually recorded (exam outcome: wave16-10; JTBD: wave16-12).
  "exam_outcome_reported",
  "onboarding_jtbd_answered",
  // Wave 17 value-first funnel (wave17-11) — measurable funnel stages fired at their REAL points.
  // Stage → fire point (see docs / task Log): `segment_complete` ← final tap of the ≤4-tap
  // self-segment (segmentAnswerConfidenceAction); `activation_aha` ← first answered question whose
  // explanation is shown (submitAnswer); `readiness_aha` ← readiness dial renders a real
  // sufficient-data number (dashboard); `exam_access_purchased` ← completeCheckout (wave17-09). The
  // conversion edges reuse existing events: registration = `user_registered`, purchase =
  // `exam_access_purchased`. Names must exist here BEFORE recordEvent fires them (recordEvent rejects unknowns).
  "segment_complete",
  "activation_aha",
  "readiness_aha",
  "exam_access_purchased",
  // Wave 19a calibration capture (wave19a-06) — fired ONLY when a real prediction↔outcome
  // calibration pair is persisted (a sufficient-data readiness snapshot existed at report time).
  "pass_outcome_captured",
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

// ---- Client analytics ingest (/api/track) ----
// First-party only: the client batches lightweight interaction events and POSTs them here. These
// caps bound abuse and keep payloads small. NOTE: this ingest path is the freeform (eventType)
// lane of AnalyticsEvent — it NEVER stores raw IPs, passwords, answer text/correctness, or raw
// form-field values (only a hashed IP + whitelisted, non-PII fields; see lib/analytics-ingest.ts).

// Max client events accepted in a single POST batch (a larger batch is rejected, not truncated).
export const TRACK_MAX_BATCH_SIZE = 50;
// Max bytes of the raw request body we will read/parse (defence against oversized payloads).
export const TRACK_MAX_BODY_BYTES = 64 * 1024; // 64 KB
// Field-length caps for stored client-event strings (longer values are rejected by zod).
export const TRACK_MAX_STRING_LEN = 512;
export const TRACK_MAX_PATH_LEN = 1024;

// Per-source rate limit for the ingest endpoint. The "source" is the anonymousId when present,
// else the hashed IP, so one visitor (or one IP) can't flood the endpoint. This is an in-memory,
// PER-INSTANCE limiter (same caveat as login throttling) — tune freely; just constants.
export const TRACK_RATE_MAX_BATCHES = 30; // batches allowed per source within the window
export const TRACK_RATE_WINDOW_SECONDS = 60; // rolling window

// ---- Analytics retention (Wave 14 §F) ----
// Our privacy/retention promise: raw AnalyticsEvent rows are pruned once older than this,
// so we keep only a recent window of granular behavioural data (aggregates are computed on
// the fly, not from ancient rows). The nightly job deletes rows past the cutoff.
export const ANALYTICS_RETENTION_DAYS = 180;
// Delete in bounded id-chunks: keeps each libsql transaction small and stays well under the
// query-parameter cap (P2029) that a single `{ id: { in: [...] } }` with thousands of ids trips.
export const ANALYTICS_PRUNE_CHUNK = 500;

// ---- Nudges (Wave 14) ----
// Gentle in-app nudge cards on the dashboard, rendered on visit — NOT web push (so the
// account quiet-hours settings do not apply on this path). All CONFIGURABLE preparation
// knobs; the pure decision policy lives in lib/nudge-policy.ts.

// The nudge kinds the policy can emit; each is also the NotificationLog dedupeKey
// prefix in the `<kind>:<day>:<userId>` shape.
export const NUDGE_KINDS = [
  "REVIEW_DUE",
  "EXAM_COUNTDOWN",
  "DAY_OFF_OFFER",
  "READINESS_MILESTONE",
  // Retake win-back (Wave 16, wave16-11): a legal kind now; `decideNudge` never EMITS it until
  // the win-back branch + window math land in wave16-11 (transitional, per task scope).
  "RETAKE_WINBACK",
] as const;
// Calm-by-default rolling cap: at most this many nudges per NUDGE_WINDOW_DAYS window
// (on top of the policy's hard one-nudge-per-day rule) — encouragement, never a nag.
export const NUDGE_WEEKLY_CAP = 4;
export const NUDGE_WINDOW_DAYS = 7;
// An exam-countdown nudge fires only when EXACTLY this many whole days remain before
// the learner's exam date — three touchpoints, not a daily drumbeat.
export const NUDGE_EXAM_COUNTDOWN_DAYS = [7, 3, 1] as const;
// Readiness milestones on the 0..100 estimate: crossing one UPWARD earns a single
// celebration nudge (downward moves never fire — no shaming).
export const NUDGE_READINESS_MILESTONES = [25, 50, 75] as const;
// Local hour (0..23) from which a day-off offer may show — evening only, so we never
// suggest resting on a day the learner might still study.
export const NUDGE_EVENING_HOUR = 18;

// ---- Confidence calibration (Wave 14) ----
// Pure math in lib/calibration.ts over the sampled "how confident were you?" answers
// (confidence 1..4, Wave 12b chip). Offline reviews carry no confidence and are excluded.

// Minimum kept (confidence-bearing) rows before we show any calibration verdict —
// below this the buckets are too noisy to say anything kind or useful.
export const CALIBRATION_MIN_SAMPLES = 20;
// Expected accuracy for each confidence level 1..4: what a well-calibrated learner
// who says "guessing / unsure / fairly sure / certain" should actually score.
export const CALIBRATION_EXPECTED_ACCURACY = [0.25, 0.5, 0.75, 0.95] as const;
// Floor for the calibration slope (actual/expected correct): the slope only DISCOUNTS
// readiness (cap 1.0, never inflates) and never discounts below this — a harsh early
// sample must not zero out a learner's estimate.
export const CALIBRATION_SLOPE_MIN = 0.6;
// "Overconfident" when high-confidence (3–4) answers score below this accuracy —
// the learner feels certain more often than they are right.
export const CALIBRATION_OVERCONFIDENT_BELOW = 0.7;
// "Underconfident" when low-confidence (1–2) answers score above this accuracy —
// the learner knows more than they trust themselves to.
export const CALIBRATION_UNDERCONFIDENT_ABOVE = 0.6;

// ---- PassOutcome calibration fit floor (Wave 19a, admin §K) ----
// Minimum PassOutcome rows before we SHOW the fitted Platt {A,B} on the admin
// calibration page. Below this the fit is too noisy to display (the pure metrics
// — Brier/LogLoss/ECE/reliability bins — still render). This is ONLY a display
// gate; it is NOT the ≥1000 isotonic auto-promotion threshold (a later wave).
export const CALIBRATION_MIN_OUTCOMES = 30;

// ---- Learning-health difficulty outliers (Wave 14, admin §E) ----
// The "generation = free data audit" loop: observed answer accuracy vs the difficulty
// an author assigned. A question that reads far easier or harder than its authored
// level is a content signal an editor should see. Pure math in lib/learning-health.ts.

// Expected observed accuracy for authored difficulty 1..5 (index difficulty-1): an
// easy (1) question should be answered right ~90% of the time, a hard (5) one ~50%.
export const DIFFICULTY_EXPECTED_ACCURACY = [0.9, 0.8, 0.7, 0.6, 0.5] as const;
// A question is an outlier only when |observed − expected| exceeds this — a quarter of
// the whole scale, so only genuinely mis-levelled questions surface (not normal spread).
export const DIFFICULTY_OUTLIER_DELTA = 0.25;
// Minimum answers before we trust a question's observed accuracy — below this the
// rate is too noisy to accuse the authored difficulty of being wrong.
export const DIFFICULTY_OUTLIER_MIN_ANSWERS = 20;

// ---- Confidence sampling (Wave 12b) ----
// Roughly 1 in CONFIDENCE_SAMPLE_RATE answered questions shows the "how confident were you?"
// follow-up chip. Sampling is a deterministic hash of (sessionId, questionId) — see
// lib/confidence-sampling.ts — so the same pair samples identically on every render/reload.
export const CONFIDENCE_SAMPLE_RATE = 5;

// ---- Value-first conversion funnel (Wave 17) ----
// Answered-question count in an anonymous play session before the "save your progress"
// prompt surfaces. Kept low so a visitor who has felt the loop is asked once they have
// something worth saving — not before. See docs/strategy/wave17-anon-funnel-adr.md.
export const ANON_SAVE_PROMPT_THRESHOLD = 5;

// ---- Elo / Rasch item-difficulty estimator (Wave 22) ----
// A logit-space online Elo/Rasch update estimates each item's difficulty (β) and each
// user's ability (θ) from real answer outcomes: θ+=K·e, β−=K·e with a guess-adjusted
// prediction P = g + (1−g)·σ(θ−β). See scripts/oracles/gen-wave22-oracles.py (the frozen
// golden) and lib/elo.ts (task 04). The ESTIMATOR ships this wave, but every CONSUMER
// stays gated OFF behind ELO_CONSUMERS_ENABLED until an item has accrued at least
// ELO_MIN_ITEM_ANSWERS answers — below that the estimate is too noisy to feed selection,
// difficulty display, or readiness. The guess floor g = min(1/optionCount, FSRS_GUESS_MAX)
// REUSES the existing FSRS_GUESS_MAX (lib/fsrs) — it is deliberately NOT redeclared here.
// Uncertainty-adaptive learning rate: K(n) = ELO_K_MAX / (1 + n/ELO_K_HALFLIFE), so a
// brand-new item/user uses K(0)=ELO_K_MAX and the step shrinks as evidence accrues.
export const ELO_K_MAX = 0.4;
export const ELO_K_HALFLIFE = 20;
export const ELO_MIN_ITEM_ANSWERS = 200;
export const ELO_CONSUMERS_ENABLED = false as const;
export const ELO_INITIAL_BETA = 0;
export const ELO_INITIAL_THETA = 0;
