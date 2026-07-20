import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  startAdaptiveReview,
  startSpacedReview,
  NothingDueError,
} from "@/lib/server/study";
import { startTestAction } from "@/app/actions/test";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";
import { getCurrentUser } from "@/lib/auth";
import { ADAPTIVE_REVIEW_SIZE } from "@/lib/constants";
import { DEFAULT_NEW_ITEM_SHARE } from "@/lib/test-engine/queue";

// §4 drives the REAL server action `startTestAction`, which calls `requireUser()` → `getCurrentUser()`.
// We never mint cookies in the node runtime, so mock the auth read to the fixture principal. The
// spread keeps the rest of `@/lib/auth` real; the §2/§3 direct-helper tests never touch auth so the
// mock is inert for them.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

// wave11-06 — integration proof that the queue-driven review sessions (wave11-05) work through the
// PRODUCTION entry paths, against the real seeded SQLite DB. Self-provisions its own OFFICIAL fixtures
// via createOfficialQuestion (throwaway category+topic+user, isDemo=false published questions — a real
// LIVE pool) so it never asserts shared-seed content, and asserts SET MEMBERSHIP / COUNTS, never the
// absolute ordering of the rng-shuffled new-item lane (noise-proof).
//
//   §2  startAdaptiveReview interleaves due SEEN cards with a bounded share of UNSEEN items:
//       every due card is present (due-first) and the unseen count stays within the new-item budget.
//   §2b a category with published questions but ZERO due & ZERO seen still yields a NON-EMPTY session
//       (unseen-first fallback; never throws).
//   §3  startSpacedReview with NOTHING seen throws the typed NothingDueError.
//   §4  ADAPTIVE_REVIEW is startable through the ACTION — startTestAction(mode=ADAPTIVE_REVIEW) creates
//       a TestSession(mode="ADAPTIVE_REVIEW") for the user (redirect throws; assert via the DB row).

const DAY_MS = 86_400_000;

// Effective session size for a fixture user with no UserStudyProfile, and the unseen ("new") budget the
// queue reserves — both mirror lib/server/study.ts's parameterisation so the assertions track the code.
const EFFECTIVE_SIZE = ADAPTIVE_REVIEW_SIZE;
const NEW_BUDGET = Math.round(EFFECTIVE_SIZE * DEFAULT_NEW_ITEM_SHARE);

// Composition fixture: enough due SEEN cards to fill all but the new-item budget, so the queue is
// size-constrained and the unseen count binds to the budget (backfill can't overfill).
const SEEN_COUNT = EFFECTIVE_SIZE - NEW_BUDGET; // 12
const UNSEEN_COUNT = 8;

// Fixed reference clock (injected into the helpers) so due/overdue anchoring is deterministic.
const NOW = new Date("2026-06-15T12:00:00.000Z");

let compFixture: OfficialQuestionFixture; // §2/§4 — has due SEEN cards + UNSEEN items
let seenIds: string[]; // the due/overdue seen fixture questions
let unseenIds: string[]; // the never-reviewed fixture questions

let freshFixture: OfficialQuestionFixture; // §2b/§3 — published questions, ZERO seen, ZERO due

async function sessionQuestionIds(sessionId: string): Promise<string[]> {
  const rows = await prisma.testSessionQuestion.findMany({
    where: { testSessionId: sessionId },
    select: { questionId: true },
  });
  return rows.map((r) => r.questionId);
}

beforeAll(async () => {
  compFixture = await createOfficialQuestion(prisma, {
    label: "adaptive-comp",
    count: SEEN_COUNT + UNSEEN_COUNT,
  });
  seenIds = compFixture.questionIds.slice(0, SEEN_COUNT);
  unseenIds = compFixture.questionIds.slice(SEEN_COUNT);

  // Mark the first SEEN_COUNT questions as due/overdue: last reviewed 30d ago, scheduled 5d before NOW.
  for (const questionId of seenIds) {
    await prisma.reviewState.create({
      data: {
        userId: compFixture.userId!,
        questionId,
        stability: 10,
        difficulty: 5,
        state: "review",
        lastReviewedAt: new Date(NOW.getTime() - 30 * DAY_MS),
        dueAt: new Date(NOW.getTime() - 5 * DAY_MS),
        reps: 3,
        lapses: 0,
      },
    });
  }

  // Fresh pool: published questions, no ReviewState at all (zero due, zero seen).
  freshFixture = await createOfficialQuestion(prisma, { label: "adaptive-fresh", count: 5 });
});

afterAll(async () => {
  // FK-safe: deleting the user cascades its ReviewState/session rows, freeing the questions.
  await compFixture.cleanup();
  await freshFixture.cleanup();
  await prisma.$disconnect();
});

describe("queue-driven review sessions through production paths (wave11-06)", () => {
  it("startAdaptiveReview includes all due cards and caps unseen at the new-item budget (§2)", async () => {
    const sessionId = await startAdaptiveReview(compFixture.userId!, compFixture.categoryId, NOW);
    expect(typeof sessionId).toBe("string");
    expect(sessionId.length).toBeGreaterThan(0);

    const session = await prisma.testSession.findUnique({ where: { id: sessionId } });
    expect(session).not.toBeNull();
    expect(session!.mode).toBe("ADAPTIVE_REVIEW");

    const picked = await sessionQuestionIds(sessionId);
    const pickedSet = new Set(picked);
    // No duplicates, non-empty, within the effective size.
    expect(picked.length).toBe(pickedSet.size);
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.length).toBeLessThanOrEqual(EFFECTIVE_SIZE);

    // Due-first composition: every due SEEN fixture card is present.
    for (const id of seenIds) expect(pickedSet.has(id)).toBe(true);

    // Unseen items are bounded by the new-item budget (never swamp the review lane).
    const newInSession = picked.filter((id) => unseenIds.includes(id));
    expect(newInSession.length).toBeLessThanOrEqual(NEW_BUDGET);
  });

  it("startAdaptiveReview yields a non-empty session when nothing is due or seen (§2b fallback)", async () => {
    const sessionId = await startAdaptiveReview(freshFixture.userId!, freshFixture.categoryId, NOW);
    const picked = await sessionQuestionIds(sessionId);
    expect(picked.length).toBeGreaterThan(0);
    // Fallback pulls only from the fresh pool's own published questions.
    for (const id of picked) expect(freshFixture.questionIds).toContain(id);
  });

  it("startSpacedReview throws NothingDueError when the user has no seen cards (§3)", async () => {
    await expect(
      startSpacedReview(freshFixture.userId!, freshFixture.categoryId, NOW),
    ).rejects.toThrow(NothingDueError);
  });

  it("ADAPTIVE_REVIEW is startable through startTestAction (§4 production path)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: compFixture.userId!,
      role: "USER",
      selectedCategoryId: compFixture.categoryId,
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

    const before = await prisma.testSession.count({
      where: { userId: compFixture.userId!, mode: "ADAPTIVE_REVIEW" },
    });

    const fd = new FormData();
    fd.set("mode", "ADAPTIVE_REVIEW");
    // On success the action redirect()s to /test/{id}, which throws NEXT_REDIRECT — assert the DB row.
    let threw = false;
    try {
      await startTestAction(fd);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);

    const after = await prisma.testSession.count({
      where: { userId: compFixture.userId!, mode: "ADAPTIVE_REVIEW" },
    });
    expect(after).toBe(before + 1);
  });
});
