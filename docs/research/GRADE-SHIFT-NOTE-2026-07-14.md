# Grade-shift note — the honest guess floor (Wave 20, 2026-07-14)

This note documents the single biggest behaviour shift introduced by Wave 20's honest guess floor
(spec Deliverable 5 / design point 4). It is a **documentation + gating** deliverable — it introduces
no production behaviour of its own; it explains and freezes the direction that tasks 03/05 shipped.

The live magnitudes below are captured in the committed pre-verify artifact
[`GRADE-SHIFT-PREVERIFY-2026-07-14.txt`](./GRADE-SHIFT-PREVERIFY-2026-07-14.txt) (static evidence,
produced against the real seeded bank via the pure `lib/fsrs/deriveGrade`). The frozen unit properties
live in `lib/fsrs/guess-floor-direction.test.ts`.

## (i) The Good→Hard bulk shift — and why it is honest

Before Wave 20, `gradePosterior` used a fixed 4-option guess floor `g = 0.25` for every question. A
neutral first-exposure prior (0.5) then yields posterior π ≈ 0.7826 ≥ `FSRS_KNOW_GOOD` (0.75), so
**every** first-exposure correct answer graded **Good(3)**.

Wave 20 makes the guess floor honest per question: `g = min(1/optionCount, FSRS_GUESS_MAX = 0.45)`. On
a 2- or 3-option item a lucky guess is far more likely (g = 0.45 / 0.333), so a single correct answer is
weaker evidence that the learner *knows* the item. At the neutral 0.5 prior the posterior drops below
the Good threshold and the grade falls to **Hard(2)**:

| optionCount | g (capped) | posterior π | grade |
|-------------|-----------|-------------|-------|
| 2 | 0.45 | 0.666667 | Hard(2) |
| 3 | 0.3333 | 0.729730 | Hard(2) |
| 4 | 0.25 | 0.782609 | Good(3) |
| 5 | 0.20 | 0.818182 | Good(3) |

(posteriors frozen from `scripts/oracles/gen-wave20-oracles.py` §(g)).

On the real published bank this reclassifies the **2/3-option majority (1582 questions, 68.1%)** from
Good(3) to Hard(2): BEFORE = 2322 Good / 0 Hard → AFTER = 740 Good / 1582 Hard (net **1582 Good→Hard**).

This is the honest direction: **a coin-flip-correct is weak evidence of knowledge**. When only two or
three options exist, getting it right once tells us little — the learner may have guessed. Grading it
Hard is not a punishment; it makes the *first* few reviews (which are the whole point of spaced
repetition) land sooner, so the item is genuinely confirmed rather than assumed-mastered on a guess.

## (ii) Queue-volume direction — items return sooner

More Hard(2) first-exposures ⇒ shorter first intervals ⇒ items come back into the review queue sooner.
Concretely, a first-exposure grade sets the initial stability from `FSRS_DEFAULT_WEIGHTS`
(`S = w[G-1]`): a Hard first review uses `w[1]` and a Good first review uses `w[2]`, with `w[1] < w[2]`
(see (iii)). At target retention 0.9 the first interval is `round(S)` days, so a Hard first exposure
returns sooner than a Good one. The net effect across the bank (1582 items shifting Good→Hard) is a
**higher near-term first-review volume** — the intended cost of confirming guess-prone items early.

## (iii) The first-interval change — w[1] (Hard) vs w[2] (Good)

The initial stability for a new card is `w[grade-1]` from `FSRS_DEFAULT_WEIGHTS`:

- Good(3) → `w[2] = 2.3065` days
- Hard(2) → `w[1] = 1.2931` days

So a first-exposure item that shifts Good→Hard has its first interval fall from ~2.31 days to ~1.29
days (≈ 44% shorter, `round(S)` = 2 → 1 day). This shorter first interval is exactly the mechanism by
which the queue-volume direction in (ii) manifests: guess-prone (2/3-option) items are re-surfaced a
day sooner on their first review.
