// Tunable constants for the pure FSRS learning engine (lib/fsrs/*).
//
// PURE + deterministic: this module holds ONLY numbers — no clock, no DB, no randomness.
// Everything here is a preparation knob, NOT legal/official truth. The FSRS weights come
// from the published FSRS-6 default optimiser output; `schedule` (the DSR state machine) and
// the queue/readiness models read them. Keep them Postgres-portable and framework-free so the
// whole `lib/fsrs/` tree stays unit-testable.

// ---- FSRS default parameters (weights) ----
// The 21-parameter FSRS-6 default weight vector (the algorithm's pre-training "global average",
// used until we optimise per-user weights in a later wave). These map to the standard FSRS-6
// stability/difficulty formulas:
//   w0..w3   — initial stability for the first rating (Again/Hard/Good/Easy).
//   w4,w5    — initial difficulty (D_0(G) = w4 - e^(w5·(G-1)) + 1).
//   w6,w7    — difficulty update: linear-damped ΔD (w6) and mean-reversion strength (w7) toward
//              the UNCLAMPED initial difficulty of Easy.
//   w8..w14  — the successful-recall stability growth (w8..w10) and the lapse stability (w11..w14).
//   w15,w16  — the Hard-penalty / Easy-bonus multipliers.
//   w17,w18  — the short-term (same-day) stability terms (S'_s = S·e^(w17·(G-3+w18))). DELIBERATELY
//              UNUSED here: we ship the long-term variant (`enable_short_term=false`), so
//              `schedule.ts` never fires the w17/w18 same-day path.
//   w19      — the short-term stability saturation exponent (S^-w19), also unused in the long-term
//              variant; kept to preserve the canonical 21-slot index alignment.
//   w20      — the TRAINABLE forgetting-curve decay. The retrievability decay is -w20 and the curve
//              FACTOR is derived from it so R(S,S) = 0.9 by construction (see retrievability.ts).
//              This is THE FSRS-6 addition over FSRS-5's fixed -0.5 decay.
// Source: py-fsrs v6.3.1 default parameters (the FSRS-6 reference), cross-checked against
// ts-fsrs@5.4.1's 21-weight FSRS-6 path. Documented, not derived at runtime.
export const FSRS_DEFAULT_WEIGHTS = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542,
] as const;

// ---- Target retention ----
// The desired probability of successful recall at the moment an item comes due. FSRS solves
// `intervalDays` so that predicted retrievability decays to exactly this value. 0.90 is the
// FSRS default (`request_retention`) and a sensible exam-prep target — high enough to keep
// knowledge fresh without over-reviewing. CONFIGURABLE; later a per-user optimiser may tune it.
export const FSRS_TARGET_RETENTION = 0.9;

// ---- Inferred-grade thresholds (see lib/fsrs/grade.ts, spec §2) ----
// ПДР is single-correct MCQ, not free-recall, so the FSRS grade (1..4) is INFERRED from the
// answer signal rather than self-reported: wrong → Again(1); correct → Good(3); correct & fast
// & confident → Easy(4); correct & (slow | low-confidence) → Hard(2). These constants define the
// latency and confidence boundaries. Just preparation tuning — adjust freely.

// THREE-band latency model (post-wave10f-review fix): production ALWAYS sends latencyMs and (until the
// Wave-12b confidence UI) NEVER sends confidence — so a single fast/slow cliff made Good(3) unreachable
// live (every correct answer became Easy≤8s / Hard>8s), corrupting the FSRS state the readiness dial
// reads. Good must be the reachable BULK grade. These are interim GLOBAL bands until Wave 11 computes
// per-topic median latency from ReviewLog (spec 03-learning-regimes §2.5).
// Easy: at/below this — genuinely instant recognition.
export const FSRS_EASY_LATENCY_MS = 5000;
// Hard: at/above this — a genuine struggle (reading + deliberating well past the norm).
export const FSRS_HARD_LATENCY_MS = 30000;

// Optional self-reported confidence is on a 1..4 scale where 4 = most confident, 1 = least.
// Confidence at/above this (upper half of the scale) counts as "confident" — a precondition for Easy.
export const FSRS_CONFIDENT_MIN = 3;
// Confidence at/below this (lower half of the scale) counts as "low-confidence" — nudges toward Hard.
export const FSRS_LOW_CONFIDENCE_MAX = 2;

// ---- Grade-engine version tag (2026-07-13) ----
// Stamped onto every ReviewLog row so a future per-user FSRS weight fit (Wave C) can segment or
// exclude reviews whose GRADE SEMANTICS differ. BUMP this string whenever the meaning of the stored
// `grade` changes (latency-band → BKT was such a change at the 19b boundary; guess/slip or
// band-threshold retunes are too). Format: <scheduler>-<grade-inference><rev>.
export const REVIEW_ENGINE_VERSION = "fsrs6-bkt2";

// ---- BKT guessing-corrected grade inference (Wave 19b deliverable #2, see lib/fsrs/grade.ts) ----
// ПДР is single-correct MCQ, so a fast+correct answer can be a lucky GUESS rather than genuine recall.
// `gradePosterior` treats a correct answer as a guess/slip observation of a latent "knows this item"
// variable, so the posterior belief — not raw latency — is the PRIMARY grade axis.
// Guess floor: g = 1/optionCount. Default 0.25 for a 4-option ПДР item (P(correct | ¬knows)).
export const FSRS_GUESS_DEFAULT = 0.25;
// Honest degeneracy cap on the guess floor (Wave 20 design point 3). A 2-option item's naive
// g = 1/2 = 0.5 sits AT the Baker, Corbett & Aleven BKT identifiability boundary: once the guess
// probability P(G) reaches 0.5 the model becomes degenerate — a correct answer carries no evidence
// that the learner knows the item, so the posterior stops updating and the grade signal collapses.
// Capping g just below that bound (0.45) keeps a 2-option (or degenerate 1-option) correct answer
// mildly informative while leaving 3/4/5-option items (g ≤ 1/3 < 0.45) and the absent-count default
// (0.25) untouched. Preparation tuning — not legal/official truth.
export const FSRS_GUESS_MAX = 0.45;
// Slip: P(wrong | knows) — a known item mis-clicked. Constant across items (pinned by the Wave-19b oracle).
export const FSRS_SLIP = 0.1;

// Posterior→FSRS-band thresholds. π = P(knows | correct) after the guess/slip update:
//   π ≥ FSRS_KNOW_EASY → Easy(4);  π ≥ FSRS_KNOW_GOOD → Good(3);  else → Hard(2).
// A first-exposure/neutral 0.5 prior yields π≈0.78 → Good; a strong 0.9 prior yields π≈0.97 → Easy;
// a weak 0.2 prior only reaches π≈0.47 → Hard (the anti-lucky-guess property). Product tuning.
export const FSRS_KNOW_EASY = 0.93;
export const FSRS_KNOW_GOOD = 0.75;
