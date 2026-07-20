# 05 — Technical Architecture & Data Model

Owner: Tech Architect · Status: proposed (2026-07-01) · Target repo: `/Users/clpc/drivers-school` (branch `main`)

This document specifies the **technical evolution** of the mature Waves 1–9 app into the calm,
adaptive, offline-capable, liquid-glass product the plan describes. It is an **additive** design:
it builds on — and must not break — the existing Next 16 / React 19 / Tailwind v4 / Prisma 7 stack
and the stable-key content architecture (`questionKey` / `optionKey` / `imageKey` → `/api/q-image`
resolver, idempotent upsert-by-key that preserves user progress).

## 0. Non-negotiables (invariants this design preserves)

1. **Stable-key content architecture is sacrosanct.** All new learning state is keyed on
   `userId × questionId` (stable cuid) and `userId × topicId` — never on array index, session order, or
   `imageKey`. `importOfficial`'s idempotent upsert must keep passing `content-upsert.integration.test.ts`:
   because question/option ids survive a reload, every new SRS/mastery/mistake row stays valid across
   content re-imports.
2. **Pure logic in `lib/`, DB orchestration in `lib/server/`, engine stays DB-free.** FSRS scheduling,
   the queue picker, and the readiness model are pure + unit-tested (verify gate is real); DB wiring lives
   in `lib/server/*`. Never import `server-only` / `@/lib/db` / `@prisma/client` into a pure module
   (purity greps false-fail on comments too — see CLAUDE.md).
3. **No SQLite enums, no native JSON.** String unions documented in `lib/constants.ts`; `*Json` fields are
   stringified `String`. Postgres-portable (`provider` swap + adapter swap only).
4. **Migrations are hand-authored SQL + `prisma migrate deploy`** (migrate-dev is interactive/broken in
   this shell). One `ADD COLUMN` per `ALTER TABLE` in SQLite; new tables via `CREATE TABLE`; indexes via
   `CREATE INDEX`. Regenerate the client after. Additive-only columns (nullable / defaulted) so no reseed.
5. **Reading content stays opaque/solid; glass is chrome only.** ≤2 co-visible real refraction lenses;
   emulated glass on weak HW. Weak/2016-era Android + phones are the perf meter, measured on **hosted PSI +
   a real browser**, never local M2 numbers.
6. **Legal/honesty positioning holds.** No official-exam claim; the readiness dial is a *preparation*
   signal (honest by construction, §4/§6); the ★4.9/testimonials stay placeholders and are never shipped
   as real; only ~38% of explanations are REVIEWED and keep their auto-gen notice.

---

## 1. Data-model additions (Prisma)

The learning brief mandates FSRS (Difficulty/Stability/Retrievability), an append-only review log,
cached topic mastery, mock-exam ground truth, an honest readiness model, confidence calibration,
detoxified streaks/goals, user settings, and notifications. We add **eight new models** and make
**three additive column changes**. Everything is keyed on stable ids.

**Reuse, don't duplicate:** the brief's "study sessions" and "ExamAttempt" map onto the existing
`TestSession` (it already stores `mode`, `status`, `correctAnswers/wrongAnswers/totalQuestions`,
`result PASSED|FAILED`, `timeLimitSeconds`, `finishedAt`). A mock exam **is** a `TestSession` with
`mode="EXAM_SIMULATION"`; the adaptive study loop is a new `mode="ADAPTIVE_REVIEW"`. We do **not** add a
parallel session table. The "mistake bank" stays `UserMistake` (its resolve-after-N rule and `/mistakes`
view are good); FSRS's `relearning` state is the *scheduler of record* that drives it (§2).

### 1.1 `ReviewState` — FSRS per-item memory state (the SRS spine)

```prisma
model ReviewState {
  id             String    @id @default(cuid())
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  questionId     String
  question       Question  @relation(fields: [questionId], references: [id], onDelete: Cascade)
  // FSRS DSR model. R (retrievability) is COMPUTED ON DEMAND from (now - lastReviewedAt) + stability —
  // never stored (it decays continuously; a stored value goes stale). See lib/fsrs/retrievability.ts.
  stability      Float     @default(0)       // days until R decays to 0.90
  difficulty     Float     @default(0)       // 1..10 (FSRS D)
  state          String    @default("new")   // new | learning | review | relearning
  dueAt          DateTime?                    // next scheduled review; null for brand-new
  lastReviewedAt DateTime?
  reps           Int       @default(0)
  lapses         Int       @default(0)
  lastGrade      Int?                         // 1..4 = Again|Hard|Good|Easy
  lastConfidence Int?                         // 1..4 (calibration, §6/§8)
  lastLatencyMs  Int?                         // response time (difficulty signal + calibration)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@unique([userId, questionId])              // one state per user×question (stable key)
  @@index([userId, state])
  @@index([userId, dueAt])                    // queue picker: "due now" scan is index-driven
}
```

