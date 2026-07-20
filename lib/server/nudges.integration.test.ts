import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { computeDueNudges, dismissNudge } from "@/lib/server/nudges";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// wave14-03 (spec §A): the server nudge orchestration decides via the PURE decideNudge and PERSISTS a
// NotificationLog card, honouring the calm caps (≤1/day via emittedToday, ≤4/rolling-7d via IMPRESSIONS — rows CREATED in the window, dismissed or not)
// and cross-user scoping on dismiss. Direct-call justified: the real entry is a server-page render that
// vitest can't drive — the browser audit (wave14-14) covers the page path. NOW sits mid-afternoon so the
// Europe/Kyiv (default tz) local day is unambiguously 2026-07-02 (no midnight boundary).

const NOW = new Date("2026-07-02T12:00:00Z");
const DAY = "2026-07-02";
const past = new Date(NOW.getTime() - 60 * 60_000);
const yesterday = new Date(NOW.getTime() - 86_400_000);

const cleanups: Array<() => Promise<void>> = [];

/** A throwaway user/category with one past-due ReviewState (so countDueReviews sees a due card). */
async function fixtureWithDueReview(label: string): Promise<OfficialQuestionFixture> {
  const f = await createOfficialQuestion(prisma, { label, count: 2 });
  cleanups.push(f.cleanup);
  await prisma.reviewState.create({
    data: {
      userId: f.userId!,
      questionId: f.questionIds[0],
      stability: 3,
      difficulty: 5,
      state: "review",
      dueAt: past,
      lastReviewedAt: past,
      reps: 1,
    },
  });
  return f;
}

afterAll(async () => {
  for (const c of cleanups) await c();
  await prisma.$disconnect();
});

describe("computeDueNudges — REVIEW_DUE lifecycle (a→b→c)", () => {
  let f: OfficialQuestionFixture;
  let userId: string;
  const dedupeKey = () => "REVIEW_DUE:" + DAY + ":" + userId; // concat, never the helper

  beforeAll(async () => {
    f = await fixtureWithDueReview("nudge-life");
    userId = f.userId!;
  });

  it("a. returns REVIEW_DUE and persists a QUEUED inapp NotificationLog row", async () => {
    const card = await computeDueNudges(userId, NOW);
    expect(card?.kind).toBe("REVIEW_DUE");

    const row = await prisma.notificationLog.findUnique({
      where: { dedupeKey: dedupeKey() },
    });
    expect(row?.id).toBe(card!.id);
    expect(row?.status).toBe("QUEUED");
    expect(row?.channel).toBe("inapp");
    expect(row?.userId).toBe(userId);
  });

  it("b. second call the same day returns the SAME row (no duplicate)", async () => {
    const first = await computeDueNudges(userId, NOW);
    const second = await computeDueNudges(userId, NOW);
    expect(second?.id).toBe(first?.id);

    const rows = await prisma.notificationLog.findMany({
      where: { userId, dedupeKey: dedupeKey() },
    });
    expect(rows).toHaveLength(1);
  });

  it("c. dismissNudge flips the row to SENT + sentAt; a later call the same day returns null", async () => {
    const card = await computeDueNudges(userId, NOW);
    await dismissNudge(userId, card!.id, NOW);

    const row = await prisma.notificationLog.findUnique({ where: { id: card!.id } });
    expect(row?.status).toBe("SENT");
    expect(row?.sentAt?.getTime()).toBe(NOW.getTime());

    // emittedToday suppressor: the day's card is never re-shown once handled.
    expect(await computeDueNudges(userId, NOW)).toBeNull();
  });
});

describe("computeDueNudges — calm caps & settings", () => {
  it("d. returns null when ≥4 SENT nudges already fired in the rolling 7 days", async () => {
    const f = await fixtureWithDueReview("nudge-cap");
    const userId = f.userId!;
    for (let i = 0; i < 4; i++) {
      await prisma.notificationLog.create({
        data: {
          userId,
          kind: "REVIEW_DUE",
          channel: "inapp",
          status: "SENT",
          sentAt: yesterday,
          dedupeKey: "filler:" + i + ":" + userId, // not one of today's four keys
        },
      });
    }
    expect(await computeDueNudges(userId, NOW)).toBeNull();
  });

  it("d2. the cap counts IGNORED (still-QUEUED) impressions too — an ignoring user cannot get 7/week (wave14-review)", async () => {
    const f = await fixtureWithDueReview("nudge-cap-queued");
    const userId = f.userId!;
    // 4 impressions over the window that the user NEVER dismissed (status stays QUEUED, sentAt null).
    for (let i = 0; i < 4; i++) {
      await prisma.notificationLog.create({
        data: {
          userId,
          kind: "REVIEW_DUE",
          channel: "inapp",
          status: "QUEUED",
          createdAt: new Date(NOW.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
          dedupeKey: "queued-filler:" + i + ":" + userId,
        },
      });
    }
    expect(await computeDueNudges(userId, NOW)).toBeNull();
  });

  it("e. returns null when notifReviewDue is disabled despite due reviews", async () => {
    const f = await fixtureWithDueReview("nudge-off");
    const userId = f.userId!;
    await prisma.userSettings.create({
      data: { userId, notifReviewDue: false },
    });
    expect(await computeDueNudges(userId, NOW)).toBeNull();
  });
});

describe("dismissNudge — cross-user scope", () => {
  it("f. leaves user A's row untouched when dismissed with user B's id", async () => {
    const a = await fixtureWithDueReview("nudge-owner");
    const b = await createOfficialQuestion(prisma, { label: "nudge-other" });
    cleanups.push(b.cleanup);

    const card = await computeDueNudges(a.userId!, NOW);
    await dismissNudge(b.userId!, card!.id, NOW); // B tries to dismiss A's row

    const row = await prisma.notificationLog.findUnique({ where: { id: card!.id } });
    expect(row?.status).toBe("QUEUED");
    expect(row?.sentAt).toBeNull();
  });
});
