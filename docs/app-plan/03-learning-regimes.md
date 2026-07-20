# 03 · Learning Regimes & Learning Logic

**Owner:** Learning-Systems Designer · **Status:** design (implementable spec) · **Date:** 2026-07-01
**Scope:** every study MODE, the mastery/readiness model, the SRS engine, adaptive selection, and the per-answer feedback loop — as an **evolution** of the existing engine, not a greenfield.

> Reading guide. §0 states principles + how this extends today's code. §1 is the data-model delta (what to add, migration-safe). §2 is the SRS engine (FSRS, exact state, formulas, backfill). §3 is the mastery + honest-readiness model (the dial). §4 is adaptive selection. §5 is the full mode catalogue. §6 is the answer→feedback loop. §7–8 are the engagement + anxiety wrappers. §9 is rollout via Mesa + open questions.

---

## 0. Principles & what already exists

**Non-negotiables carried into every mechanic** (from the brief + research):

1. **Active recall is the only path to the explanation.** Every surface is *question-first*; the "why" unlocks only after an answer tap. Every retrieval is logged.
2. **The honest readiness DIAL is the emotional centre** — a *predicted probability of passing the real ТСЦ exam*, never "% of questions seen". It falls when coverage is thin, decays as memory lapses, and is discounted by measured over-confidence. One dial per selected category; the single count-up climax lives on the dashboard (ported from the landing).
3. **Calm, not gamey.** No leagues, no public ranking, no punitive streaks, no confetti. Competence + relief carry engagement (SDT). Світлик is the messenger, never a nag.
4. **Official-only, honest.** 2322 questions / 65 topics / 8 categories. Only ~38 % of explanations are `REVIEWED`; the rest render the existing `ExplanationNotice`. Never fabricate an explanation, a stat, or a review.
5. **Stable-key discipline.** All new learning state keys on the immutable `Question.id` / `questionKey` (cuid) — **never** an array index or ordinal. Images stay behind `imageKey → GET /api/q-image/[key]`. The idempotent upsert-by-key loader must keep preserving every learning row.
6. **Weak-HW / mobile-first.** The SRS math is pure and cheap and can run client-side for an instant/offline dial; the server holds the canonical copy. Keep the daily queue *short* (FSRS's whole value).

**What the codebase already gives us (verified, reuse — do not rebuild):**

| Concern | Existing module | Reuse as |
|---|---|---|
| 5 modes (EXAM / TOPIC / MISTAKE / MIXED / SAVED) | `lib/constants.ts` `TEST_MODES`, `lib/server/test-engine.ts` | keep; extend the union |
| Session lifecycle (`startSession` → `submitAnswer` → `finishSession`) | `lib/server/test-engine.ts` | keep; add SRS write inside `submitAnswer` |
| Official ТСЦ exam rules (20 Q / 20 min / ≤2 errors) | `DEFAULT_EXAM_*`, `lib/test-engine/scoring.ts` `evaluateExam` | keep verbatim |
| Cat-B subject blueprint (per-section blocks) | `lib/exam-blueprint.ts`, `blueprint-selection.ts` | keep; extend to more categories + reuse for the dial's exam sampling |
| Mistake bank state machine (resolve after 2 corrects, reopen on wrong) | `lib/mistakes.ts`, `lib/server/mistakes.ts` | keep as the *pool label*; its scheduling is superseded by FSRS |
| SM-2-lite spaced ordering / `dueMistakes` ladder | `lib/test-engine/selection.ts`, `REVIEW_INTERVALS_HOURS` | **superseded** by FSRS for *scheduling*; keep the pure fns until backfill flips over |
| Per-topic mastery bands (weak/learning/strong) | `lib/mastery.ts` | keep the band vocabulary; drive it from aggregate R instead of raw accuracy |
| Two readiness estimates (5-level + 3-band) | `lib/progress.ts`, `lib/readiness.ts` | **demote to fallback** when a user has no FSRS data; the FSRS `passProbability` becomes the dial |
| Streak / daily goal | `lib/streak.ts`, `DAILY_GOAL_ANSWERS` | keep; add forgiveness ("day-off") |
| Image resolver tiers | `lib/image-resolve.ts` → `/api/q-image/[key]` | keep; the feedback loop uses it |

The design is therefore **additive**: one pure SRS library, two new tables, a handful of new mode strings, one new readiness function, and a selection picker generalised over parameters. Nothing above is deleted; the SM-2-lite scheduler and the old readiness estimates become *fallbacks* that light up only until a user accumulates FSRS state.

---

## 1. Data-model delta (migration-safe)

Follow the project's migration rules (hand-authored `prisma/migrations/<14-digit>_name/migration.sql`, `prisma migrate deploy`, one `ADD COLUMN` per `ALTER`, nullable/additive, then `prisma generate`). All new columns are nullable or defaulted so the loader stays progress-preserving.

### 1.1 `ReviewState` — one row per `userId × questionId` (the SRS spine)

```prisma
model ReviewState {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  questionId     String
  question       Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  topicId        String?  // denormalised for fast topic-aggregate + picker (kept in sync on write)

  // FSRS DSR memory model
  stability      Float?   // S: days until R decays to 0.9 (null until first review)
  difficulty     Float?   // D: 1..10 (null until first review)
  state          String   @default("new") // new | learning | review | relearning
  dueAt          DateTime? // next scheduled review; null while new
  lastReviewedAt DateTime?
  lastElapsedDays Float?   // t used at the last review (for the log/debug; R is recomputed live)

  reps           Int      @default(0)   // total successful graded reviews
  lapses         Int      @default(0)   // times it dropped to relearning (Again after review)
  lastGrade      Int?     // 1..4  Again|Hard|Good|Easy
  lastConfidence Int?     // 1..4  self-rated pre-answer confidence (sampled, for calibration)
  lastLatencyMs  Int?     // response time of the last answer (difficulty signal)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([userId, questionId])   // the stable key — never an index/ordinal
  @@index([userId, dueAt])         // the daily-due query
  @@index([userId, state])
  @@index([userId, topicId])
}
```

`retrievability` is **never stored** — it decays continuously and would go stale; it is computed on demand from `stability` + elapsed days (§2.3).

### 1.2 `ReviewLog` — append-only, one row per answered retrieval

Mandatory: the FSRS optimiser needs ~1 000+ rows of history to fine-tune per-user weights, and calibration + mistake analytics read it too.

```prisma
model ReviewLog {
  id             String   @id @default(cuid())
  userId         String
  questionId     String
  mode           String   // TestMode at answer time
  grade          Int      // 1..4 (derived or self-rated, see §2.5)
  stateBefore    String
  stabilityBefore Float?
  difficultyBefore Float?
  elapsedDays    Float    // days since lastReviewedAt (0 for a brand-new item)
  scheduledDays  Float?   // the interval it had been given (for optimiser)
  confidence     Int?     // 1..4 if this item was confidence-sampled
  latencyMs      Int?
  isCorrect      Boolean
  reviewedAt     DateTime @default(now())

  @@index([userId, reviewedAt])
  @@index([userId, questionId])
}
```

### 1.3 `TopicMastery` cache (optional, perf) — derived, recomputable

Aggregate retrievability per `userId × topicId`, refreshed on session finish + on the daily job. Start **derived-on-read** (compute from `ReviewState` rows); promote to a cached table only if the progress page shows measurable cost on the reference device.

```prisma
model TopicMastery {
  id          String @id @default(cuid())
  userId      String
  topicId     String
  seenCount   Int    @default(0)  // questions in this topic with a ReviewState
  totalCount  Int    @default(0)  // published questions in this topic (category-scoped snapshot)
  aggregateR  Float  @default(0)  // coverage-weighted mean retrievability (§3.2)
  band        String @default("learning") // weak | learning | strong (reuses MasteryBand vocab)
  updatedAt   DateTime @updatedAt
  @@unique([userId, topicId])
}
```

### 1.4 Exam ground truth — **reuse `TestSession`, no new table**

The "reality anchor" for the dial (§3.4) reads existing `TestSession where mode="EXAM_SIMULATION" and status="COMPLETED"` rows (they already carry `correctAnswers`, `result`, `finishedAt`). No `ExamAttempt` table is needed; per-question exam correctness already lives in `TestAnswer`.

### 1.5 Constants & mode-union additions (`lib/constants.ts`)

```ts
export const TEST_MODES = [
  "EXAM_SIMULATION", "TOPIC_PRACTICE", "MISTAKE_PRACTICE",
  "MIXED_PRACTICE", "SAVED_QUESTIONS",
  // new:
  "SPACED_REVIEW",   // daily FSRS due queue — "Повторення на сьогодні"
  "ADAPTIVE",        // renamed face of MIXED_PRACTICE — "Розумна практика"
  "SIGN_TRAINER",    // "Знаки" — sign recognition + sign-topic drill
  "MARATHON",        // endless adaptive stream
  "QUICK",           // 5-хв micro-session (preset over the adaptive picker)
  "DIAGNOSTIC",      // onboarding "Стартова перевірка"
] as const;
```

`mode` is a `String` column → **no migration** for the new values. `MODE_LABEL` gets Ukrainian labels. `MIXED_PRACTICE` is kept as an alias of `ADAPTIVE` for old rows.

New tuning constants (all "preparation knobs, not legal truth", documented like the existing ones):

```ts
// FSRS
export const FSRS_TARGET_RETENTION = 0.90;      // requested recall probability r*
export const FSRS_MAX_INTERVAL_DAYS = 365;
export const FSRS_DEFAULT_WEIGHTS = [ /* 19 FSRS-5 defaults, §2.4 */ ];
export const FSRS_OPTIMIZE_MIN_LOGS = 1000;     // per-user optimiser gate
// Adaptive selection
export const NEW_ITEMS_PER_SESSION_DEFAULT = 8; // calm intro rate
export const DESIRABLE_P_LOW = 0.70;            // desirable-difficulty band
export const DESIRABLE_P_HIGH = 0.85;
export const INTERLEAVE_MAX_SAME_TOPIC_RUN = 2;
// Readiness dial
export const READINESS_UNSEEN_PRIOR = 0.50;     // conservative prior for never-seen items
export const READINESS_MC_DRAWS = 1500;         // Monte-Carlo exam samples
export const READINESS_ANCHOR_STRENGTH = 4;     // Beta prior strength for the mock anchor
// Session presets (count, softTimeSec, newBudget)
export const QUICK_COUNT = 10;
export const DAILY_REVIEW_SOFT_CAP = 30;        // never dump a huge queue at once
```

---

## 2. SRS engine — **FSRS**, not SM-2

### 2.1 Choice & justification

**Recommendation: FSRS (Free Spaced Repetition Scheduler), replacing the current SM-2-lite mistake ordering.**

- SM-2 nudges a single mutable "ease factor" with no real memory model; on the open ~700 M-review benchmark it hits a 90 % retention target within ±16 %, vs FSRS's ±5 %, and FSRS reaches the same retention with **20–30 % fewer reviews**. For an anxious learner facing a 2 322-item bank, "fewer reviews, same retention" *is* the product — it keeps the daily queue short and the promise ("кілька хвилин на день") honest.
- FSRS models memory with **DSR — Difficulty, Stability, Retrievability**. Crucially it outputs **R = P(recall now)** per item — the exact per-question pass-probability the honest dial needs. SM-2 gives no such probability; we'd have to invent one.
- Our bank is fixed and official → items are stable and reusable → the per-item DSR state is worth maintaining and the optimiser has clean data to learn from.

The existing `REVIEW_INTERVALS_HOURS` ladder + `spacedMistakeOrder`/`dueMistakes` stay in the tree as the **fallback scheduler** for a user with zero FSRS state, and are removed once backfill (§2.6) is proven.

### 2.2 Exact state stored per question

Per `userId × questionId`: `stability`, `difficulty`, `state`, `dueAt`, `lastReviewedAt`, `reps`, `lapses`, `lastGrade`, `lastConfidence`, `lastLatencyMs` (see `ReviewState`, §1.1). Plus the append-only `ReviewLog` (§1.2). Retrievability is computed, not stored.

### 2.3 Retrievability & interval

Pure functions in a new `lib/srs/fsrs.ts` (no DB, no clock — `now`/elapsed injected, mirroring the existing pure-lib discipline). FSRS-4.5/5 power forgetting curve:

```
DECAY  = -0.5
FACTOR = 19 / 81                     // = 0.9^(1/DECAY) − 1
R(t, S) = (1 + FACTOR · t / S) ^ DECAY          // t = elapsed days, S = stability
interval(S, r*) = (S / FACTOR) · ( r*^(1/DECAY) − 1 )   // days until R decays to r* (default 0.90)
```

`dueAt = lastReviewedAt + interval(S, FSRS_TARGET_RETENTION)`, clamped to `FSRS_MAX_INTERVAL_DAYS` and a 1-day floor for `review` state.

### 2.4 Grade → state transition (the 4 update rules)

Grades `G ∈ {1 Again, 2 Hard, 3 Good, 4 Easy}`. Weights `w[0..18]` = published FSRS-5 defaults, shipped as `FSRS_DEFAULT_WEIGHTS` and tunable.

**First review (`state = new`):**
```
S0(G) = w[G-1]
D0(G) = clamp( w4 − exp(w5·(G−1)) + 1 , 1, 10 )
```
**Successful review (G ≥ 2), with current R at review time:**
```
ΔD      = −w6 · (G − 3)
D'      = D + ΔD · (10 − D) / 9                 // linear damping (FSRS-5)
D_new   = clamp( w7 · D0(4) + (1 − w7) · D' , 1, 10 )   // mean reversion
S_new   = S · ( 1 + exp(w8) · (11 − D) · S^(−w9)
                · (exp(w10 · (1 − R)) − 1)
                · (G==2 ? w15 : 1)              // Hard penalty
                · (G==4 ? w16 : 1) )            // Easy bonus
```
**Lapse (G = 1, "Again"):**
```
S_new = min( S,  w11 · D^(−w12) · ((S + 1)^w13 − 1) · exp(w14 · (1 − R)) )
lapses += 1 ;  state = "relearning"
```
`w17, w18` handle same-day (short-term) reviews and are applied when `elapsedDays < 1`. Every transition returns the new `ReviewState` and is unit-tested against a fixture vector.

### 2.5 Grade capture — collapse 4 self-grades to what the UI already knows

Four-button self-grading raises anxiety and adds noise. We derive the grade instead:

- **In MCQ modes (the default):** correctness is the primary signal.
  - Wrong → **G = 1 (Again)**.
  - Correct → **G = 3 (Good)** by default; **G = 4 (Easy)** if `latency ≤ topicMedianLatency·0.5` **and** (confidence == 4 when sampled); **G = 2 (Hard)** if `latency ≥ topicMedianLatency·1.75` **or** (confidence ≤ 2 when sampled). Latency thresholds are per-topic, computed from `ReviewLog`.
- **In recall/flashcard sub-modes** (Sign trainer "name this sign", §5.7): the two-tap **«Не згадав / Згадав»** → Again(1)/Good(3). Hard/Easy still derived from latency.

This gives FSRS a full 1–4 grade without ever showing the learner a 4-button rubric.

### 2.6 Backfill & optimiser

- **Backfill (one-off job, `scripts/srs-backfill.ts`):** for every existing user, replay their `TestAnswer` rows in `answeredAt` order through the pure FSRS engine (grade from `isCorrect` + `timeSpentSeconds`), producing a `ReviewState` per answered question and seeding `ReviewLog`. Deterministic, idempotent (re-runnable), keyed on `questionId` — never breaks existing rows. Users keep their history and get an instant, honest dial.
- **Per-user optimiser (deferred):** ship `FSRS_DEFAULT_WEIGHTS` for everyone. Once a user has `≥ FSRS_OPTIMIZE_MIN_LOGS` `ReviewLog` rows, a nightly job fits their ~19 weights (gradient descent on log-loss over their review history) and stores them (`User.fsrsWeightsJson`, nullable). Until then, defaults — which the benchmark shows already beat SM-2 for ~99 % of users.

---

## 3. Mastery & the honest readiness model

### 3.1 Per-question pass-probability `p_i`

```
seen item   (has ReviewState): p_i = calibrate( R(elapsed, S) )        // §3.3
unseen item (no ReviewState) : p_i = empiricalBayesPrior(topic)        // §3.5
```

### 3.2 Per-topic mastery (drives the 65-topic grid + rings + picker)

`aggregateR(topic) = mean over the topic's published questions of p_i` (seen use R, unseen use the prior — so a topic with thin coverage cannot read "strong"). Band vocabulary is the existing `MasteryBand`:

```
aggregateR < 0.60           → "weak"     (Слабко)
0.60 ≤ aggregateR < 0.85    → "learning" (Вивчаю)
aggregateR ≥ 0.85           → "strong"   (Впевнено)
```

Mastery is a **moving target**: because R decays, a "strong" topic can slip to "learning" — honest, and it keeps review alive. Gate nothing hard (anxious users hate locks); *steer* — the "continue" button routes to the weakest not-yet-strong topic (§4.4).

### 3.3 Calibration discount (over-confidence can't inflate the dial)

Low performers over-predict and stay over-confident even after feedback. On confidence-sampled items we store `confidence ∈ {1..4}` and the outcome. Build a per-user reliability map: for each confidence bucket `c`, `observedAccuracy_c = correct_c / n_c`. Then

```
calibrate(R) = R · ( observedAccuracy_c* / statedConfidenceNorm_c* )   // isotonic-lite
```

where `c*` is the bucket this item's predicted R falls into. MVP: a single global multiplier from the over-confidence gap `Δ = mean(statedConfNorm) − mean(actualCorrect)`, `calibrate(R) = R·(1 − max(0,Δ)·γ)`. Either way the gap **discounts** seen `p_i`, so bravado lowers the dial rather than raising it.

### 3.4 The dial = **P(pass the real exam)**, per selected category

1. **Monte-Carlo the real exam.** Draw `READINESS_MC_DRAWS` simulated exams from the category's blueprint (`lib/exam-blueprint.ts` for cat-B; uniform sampling for categories without one — the same sampler the real `EXAM_SIMULATION` uses), so the dial samples across categories/topics exactly as the ТСЦ does.
2. **Per draw, Poisson-binomial pass probability.** For the 20 drawn questions with probabilities `p_1..p_20`, compute `P(X ≥ 18)` via the Poisson-binomial DP (`dp[j] = Σ`; O(n²), n = 20 — trivial). Average over all draws → `P_sim`.
3. **Reality anchor (shrinkage toward real mocks).** Let the user's recent `EXAM_SIMULATION` sessions give `m` attempts with `k` passes. Treat `P_sim` as a Beta prior of strength `READINESS_ANCHOR_STRENGTH`:
   ```
   readiness = ( k + READINESS_ANCHOR_STRENGTH · P_sim ) / ( m + READINESS_ANCHOR_STRENGTH )
   ```
   With `m = 0` the dial equals the simulation; each real mock nudges it toward what the user actually scores, so the number never diverges from lived experience.

`readiness` is a 0–1 → render as `round(·100)` %. This is **honest by construction**: unseen items (prior ≈ 0.5, dragged further down by weak-topic empirical Bayes) pull it down, so coverage is baked in with no separate penalty; it decays as stability lapses; it is discounted by measured over-confidence; and it is anchored to real mock scores.

**Bottleneck surfacing (always paired with the number).** Beneath the dial, name the 1–2 weakest topics by `aggregateR` and the count of due reviews: *"Найслабше: Розмітка, Проїзд перехресть · 8 на повторення"* — so the % is always followed by the next action, never dread.

### 3.5 Unseen-item prior (empirical Bayes)

An unseen question in topic `t` inherits shrunk topic evidence:
```
prior(t) = shrink( topicSeenAccuracy(t),  mean = READINESS_UNSEEN_PRIOR(0.50),  strength = k0 )
         = ( correctSeen_t + k0·0.50 ) / ( answeredSeen_t + k0 )
```
So unseen items in a demonstrated-strong topic get a prior above 0.5, and in a weak topic below it — coverage is rewarded proportionally to evidence, not flat.

### 3.6 Reconciliation with the two existing estimates

`estimateReadiness` (internal 5-level, `lib/progress.ts`) and `examReadiness` (3-band, `lib/readiness.ts`) are **kept as the fallback** and shown only when a user has `< READINESS_MIN_ANSWERS` answers / empty `ReviewState` (the "NOT_ENOUGH_DATA" regime). Once FSRS state exists, the dial reads `passProbability` (§3.4). The dashboard's trend sparkline continues to read `ProgressSnapshot.readinessScore` — we simply start writing the FSRS number into that field on `finishSession`, so history is continuous.

---

## 4. Adaptive difficulty & question-selection logic

One **unified picker** (`lib/srs/select-review.ts`, pure) drives daily review, adaptive practice, quick, and marathon — they differ only in parameters. `startSession` calls it for those modes; exam/topic/saved keep their current selectors.

### 4.1 Candidate scoring

```
priority(q) =  w_over · overdueness(q)            // (now − dueAt) / interval, ≥0
             + w_ret  · (1 − R(q))                // about-to-forget
             + w_weak · (1 − aggregateR(topic(q)))// weak-spot targeting
```
Due items (`dueAt ≤ now`, `state ∈ {learning,review,relearning}`) sort by descending `priority`. This surfaces items the learner is *about to forget*, in topics they're worst at — automatic weak-spot targeting with no separate feature.

### 4.2 Desirable difficulty

When the due set is exhausted but the session isn't full, pull **seen** items whose predicted `p_i` sits in `[DESIRABLE_P_LOW, DESIRABLE_P_HIGH]` (0.70–0.85) — hard enough to be a productive struggle, not demoralising. Skip items with `R > 0.95` (wasteful) and `R < 0.40` (route those to relearning, not cold practice).

### 4.3 New-item introduction (calm intro rate)

Cap new items at `newBudget` per session (default `NEW_ITEMS_PER_SESSION_DEFAULT = 8`). Introduce them **weakest-topic-first**, and within a topic **easiest-first** (`Question.difficulty` ascending) so a first pass lowers anxiety. New items enter `ReviewState` on first answer.

### 4.4 Interleaving & weak-spot routing

- **Interleave:** after ordering, reshuffle so no more than `INTERLEAVE_MAX_SAME_TOPIC_RUN` (2) consecutive items share a topic — near-identical sign/right-of-way traps are exactly what interleaving trains discrimination on. Single-topic drill stays available (lower anxiety for a first pass) but the *recommended* mode is interleaved once a topic reaches "learning".
- **"Continue" routing:** the dashboard's primary CTA always targets the weakest not-yet-strong topic (lowest `aggregateR` with `coverage > 0`), or, if a due queue exists, the daily review.

### 4.5 Picker parameters per mode

| Mode | count | soft time | newBudget | pool filter | order |
|---|---|---|---|---|---|
| SPACED_REVIEW | ≤ `DAILY_REVIEW_SOFT_CAP` | none | 0 | due only | priority |
| ADAPTIVE | 20 | none | 8 | due + desirable + new | priority → interleave |
| QUICK | 10 | ~5 min (calm, non-blocking) | 4 | due-first, then desirable | priority → interleave |
| MARATHON | ∞ (paged) | none | rolling | due → desirable → new, refills | priority → interleave |
| SIGN_TRAINER | 20 | none | 8 | sign topics + image-bearing | difficulty/priority |

---

## 5. The study modes (full specs)

Every mode below defines **entry · question selection · timing · pass rule · feedback**. Modes reuse `startSession`/`submitAnswer`/`finishSession`; new ones extend the union (§1.5). Ukrainian names are the visible labels; the calm/anxiety framing is per the engagement + anxiety briefs.

### 5.1 Пробний іспит — official ТСЦ mock (`EXAM_SIMULATION`) — *table stakes, exists*
- **Entry:** dashboard "Пробний іспит як у ТСЦ" card; optional 60-sec calm ritual first (§8). Confirm-before-start (it's timed).
- **Selection:** the category blueprint. Cat-B → `selectByBlueprint` (structure 2 · medicine 2 · law 2 · general 1 · safety 2–3 · ПДР remainder = 20) with within-exam content-dedup. Categories without a blueprint → uniform-random 20 from the published category pool. *Roadmap:* author blueprints for A, C, D as their official structures are confirmed.
- **Timing:** hard **20-minute** countdown (`DEFAULT_EXAM_TIME_LIMIT_MINUTES`), auto-submit at 0. Timer visible but calm (no red pulsing until <60 s, and even then amber not alarm).
- **Pass rule:** `evaluateExam` — **≤ 2 wrong of 20 = PASSED** (`DEFAULT_EXAM_MAX_ERRORS`).
- **Feedback:** **none mid-test** (graded exposure — the format itself is the anxiety treatment). After finish: full розбір per question (correct option, explanation, image), wrong ones auto-enter the mistake pool, result page offers "Робота над помилками" as the default next action. Every answer still writes `ReviewState`/`ReviewLog`. The mock is the reality anchor for the dial (§3.4).

### 5.2 Екзамен за категорією — category exam
Same engine as 5.1, scoped to the learner's `selectedCategory`; the dial and readiness are always per selected category. Not a separate mode value — it *is* `EXAM_SIMULATION` with the category applied. Called out here because the dial's honesty depends on exam and dial sharing one category + one blueprint sampler.

### 5.3 Тема — topic drill (`TOPIC_PRACTICE`) — *exists*
- **Entry:** `/practice` → a topic card (only topics with ≥1 published question in the category are shown, with servable counts). Blocked, single-topic — deliberately the lowest-anxiety first pass.
- **Selection:** `selectQuestions(mode=TOPIC_PRACTICE, topicId)` — shuffle within topic, `count = DEFAULT_PRACTICE_QUESTION_COUNT` (20). *Evolution:* bias the shuffle by the picker's priority so due/weak items in the topic float up (still single-topic).
- **Timing:** untimed; per-question latency logged.
- **Pass rule:** none — framed as practice, not judgement. Surfaces the topic's mastery band + delta afterwards.
- **Feedback:** immediate reveal after each answer (§6). Writes `ReviewState`.

### 5.4 Повторення на сьогодні — daily spaced review (`SPACED_REVIEW`) — **new, the core ritual**
- **Entry:** the dashboard's "due today" card ("Світлик радить повторити 8 знаків" — calm count, not a red badge). Standalone launch also lands here when a queue exists.
- **Selection:** unified picker, **due only** (`dueAt ≤ now`), ordered by `priority`, capped at `DAILY_REVIEW_SOFT_CAP` (never dump the whole backlog — split across days, honestly labelled "ще N на завтра").
- **Timing:** untimed.
- **Pass rule:** none; completing the day's due set fills the daily goal and (if configured) the streak.
- **Feedback:** immediate reveal + FSRS reschedule. This is where FSRS earns its keep — short queue, high yield.

### 5.5 Розумна практика — adaptive weak-spot (`ADAPTIVE`, formerly `MIXED_PRACTICE`) — *evolves existing*
- **Entry:** "Продовжити" primary CTA / "Розумна практика" card. This is the default recommended session.
- **Selection:** unified picker — due-first, then desirable-difficulty (0.70–0.85), then ≤8 new items weakest-topic-first, **interleaved** (≤2 same-topic in a row). Replaces the current `prioritizeWeakTopics` two-band shuffle (kept as the fallback until FSRS state exists).
- **Timing:** untimed; `count = 20`.
- **Pass rule:** none.
- **Feedback:** immediate reveal; each answer moves the dial live.

### 5.6 Робота над помилками — mistake bank (`MISTAKE_PRACTICE`) — *exists, rescheduled by FSRS*
- **Entry:** `/mistakes`, reframed as **«помилки, які вже не повторяться»** with the error count visibly *shrinking* — not shame. Default post-mock action.
- **Selection:** the pool = `ReviewState where lapses > 0 and state ∈ {relearning, learning}` (equivalently the existing `UserMistake status=ACTIVE` set — kept in sync). Ordered by FSRS `priority` (relearning items are short-interval and surface first). Grouped by topic so the pattern is visible.
- **Timing:** untimed.
- **Pass rule / exit:** an item leaves the pool after **N = 2 spaced correct recalls** (`MISTAKE_RESOLVE_THRESHOLD`) — *spaced*, not one immediate re-tap (fluency illusion). The existing `applyAnswer` state machine already enforces this and reopens on a wrong answer; FSRS now governs *when* the item resurfaces instead of the SM-2-lite ladder.
- **Feedback:** immediate reveal; resolves emit a quiet "виправлено" from Світлик, never confetti.

### 5.7 Знаки — sign trainer (`SIGN_TRAINER`) — **new**
- **Entry:** "Знаки" card; also reachable from any sign question's explanation ("тренувати цей знак"). Nods to the popular sign-only competitors, but inside the calm shell + restyled assets (a visual moat).
- **Selection:** two sub-modes:
  1. **Drill** — questions from the sign/marking sections (§33 ДОРОЖНІ ЗНАКИ → `Topic.displayOrder 132`, §34 markings) and any image-bearing question, ordered by picker priority.
  2. **Recognition (flashcard)** — show the restyled sign asset large via `imageKey → /api/q-image/[key]`, ask "який це знак?" as MCQ *or* self-recall with the two-tap grade (§2.5). Uses the sign name + official section reference as the answer.
- **Timing:** untimed (optional "швидкий" speed variant later; never sacrifice calm).
- **Pass rule:** none; feeds the sign topics' mastery bands + `ReviewState`.
- **Feedback:** immediate; the sign asset + its official name + `legalReference` are the anchor (§6). Meaningful Ukrainian `alt` = the sign name.

### 5.8 Марафон — endless (`MARATHON`) — **new**
- **Entry:** "Марафон" — for a learner in flow who wants to keep going.
- **Selection:** unified picker in **rolling** mode — due → desirable → new, refilling as answered; interleaved; no fixed count. Paged (fetch 20 at a time) to protect the JS/transfer budget on weak HW.
- **Timing:** untimed, endless until the user stops; progress auto-saved (resumable via the existing `getResumableSession`).
- **Pass rule:** none; a calm running accuracy + "N answered" counter, no leaderboard.
- **Feedback:** immediate reveal each item.

### 5.9 Швидка сесія (5 хв) — quick micro-session (`QUICK`) — **new**
- **Entry:** "Швидка сесія · 5 хв" — the low-commitment daily habit hook.
- **Selection:** unified picker preset `QUICK_COUNT = 10`, due-first then desirable, newBudget 4.
- **Timing:** a **soft** ~5-min guide (a gentle progress hint, **not** a blocking countdown — calm, not exam pressure).
- **Pass rule:** none; counts toward the daily goal.
- **Feedback:** immediate reveal.

### 5.10 Збережені — saved questions (`SAVED_QUESTIONS`) — *exists*
- **Entry:** `/saved`; the ★ on any question adds it.
- **Selection:** the user's saved set, most-recent-first, filtered to still-published (existing behaviour). Fully reviewable offline.
- **Timing:** untimed. **Pass rule:** none.
- **Feedback:** immediate reveal; also writes `ReviewState` (saving ≠ scheduling, but answering a saved item still schedules it).

### 5.11 Стартова перевірка — diagnostic (`DIAGNOSTIC`) — **new, onboarding**
- **Entry:** first run, after category select. "Дай нам 3 хвилини — покажемо, з чого почати." Reduces the overwhelm of 2 322 items ("we'll figure out what you don't know").
- **Selection:** ~15 blueprint-representative questions spanning the category's blocks/topics (so the seed covers the exam's shape), easy-to-medium first.
- **Timing:** untimed (no pressure on the very first session).
- **Pass rule:** none — it produces the **first `ReviewState` seed** and the **first dial climax** (the count-up on *their* data, seeding competence before any friction).
- **Feedback:** gentle per-item reveal; ends on the dial's first 0→N% animation + the named bottleneck + a finite plan (§7).

---

## 6. The explanation / feedback loop after each answer

The single most important learning surface. Fires on `submitAnswer` for every practice mode (exam/diagnostic withhold until finish). Order of operations:

1. **Lock & score.** Selection locks; `submitAnswer` returns `{ isCorrect, correctOptionId, explanation }` (existing shape). Options render as a semantic **radiogroup** (≥44 px rows, thumb-zone, arrow-key nav) — chosen option tinted **correct** `hsl(152 46% 90%)` + green-deep border + ✓ + word "Правильно", or **wrong** `warn #B4532E` + ✕ + word "Неправильно"; on a wrong answer the correct option is also highlighted. **Non-colour signalling always** (icon + Ukrainian label), per a11y.
2. **Image / sign anchor.** The restyled official photo or sign renders via `imageKey → GET /api/q-image/[key]?w={360|540|720}&f=avif` (resolver tiers override ▸ restyled-live ▸ official), with explicit width/height (CLS), `loading="lazy"`, and a **meaningful Ukrainian `alt`** (sign name / scene) — never a filename. For sign questions the asset is shown large with its official name + section. Decorative gloss is `aria-hidden`.
3. **Explanation panel (honest).** If `explanation.reviewedStatus === "REVIEWED"`: render `shortText`, then `detailedText`, then `legalReference` (пункт ПДР) as the credibility anchor. Otherwise render the existing **`ExplanationNotice`** ("орієнтовне, автоматично згенероване") above whatever text exists — never fabricate, never hide the disclaimer. `LegalDisclaimer` stays where it is.
4. **Confidence sampling (calibration).** On a *sample* of items (e.g. first exposure + every Nth review — not all, to avoid friction), *before* reveal ask **"Наскільки впевнені?"** as a lightweight 1–4 (or 2-level) tap. Store on `ReviewState.lastConfidence` + `ReviewLog.confidence`. Periodically surface a calm calibration panel ("коли ти був упевнений, ти мав рацію у 72 % випадків").
5. **Grade & schedule.** Derive `G` from correctness + latency + (sampled) confidence (§2.5); run the pure FSRS update; write `ReviewState` + append `ReviewLog`. Keep the existing `recordMistakeOutcome` call so the mistake bank stays in sync. A wrong (or low-confidence-correct = lucky guess) item enters relearning.
6. **Dial delta & Світлик.** The readiness contribution updates; if it crosses a friendly threshold, Світлик gives a *calm* acknowledgement (green "go" lamp), never confetti or guilt. Mistakes are framed as *fixed*, not shameful.
7. **A11y / focus.** After submit, **move focus to the result and announce it** via `aria-live="polite"`; the "Далі" button is anchored in the bottom thumb zone.
8. **Offline.** Answer/attempt state writes to **IndexedDB**; `ReviewLog`/`ReviewState` deltas background-sync when back online. Mistakes, Saved, and last-N tests (answers + explanations + cached images by `imageKey`) are fully reviewable offline. The dial can recompute client-side from local `ReviewState` for an instant offline number; the server holds canonical.

---

## 7. Engagement wrapper (calm, not gamey)

- **Streak = "days of practice", detoxified.** Keep `studyStreak` + `DAILY_GOAL_ANSWERS` (user-adjustable 10/15/20 for autonomy). No fire-emoji panic, no "streak at risk" modals.
- **Forgiveness from day one.** An automatic, generous **"вихідний / day off"** Світлик *offers* ("Відпочинь сьогодні — прогрес збережено"); life-happens never reads as failure. No punitive resets.
- **Test-date-aware finite plan (highest-leverage feature).** Onboarding asks exam date + category → a personalised, *finite* daily dose ("~18 днів × 15 питань — встигаєш спокійно"), sized so due-review + coverage complete before the date. Notification escalation ties to the **exam date**, never to a broken streak.
- **Progress as the superpower:** the honest dial (hero), the 65-topic grid filling in (a finite map over a scary 2 322 mountain), the shrinking mistake count, the calm due-review nudge.
- **Explicitly rejected:** leagues, public leaderboards, rank-vs-peers, abstract XP/coins/badge walls, loss-aversion framing, guilt/FOMO/red-alarm notifications, fabricated social proof (★4.9/testimonials stay placeholders — never shipped as real). Notifications ≤ 3–4/week, in the user's chosen window, in Світлик's warm voice, with granular per-category mute.

---

## 8. Test-anxiety layer (primary, not cosmetic)

- **Exposure ladder:** flash Quick (5.9) → topic/adaptive → full timed mock (5.1). Familiarity with the format is the strongest anxiolytic; the mock *is* the treatment.
- **Optional 60-sec calm ritual before a mock:** a breathing screen paced by Світлик's amber→green lamp, doubling as a reframe ("це тренування, не вирок"). Gated by `prefers-reduced-motion`.
- **Honest, controllable dial** replaces dread-of-uncertainty with a plan ("ти на 84 %, ~30 хв до 90 %") — always paired with the named bottleneck.
- **Effort/mastery language throughout** ("спокійно росте"), never scores-as-judgement.

---

## 9. Rollout (via Mesa harness) & open questions

**Phased delivery** — each phase a `mesa plan` → `run-all` (evaluator + verify gate) → independent real-browser audit (`npm run audit:browser` over the real http origin; never claim done from static/build/curl):

1. **Phase 1 — SRS spine.** `lib/srs/fsrs.ts` (pure, unit-tested vectors) + `ReviewState`/`ReviewLog` migrations + dual-write inside `submitAnswer` + backfill job. Mistake bank + old estimates keep working (fallback). *Verify:* backfill is idempotent, preserves all rows; FSRS vectors match reference.
2. **Phase 2 — modes.** Unified picker + `SPACED_REVIEW`, `ADAPTIVE`, `QUICK`, `MARATHON` + dashboard due-card. *Verify:* queues are short, interleaved, weak-first.
3. **Phase 3 — honest dial.** `passProbability` (Monte-Carlo + Poisson-binomial + anchor + calibration) → swap the dashboard hero dial; keep writing the number into `ProgressSnapshot`. *Verify:* dial is low at thin coverage, rises with mocks, matches recent mock pass-rate within tolerance.
4. **Phase 4 — trainer, diagnostic, calibration, calm ritual.** `SIGN_TRAINER`, `DIAGNOSTIC`, confidence sampling + calibration panel, breathing screen. *Verify:* a11y (axe + VoiceOver/TalkBack on real HW), offline review.
5. **Phase 5 — per-user optimiser** once logs accumulate.

**Open questions (need a human/product decision or data):**

- **Real ТСЦ rules per category.** We have the cat-B blueprint + 20/20/≤2 defaults; the *official* structure/time/error-thresholds for A, C, D, and the combined categories (BE/CE/DE, T) are unconfirmed. Ship B honestly, label others "загальна практика" until their blueprint is authored — or source the official per-category exam spec?
- **Confidence-sampling rate.** How often to ask "наскільки впевнені?" before it becomes friction — every first-exposure only, or a rolling %? Needs a small A/B on completion rate.
- **`FSRS_TARGET_RETENTION`.** 0.90 is Anki's default; for a *pass-once* exam a slightly lower target (0.85) means fewer reviews but a thinner safety margin. Tune against the dial's reality-anchor error.
- **New-item intro rate vs exam date.** Should `newBudget` auto-scale up when the finite plan is behind schedule (risking overwhelm) or stay fixed (risking not covering the bank in time)?
- **Mistake-bank ↔ ReviewState unification.** Keep `UserMistake` as a synced convenience table, or fully derive the pool from `ReviewState (lapses>0)` and retire `UserMistake` after Phase 1? (Derivation is cleaner but touches `/mistakes`, admin content-health, and integration fixtures.)
- **Client-side vs server-side dial compute.** Instant/offline dial from local `ReviewState` is attractive but risks a visible number mismatch with the canonical server value — do we show server-only, or reconcile with a "syncing" state?
- **Diagnostic length.** 15 questions seeds priors but may feel long as a *first* session for an anxious user — is a 7-question "mini-diagnostic → first dial climax" a better first-win-in-<60s?
