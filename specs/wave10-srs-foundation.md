# Wave 10 — SRS foundation (FSRS engine + learning-state schema, no UI)

First build wave of the app master plan (`docs/app-plan/`, esp. `05-tech-architecture.md` §1–§3, §7). Lay the
**invisible learning engine**: the FSRS learning-state schema, the pure scheduling / queue / readiness logic
(unit-tested against reference behaviour so the verify gate is real), and the minimal DB wiring that records
per-item memory state on every answer. **No user-facing UI** — that is Waves 11–12. Purely additive over the
mature Waves 1–9 app; must NOT break the stable-key content architecture, existing pools, or existing tests.

RULES (from CLAUDE.md / docs/app-plan — non-negotiable):
- New core logic PURE + UNIT-TESTED — no `server-only` / `@/lib/db` / `@prisma/client` / `lib/generated`
  imports, and no `Math.random` / `Date.now` / `new Date()` inside pure fns (INJECT `now: Date` and
  `rng: () => number`, exactly like `lib/test-engine/selection.ts`). Purity greps match COMMENTS too — never
  write those tokens (or JSX-like `<…/>`) even in a pure module's doc comments.
- SCHEMA CHANGE → hand-author `prisma/migrations/<14-digit ts>_srs_learning_state/migration.sql`: one
  `CREATE TABLE` per model + `CREATE INDEX` per index; exactly ONE `ADD COLUMN` per `ALTER TABLE` (SQLite);
  additive / nullable / defaulted only (data-preserving, no reseed). Apply with `prisma migrate deploy`, then
  `prisma generate`. NEVER `migrate dev` (interactive-broken here). String unions live in `lib/constants.ts`
  (no SQLite enums); `*Json` fields are `String`. Keep everything Postgres-portable.
- Never pass a full id list to a Prisma `{ in: [...] }` filter (P2029 at ~1k+ params) — chunk ≤200 or use a
  relation filter.
- DB orchestration in `lib/server/*`; the pure engine stays DB-free. Preserve Ukrainian copy, the demo /
  no-official-claims legal positioning, and the idempotent `importOfficial` loader (user progress preserved).
  Tests on every change; the final task runs `npm run build`. Prove test-file inclusion with `npx vitest list`
  (capture to a var BEFORE `grep -q`). Integration tests self-provision via
  `lib/server/__testutils__/official-question.ts` (FK-safe cleanup: user→reviewLogs/reviewStates/answers→
  session→question→topic→category); a LIVE pool needs `isPublished:true isDemo:false` + category connect
  (`SERVE_DEMO_QUESTIONS` is false).

## A. Schema — 9 learning-state models + confidence column (one migration)
- Add to `prisma/schema.prisma` the NINE models EXACTLY as in `05-tech-architecture.md` §1.1–§1.8:
  `ReviewState`, `ReviewLog`, `TopicMastery`, `UserStudyProfile`, `StudyDay`, `ReadinessSnapshot`,
  `UserSettings`, `PushSubscription`, `NotificationLog` (fields, `@default`s, `@@unique`, `@@index` as
  specified). Add the back-relation fields on `User` and `Question` (schema-only). Add `TestAnswer.confidence Int?`.
- Hand-author `prisma/migrations/<ts>_srs_learning_state/migration.sql`: `CREATE TABLE` ×9 + their indexes +
  a single `ALTER TABLE "TestAnswer" ADD COLUMN "confidence" INTEGER;`.
- Apply via `prisma migrate deploy`; `prisma generate` regenerates the client (`lib/generated/prisma`).
- `npm run typecheck` exits 0; the generated client exposes all 9 new models.
- Additive-only: `schema.prisma` diff is ONLY the new models + back-relations + the one nullable column; no
  existing column changed.
- Data-preserving: `npm run db:seed` then `npm run test:integration` still pass with ZERO failures (no reseed).

## B. Pure FSRS engine — `lib/fsrs/`
- PURE, clock-injected, deterministic:
  - `schedule(state, grade, now) → nextState` — the FSRS DSR update: `stability`, `difficulty` (1..10), the
    `new → learning → review ⇄ relearning` state machine, `reps` / `lapses`, and
    `dueAt = now + intervalDays(stability, FSRS_TARGET_RETENTION)`.
  - `retrievability(state, now) → number` (0..1) from elapsed days + stability — NEVER stored.
  - `deriveGrade({ correct, latencyMs?, confidence? }) → 1|2|3|4` per §2 (`wrong → Again(1)`;
    `correct → Good(3)`; `correct & fast & confident → Easy(4)`; `correct & (slow | low-confidence) → Hard(2)`).
  - `FSRS_DEFAULT_WEIGHTS` (documented ~19-param constant) + `FSRS_TARGET_RETENTION` (default `0.90`).
- UNIT-TESTED (`lib/fsrs/*.test.ts`): a first `Good` moves `new → learning` with `stability > 0` and
  `dueAt > now`; an `Again` on a `review` item increments `lapses` and drops to `relearning`; `retrievability`
  = 1 at elapsed 0 and decreases monotonically with elapsed time; `schedule` is deterministic for a fixed `now`;
  `deriveGrade` maps all four cases.
- Deterministic (no `Math.random`/`Date.now`); typecheck + `npm test` pass.

## C. Pure queue picker — `lib/test-engine/queue.ts`
- PURE, `now` + `rng` injected (default `rng = Math.random`, scoped exactly like `selection.ts`):
  `scoreCandidate(state, now, topicWeakness) = overdueness × (1 − R) × topicWeakness`, and
  `selectReviewQueue(candidates, { now, rng, size, newItemShare }) → ordered questionIds` that targets the
  desirable-difficulty band (prefer items whose R ≈ 0.70–0.85), INTERLEAVES adjacent items across different
  topics, and mixes in a bounded share of new (unseen) items so coverage grows.
