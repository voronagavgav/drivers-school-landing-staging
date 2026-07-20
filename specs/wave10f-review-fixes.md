# Wave 10f — Fix the 18 confirmed findings from the adversarial Wave-10 review (+2 spikes)

An independent adversarial review (5 hostile reviewers + per-finding skeptic verification, vs published FSRS-5
sources) confirmed 18 real defects in Wave 10 (7 major). Root pattern: **self-referential tests** — the suite
asserts the code against itself, so formula deviations stay green. This wave fixes ALL confirmed code findings
and adds the missing EXTERNAL reference gate. No new features, no UI. Everything from Wave 10's RULES block
(`specs/wave10-srs-foundation.md`) still applies verbatim: purity, injected clock/rng, hand-authored
migrations via `migrate diff`/`migrate deploy` (never migrate-dev), one ADD COLUMN per ALTER, ≤200-id chunks,
Ukrainian copy, stable-key architecture untouched, `npx vitest list` capture-to-var proof.

## A. FSRS golden-vector gate (THE keystone task — do first)
- Generate authoritative FSRS-5 reference vectors: in a THROWAWAY scratch dir (NOT the repo),
  `npm i ts-fsrs@5.4.1` (the last FSRS-5/19-weight release; current ts-fsrs is FSRS-6 — wrong reference),
  configure it with OUR exact defaults (`FSRS_DEFAULT_WEIGHTS`, request_retention 0.90,
  `enable_short_term=false` — we ship the long-term variant) and script it to emit, for ≥4 grade sequences
  (e.g. G,G,G,G · G,A,G,G · E,E,E · H,G,A,H,G) at fixed inter-review gaps (0d same-new, 1d, 3d, 7d, 21d),
  the per-step `stability`, `difficulty`, and interval. VENDOR the emitted numbers as literals into
  `lib/fsrs/reference-vectors.test.ts` (with a header comment naming source pkg+version+config; no runtime
  dep on ts-fsrs; scratch dir deleted).
- The new test drives OUR `schedule()` through the same sequences and asserts S/D/interval `toBeCloseTo`
  the vendored numbers (tolerance ≤1e-4 for S/D; intervals exact integer match).
