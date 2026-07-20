# Wave 11 — Adaptive loop + honest readiness: SERVER CORE + ADMIN SHADOW (no learner UI)

Per the re-scoped master plan (`docs/app-plan/00-MASTER-PLAN.md` Addendum §2): Wave 11 wires the Wave-10/10f
engine into the live loop — queue-driven sessions, the study plan, mastery/readiness recompute, the nightly
job, detoxified streaks — and surfaces the FSRS dial ONLY in an admin shadow view (vs the legacy readiness)
so calibration is observable before any learner sees it. **ALL learner-facing UI is Wave 12a/b** — this wave
must not add/restyle any learner screen. Deploy target: self-hosted Node box (nightly job = on-box).

RULES (unchanged from Waves 10/10f — CLAUDE.md is law): pure logic in `lib/` (injected clock/rng, no DB
imports, purity greps hit comments), DB orchestration in `lib/server/*`; additive-only hand-generated
migrations via `migrate diff` + `migrate deploy`; ≤200-id chunks (P2029); Ukrainian copy; legal positioning;
`npx vitest list` capture-to-var proof; integration tests drive PRODUCTION entry paths (actions), self-
provision via `__testutils__/official-question.ts`, and must be NOISE-PROOF (unique fixture keys/windows —
the analytics suite's top-N fragility under real traffic is the counterexample, see UX-FINDINGS).
Read `docs/app-plan/UX-FINDINGS-2026-07-02.md` — its Wave-11 items are folded in below.

## A. Schema — per-topic latency median cache (one additive column)
- `TopicMastery.medianLatencyMs Int?` (nullable, additive). Migration via `migrate diff`, scoped. `generate`.
- `npm run typecheck` 0; `db:seed` + full integration still green (data preserved).

## B. ADAPTIVE_REVIEW goes live (queue-driven session)
- `lib/server/study.ts`: `startAdaptiveReview(userId, categoryId)` — load the user's `ReviewState` rows +
  `TopicMastery` weakness for the category (chunked), score with the PURE `selectReviewQueue`
  (`lib/test-engine/queue.ts`, spec §4 weights; `now` injected; size = user's dailyGoal or
  `ADAPTIVE_REVIEW_SIZE` default 15; `backfillWithNew: true` with the spec's new-item budget), create a
  `TestSession(mode="ADAPTIVE_REVIEW")` + ordered `TestSessionQuestion`s, return the id. Empty queue (new
  user, nothing due, no new) → fall back to unseen-first selection; NEVER an empty session error for a
  category with published questions.
- Flip `ADAPTIVE_REVIEW` INTO `STARTABLE_MODES`; `startTestAction` accepts it (existing generic path).
- `SPACED_REVIEW` mode: same machinery, `newItemShare: 0`, `backfillWithNew: false`, due-only; empty due
  queue → the action returns a typed "nothing due" signal (redirect target is a W12 concern — for now the
  existing empty-mode redirect pattern).
- Integration (`adaptive-session.integration.test.ts`): seed ReviewStates with known due/overdue/new mix →
  `startAdaptiveReview` session contains the expected composition (due-first, interleaved, size respected);
  SPACED_REVIEW with nothing due → typed empty signal; ADAPTIVE_REVIEW now startable through the ACTION.

## C. Per-topic latency bands feed deriveGrade
- In `submitAnswer`'s tx: read the user's `TopicMastery.medianLatencyMs` for the question's topic (one
  indexed read) and derive per-topic bands: Easy ≤ `max(2500, 0.5×median)`, Hard ≥ `max(20000, 2.5×median)`;
  ABSENT median → the existing global constants (unchanged behavior). Extend PURE `deriveGrade` to accept
  optional `{ easyMs, hardMs }` overrides (defaults = constants; unit-tested: overrides honored, absent →
  globals, Good stays the mid-band bulk).
- The nightly job (E) recomputes `medianLatencyMs` per (user, topic) from `ReviewLog.latencyMs` (chunked).

## D. finishSession recompute: TopicMastery + ReadinessSnapshot (server-authoritative)
- `lib/server/mastery-readiness.ts`: `recomputeTopicMastery(userId, topicIds, tx?)` — per touched topic:
  meanR (pure `retrievability` over that topic's ReviewStates at `now`), coverage, band (reuse
  `lib/mastery.ts` thresholds), itemsSeen/Total, medianLatencyMs (from ReviewLog). `recomputeReadiness(
  userId, categoryId)` — pure `computeReadiness` fed: per-block `{quota_b, meanProb_b}` from the cat-B
  exam blueprint (`lib/exam-blueprint.ts`) × the user's per-block mean pass-prob (R × calibration, unseen →
  honesty-floored prior), mock counts `{m, k}` from COMPLETED `EXAM_SIMULATION` sessions (last
  `READINESS_MOCK_WINDOW` = 10), → persist a `ReadinessSnapshot` row (inputsJson = the audit trail).
  **Insufficient data is FIRST-CLASS:** `seenCount < READINESS_MIN_SEEN (20)` → snapshot carries
  `dialPercent = null` semantics (UX-FINDINGS: never a hard number+verdict below threshold — encode as
  inputsJson flag + 0 dialPercent + a `sufficientData` boolean column? NO new column: put
  `sufficientData` in inputsJson and expose via the reader fn). Reader: `getLatestReadiness(userId,
  categoryId)`.
