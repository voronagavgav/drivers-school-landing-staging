# SIGNAL — Wave 22: Elo item-difficulty estimation (ship the estimator, gate the consumers)

Source: `docs/research/BEYOND-CURRENT-RESEARCH-2026-07-13.md` finding #2 (HIGH confidence,
top leverage-per-complexity). Every seeded `Question.difficulty` is a uniform 1 — the app has NO
real item-difficulty signal. Research verdicts that bind this design: under ADAPTIVE item selection
naive %-correct FAILS to recover difficulty (correlation ~0, doesn't improve with more students —
Pelánek 2016), while Elo matches joint-max-likelihood IRT quality with trivial online updates;
~200 answers/item → reliable difficulty; ~10 answers/student → usable ability (r≈0.8, simulated
under Rasch assumptions); Prowise Learn proves production Elo-CAP at scale; full 3PL IRT is WRONG
at our scale. REFUTED (never cite): "3PL needs ~3000 respondents".

## Goal
Build the ONLINE Elo estimator now so it converges as real answers accrue — but every CONSUMER
(queue ordering, FSRS seeding, UI) stays data-gated OFF until per-item sample thresholds are met.
Shipping the estimator early is the point (it's cumulative); shipping consumers early would act on
noise.

## Design (settled — refine constants, not the shape)
- **Model**: Rasch/Elo. P(correct) = sigmoid(θ_user − β_item). After each FIRST-attempt answer
  (mirror the FSRS first-attempt-per-session rule): `θ += K_u·(y − P)`, `β −= K_i·(y − P)`.
  Uncertainty-adaptive K (the Prowise pattern): `K(n) = K_MAX / (1 + n/ELO_K_HALFLIFE)` with
  separate item/user counters — new items/users move fast, established ones stabilize. Constants in
  `lib/constants.ts` (`ELO_*`), all pinned by the oracle. Guess asymmetry: a Rasch model ignores
  the 2–5-option guess floor — fold it in as the 3PL-lite likelihood
  `P = g + (1−g)·sigmoid(θ − β)` with `g = min(1/optionCount, FSRS_GUESS_MAX)` (reuse the wave20
  constant — do NOT redeclare), which keeps 2-option corrects from deflating β. This is the one
  place the design goes beyond plain Elo; the python oracle freezes both the plain and
  guess-adjusted update on fixed streams so the choice is auditable.
- **Computation model**: DETERMINISTIC BATCH FOLD, not per-request writes. A pure
  `lib/elo.ts` `foldEloStream(answers, params)` consumes a chronologically-ordered answer stream
  (`{userId, questionId, correct, optionCount, answeredAt}`) and returns `{items: Map<qid,{beta,n}>,
  users: Map<uid,{theta,n}>}`. The server layer replays TestAnswer history (first-attempt rows,
  `answeredAt` ASC, stable tiebreak by id) — full recompute is idempotent/deterministic and cheap at
  our scale (<100k rows for years). NO incremental cursor state to corrupt.
- **Persistence**: additive nullable columns on Question: `eloBeta Float?`, `eloAnswerCount Int
  @default(0)` (additive migration via `prisma migrate diff` — strip out-of-scope drift, house
  rule). Do NOT touch the existing `difficulty` Int (its semantics stay; a future consumer wave may
  map β→1..5 bands). Per-user θ is NOT persisted this wave (recomputed on demand; users change fast
  and no consumer needs it stored).
- **Refresh job**: extend the EXISTING nightly script (the launchd readiness job,
  `--conditions=react-server` — see ops/README.md) with the Elo recompute + writeback in chunks of
  ≤200 ids (P2029 cap). Also a manual `scripts/elo-recompute.ts` entry point.
- **Surface (read-only, admin)**: `/admin/content-health` gains an Elo column (β, n, and a
  "insufficient n<ELO_MIN_ITEM_ANSWERS(200)" marker) — admin-only, no learner-facing change.
- **Consumers**: NONE this wave. `ELO_CONSUMERS_ENABLED=false` constant documents the gate; queue/
  FSRS integration is a future wave once real data crosses thresholds.

## Deliverables (priority order)
1. **Python reference oracle** (`scripts/oracles/gen-wave22-oracles.py`, stdlib-only): freezes
   (a) single-update values (plain + guess-adjusted) at 6dp on fixed (θ,β,y,g,K) grid incl. y=0/1,
   g extremes (0.2/0.45), K schedule points n=0/10/200; (b) fold determinism: a fixed 40-answer
   synthetic stream → exact final β/θ/n maps; (c) ORDER SENSITIVITY pinned: the same stream
   shuffled gives DIFFERENT β (documents why the fold orders by answeredAt+id — determinism is the
   guarantee, not order-invariance); (d) convergence direction: a stream where item X is answered
   wrong by high-θ users must end with β_X above the pool mean (hard item), and symmetric for easy;
   (e) guess-adjustment direction: identical streams, 2-option vs 5-option — the 2-option item's β
   must move LESS per correct (weaker evidence); (f) K decay: later updates smaller, monotone.
   PREVERIFY-OUTPUT.txt evidence per house rule.
2. **Pure `lib/elo.ts`**: types + `eloUpdate` + `foldEloStream` exactly matching the oracle;
   injected params object (no module-global mutable state); purity gates standard.
3. **Constants + TS oracle test** (declaration/tests pattern): `ELO_K_MAX`, `ELO_K_HALFLIFE`,
   `ELO_MIN_ITEM_ANSWERS=200`, `ELO_CONSUMERS_ENABLED=false` (typed literal), initial β=0/θ=0.
4. **Migration + server fold** (`lib/server/elo.ts`): additive columns; `recomputeElo(tx?)` loads
   first-attempt TestAnswer rows (JOIN options count via the question's options relation — or reuse
   a cached count; NO per-row queries), orders answeredAt ASC id ASC, folds, writes back in ≤200-id
   chunks. Determinism integration test: seed a fixture stream via direct TestSession/TestAnswer
   creates (house pattern), run recompute TWICE → identical rows; assert one fixture item's β
   against the ORACLE's fold value for the same stream (external truth).
5. **Nightly wiring + manual script**: extend the nightly entry point; `scripts/elo-recompute.ts`
   runnable via tsx --conditions=react-server; ops/README.md note.
6. **Admin surface**: content-health Elo column + insufficient-data marker (server component,
   RBAC via existing requireContentManager path; no client-graph leaks — plain props).
7. **Verify-wave**: typecheck 0 · unit · db:seed then integration (0 skipped) · build · restart
   :3100 · audit:browser (admin page assert may extend the audit). lib/fsrs + readiness + wave20/21
   oracles byte-untouched.

## Out of scope (do NOT plan)
- ANY consumer wiring (queue ordering, FSRS initial-difficulty seeding, learner-facing difficulty
  display) — future wave, data-gated on ELO_MIN_ITEM_ANSWERS.
- Per-user θ persistence; distractor-level modeling (logged elsewhere, deferred by research).
- IRT 2PL/3PL fitting; any lib/fsrs change.

## House rules
Pure logic in lib/ (injected params, no Date.now — answeredAt comes from rows). Oracle rule:
expectations from the python reference only. Migration additive; strip out-of-scope drift; seed
FK-order rules apply if any FK changes (none expected). db:seed BEFORE test:integration in gates.
Evaluator artifacts (Acceptance table + PREVERIFY-OUTPUT.txt). Model tiering: Opus bulk.