Rows are **created lazily** on a question's first answer (no bulk backfill → sidesteps the P2029
query-parameter cap on huge `IN (...)` lists noted in CLAUDE.md). Optionally a one-off script can seed
`ReviewState` from existing `TestAnswer` history, but it is not required for correctness.

### 1.2 `ReviewLog` — append-only telemetry spine (mandatory, §6)

```prisma
model ReviewLog {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  questionId      String
  question        Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  topicId         String?
  reviewedAt      DateTime @default(now())    // CLIENT event time when replayed from offline
  grade           Int                          // 1..4
  elapsedDays     Float                        // days since prior review at grading time
  priorStability  Float?                       // FSRS optimizer needs the pre-review state
  priorDifficulty Float?
  scheduledDays   Float?                       // interval FSRS assigned next
  confidence      Int?                         // 1..4
  latencyMs       Int?
  mode            String                       // ADAPTIVE_REVIEW | EXAM_SIMULATION | TOPIC_PRACTICE | ...
  testSessionId   String?                      // link back to the quiz session
  clientEventId   String?  @unique             // IDEMPOTENCY for offline replay (§3.4)
  createdAt       DateTime @default(now())

  @@index([userId, reviewedAt])
  @@index([userId, questionId])
}
```

The log is the **FSRS optimizer corpus** (needs ~1,000+ reviews/user to fine-tune weights; ship default
weights until then), the **calibration source**, and the **mistake feed**. Append-only, never mutated.

### 1.3 `TopicMastery` — cached aggregate for the 65-topic rings + picker

```prisma
model TopicMastery {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  topicId    String
  categoryId String?
  meanR      Float    @default(0)   // aggregate retrievability across the topic's seen items
  coverage   Float    @default(0)   // seen / total in the user's category
  band       String   @default("weak") // weak|learning|strong  →  Вивчаю|Майже|Впевнено
  itemsSeen  Int      @default(0)
  itemsTotal Int      @default(0)
  computedAt DateTime @default(now())

  @@unique([userId, topicId])
  @@index([userId, band])
}
```

Truth is `ReviewState`; this is a **materialized view** recomputed on `finishSession` and by a nightly
job, so the dashboard rings and the queue's `topic-weakness` factor are O(1) reads. `band` reuses the
existing `lib/mastery.ts` thresholds so the two notions of "mastery" stay consistent. A topic can slip
back to "Майже" as R decays — honest and keeps review alive (mastery-learning, §3 of the learning brief).

### 1.4 `UserStudyProfile` — exam-date plan, detoxified streak, goal, calibration slope