- Wire into `finishSession` AFTER the existing totals/snapshotProgress (session-scoped topics only; readiness
  only for the session's category). Keep the per-answer tx lean (recompute at finish, per master plan F4).
- Integration (`readiness-snapshot.integration.test.ts`): drive a session with known answers →
  TopicMastery rows appear with sane meanR/coverage; ReadinessSnapshot created; a user with <20 seen gets
  the insufficient-data flag; failing all recent mocks drags the dial DOWN vs the pure model (Beta anchor
  by counts — assert both directions).

## E. Nightly job (on-box) — `scripts/nightly-readiness.mjs`
- Standalone Node script (own PrismaClient + libsql adapter like `prisma/seed.ts` — never `@/lib/db`):
  for each user with ≥1 ReviewState (chunked ≤200): recompute all TopicMastery for their category +
  medianLatencyMs + a fresh ReadinessSnapshot. Idempotent; logs one summary line per run; exits 0 on empty DB.
- `ops/com.drivers.nightly-readiness.plist` (launchd template, 03:30 Europe/Kyiv) + a README line in
  `ops/`. Do NOT `launchctl bootstrap` in this wave (deploy-box step; document the command).
- Verify: run the script twice against the seeded dev DB → second run changes 0 snapshot semantics
  (idempotent-ish: new snapshot rows are fine, values equal), exits 0, ≤200-id chunking proven by a grep.

## F. UserStudyProfile + StudyDay + detoxified streak (server logic only)
- `lib/server/study-profile.ts`: `getOrCreateProfile(userId)`; actions `setExamDateAction`,
  `setDailyGoalAction` (zod-validated, self-only); `bumpStudyDay(userId, tz, tx)` — upsert today's
  `StudyDay` (Europe/Kyiv day key via the profile timezone), reviewCount++, goalMet when ≥ dailyGoal.
- Streak on `finishSession`: consecutive-day walk with AUTO-FREEZE — a single missed day consumes a
  `freezeToken` (if any) instead of resetting; never punitive reset messaging (server returns state only).
  PURE `lib/streak-policy.ts` (`nextStreakState(prev, todayKey, tokens)` — unit-tested: consecutive,
  gap+token, gap+no-token, same-day idempotent, best tracking).
- `getStudyPlan(userId)` in `lib/server/study.ts` + PURE `lib/study-plan.ts`: from examDate + dueCounts +
  coverage → `{ daysLeft, dailyQuota, feasible, message }` — the finite-plan math (unit-tested: no exam
  date → default-goal plan; tight date → higher quota + honest infeasible flag; done-user → maintenance).
- Integration: profile actions through the ACTION path (RBAC self-only), StudyDay bump on answer,
  streak+freeze transitions across synthetic days.

## G. Admin shadow view — `/admin/readiness-shadow`
- `requireContentManager()`. Table per user (chunked query): legacy readiness (existing
  `ProgressSnapshot`/`examReadiness`) vs FSRS `ReadinessSnapshot.dialPercent` (+ sufficientData flag,
  seenCount, mock m/k, bottleneck topic) + the DELTA, plus aggregates (mean |delta|, % users
  insufficient-data). Ukrainian labels; no PII beyond email; nav link «Готовність (тінь)» after «Якість
  контенту». This is THE calibration instrument for the W12b dial-promotion decision.
- Browser-audit extension: admin reaches `/admin/readiness-shadow` (assert title text) — append to
  `bin/browser-audit.sh` (17th assertion) following its `ok`/`bad` helper style (grep -E, capture-to-var).

## H. Wave-11 acceptance gate (verify-only, final)
1. typecheck 0 · `npm test` 0 (incl. new pure suites: queue-overrides, streak-policy, study-plan,
   deriveGrade overrides) · `db:seed` 0 → `test:integration` 0 (incl. the three new suites).
2. `npm run build` 0 · migrate-diff drift EMPTY.
3. `npm run audit:browser` 17/17 over the non-localhost origin (incl. the new shadow-view assertion).
4. Static: ADAPTIVE_REVIEW ∈ STARTABLE_MODES; no learner-facing route/page added or restyled (git diff
   touches no `app/(app)/*/page.tsx` except NONE — admin only); nightly script never imports `@/lib/db`;
   all new Prisma reads with id-lists are chunked ≤200.
5. Stable-key preserved: re-run loader → 0 id changes (`content-upsert` suite green).

## Out of scope (verbatim guard)
- ANY learner-facing UI: dashboard cards, dial component, onboarding funnel, mode entries, runner changes,
  notifications, confidence UI (W12a/b); PWA/offline/images (W13); Web Push + calibration panel +
  breathing ritual (W14); FSRS per-user optimizer; Postgres; monetization.
