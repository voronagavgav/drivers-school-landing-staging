# Wave 15 — Practice modes: QUICK · MARATHON · SIGN_TRAINER · DIAGNOSTIC

## Context
The Wave 10–14 program is complete (PLAN.md 2026-07-03). This wave ships the four practice modes the
master plan deferred by name (docs/app-plan/00-MASTER-PLAN.md C2; definitions in
docs/app-plan/03-learning-regimes.md §5.7–5.11 and the preset table §5 "Session presets"). They are
designed as **cheap presets over the existing unified queue picker** (`lib/test-engine/queue.ts`) and the
existing session lifecycle — NOT a new engine. Everything is additive; the stable-key content architecture
and all existing mode behavior stay untouched.

## Goal (user-visible)
- A learner can start **Швидка сесія (QUICK)** — 10 questions, due-first, low-commitment daily habit.
- A learner can start **Марафон (MARATHON)** — an endless, paged adaptive stream with a calm running
  counter, stoppable and resumable at any point.
- A learner can start **Знаки (SIGN_TRAINER)** — a drill over the sign/marking sections and image-bearing
  questions.
- A brand-new user completes **Стартова перевірка (DIAGNOSTIC)** from onboarding — ~15 blueprint-
  representative questions that seed their ReviewState and end on their first readiness-dial reveal +
  named weakest topic + plan CTA.

## Non-goals (explicit, do not build)
- SIGN_TRAINER **recognition/flashcard sub-mode** (§5.7 sub-mode 2, self-recall two-tap) — deferred; v1 is
  the drill sub-mode only.
- Timed/speed variants of anything (calm > pressure — §5.9's 5-min guide is a SOFT hint, never a countdown).
- Leaderboards, streak mechanics beyond what exists, confetti. Web Push. Monetization. Offline topic-packs for new modes.
- No changes to FSRS math, readiness model, or the exam blueprint.

## Mode contracts (source of truth: 03-learning-regimes.md — follow it where this summary is thinner)

| Mode | count | soft time | newBudget | pool | order | reveal |
|---|---|---|---|---|---|---|
| QUICK | `QUICK_COUNT = 10` | ~5 min gentle hint (non-blocking) | 4 | due-first, then desirable | priority → interleave | immediate |
| MARATHON | ∞, paged 20 | none | rolling | due → desirable → new, refills | priority → interleave | immediate |
| SIGN_TRAINER | 20 | none | 8 | §33 signs + §34 markings (live-seed Topic displayOrders 134/135 — the doc's old 132 was stale) + image-bearing (`imageKey != null`) | difficulty/priority | immediate |
| DIAGNOSTIC | ~15 | none | n/a (works with ZERO ReviewState) | blueprint-representative spread across the category's blocks/topics, easy-to-medium first | fixed at start | **withheld until finish** (like exam) |

## Requirements

### A. Mode union + constants (`lib/constants.ts`)
- Append `"QUICK"`, `"MARATHON"`, `"SIGN_TRAINER"`, `"DIAGNOSTIC"` to `TEST_MODES` (canonical names per C2 —
  no aliases). All four startable (`STARTABLE_MODES = TEST_MODES` already holds — keep that true).
- `MODE_LABEL`: QUICK «Швидка сесія» · MARATHON «Марафон» · SIGN_TRAINER «Знаки» · DIAGNOSTIC «Стартова
  перевірка». Add the preset constants (`QUICK_COUNT = 10`, `QUICK_NEW_BUDGET = 4`, `MARATHON_PAGE = 20`,
  `SIGN_TRAINER_COUNT = 20`, `DIAGNOSTIC_COUNT = 15`) in constants, not buried in code.
- Any new analytics event names go into `ANALYTICS_EVENTS` first (recordEvent rejects unknown names).

### B. Selection (pure lib first, then server wiring)
- QUICK / MARATHON-page / SIGN_TRAINER selection = presets over the existing `selectReviewQueue` /
  picker in `lib/test-engine/queue.ts` — pure, injectable clock+rng, unit-tested (house determinism rules).
- SIGN_TRAINER pool filter: sign/marking topics + image-bearing published questions; if the pool underfills
  20, take what exists (no invention). Works for a user with zero ReviewState (falls through to new items).
- DIAGNOSTIC selection: NEW pure fn — spread ~15 across the category's exam-blueprint blocks/topics
  proportionally (reuse the existing blueprint machinery from EXAM_SIMULATION), order easy→medium
  (`Question.difficulty` ascending within block), deterministic under injected rng. Must NOT require any
  prior ReviewState/TopicMastery.
- Server wiring in `lib/server/` (test-engine.ts / study.ts patterns): branch `startSession` for the new
  modes exactly as ADAPTIVE_REVIEW/SPACED_REVIEW were branched in Wave 11. FSRS `recordReview` on
  `submitAnswer` already fires for every mode — do not duplicate or fork that path.

### C. MARATHON paging (the one genuinely new mechanic)
- A MARATHON session starts with the first page (20) of `TestSessionQuestion` rows; a server action
  `extendSession(sessionId)` appends the next page using the rolling picker (due → desirable → new,
  excluding questions already in the session; respect `@@unique([testSessionId, questionId])`).
- Refill is requested by the runner when the learner nears the end of the loaded page (e.g. ≤3 unanswered
  left). If the whole pool is exhausted, the runner shows a calm "все пройдено" end-state instead of erroring.
- The session stays `IN_PROGRESS` and resumable via the existing `getResumableSession`; finishing at any
  point runs the normal `finishSession`/`finalizeSession` path (streak/goal/readiness semantics unchanged).
- Chunked queries only (≤200 ids per `in` — P2029 house rule).

### D. DIAGNOSTIC onboarding integration
- Entry: the existing `/onboarding` flow, after category select — CTA «Дай нам 3 хвилини — покажемо, з
  чого почати». Also guard: a user with a COMPLETED DIAGNOSTIC session doesn't get re-prompted (derive
  from the session table — NO new schema).
- During the run: per-item reveal is WITHHELD (exam-style) — §6 of 03-learning-regimes.
- Finish screen: the user's first readiness-dial animation (reuse the existing dial + its
  sufficientData guard — if the dial reports insufficient data at N=15, show the honest insufficient-data
  state with the plan CTA, never a fabricated number), + named weakest topic from the diagnostic's own
  answers, + CTA into the finite plan (existing surface). Calm copy, Ukrainian, no scores-as-judgement.