- EXPECTED: this test FAILS against current code (the B1 prior-difficulty bug) — commit it failing-guarded?
  NO: order the fix task B1 immediately after and let this task's verify run the vectors test EXCLUDING it
  from the green gate (`it.todo` is forbidden — instead the task's verify.sh asserts the test FILE exists +
  is listed by `npx vitest list`, and B1's verify flips it to must-pass). Document this two-step in both journals.
- `npm run typecheck` 0.

## B. FSRS engine corrections (`lib/fsrs/`)
1. **Prior-difficulty bug (MAJOR):** `schedule()` currently feeds the ALREADY-UPDATED difficulty into the
   stability update. Reference FSRS-5 computes next stability from the PRE-review difficulty. Fix: compute
   `stability` from `state.difficulty` (prior), THEN `difficulty = nextDifficulty(...)`. After this fix the
   §A reference-vectors test MUST pass and become part of `npm test`'s green gate.
2. **Hardcode the curve constants (minor):** `FSRS_FACTOR = 19/81` and `FSRS_DECAY = -0.5` are FIXED model
   constants the weights were fitted against — decouple from `FSRS_TARGET_RETENTION` (which stays a free
   parameter of `intervalDays` only). Add a test: R(S,S) ≈ 0.9 holds even when `FSRS_TARGET_RETENTION` ≠ 0.9.
3. **Easy reachable without a confidence sample (minor):** in `deriveGrade`, missing confidence must NOT
   block Easy: `fast && (confidence == null || confidence >= 3) → 4`; an explicit LOW confidence stays an
   active veto (Hard). Update its unit tests (fast+no-confidence → Easy; fast+low-confidence → Hard).
4. **Docs honesty (nit, fold into 1–3):** correct the `constants.ts` / `lib/fsrs/CLAUDE.md` comments that
   imply w17/w18 fire — we ship the published `enable_short_term=false` long-term variant; w17/w18 are
   deliberately unused.

## C. Readiness model corrections (`lib/readiness-model.ts`)
1. **Beta mock anchor (MAJOR):** replace the fixed `0.65·model + 0.35·rate` blend. Accept mock evidence as
   COUNTS `{ mockAttempts m, mockPasses k }` (not a rate) and implement the specced Beta shrinkage:
   `readiness = (k + ANCHOR_STRENGTH·P_model) / (m + ANCHOR_STRENGTH)` with
   `READINESS_ANCHOR_STRENGTH = 4`. m=0 → pure model; mock evidence dominates as m grows. Unit tests:
   model R high + 0/10 mocks → readiness < 0.35; 10/10 mocks + weak model → rises accordingly; m=0 → model.
2. **Blueprint heterogeneity (MAJOR):** stop feeding the DP a constant vector (that degenerates it to a
   plain binomial and over-reports when weakness sits in a small fixed-quota block). Exact fix, no MC:
   accept per-block inputs `{ quota_b, meanProb_b }[]` (cat-B blueprint blocks), build the p-vector as
   quota_b entries of meanProb_b per block, run the SAME exact Poisson-binomial DP. Unit test: two-block
   case (18 strong ×0.95, 2-slot block ×0.10) must report ≈ the true heterogeneous tail, NOT the pool-mean
   binomial (assert both: correct value, and ≠ the degenerate constant-vector result).
3. **Unseen-prior honesty (MAJOR):** the flat scalar prior RAISES readiness for weak learners (seen-mean <
   prior). Interim honest rule (per-topic empirical-Bayes lands in Wave 11): when seen data exists,
   `effectiveUnseenPrior = min(unseenPrior, seenMeanProb)` — adding unseen items can NEVER raise readiness.
   Unit test asserts the monotone-honesty property both sides of the prior.
4. Keep `poissonBinomialAtLeast` itself UNCHANGED (verified correct by hand-computation in review).

## D. Queue picker corrections (`lib/test-engine/queue.ts`)
1. **Additive scoring per spec §4.1 (MAJOR):** replace the multiplicative
   `overdueness × (1−R) × topicWeakness` (any zero factor annihilates: a year-overdue R≈0 card ranks below
   a fresh one when topicWeakness=0). Use the spec's additive weighted sum (documented weights; overdueness
   and (1−R) dominant, topicWeakness a boost, small deterministic tiebreak). Unit tests: topicWeakness=0
   does NOT zero an overdue card's score; all-mastered user still gets a sensible due-order queue.
2. **newItemShare is a CAP, not a target (MAJOR):** `newCount = min(newTarget, unseen.length)`; the queue
   returns FEWER than `size` when seen cards run short (short queues are by-design). Add explicit opt-in
   `backfillWithNew: boolean` (default false) for modes that want fill. Unit tests: share=0 + 2 seen + 10
   unseen + size=10 → EXACTLY the 2 seen; share=0.2/size=10 → ≤2 new; backfillWithNew:true restores old fill.

## E. Server wiring (`lib/validation.ts`, `app/actions/test.ts`, `components/test-runner.tsx`, `lib/server/*`)
1. **Unstrip the SRS fields (MAJOR — the plumbing is dead code today):** extend `submitAnswerSchema` with
   optional `latencyMs` (int ≥0, ≤600000), `confidence` (int 1..4), `clientEventId` (string 1..64); widen
   `submitAnswerAction`'s input type. zod v4 `{ error: }` message form. This also supplies the missing 1..4
   range validation (DB has no CHECK).
2. **Client sends them:** `test-runner.tsx` mints ONE `clientEventId` per (sessionId, questionId, attempt)
   — `crypto.randomUUID()` — and sends `latencyMs` derived from its existing per-question timer (the same
   value already sent as `timeSpentSeconds`, in ms). NO confidence UI yet (Wave 12b) — field stays absent.
3. **Whole-transaction idempotency (minor):** hoist the dedupe: when `clientEventId` is present, check
   `reviewLog.findUnique({ where: { clientEventId } })` FIRST inside the tx; on a hit the ENTIRE transaction
   is a no-op (no TestAnswer rewrite, no `recordMistakeOutcome` re-run, no double FSRS advance). Keep
   recordReview's inner guard as belt-and-suspenders.
