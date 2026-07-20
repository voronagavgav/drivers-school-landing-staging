import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { chunk } from "@/lib/analytics-dashboard";
import { foldEloStream, type EloAnswer } from "@/lib/elo";

// ---------------------------------------------------------------------------
// Server-authoritative Elo/Rasch item-difficulty recompute (Wave 22).
//
// This is the ONLY write path for `Question.eloBeta`/`Question.eloAnswerCount`:
// a FULL deterministic batch replay, not incremental per-request writes. It
// loads the entire first-attempt answer stream, folds it through the ALREADY-
// oracle'd PURE `foldEloStream` (never re-derives the Elo math here), and writes
// each item's final β and answer-count back onto `Question`.
//
// Determinism: Elo has NO time-decay, so a full recompute is idempotent — the
// reference time comes from each row's `answeredAt`, never `new Date()`. Running
// it twice yields byte-identical β/n for every item.
//
// FIRST-ATTEMPT rule (wave22-review MAJOR fix): the stream source is `ReviewLog`,
// NOT `TestAnswer`. TestAnswer is UPSERTED on answer change — it holds the FINAL
// choice and the LAST-touch answeredAt, so it is the wrong record for the spec's
// "mirror the FSRS first-attempt-per-session rule". ReviewLog IS the first-attempt
// record by construction (`recordReview` is gated on no prior attempt), with the
// preserved invariant `correct ⟺ grade ≥ 2` and the first-attempt `reviewedAt`.
// One log row = exactly one fold event; logOnly/offline-replay rows are genuine
// answer observations and fold like any other.
//
// Composes with an interactive transaction: every DB op routes through the
// injected `tx` (default the module `prisma`), same pattern as the other
// lib/server recompute fns.
// ---------------------------------------------------------------------------

// Write batch size. Each writeback is a single-row update (never near the P2029
// bound-parameter cap); the chunking just keeps transactions/latency bounded.
const WRITEBACK_CHUNK = 200;

export interface RecomputeEloResult {
  answersFolded: number;
  itemsWritten: number;
}

/**
 * Full deterministic recompute of every item's Elo difficulty from the whole
 * FIRST-ATTEMPT answer history. Loads `ReviewLog` rows (the first-attempt record;
 * `correct ⟺ grade ≥ 2`) ordered by `reviewedAt` ASC then `id` ASC (stable
 * tiebreak), joins each answer's option-count via a single batched question-count
 * read (no per-row queries), folds via the pure `foldEloStream`, and writes
 * `eloBeta`/`eloAnswerCount` back in ≤200-id chunks.
 */
export async function recomputeElo(
  tx: Prisma.TransactionClient = prisma,
): Promise<RecomputeEloResult> {
  // 1. Batch the per-question option counts once — NO per-row `_count` queries.
  //    No `in` filter, so no bound-parameter cap concern on this read.
  const questionCounts = await tx.question.findMany({
    select: { id: true, _count: { select: { options: true } } },
  });
  const optionCountById = new Map<string, number>(
    questionCounts.map((q) => [q.id, q._count.options]),
  );

  // 2. Load the first-attempt stream in fold order (reviewedAt ASC, id ASC).
  const rows = await tx.reviewLog.findMany({
    select: {
      id: true,
      userId: true,
      questionId: true,
      grade: true,
      reviewedAt: true,
    },
    orderBy: [{ reviewedAt: "asc" }, { id: "asc" }],
  });

  const stream: EloAnswer[] = rows.map((r) => ({
    userId: r.userId,
    questionId: r.questionId,
    // The preserved wave20 invariant: a wrong first attempt always logs grade 1.
    correct: r.grade >= 2,
    optionCount: optionCountById.get(r.questionId) ?? 0,
    answeredAt: r.reviewedAt,
    id: r.id,
  }));

  // 3. Fold via the pure, oracle'd estimator (never reimplement the math here).
  const { items } = foldEloStream(stream);

  // 4. Write each item's β/n back, chunked ≤200 ids per batch (P2029 safety).
  let itemsWritten = 0;
  for (const batch of chunk([...items.entries()], WRITEBACK_CHUNK)) {
    for (const [questionId, { beta, n }] of batch) {
      await tx.question.update({
        where: { id: questionId },
        data: { eloBeta: beta, eloAnswerCount: n },
      });
      itemsWritten += 1;
    }
  }

  return { answersFolded: stream.length, itemsWritten };
}