- DIAGNOSTIC answers seed ReviewState via the normal submitAnswer path (verify this holds in an
  integration test — first `ReviewState` rows exist after a diagnostic).

### E. UI surfaces (design system as ported in W12a/12b — glass tiers, existing card/CTA components)
- `/practice`: four new mode cards (QUICK, MARATHON, SIGN_TRAINER + keep existing), same
  `<form action>` + hidden `mode` input pattern the page already uses. DIAGNOSTIC is NOT a /practice card
  (onboarding-only entry) unless the user has never completed one — then a single gentle dashboard nudge
  card may link to it.
- Runner adaptations: QUICK soft-time gentle hint (text/progress, not a countdown); MARATHON rolling
  "N відповідано · точність X%" counter + always-visible calm «Завершити» (existing finish flow);
  DIAGNOSTIC hides per-answer correctness until the finish screen.
- Mobile-first (390px), a11y (labels/focus/contrast per house standards), Ukrainian copy throughout,
  no new fonts/deps.

### F. Tests + verification (house gates)
- Unit: selection presets (each mode's pool/order/budget invariants, deterministic), diagnostic spread fn.
- Integration (self-provisioned official fixtures via `createOfficialQuestion`, FK-safe cleanup): start
  each new mode → correct pool size/composition; MARATHON extendSession appends without duplicates and
  excludes answered; DIAGNOSTIC seeds ReviewState + withholds reveal (server doesn't return correctness
  pre-finish) + finish computes weakest topic; QUICK counts toward daily goal.
- `npm run audit:browser` extended: start QUICK, MARATHON (incl. one refill), SIGN_TRAINER over the real
  http origin; assert each lands in /test/ and answers persist. (Server restart trap: restart :3100 after
  build before auditing — CLAUDE.md.)
- Full board green: typecheck 0 · unit · db:seed · integration · build · audit — same bar as W10–14.

## Constraints (hard)
- Purely additive. No schema migration expected; if one becomes truly unavoidable it must be additive and
  hand-authored per house rules — but first try to derive from existing tables.
- Never touch: stable-key loader, imageKey resolver, FSRS math, existing modes' behavior, return shapes
  consumed by existing clients.
- Pure lib code stays pure (no server-only/db/Math.random/Date.now — house purity gates grep whole files;
  keep forbidden tokens out of comments too).
- Legal copy positioning unchanged (no official-exam claims).
