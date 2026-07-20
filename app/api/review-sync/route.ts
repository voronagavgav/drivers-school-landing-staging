import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  REVIEW_SYNC_MAX_BODY_BYTES,
  clampReviewedAt,
  reviewSyncBatchSchema,
  type ReviewSyncItem,
} from "@/lib/review-sync";
import { submitAnswer } from "@/lib/server/test-engine";
import { namespacedEventId, recordReview } from "@/lib/server/study";

// Offline review sync (spec §D). Replays a batch of answers recorded while offline through the SAME
// submitAnswer path a live answer takes — so auth, foreign-session rejection, idempotency (the
// wave13-09 namespaced clientEventId guard) and the FSRS dual-write are all inherited, never
// reimplemented. The only offline-specific twist is the CLAMPED client `reviewedAt`, which feeds the
// FSRS lane only.
//
// SESSIONLESS lane (wave13-17, spec §E): an item WITHOUT a sessionId is an offline-practice review —
// no TestSession exists and none is fabricated (a fake session would pollute exam/practice stats with
// unverifiable data). It lands in the SRS lane ONLY: one recordReview inside a transaction, with
// `correct` computed server-side from the stored options (the client's cached isCorrect is NEVER
// trusted) and the same hoisted namespaced-id idempotency guard submitAnswer applies.
//
// Beacon-safe contract: the response is ALWAYS a small 200 JSON — `{ ok: false }` on any reject
// (unauthenticated, oversized, malformed) and never a 500/stack — so a background sync can't be used
// to probe internals. The user comes from the session cookie ONLY; a `userId` in the body is
// stripped by the schema whitelist and ignored.

export const runtime = "nodejs";

function nack(): NextResponse {
  return NextResponse.json({ ok: false });
}

/**
 * Apply one sessionless offline-practice review (no TestSession/TestAnswer row — SRS lane only).
 * Throws on any reject condition (unknown/unservable question, foreign option) so the caller's
 * per-item isolation reports it `rejected`; a replayed clientEventId is a silent whole-tx no-op.
 */
async function applySessionlessReview(
  userId: string,
  item: ReviewSyncItem,
  reviewedAt: Date,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Idempotency guard hoisted to the whole transaction (mirrors submitAnswer); recordReview's
    // inner guard stays as the belt-and-suspenders second layer.
    const seen = await tx.reviewLog.findUnique({
      where: { clientEventId: namespacedEventId(userId, item.clientEventId) },
      select: { id: true },
    });
    if (seen) return;

    // Only a SERVABLE question may earn a review — an unpublished/inactive/archived one (e.g. from
    // a stale cached pack) is rejected outright.
    const question = await tx.question.findFirst({
      where: { id: item.questionId, isActive: true, isPublished: true, archivedAt: null },
      select: { topicId: true, options: { select: { id: true, isCorrect: true } } },
    });
    if (!question) throw new Error("UNSERVABLE_QUESTION");

    // Server-side correctness: the selected option must belong to THIS question; an explicit skip
    // (null) is a failed recall, exactly as the live lane scores it.
    const selected =
      item.selectedOptionId != null
        ? question.options.find((o) => o.id === item.selectedOptionId)
        : null;
    if (item.selectedOptionId != null && !selected) throw new Error("FOREIGN_OPTION");
    const correct = selected?.isCorrect ?? false;

    // Stale-replay guard (wave13-review): an offline review OLDER than the card's current
    // lastReviewedAt (a newer LIVE review already happened) is applied LOG-ONLY — the event enters
    // the telemetry corpus and consumes its idempotency key, but never regresses FSRS state backward.
    const currentState = await tx.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: item.questionId } },
      select: { lastReviewedAt: true },
    });
    const stale =
      currentState?.lastReviewedAt != null &&
      reviewedAt.getTime() <= currentState.lastReviewedAt.getTime();

    await recordReview(
      tx,
      {
        userId,
        questionId: item.questionId,
        topicId: question.topicId,
        correct,
        latencyMs: item.latencyMs,
        // Honest guess-floor parity with the live lane (wave20 review fix): the options are
        // already loaded above for correctness scoring, so the count is free — omitting it fell
        // back to the 4-option default and made grades lane-dependent (live vs offline).
        optionCount: question.options.length,
        mode: "TOPIC_PRACTICE",
        testSessionId: null,
        clientEventId: item.clientEventId,
        logOnly: stale,
      },
      reviewedAt,
    );
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Size guard BEFORE any JSON.parse: cheap declared-length check first, then the cap enforced on
    // the actually-read text too (a lying content-length header can't sneak past).
    const declaredLen = Number(req.headers.get("content-length") ?? "");
    if (Number.isFinite(declaredLen) && declaredLen > REVIEW_SYNC_MAX_BODY_BYTES) {
      return nack();
    }

    let raw: string;
    try {
      raw = await req.text();
    } catch {
      return nack();
    }
    if (raw.length > REVIEW_SYNC_MAX_BODY_BYTES) {
      return nack();
    }

    // Session-authed only: an anonymous beacon gets the same shape as a malformed one — zero writes,
    // zero information about which check failed.
    const user = await getCurrentUser();
    if (!user) {
      return nack();
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return nack();
    }

    const parsed = reviewSyncBatchSchema.safeParse(json);
    if (!parsed.success) {
      return nack();
    }

    // Apply in the order the user actually answered (client clock order), each item clamped into the
    // trustworthy [now − 7d, now] window against ONE `now` for the whole batch.
    const now = new Date();
    const items = [...parsed.data].sort(
      (a, b) => Date.parse(a.reviewedAt) - Date.parse(b.reviewedAt),
    );

    // Per-item isolation: one bad item (foreign/completed session, unknown question, anything) is
    // reported `rejected` and the batch CONTINUES. A replayed no-op reports `applied` — idempotency
    // makes it indistinguishable from a first apply, and the client deletes its WAL entry either way.
    const results: Array<{ clientEventId: string; status: "applied" | "rejected" }> = [];
    for (const item of items) {
      try {
        const reviewedAt = clampReviewedAt(new Date(item.reviewedAt), now);
        if (item.sessionId != null) {
          try {
            await submitAnswer({
              sessionId: item.sessionId,
              userId: user.id,
              questionId: item.questionId,
              selectedOptionId: item.selectedOptionId,
              latencyMs: item.latencyMs,
              clientEventId: item.clientEventId,
              reviewedAt,
            });
          } catch (e) {
            // FINISH-BEFORE-DRAIN race (wave13-review): the session finished (timer expiry / another
            // tab) before this queued answer drained. Rejecting would DELETE the WAL entry and lose a
            // real retrieval event. The exam's settled score stays untouched — but the LEARNING event
            // still counts, so fall back to the sessionless SRS-only lane. Any other failure class
            // (foreign session, unknown question) still rejects per-item below.
            if (e instanceof Error && e.message === "SESSION_NOT_ACTIVE") {
              await applySessionlessReview(user.id, item, reviewedAt);
            } else {
              throw e;
            }
          }
        } else {
          await applySessionlessReview(user.id, item, reviewedAt);
        }
        results.push({ clientEventId: item.clientEventId, status: "applied" });
      } catch {
        results.push({ clientEventId: item.clientEventId, status: "rejected" });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch {
    return nack();
  }
}