4. **Gate ADAPTIVE_REVIEW (minor):** it's client-startable today but unwired (serves unshuffled first-20
   labelled «Розумне повторення»). Add a `STARTABLE_MODES` subset in `lib/constants.ts` (= TEST_MODES minus
   ADAPTIVE_REVIEW for now) and validate `startTestSchema` against IT; ADAPTIVE_REVIEW stays in TEST_MODES
   for labels/config. Wave 11 flips it into STARTABLE_MODES when the queue is wired.
5. **Integration test extensions** (`srs-review.integration.test.ts` or sibling): (a) drive
   `submitAnswerAction`-level validation — a parsed payload WITH clientEventId/latencyMs reaches submitAnswer
   (proves the unstrip; direct-call bypass was how this went unseen); (b) replay a full duplicate answer with
   the same clientEventId → TestAnswer NOT rewritten, mistake `correctRepeatCount` NOT advanced, exactly one
   ReviewLog; (c) POST mode=ADAPTIVE_REVIEW to the start action → rejected.

## F. Schema hygiene (one migration + schema cleanup)
1. **ReviewLog FK (minor, do NOW while the table is ~empty):** `ReviewLog.question` `onDelete: Cascade` →
   `Restrict` (matches `TestAnswer`'s protection of historical corpus; a Question hard-delete must not
   silently destroy the FSRS optimizer corpus). SQLite can't ALTER a FK → table-rebuild migration
   (create-new/copy/drop/rename, preserving indexes + the clientEventId unique), via
   `prisma migrate diff` then hand-scope. Same treatment for `ReviewState.question` → `Restrict` (its rows
   are cheap to lose but consistency beats surprise; document the choice in the migration header).
2. **Duplicate index (minor):** drop `StudyDay @@index([userId, day])` (identical to its `@@unique`) —
   schema edit + `DROP INDEX "StudyDay_userId_day_idx";` in the same migration.
3. **Kill the pre-existing drift (minor):** delete `@@index([questionKey])` / `@@index([optionKey])` from
   `schema.prisma` (redundant with their `@unique`; they exist in NO migration). Gate:
   `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`
   emits EMPTY (drift zero) after this wave.
4. `prisma migrate deploy` + `generate`; `db:seed` + full integration suite still green (data preserved).

## G. Spike 1 — Serwist × Next 16 webpack build (investigation, half-day cap)
- In a THROWAWAY branch (`spike/serwist`): minimal `@serwist/next` wiring per current Serwist docs
  (context7/web — verify current API), `app/sw.ts` trivial precache, `next build` on the WEBPACK path.
  Record verdict in `docs/app-plan/SPIKES.md`: does `public/sw.js` emit? build green? dev (Turbopack) noop OK?
  exact config that worked (or the failure + the no-SW fallback recommendation for Wave 13). Branch deleted
  after; verdict file committed on main. NO production wiring in this wave.

## H. Spike 2 — sharp AVIF on Node 25 (investigation)
- `npm i sharp` in a scratch (or devDependency trial — record which), transcode ONE representative restyled
  PNG (`public/restyled/…`) to AVIF ≤120 KB + WebP fallback at w=540; record in `docs/app-plan/SPIKES.md`:
  Node-25 prebuild works? output sizes? encode time on this box? Recommendation for the Wave-13 resolver
  (build-time prebake per plan). Scratch cleaned; no repo dependency added unless the trial says devDep is fine.

## I. Wave-10f acceptance gate (verify-only, final)
1. `npm run typecheck` 0; `npm test` 0 failures INCLUDING `reference-vectors.test.ts` now green.
2. `npm run db:seed` 0 → `npm run test:integration` 0 failures, incl. the E5 extensions.
3. `npm run build` 0.
4. Drift zero: the F3 migrate-diff command emits an empty script.
5. Static: `schedule()` computes stability from prior difficulty (the golden vectors prove it);
   `FSRS_FACTOR` is the literal `19/81`; `submitAnswerSchema` contains latencyMs+confidence+clientEventId;
   `STARTABLE_MODES` excludes ADAPTIVE_REVIEW; ReviewLog/ReviewState FKs are Restrict in schema+DB;
   `docs/app-plan/SPIKES.md` records BOTH spike verdicts.

## Out of scope
- Per-topic empirical-Bayes unseen prior, per-user event-id namespacing, client-supplied `reviewedAt`
  (offline replay ordering) — Wave 11/13 per plan; the interim rules above are documented stopgaps.
- Any UI, any new feature, monetization, PWA production wiring.
