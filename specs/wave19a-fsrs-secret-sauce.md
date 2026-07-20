# Wave 19a — FSRS-6 upgrade + readiness calibration ground-truth pipeline

## Context
Deep research (`docs/research/FSRS-READINESS-STRATEGY-2026-07-07.md`, 25 verified findings) defined the
path to make our FSRS + readiness dial a defensible "secret sauce." This wave ships the two
**data-INDEPENDENT** wins that require no user traffic to build (per-user weight-fitting and real-outcome
calibration are deferred until traffic accrues — this wave builds the pipeline that collects that data
from day one). Everything is PURELY ADDITIVE over the mature Waves 1–18 app; the stable-key content
architecture, all existing mode behavior, and the readiness-dial API surface stay intact.

## Goal (what's true when done)
- The pure FSRS engine (`lib/fsrs/*`) runs **FSRS-6** (21 trainable weights incl. a trainable
  forgetting-decay) instead of FSRS-5's 19-weight, fixed `DECAY=-0.5` variant — validated against the
  FSRS-6 reference implementation, with every existing consumer (queue, mastery, readiness) still green.
- The app **records real exam outcomes** (`predicted P(pass)` at report time + actual pass/fail) into a
  durable table, and a pure metrics module can compute **reliability diagram + Brier + LogLoss + ECE** and
  fit a **Platt/logistic calibrator** over that table — so the moment real outcomes exist, the dial can be
  calibrated. (Auto-promotion to isotonic at ~1000 outcomes is a LATER wave; not built here.)

## Non-goals (explicit — do NOT build)
- Per-user or per-population **weight OPTIMIZATION** on ReviewLogs (needs ≥~1000 real reviews — deferred;
  `dev.db` currently has 0). Do not build the optimizer training loop this wave.
- **Isotonic** calibration (deferred to the ≥1000-outcome threshold). Platt/logistic only.
- Grade-inference rework (BAMA/BKT), SSP-MMC exam-date scheduling, Poisson-binomial correlation correction
  — all later waves (round-2 research pending).
- Any change to Ukrainian copy positioning, the demo/no-official-claims legal stance, or mobile-first.
- Neural KT, DASH, HLR — research says do NOT deploy these.

---

## Part 1 — FSRS-5 → FSRS-6 migration (`lib/fsrs/*`)

### Facts to build to (from the research, verified)
- FSRS-6 uses **21 weights** (vs 19). Published default vector (py-fsrs v6.3.1):
  `[0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542]`
- The new params add a **trainable forgetting decay** (the last weight, `w20`). The forgetting curve
  becomes `R(t,S) = (1 + FACTOR · t/S)^(-w20)` where `FACTOR = 0.9^(-1/w20) − 1` (so `R(S,S)=0.9` for any
  decay). Our current fixed `FSRS_DECAY=-0.5` and `FSRS_FACTOR=19/81` must become **derived from `w20`**,
  not hardcoded. Keep the long-term variant (`enable_short_term=false`); w17/w18 short-term path stays unused.
- FSRS-6 also revises the initial-difficulty and difficulty-update / stability formulas vs FSRS-5. **Do NOT
  hand-guess these** — port to match the FSRS-6 reference implementation exactly (see gate below).

### Requirements
- **A. Reference-vector gate is the source of truth.** Regenerate `lib/fsrs/` golden reference vectors from
  the **FSRS-6 reference implementation** — `ts-fsrs` (latest v6+) or `py-fsrs` v6.3.1 (`pip install fsrs`),
  whichever is cleaner to script. Produce a fixture of (prior memory state, grade 1–4, elapsed days) →
  (next stability, difficulty, learning-state, dueAt/interval) rows spanning new/learning/review/relearning
  and all four grades. `lib/fsrs/reference-vectors.test.ts` must assert our engine reproduces them within a
  tight tolerance (match the existing test's tolerance discipline; document the reference version + commit
  the generator script under `scripts/`). This REPLACES the FSRS-5 golden fixture — the values change by
  design; the gate is "matches the FSRS-6 reference," not "unchanged from FSRS-5."
- **B. Update `lib/fsrs/constants.ts`**: `FSRS_DEFAULT_WEIGHTS` → the 21-length FSRS-6 vector above; document
  provenance. Keep the module PURE (numbers only, no clock/DB/rng).
- **C. `lib/fsrs/retrievability.ts`**: derive `FACTOR`/decay from `w20` (curve parameterized by the trainable
  decay), preserving `R(S,S)=0.9`. `retrievability()` stays pure with the injected `now`.
- **D. `lib/fsrs/schedule.ts`**: implement the FSRS-6 DSR update (initial stability/difficulty, difficulty
  mean-reversion, successful-recall & lapse stability) to match the reference. Signature and return shape
  UNCHANGED (callers `submitAnswer`/queue/mastery must not need edits). `MIN_STABILITY` stays aligned to the
  reference.
- **E. Keep every downstream consumer behavior-valid**: `lib/test-engine/queue.ts`, `lib/server/mastery*.ts`,
  `lib/readiness*.ts` compile and their unit + integration tests pass. Exact dueAt numbers may shift (better
  model) — that is expected and fine; assertions that pinned FSRS-5 magic numbers should be re-derived from
  the engine, not frozen.