```prisma
model UserStudyProfile {
  id               String    @id @default(cuid())
  userId           String    @unique
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  examDate         DateTime?                    // drives the finite "N днів × M питань" plan
  dailyGoal        Int       @default(15)       // user-adjustable (autonomy); small dose (spacing)
  timezone         String    @default("Europe/Kyiv")
  studyWindowStart Int?                          // minutes-from-midnight; notification timing
  streakCurrent    Int       @default(0)         // "days of practice", NOT a fragile trophy
  streakBest       Int       @default(0)
  lastStudyDay     String?                       // "YYYY-MM-DD" local (Slavic-safe day key)
  freezeTokens     Int       @default(2)         // "вихідний" day-off; auto-applied, generous
  freezeAutoUsedOn String?                       // last date a freeze auto-covered a gap
  calibrationSlope Float?                         // learned over/under-confidence → discounts readiness
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

Streak logic is **forgiving**: a missed day inside the window auto-spends a `freezeToken` (Світлик
*offers* rest), never a punitive reset. No leagues, no rank, no loss-aversion framing (engagement brief).

### 1.5 `StudyDay` — per-day rollup (streak/goal ring, offline-cheap)

```prisma
model StudyDay {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  day         String                     // "YYYY-MM-DD" local
  reviewCount Int      @default(0)
  goalMet     Boolean  @default(false)
  usedFreeze  Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@unique([userId, day])
  @@index([userId, day])
}
```

Derivable from `ReviewLog`, but materialized so the streak ring renders without scanning the log and so
offline clients can show today's progress from a tiny cached row.

### 1.6 `ReadinessSnapshot` — the honest pass-probability behind the dial

```prisma
model ReadinessSnapshot {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId        String?
  passProbability   Float    @default(0)   // 0..1 = P(≥18/20) from the Poisson-binomial (§6)
  dialPercent       Int      @default(0)   // 0..100 after mock-shrinkage — the ONE dial number
  coverage          Float    @default(0)
  calibrationSlope  Float?
  bottleneckTopicId String?
  bottleneckTitle   String?                // "найслабше: Розмітка" surfaced under the dial
  inputsJson        String   @default("{}")// {meanR, seenCount, mockPassRate, priorUnseen} for audit
  createdAt         DateTime @default(now())

  @@index([userId, createdAt])
}
```

Coexists with (does not delete) the legacy `ProgressSnapshot` (internal 5-level + 3-band `examReadiness`),
which stays for admin/back-compat. `ReadinessSnapshot.dialPercent` becomes the single source for the
landing/dashboard count-up dial. Recomputed on `finishSession` + nightly (§3.5).

### 1.7 `UserSettings` — rendering/a11y overrides, notification prefs, offline

```prisma
model UserSettings {
  id                 String   @id @default(cuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  glassTier          String   @default("auto")  // auto | real | emulated | solid (§5.4)
  reduceMotion       String   @default("auto")  // auto | on | off
  notifStudyReminder Boolean  @default(true)
  notifReviewDue     Boolean  @default(true)
  notifExamCountdown Boolean  @default(true)
  notifQuietStart    Int?                        // minutes-from-midnight (do-not-disturb)
  notifQuietEnd      Int?
  offlineAutoPack    Boolean  @default(false)    // auto-cache next topic for offline
  analyticsOptOut    Boolean  @default(false)    // mirrors existing ds_no_analytics cookie
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

Defaults are `auto` = respect OS (`prefers-reduced-motion`, `prefers-reduced-transparency`,
`Save-Data`); these are explicit user overrides. `analyticsOptOut` reconciles with the existing account
opt-out cookie (the cookie remains the anonymous-visitor mechanism; this row is the logged-in mirror).

### 1.8 `PushSubscription` + `NotificationLog` — Web Push + delivery guard

```prisma
model PushSubscription {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint   String    @unique
  p256dh     String
  auth       String
  userAgent  String?
  createdAt  DateTime  @default(now())
  lastSeenAt DateTime?
  @@index([userId])
}

model NotificationLog {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  kind         String    // STUDY_REMINDER | REVIEW_DUE | EXAM_COUNTDOWN | DAY_OFF_OFFER | READINESS_MILESTONE
  channel      String    @default("push")  // push | inapp
  scheduledFor DateTime?
  sentAt       DateTime?
  status       String    @default("QUEUED")// QUEUED | SENT | SKIPPED | FAILED
  dedupeKey    String?   @unique            // e.g. "review_due:2026-07-02:<userId>" → ≤1/day/kind
  createdAt    DateTime  @default(now())
  @@index([userId, sentAt])
  @@index([status, scheduledFor])
}
```

`dedupeKey` + a rolling per-user count enforce the engagement cap: **≤3–4/week**, tied to the exam date
(not a broken streak), voiced as Світлик, muted per-category via `UserSettings`. `NotificationLog` also
powers **in-app** nudges when push is unavailable (iOS Safari without an installed PWA).

### 1.9 Additive column changes (three)

- **`TestAnswer.confidence Int?`** — nullable; the optional "Наскільки впевнені?" tag captured in-session
  (sampled, not every item — friction). Feeds `ReviewLog.confidence` + calibration.
- **`Question` / `User`** — no column changes; only new back-relations (`reviewStates`, `reviewLogs`,
  `topicMasteries`, `studyProfile`, `settings`, `pushSubscriptions`, `notifications`, `readinessSnapshots`,
  `studyDays`). Relation fields are schema-only, no migration SQL.
- **`UserMistake`** — unchanged columns; its `status`/`correctRepeatCount` are now *also* updated inside the
  same review transaction as `ReviewState.relearning` (§2), keeping the mistake pool and the scheduler in
  lockstep. `MISTAKE_RESOLVE_THRESHOLD = 2` (N=2 spaced corrects) already matches the learning brief.

### 1.10 Migration plan

One migration dir `prisma/migrations/<YYYYMMDDHHMMSS>_srs_learning_state/migration.sql`:
`CREATE TABLE` for the 8 new models + their indexes, and a single
`ALTER TABLE "TestAnswer" ADD COLUMN "confidence" INTEGER;`. Apply via `prisma migrate deploy`
(non-interactive), then `prisma generate`. All additive/nullable → **no reseed, user data preserved**.
Client-side offline stores (IndexedDB) are **not** Prisma models (§4.4).

---

## 2. FSRS engine placement & state transitions

- **`lib/fsrs/` (pure, unit-tested, deterministic — clock injected):**
  - `schedule(state, grade, now) → nextState` — the DSR update (S, D, dueAt, reps/lapses, state machine
    new→learning→review⇄relearning).
  - `retrievability(state, now) → R` (0..1) — computed from elapsed days + stability; **never stored**.
  - `deriveGrade({ correct, latencyMs, confidence }) → 1..4` — maps the app's **MCQ** answer to an FSRS
    grade (§8 / open Q2): `wrong → Again(1)`; `correct & (slow | low-confidence) → Hard(2)`;
    `correct → Good(3)`; `correct & fast & confident → Easy(4)`. UI stays two-tap-simple; Hard/Easy are
    inferred so we don't add a 4-button self-grade (raises anxiety, adds noise).
  - `FSRS_DEFAULT_WEIGHTS` (the ~19 params) as a documented constant; `lib/fsrs/optimizer.ts` deferred
    (open Q1).
- **State transitions live only in `lib/server/study.ts`**, inside the `submitAnswer` transaction (§3.2):
  read `ReviewState` (or default-new) → `deriveGrade` → `schedule` → upsert `ReviewState` → append
  `ReviewLog` → reconcile `UserMistake` (a wrong answer or lucky-guess low-confidence-correct enters/refreshes
  the pool as `relearning`; leaves only after N=2 spaced corrects) → bump `StudyDay`/streak.

---

## 3. API / server-action design for the study loop

Conventions kept: **Server Actions** in `app/(app)/*/actions.ts` for interactive mutations (progressive
enhancement, no client fetch), calling `lib/server/*`; **Route Handlers** only where a non-action caller
needs them (the service worker's background sync, image negotiation). Next 16: `params`/`searchParams` are
Promises (await them); `cookies()`/`headers()` are async.

### 3.1 The loop (one screen = one retrieval, explanation gated behind an answer)

```
startAdaptiveReview() ──► TestSession(mode=ADAPTIVE_REVIEW) ──► /test/[id]
   getSessionState()  (unchanged; withholds correctness until answered)
   submitAnswer({...grade/confidence/latency, clientEventId})  ──► feedback + explanation
   ... repeat ...
   finishSession()  ──► recompute TopicMastery + ReadinessSnapshot ──► result
```

### 3.2 New / extended server actions & orchestration (`lib/server/study.ts`)

- **`startAdaptiveReview(userId, categoryId)`** — builds the queue (§3.3), creates a
  `TestSession(mode="ADAPTIVE_REVIEW")` + ordered `TestSessionQuestion`s, returns its id. `ADAPTIVE_REVIEW`
  is added to `TEST_MODES` (constants) with a `MODE_LABEL` (e.g. "Розумне повторення") and
  `showsImmediateFeedback = true`.
- **`submitAnswer(...)` (extend the existing `lib/server/test-engine.ts`)** — accepts optional
  `{ confidence?, latencyMs?, grade?, clientEventId? }`. Wrap the writes in **one
  `prisma.$transaction`** so a single retrieval atomically produces: `TestAnswer` upsert (existing) →
  `ReviewLog` append (dedupe on `clientEventId`) → `ReviewState` upsert via FSRS → `UserMistake`
  reconcile (existing `recordMistakeOutcome`) → `StudyDay`/streak bump → analytics event. Returns the same
  practice feedback shape (correctness + `correctOptionId` + explanation) it does today, so `test-runner.tsx`
  changes minimally.
- **`finishSession(...)` (extend)** — after the existing totals/result/`snapshotProgress`, also recompute
  the affected `TopicMastery` rows and a fresh `ReadinessSnapshot` (both cheap, session-scoped).
- **`getStudyPlan(userId)`** — from `UserStudyProfile.examDate` + due count + coverage, returns the finite
  calm plan ("~18 днів × 15 питань — встигаєш спокійно") and today's recommended action (weakest not-yet-
  mastered topic; steer, never lock).
- **Profile/settings actions** — `setExamDate`, `setDailyGoal`, `updateSettings`, `subscribePush`,
  `unsubscribePush` (each zod-validated in `lib/validation.ts`, RBAC = self-only, no IDOR).

### 3.3 Queue picker (pure — `lib/test-engine/queue.ts`)

`scoreCandidate(state, now, topicWeakness) = overdueness × (1 − R) × topicWeakness`, targeting the
**desirable-difficulty band P(correct) ≈ 0.7–0.85** (learning brief §5). It **interleaves** across
topics/categories (adjacent-but-different) for discrimination, respects the blueprint weighting for
exam-shaped sessions, and mixes in a small share of new items so coverage grows. Deterministic (clock +
rng injected) → unit-tested like the existing `selection.ts`. `dueMistakes`/`spacedMistakeOrder` remain for
the legacy mistake mode; the FSRS queue supersedes them for `ADAPTIVE_REVIEW`.

### 3.4 Offline sync endpoint (Route Handler — `app/api/review-sync/route.ts`)

The service worker's Background Sync cannot invoke a Server Action, so reviews taken offline POST here.
- Auth via the same session cookie; zod-validated batch (reuse the `/api/track` size-cap + rate-limit
  patterns); **idempotent by `clientEventId`** (unique on `ReviewLog`) so a replayed beacon is a no-op.
- The batch is **applied in `reviewedAt` order** (FSRS is order-dependent). If a late review arrives out of
  order for a question, the handler **rebuilds that question's `ReviewState` by replaying its `ReviewLog`
  in order** (authoritative reconstruction) rather than trusting incremental state — a rare, bounded cost
  (open Q5).
- Always acks 200-style JSON even on partial reject (a beacon can't probe internals), mirroring `/api/track`.

### 3.5 Readiness computation (pure model + cached snapshot)

`lib/readiness-model.ts` (pure): per-item pass-probability `p_i = R_i × calibrationSlope` for seen items,
a conservative prior (~0.5–0.6, category baseline) for **unseen** items (so thin coverage drags the number
down automatically); then **P(≥18 of 20)** via the exact **Poisson-binomial DP** over the blueprint-weighted
draw of `p_i`; then **blend with the recent `EXAM_SIMULATION` pass-rate** (shrinkage toward observed mocks)
so the dial never diverges from what the user actually scores. The DP over 20 draws is trivially cheap; the
expensive part (scanning per-item R across ~1.9k category items) is done **on `finishSession` + nightly**,
persisted to `ReadinessSnapshot`, and read O(1) on the dashboard — never computed in the dial's render path.
The bottleneck topic is surfaced beneath the % so it's always paired with a next action.

---

## 4. Offline / PWA strategy

### 4.1 Service worker: Serwist (`@serwist/next`)

`next.config.ts` wraps with `withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js",
additionalPrecacheEntries: [{ url: "/~offline", revision }] })` (revision from `git rev-parse HEAD`).
**Turbopack caveat (load-bearing):** `@serwist/next` injects the SW through the **webpack** compilation, but
Next 16 defaults to Turbopack. Keep `next dev` on Turbopack (fine — SW is a dev-noop) and run **`next build`
on the webpack path** (do not enable the experimental Turbopack build for production) so `public/sw.js` is
emitted. This is the single most likely build break; pin it in the PWA wave's spec + verify gate.

### 4.2 Precache + runtime caching (`app/sw.ts`)

- **Precache:** app shell, `/dashboard`, `/practice`, `/mistakes`, `/saved`, `/~offline` fallback, fonts,
  the Світлик sprite, and CSS.
- **Runtime (`runtimeCaching`):**
  - **Images** (`sameOrigin && request.destination === "image"`, includes `/api/q-image/*`): **CacheFirst**,
    named cache, capped by count/age — images are content-addressed by `imageKey` (+ negotiated `w`/`f`), so
    they're immutable and cache-safe.
  - **Question JSON / session state:** **StaleWhileRevalidate** (or NetworkFirst) so a re-opened topic
    renders instantly then refreshes.
  - **Mutations** (`POST /api/review-sync`, `POST /api/track`): **NetworkOnly + a `BackgroundSyncQueue`** so
    offline reviews queue and replay on reconnect.

### 4.3 Manifest & install

`app/manifest.ts` (Ukrainian `name`/`short_name`, `display: "standalone"`, calm pastel
`theme_color`/`background_color`, **maskable 192 + 512 Світлик icons**, `categories: ["education"]`,
screenshots). Standalone launch resolves to **`/dashboard`, not the landing**. iOS ignores the manifest
icons → add `apple-touch-icon` + `apple-mobile-web-app-*` meta and a calm in-app "Додати на головний
екран" instruction card (do **not** rely on `beforeinstallprompt` — unsupported on iOS Safari); let
Chrome/Android surface the native prompt.

### 4.4 Offline-capable study (IndexedDB write-ahead log)

- **Opt-in "Завантажити тему для офлайн"** per topic: caches that topic's question JSON (IndexedDB) + its
  images by `imageKey` (Cache Storage), after a **confirm dialog showing the size** ("~X МБ"). Global
  **Cache Storage budget ≤ 50 MB**; the full corpus at ~50 KB AVIF ≈ ~37 MB is opt-in, never eager.
- **Mistakes, Saved, and the last-N completed tests are reviewable offline** (answers + explanations +
  cached images) — precached on last view.
- **Reviews taken offline** are written to an **IndexedDB write-ahead log** (grade/confidence/latency +
  a client-minted `clientEventId` + `reviewedAt`), replayed to `/api/review-sync` via Background Sync when
  back online. The online/offline banner is calm and non-alarming.

### 4.5 Image content-negotiation inside the existing resolver (no key break)

Extend `/api/q-image/[key]/route.ts` (its `params` is already an awaited Promise) to honor
`?w={360,540,720}&f={avif,webp}` (or the `Accept` header) **on the same stable key** — the resolver still
walks `image-overrides ▸ restyled-live ▸ official-images`, then transcodes/serves the negotiated variant
with `Cache-Control: public, max-age=31536000, immutable`. The key regex + path-containment guard
(traversal → 404) are unchanged. This satisfies offline packs and §5.2 without touching the loader or DB.

---

## 5. Performance architecture (weak HW is the meter)

Budget per app route at the 75th percentile on a Moto-G-class Android / Slow-4G:
**LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, lab TBT ≤ 200 ms, First-Load JS ≤ 150 KB gz** (Next flags > 128 KB),
per-route async chunk ≤ 50 KB, non-image study-session transfer ≤ 300 KB gz, fonts ≤ 90 KB woff2 /
≤ 2 weights / `font-display: optional`.

### 5.1 Rendering & code-splitting

- **Server Components by default;** keep only `test-runner.tsx` and the few interactive widgets as client
  components, and slim them. Stream the dashboard with **Suspense** (`loading.tsx`) so the shell paints
  before the readiness dial / weak-topic list resolve; PPR is optional and additive.
- **Dynamically import heavy widgets** (`next/dynamic`, `ssr: false` where they're canvas/SVG-animation
  heavy): the readiness **dial animation**, any map background, and the real-refraction glass path. Defer
  each to **first interaction / on-reveal** (IntersectionObserver), so they never sit in the critical
  first-load JS.

### 5.2 Serving the 734 photos (the current villain)

Restyled PNGs average 342 KB (~250 MB corpus) — fatal on Slow-4G. Fix **without breaking the key**: the
resolver (§4.5) pre-transcodes with **`sharp`** to **AVIF-first (~40–70 KB) → WebP (≤ 90 KB) → JPEG safety
net**, hard-capped **120 KB/image**, cached by `imageKey + w + f`. The client uses `srcset` 360/540/720 with
`sizes`, `loading="lazy"`, and explicit width/height (protects CLS); never ship a photo wider than its
≤ 720 CSS-px box. Meaningful Ukrainian `alt` (sign name / scene), decorative gloss `aria-hidden`. **Where the
transcode cache lives depends on the deploy target** (writable dir on the self-hosted Node box vs a CDN) —
open Q6.

### 5.3 Fonts & tokens

Port the landing's tokens into **Tailwind v4 `@theme`** in `app/globals.css` (the app has no config file):
the pastel palette, one green accent (`--green-soft` fill + `--green-ink` text — never white on soft green,
never harden the green), radii, `--calm-ease`, and the glass elevation vars. Subset Nunito + Manrope to
Cyrillic+Latin, ≤ 2 weights.

### 5.4 The emulated-glass tier (the #1 GPU/heat cost)

`backdrop-filter: blur()` re-blurs every frame (worst over a moving backdrop). A device-tier detector
(client, at boot) sets `body.glass-emu` when `deviceMemory ≤ 4 || hardwareConcurrency ≤ 4 || Save-Data ||
coarse pointer || prefers-reduced-transparency`, or when `UserSettings.glassTier` forces it. Emulated tier
**drops `backdrop-filter` entirely** and keeps painted translucent fill + gloss + rim + colored shadow
(visually indistinguishable at reading distance, ~zero GPU). **Real refraction only on ≤ 2 co-visible
signature lenses** (hero sample + readiness dial), never over an animated background, never glass-on-glass;
reading content stays opaque at every tier. `prefers-reduced-transparency` → the opaque tier;
`prefers-reduced-motion` → kill Світлик flight/sweeps and jump the count-up to final. Keep an
`?heat=`/`?glass=` A/B toggle to isolate GPU cost cheaply before building any fix.

### 5.5 Measurement (verification, not vibes)

Judge on **hosted PSI (mobile) + Lighthouse mobile 4× CPU throttle**, and confirm behavior by **driving a
real browser over the real http origin** (the existing `npm run audit:browser` against the non-localhost
Tailscale IP, extended with offline/glass/dial assertions). Local M2 numbers are not evidence.

---

## 6. Learning telemetry

Two **separate lanes**, kept distinct on purpose:

1. **Product analytics (existing `AnalyticsEvent`, PII-stripped, opt-out/DNT/GPC, hashed IP).** Add typed
   `ANALYTICS_EVENTS`: `adaptive_review_started`, `review_graded`, `readiness_computed`,
   `offline_pack_downloaded`, `exam_date_set`, `daily_goal_set`, `notification_sent`, `push_subscribed`,
   `calm_ritual_started`. These are for funnel/UX health and carry **no answer content**.
2. **Learning telemetry (`ReviewLog`, first-party, user-owned).** This is *not* anonymized — it is the
   user's own study history under their account, and it's the substrate for FSRS scheduling, the FSRS
   optimizer (≥ 1,000 reviews to fine-tune weights), confidence calibration (`calibrationSlope` learned from
   confidence-vs-correctness bins, surfaced as "коли ви впевнені, ви праві у 72%"), the readiness inputs, and
   the mistake feed. It is **excluded from any anonymized analytics export** and is **user-exportable /
   cascade-deleted on account deletion** (GDPR-clean). Retention: `ReviewLog` is kept (optimizer corpus);
   add the still-missing **analytics pruning job** for `AnalyticsEvent`.

**Admin surfacing:** aggregate item difficulty derived from real `ReviewLog` grades feeds the existing
`lib/content-flags.ts` — real observed difficulty vs authored `Question.difficulty`, and corroboration for
`WRONG_KEY_SUSPECTED` (a distractor out-drawing the keyed answer *and* low observed R is a strong signal).
This closes the "generation = free data audit" loop with live behavioral data.

---

## 7. Delivery via the Mesa harness

Route this build through the harness exactly as Waves 1–9: for each wave author a spec →
`mesa plan <spec> <prefix>` (atomic, boolean-criteria task journals, ≤ 7 criteria each) →
`DRIVER_EVALUATE=1 mesa run-all` (increment → verify gate `npm run -s typecheck && npm run -s test` →
independent evaluator → learnings → done) → **independent re-verify** (typecheck + unit + integration +
build + **real-browser audit over the http origin** + hosted PSI) before closing the wave in `PLAN.md`.
Set `mesa.config.json` `evaluate: true` for these waves (the evaluator earned its keep in Waves 7/9).

**Migration discipline in-harness:** any schema task hand-authors `migration.sql` + `prisma migrate deploy`
+ `prisma generate` (never migrate-dev), one `ADD COLUMN` per `ALTER`. **Purity discipline:** ship
`lib/fsrs/*`, `lib/test-engine/queue.ts`, `lib/readiness-model.ts` as pure + unit-tested first so the verify
gate is real; DB wiring follows in `lib/server/*`.

Proposed wave decomposition (each green + independently verified before the next):

- **Wave 10 — SRS foundation (no UI):** the migration (§1.10), pure `lib/fsrs/*` + `queue.ts` +
  `readiness-model.ts` with unit tests, `ReviewState`/`ReviewLog`/`TopicMastery` wiring inside the
  `submitAnswer` transaction (lazy state creation), `ADAPTIVE_REVIEW` mode. Verify: schema live, ids/progress
  preserved (re-run loader → 0 id changes), FSRS reschedules deterministically.
- **Wave 11 — Adaptive loop + honest readiness:** `startAdaptiveReview`, queue-driven session, exam-date
  `getStudyPlan`, `ReadinessSnapshot` compute on finish + nightly job, `UserStudyProfile`/`StudyDay` +
  detoxified streak/goal + freeze. Verify: dial number matches the model; mistake pool reconciles.
- **Wave 12 — Design-system port:** landing tokens → Tailwind `@theme`, glass tiers + device detection +
  `UserSettings` overrides, Світлик, the count-up dial component, opaque reading content. Verify: real-browser
  glass render (e2b Chromium) + PSI budget + a11y (axe) + reduced-motion/transparency fallbacks.
- **Wave 13 — PWA / offline / images:** Serwist SW (webpack-build caveat), manifest + iOS meta, image
  content-negotiation + `sharp` transcode cache, opt-in offline packs, `/api/review-sync` + Background Sync.
  Verify: offline reload of dashboard/mistakes, offline review → reconnect → synced (real browser), image
  ≤ 120 KB.
- **Wave 14 — Engagement + telemetry + calm-nerves:** notifications (`PushSubscription`/`NotificationLog` +
  the ≤3–4/week guard + off-box scheduler), calibration panel, the optional 60-second breathing/reframing
  ritual before a mock, admin difficulty/calibration surfacing, analytics pruning job.

Every wave preserves the legal/demo positioning and the stable-key architecture; the harness's verify gate +
independent audit is the acceptance test.

---

## 8. Open questions

1. **FSRS optimizer scope for v1** — ship fixed default weights only, or implement per-user weight
   optimization (needs ≥ 1,000 reviews; client-side WASM vs a server/off-box job)? Recommendation: defaults
   now, optimizer deferred to a later wave.
2. **MCQ → FSRS grade mapping** — confirm the `deriveGrade` heuristic (wrong=Again, correct=Good,
   fast+confident=Easy, slow/low-confidence=Hard) and **how often to ask explicit confidence** (every item
   raises anxiety; propose sampling, default off, opt-in). ПДР is single-correct MCQ, not free-recall — the
   grade is inferred, not self-reported.
3. **Readiness recompute cadence & method** — exact Poisson-binomial (chosen) vs Monte-Carlo; recompute on
   `finishSession` + nightly (chosen) vs on-demand-with-TTL. Confirm the nightly job's host.
4. **Notification delivery & scheduler host** — is Web Push in scope for v1, or in-app nudges only? Web Push
   needs VAPID keys + a recurring scheduler; iOS web push requires an **installed** PWA (iOS 16.4+). The
   local Mac is proc-constrained (memory: ~40 free procs) → the scheduler should run **off-box** (droplet/cron),
   matching prior guidance. Decide.
5. **Offline review ordering** — accept the "rebuild `ReviewState` from `ReviewLog` on out-of-order arrival"
   strategy (§3.4), or a simpler last-write-wins? Rebuild is correct-by-construction but costs a per-question
   log replay; confirm the trade.
6. **Deploy target (biggest unknown)** — SQLite `dev.db` implies a self-hosted Node box, but the plan
   mentions Vercel tooling. This decides the **image transcode cache** (writable dir vs CDN), the **push
   scheduler** host, and **Postgres timing**. Please confirm prod topology.
7. **Postgres cutover timing** — `ReviewLog` is high-volume; SQLite is fine for single-box dev, but readiness
   aggregates at real volume may want Postgres. The schema is portable (adapter swap) — when do we cut over?
8. **Readiness dial ownership** — the honest `ReadinessSnapshot.dialPercent` becomes the single dial source;
   keep the legacy 3-band `examReadiness` + internal 5-level only for admin/back-compat? Recommendation: yes,
   replace as the learner-facing source, retain legacy internally.