- UNIT-TESTED: an overdue low-R weak-topic item outscores a fresh high-R strong-topic item; the output
  interleaves topics (no 3 same-topic in a row when alternatives exist); the new-item share is respected;
  deterministic given a fixed `rng`.
- typecheck + `npm test` pass.

## D. Pure readiness model — `lib/readiness-model.ts`
- PURE: `perItemPassProb(R, calibrationSlope?) → p`; `poissonBinomialAtLeast(k, ps[]) → P(≥k successes)` via
  the exact DP; `computeReadiness({ seen, unseenCount, unseenPrior, blueprint, mockPassRate?, calibrationSlope? })
  → { passProbability, dialPercent, ... }` = Poisson-binomial `P(≥18/20)` over a blueprint-weighted draw, with
  UNSEEN items using a conservative prior (~0.5–0.6) so thin coverage drags the number down, then shrunk toward
  `mockPassRate` when present.
- UNIT-TESTED: `poissonBinomialAtLeast` matches hand-computed values on a tiny 3-item case AND the all-equal-p
  case (equals the binomial); readiness rises as seen-R rises; more unseen items lower it (honest-by-construction);
  `dialPercent ∈ 0..100`.
- typecheck + `npm test` pass.

## E. `ADAPTIVE_REVIEW` mode constant
- Add `ADAPTIVE_REVIEW` to `TEST_MODES` in `lib/constants.ts` with a `MODE_LABEL` ("Розумне повторення") and
  `showsImmediateFeedback: true` (mirror an existing practice mode's config shape). Keep `MIXED_PRACTICE` as a
  working back-compat alias — do NOT delete it. Handle the new member in every exhaustive `switch` /
  `Record<Mode, …>` over `TEST_MODES` so typecheck stays 0.
- `npm run typecheck` 0; `npm test` 0 (no behavioural regression).

## F. Wire the SRS dual-write into `submitAnswer` (lazy, additive)
- New `lib/server/study.ts`: `recordReview(tx, { userId, questionId, topicId, correct, latencyMs?, confidence?,
  mode, testSessionId?, clientEventId? }, now)` — LAZILY reads (or defaults-new) the `ReviewState` for
  `userId × questionId`, calls the pure `deriveGrade` + `schedule`, UPSERTS `ReviewState`
  (`@@unique([userId, questionId])`), and appends a `ReviewLog` row (skip when `clientEventId` already exists →
  idempotent). No bulk backfill.
- Extend `submitAnswer` in `lib/server/test-engine.ts` to accept optional `{ latencyMs?, confidence?,
  clientEventId? }` and, inside a `prisma.$transaction` together with the existing `TestAnswer` / mistake writes,
  call `recordReview`. The returned feedback shape stays UNCHANGED (correctness + `correctOptionId` +
  explanation) so `test-runner.tsx` needs no change. Existing mistake reconcile + analytics stay as-is.
- `npm run typecheck` + `npm run build` pass; existing `engine` / `finish-idempotency` / `access-control`
  integration suites still pass.

## G. Integration test — SRS writes + progress preserved
- `lib/server/srs-review.integration.test.ts` (self-provision via `createOfficialQuestion`): drive a session and
  `submitAnswer` a CORRECT answer → assert a `ReviewState` exists for `userId × questionId` with `state != "new"`,
  `stability > 0`, `dueAt > now`, `reps = 1`, and one `ReviewLog` appended. Re-submit with the SAME
  `clientEventId` → still exactly one `ReviewLog` (idempotent). A WRONG answer on a second question →
  `ReviewLog.grade = 1` and `ReviewState.lapses`/`relearning` reflect the lapse. Then re-run
  `importOfficial(prisma)` and assert the question/option ids are UNCHANGED and the `ReviewState`/`ReviewLog` rows
  still reference valid ids (stable-key preserved). FK-safe `afterAll`.
- `npm run test:integration` includes + passes this file (prove with `npx vitest list`).

## H. Wave-10 acceptance gate (verify-only, final)
- No new feature code. PASS only if all hold; on failure record + reopen the failing upstream task:
  1. `npm run typecheck` 0.
  2. `npm test` 0, ZERO failures, includes the `lib/fsrs/*`, `queue`, and `readiness-model` unit tests.
  3. `npm run db:seed` 0, then `npm run test:integration` 0, ZERO failures, includes
     `srs-review.integration.test.ts`.
  4. `npm run build` 0.
  5. Migration applied: the 9 learning-state tables + `TestAnswer.confidence` exist in the DB; `schema.prisma`
     diff is additive-only.
  6. Static: `lib/fsrs/*`, `lib/test-engine/queue.ts`, `lib/readiness-model.ts` exported + PURE (no
     `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`; no `Math.random`/`Date.now`/`new Date()` except a
     scoped injectable `rng` default); `submitAnswer` returns the same feedback shape; re-running `importOfficial`
     changes 0 question/option ids.

## Out of scope (later waves)
- Any UI: `startAdaptiveReview` action, the `/practice` mode entry, the readiness dial component, confidence
  capture in `test-runner.tsx` (Waves 11–12).
- `TopicMastery` / `ReadinessSnapshot` / `StudyDay` / streak RECOMPUTE on `finishSession` + the nightly job
  (Wave 11) — Wave 10 only creates the tables and records `ReviewState`/`ReviewLog` per answer.
- `getStudyPlan`, exam-date profile, notifications / Web Push, offline / PWA, image negotiation, the FSRS
  per-user optimizer (Waves 11–14).
- Postgres cutover; deploy-topology wiring.