- **F. `lib/fsrs/CLAUDE.md`** (the module's learnings file) updated to say FSRS-6, 21 weights, trainable decay.

### Boolean acceptance (Part 1)
- `npm run -s typecheck` clean; `npm run -s test` green (incl. the regenerated `reference-vectors.test.ts`).
- `FSRS_DEFAULT_WEIGHTS.length === 21`; the decay is read from `w20`, not a hardcoded `-0.5`.
- The generator script exists under `scripts/` and names the exact reference version it was run against.
- No `lib/fsrs/*` file imports a clock/DB/rng (purity preserved).

---

## Part 2 — Readiness calibration ground-truth pipeline

### Requirements
- **G. Schema — `PassOutcome` model** (hand-authored migration; `prisma migrate deploy`, NEVER migrate-dev;
  new table, so no table-rebuild needed):
  - `id` cuid PK · `userId` String + relation to `User` (`onDelete: Cascade`) · `predictedPassProbability`
    Float (0–1, the dial's P(pass) snapshotted at report time) · `passed` Boolean · `categoryId` String?
    (relation to `Category`, `onDelete: SetNull`, indexed — consistent with the wave-audit FK convention) ·
    `source` String (e.g. `"self_report"`) · `createdAt` DateTime default now · `@@index([createdAt])`.
  - Add the reverse relations on `User`/`Category`. Follow the migration discipline in CLAUDE.md exactly.
- **H. Pure metrics module — `lib/calibration-metrics.ts`** (PURE: no clock/DB/rng; unit-tested with
  hand-computed oracles):
  - `reliabilityDiagram(points, bins=10)` → per-bin {meanPredicted, observedFraction, count}.
  - `brierScore(points)`, `logLoss(points)` (with clamping to avoid ±∞), `ece(points, bins=10)`.
  - `fitPlatt(points)` → logistic `{A, B}` (fit `P' = sigmoid(A·logit(p) + B)` or the standard Platt
    objective; document which) and `applyPlatt(p, {A,B})`.
  - Each function has a unit test with a KNOWN oracle (e.g. a perfectly-calibrated set → ECE≈0, Brier matches
    a hand value; a base-rate-only predictor → ECE≈0 but poor Brier/LogLoss — encode the research's "ECE is
    gameable" fact as an explicit test comment).
- **I. Capture wiring — `recordExamOutcome` server action** (`app/actions/` or `lib/server/*` per house
  patterns): given `passed: boolean` (+ optional categoryId), snapshot the user's CURRENT readiness
  `predictedPassProbability` (from the latest `ReadinessSnapshot` / the live readiness model — reuse
  `getLatestReadiness`), and insert a `PassOutcome`. Server-side auth (`requireUser`), input-validated (zod),
  no IDOR. Fire-and-forget analytics event (add the name to `ANALYTICS_EVENTS` first). Integration-tested
  (drive the action, assert the row + snapshotted probability; FK-safe teardown).
- **J. Minimal capture surface**: a small, honest UI entry to report a real exam result — e.g. on the
  account page or the result page: «Ти вже склав іспит у ТСЦ?» → «Склав / Не склав» calling the action.
  Keep it ONE quiet control (frontend-design: one job per element), Ukrainian copy, 44px targets, glass
  tier as ported. No dark patterns, no fabricated claims. (If a full surface is too big for one task, a
  minimal account-page control satisfies this — the data pipeline is the deliverable, not the UX polish.)
- **K. Admin read view (light)**: extend `app/admin/readiness-shadow` (or a sibling admin page) to show the
  calibration snapshot over `PassOutcome`: N outcomes, reliability-diagram bins, Brier, LogLoss, ECE, and
  (once ≥ a small floor) the fitted Platt `{A,B}`. Read-only, RBAC-gated. Gracefully shows "not enough data"
  at 0 rows (we expect 0 today) — this must not error on an empty table.

### Boolean acceptance (Part 2)
- Migration applies via `prisma migrate deploy`; `prisma migrate status` clean; `PassOutcome` present.
- `lib/calibration-metrics.ts` is pure and every exported fn has a known-oracle unit test; `npm run -s test` green.
- `recordExamOutcome` integration test passes (row created with the snapshotted probability; auth/IDOR guarded).
- The admin calibration view renders with **0 rows** without throwing ("not enough data" state).
- Typecheck + full unit + integration suites green.

---

## Constraints (hard — house rules)
- Purely additive; do NOT break the stable-key content architecture or any existing mode/readiness behavior.
- Pure logic in `lib/` = no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`, no `Math.random`/
  `Date.now`/`new Date()` (inject clock+rng). DB orchestration in `lib/server/*`.
- Hand-authored migrations only (`prisma migrate deploy`; one `ADD COLUMN` per `ALTER`; new table is fine);
  NEVER `prisma migrate dev`. Stop any LAN `next start` server holding `dev.db` before `migrate deploy`.
- Security first: validate inputs (zod v4 `{ error }`), server-side RBAC, no IDOR, sanitize rendered content.
- New analytics event names go into `ANALYTICS_EVENTS` (`lib/constants.ts`) FIRST or typecheck fails.
- Tests on every change. Keep `npm run -s typecheck && npm run -s test` green (the harness gate).
- Reference the research doc for any FSRS-6 / calibration detail; do not invent math — match the reference impl.
