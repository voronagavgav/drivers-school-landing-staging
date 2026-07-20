# FINDINGS — wave23-02 sim-pipeline-map

The EXACT real-pipeline contract the exam-allocator sim (wave23-05) must compose so it runs the
**SHIPPED** pipeline, not a re-derivation. Every symbol below is a currently-exported/defined
function in the repo (grep-verified 2026-07-14). Line numbers are as of this commit.

This is READ-ONLY investigation — no code/test/lib change. It maps the contract; it does NOT decide
the allocator math (that is wave23-01's frozen oracle).

## Acceptance

| Goal | Answer (symbol + `file:line`) |
|------|-------------------------------|
| 1. `## Acceptance` block mapping every question → `file:line` | this table |
| 2. State init — `ReviewMemoryState` shape; UNSEEN vs SEEN(target R) seed; invert forgetting curve | `ReviewMemoryState` `lib/fsrs/types.ts:17`; `retrievability` `lib/fsrs/retrievability.ts:28`; `FSRS_FACTOR` `lib/fsrs/retrievability.ts:22`, `FSRS_DECAY` `:15` — see §2 |
| 3. Answer sampling — `p = R_i` (seen) / `p = g` (unseen) | `retrievability(state, now)` `lib/fsrs/retrievability.ts:28`; `FSRS_GUESS_DEFAULT=0.25` `lib/fsrs/constants.ts:76`, `FSRS_GUESS_MAX=0.45` `:84` — see §3 |
| 4. State update path — grade → schedule → next state; guess/slip prior; lapse adjust; where `correct` enters | `gradePosterior` `lib/fsrs/grade.ts:52`, `deriveGrade` `:85`; `schedule` `lib/fsrs/schedule.ts:119`; `slipAdjustedLapse` `lib/fsrs/lapse-adjust.ts:37` — see §4 |
| 5. Objective call — assemble `ReleaseInput`; quotas; `seenR`/`nUnseen`/`reviewMass`; pass-prob = `.final` | `ReleaseInput` `lib/readiness-release.ts:50`, `ReleaseBlockInput` `:40`, `releaseDial` `:88`; quotas `lib/exam-blueprint.ts:70` — see §5 |
| 6. Baseline policy — `selectReviewQueue`; `QueueCandidate`; `QueueOptions`; returns ≤ B ids | `selectReviewQueue` `lib/test-engine/queue.ts:150`, `QueueCandidate` `:99`, `QueueOptions` `:108`, `DEFAULT_NEW_ITEM_SHARE=0.2` `:93` — see §6 |
| 7. `## Sim contract` pseudocode over real symbols | see `## Sim contract` |

---

## §2. State init — `ReviewMemoryState`

`ReviewMemoryState` (`lib/fsrs/types.ts:17`) is the per-user memory state for one question:

```ts
interface ReviewMemoryState {
  stability: number;                 // days until R decays to target retention
  difficulty: number;                // FSRS latent [1,10]
  state: LearningState;              // "new" | "learning" | "review" | "relearning"
  dueAt: Date | null;               // lastReviewedAt + intervalDays(stability, target)
  lastReviewedAt: Date | null;      // anchors the forgetting curve; null = never reviewed
  reps: number;
  lapses: number;
}
```

Retrievability is DERIVED on demand (`retrievability`), never stored.

**(a) UNSEEN item** (never reviewed): seed `{ stability: 0, difficulty: <D0>, state: "new", dueAt: null,
lastReviewedAt: null, reps: 0, lapses: 0 }`. The load-bearing fields are `state: "new"` (routes
`schedule` through the first-exposure branch, `lib/fsrs/schedule.ts:123`) and `lastReviewedAt: null`
(`retrievability` returns 1 for a never-reviewed card, `lib/fsrs/retrievability.ts:34` — but the sim
must NOT sample an unseen item at R=1; see §3, unseen uses the guess floor `g`, not R).

**(b) SEEN item with target retrievability R at `now`**: pick a `stability > 0`, `state: "review"`,
`reps ≥ 1`, and set `lastReviewedAt` so that `retrievability({stability, lastReviewedAt}, now) === R`.

Invert the forgetting curve. `retrievability` (`lib/fsrs/retrievability.ts:28`) computes
`R = (1 + FSRS_FACTOR·(elapsedDays / stability))^FSRS_DECAY` with `FSRS_FACTOR`
(`lib/fsrs/retrievability.ts:22`) and `FSRS_DECAY = -W20` (`:15`). Solve for `elapsedDays`:

```
elapsedDays = stability · (R^(1/FSRS_DECAY) − 1) / FSRS_FACTOR
lastReviewedAt = new Date(now.getTime() − elapsedDays · 86_400_000)
```

(This is exactly `intervalDays(stability, R)` from `lib/fsrs/schedule.ts:34` —
`intervalDays(S, retention) = (S/FSRS_FACTOR)·(retention^(1/FSRS_DECAY) − 1)` — so the sim can seed a
seen item at retrievability R by `lastReviewedAt = now − intervalDays(stability, R) days`.) Choose any
`stability > 0` (e.g. the FSRS default weights' initial stability); the pair `(stability,
lastReviewedAt)` then yields the target R at `now`.

---

## §3. Answer sampling

For each item the student answers on a given day, the sim samples `correct ~ Bernoulli(p)`:

- **SEEN item** (has a real `ReviewMemoryState` with `lastReviewedAt != null`): `p = R_i =
  retrievability(state, now)` (`lib/fsrs/retrievability.ts:28`) — the item's current retrievability at
  the day's clock.
- **UNSEEN item** (first exposure, `state: "new"`): `p = g` = the guess floor
  `g = min(1/optionCount, FSRS_GUESS_MAX)`. For 4-option ПДР items this is `1/4 = 0.25`
  (`FSRS_GUESS_DEFAULT` `lib/fsrs/constants.ts:76`); the cap `FSRS_GUESS_MAX = 0.45`
  (`lib/fsrs/constants.ts:84`) only binds for ≤2-option items. This matches the likelihood
  `P(correct | ¬knows) = g` used inside `gradePosterior` (`lib/fsrs/grade.ts:52`).

Note: do NOT sample an unseen item at `retrievability`'s null-`lastReviewedAt` return of 1 — an unseen
item is answered by guessing, so `p = g`, not `p = 1`.

---

## §4. State update path (one review)

The exact call chain a single review takes (all pure, `now: Date` injected):

1. Sample `correct: boolean` (§3). This is the value that enters the whole chain.
2. Compute the prior belief `priorKnow = R = retrievability(prevState, now)` for a seen item
   (`lib/fsrs/retrievability.ts:28`); for a fresh card the server uses a neutral `0.5`
   (`gradePosterior` doc, `lib/fsrs/grade.ts:40`), NOT the R=1 of an unreviewed card.
3. `deriveGrade({ correct, priorKnow, optionCount }) → Grade (1..4)` (`lib/fsrs/grade.ts:85`). This is
   the wave20 honest-guess/slip-adjusted grading: its PRIMARY axis is
   `gradePosterior({ correct: true, priorKnow, optionCount })` (`lib/fsrs/grade.ts:52`,
   the arg that carries the guess/slip adjustment) mapped through
   `FSRS_KNOW_EASY`/`FSRS_KNOW_GOOD` thresholds. A wrong answer is grade 1 (Again) unconditionally
   (`lib/fsrs/grade.ts:87`).
4. `schedule(prevState, grade, now) → next ReviewMemoryState` (`lib/fsrs/schedule.ts:119`). First
   exposure (`state === "new"`) seeds S/D from the rating; a subsequent review computes next stability
   from the PRIOR difficulty via recall/forget stability, updates difficulty, advances learning state,
   and sets `dueAt = now + intervalDays(stability, FSRS_TARGET_RETENTION)`.
5. **Lapse adjustment (if applicable)**: for a WRONG answer (grade 1) the honest slip-adjusted lapse
   softens the interval crush — `slipAdjustedLapse(prevState, pi, now)` (`lib/fsrs/lapse-adjust.ts:37`)
   where `pi = gradePosterior({ correct: false, priorKnow, optionCount })` = P(knows | wrong). It runs
   BOTH `schedule(prev, 1, now)` (Again) and `schedule(prev, 2, now)` (Hard) from the same prior and
   geometric-blends only their stabilities, capped at `prev.stability` (never-grow-on-wrong). For a
   CORRECT answer there is no lapse adjustment — the plain `schedule(prev, grade, now)` result is the
   next state. The sim should mirror the server: correct ⇒ `schedule`; wrong ⇒ `slipAdjustedLapse`.

---

## §5. Objective call — assemble `ReleaseInput`, read `.final`

At the exam date, score the student's memory state via the shipped release model
`releaseDial(input: ReleaseInput): ReleaseResult` (`lib/readiness-release.ts:88`).

`ReleaseInput` (`lib/readiness-release.ts:50`):

```ts
interface ReleaseInput {
  blocks: ReleaseBlockInput[];   // one per blueprint stratum
  reviewMass: number;            // mean per-item review count (drives σ decay)
  slope?: number;                // omit ⇒ 1 (identity)
}
interface ReleaseBlockInput {    // lib/readiness-release.ts:40
  quota: number;                 // exam slots this block contributes
  seenR: number[];               // retrievabilities of the block's SEEN items at exam `now`
  nUnseen: number;               // not-yet-studied slots in the block
}
```

**Blueprint quotas** (4 strata, `CATEGORY_B_BLUEPRINT` `lib/exam-blueprint.ts:70`, header
`lib/exam-blueprint.ts:59-65`): **pdr 10 · safety 4 · structure ("build") 4 · medical 2** (= 20).
`THRESHOLD = 18` (`DEFAULT_EXAM_QUESTION_COUNT 20 − DEFAULT_EXAM_MAX_ERRORS 2`,
`lib/readiness-release.ts:33` / `lib/constants.ts:119,121`). NB: the blueprint's key for будова/vehicle
structure is `structure`; the release-model recall names it `build` — same block.

Per block the sim assembles:
- `quota` = the fixed blueprint count above.
- `seenR` = `[ retrievability(state_i, examNow) for each SEEN item i in that block ]`.
- `nUnseen` = count of the block's exam slots the student has never studied.
- `reviewMass` (top-level) = mean per-item review count across the student's seen items (mean of
  `state.reps`); higher ⇒ smaller σ ⇒ mixture closer to independence.

Reported pass-prob = **`releaseDial(input).final`** (`ReleaseResult.final`,
`lib/readiness-release.ts:66` field; `= min(mixture, independence)`, `lib/readiness-release.ts` compose).
Correlation anchors are OMITTED (`m₀ = READINESS_RELEASE_EVIDENCE_M0 = 1` ⇒ identity per spec;
`lib/constants.ts:238`).

---

## §6. Baseline policy — `selectReviewQueue`

The CURRENT production daily-selection policy is `selectReviewQueue(candidates, opts): string[]`
(`lib/test-engine/queue.ts:150`) — the exact call the baseline arm invokes each day.

`QueueCandidate` (`lib/test-engine/queue.ts:99`):

```ts
interface QueueCandidate {
  questionId: string;
  topicId: string;
  topicWeakness: number;        // 0..1, higher ⇒ prioritised
  state?: ScoredState | null;   // null/undefined ⇒ UNSEEN; present ⇒ SEEN
}
```

`QueueOptions` (`lib/test-engine/queue.ts:108`):

```ts
interface QueueOptions {
  now: Date;
  rng?: () => number;                    // injected for determinism (default Math.random)
  size: number;                          // target queue length = daily budget B
  newItemShare?: number;                 // default DEFAULT_NEW_ITEM_SHARE = 0.2 (queue.ts:93)
  backfillWithNew?: boolean;             // default false ⇒ newItemShare is a CAP, queue may be < size
}
```

Returns an ordered `questionId[]` of length **≤ size** (SEEN ranked by `scoreCandidate`
`lib/test-engine/queue.ts:77` — overdue/low-R/weak-topic first — plus a bounded
`round(size × newItemShare)` share of rng-shuffled UNSEEN items, interleaved and topic-varied). The
baseline picks the SAME budget B items per day via `selectReviewQueue(candidates, { now, rng, size: B })`.

---

## Sim contract

Per-day loop (both policies pick B, answers sampled per §3, states updated per §4) + exam-date scoring
per §5. Every name below is a real exported symbol (greppable):

```
# real symbols: retrievability, intervalDays, deriveGrade, gradePosterior, schedule,
#               slipAdjustedLapse, selectReviewQueue, releaseDial, CATEGORY_B_BLUEPRINT
# constants:    FSRS_GUESS_DEFAULT, FSRS_GUESS_MAX, FSRS_TARGET_RETENTION,
#               DEFAULT_EXAM_QUESTION_COUNT, DEFAULT_EXAM_MAX_ERRORS

for each policy in { BASELINE = selectReviewQueue, ALLOCATOR = wave23-04 allocate }:
  states := { qid -> ReviewMemoryState }   # UNSEEN seeded state:"new", lastReviewedAt:null (§2a)
  for day in 0 .. examDay-1:
    now := startClock + day
    candidates := [ { questionId, topicId, topicWeakness, state: states[qid] or null } ]  # §6
    if policy == BASELINE:
      picks := selectReviewQueue(candidates, { now, rng, size: B })          # ≤ B ids (§6)
    else:
      picks := allocate(candidates, { now, size: B, ... })                   # wave23-04
    for qid in picks:
      st := states[qid]
      seen := st != null and st.lastReviewedAt != null
      p := seen ? retrievability(st, now) : g            # g = min(1/optionCount, FSRS_GUESS_MAX) (§3)
      correct := (rng() < p)                             # Bernoulli(p)
      prior := seen ? retrievability(st, now) : 0.5      # neutral prior for fresh card (§4.2)
      if correct:
        grade := deriveGrade({ correct:true, priorKnow:prior, optionCount:4 })
        states[qid] := schedule(st_or_newState, grade, now)                  # §4.4
      else:
        pi := gradePosterior({ correct:false, priorKnow:prior, optionCount:4 })
        states[qid] := slipAdjustedLapse(st_or_newState, pi, now)            # §4.5
  # ---- exam-date scoring (§5) ----
  examNow := startClock + examDay
  blocks := for each stratum in CATEGORY_B_BLUEPRINT (pdr 10, safety 4, structure 4, medical 2):
              { quota,
                seenR:  [ retrievability(states[i], examNow) for SEEN i in stratum ],
                nUnseen: count of never-studied slots in stratum }
  reviewMass := mean over seen items of state.reps
  passProb := releaseDial({ blocks, reviewMass }).final                      # min(mixture, independence)
  record passProb for this policy
# compare BASELINE.passProb vs ALLOCATOR.passProb across the profile grid (wave23-05)
```
