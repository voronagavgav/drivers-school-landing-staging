import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { computeDueNudges } from "@/lib/server/nudges";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// wave16-11 (spec T3): the retake win-back nudge flows through the REAL computeDueNudges. The
// exam is fixed at Kyiv-day 2026-07-01; NOW mid-afternoon so the Europe/Kyiv day is unambiguous.
// DAY8 = 8 Kyiv-days after the exam (window opens), DAY9 = 9 (still open). examOutcomeReportedAt
// sits before the exam-render times so a created RETAKE_WINBACK row (real createdAt) is >= it,
// which the server one-shot rule uses to suppress the second impression.
const EXAM = new Date("2026-07-01T06:00:00.000Z"); // Kyiv 2026-07-01
const DAY8 = new Date("2026-07-09T12:00:00.000Z"); // Kyiv 2026-07-09 → 8 days later
const DAY9 = new Date("2026-07-10T12:00:00.000Z"); // Kyiv 2026-07-10 → 9 days later
const REPORTED = new Date("2026-07-01T09:00:00.000Z");

const cleanups: Array<() => Promise<void>> = [];

async function fixture(label: string): Promise<OfficialQuestionFixture> {
  const f = await createOfficialQuestion(prisma, { label, count: 2 });
  cleanups.push(f.cleanup);
  return f;
}

/** Seed the self-reported outcome onto the user's study profile. */
async function setOutcome(
  userId: string,
  outcome: string | null,
  date: Date | null,
  reportedAt: Date | null,
): Promise<void> {
  await prisma.userStudyProfile.upsert({
    where: { userId },
    create: { userId, examOutcome: outcome, examOutcomeDate: date, examOutcomeReportedAt: reportedAt },
    update: { examOutcome: outcome, examOutcomeDate: date, examOutcomeReportedAt: reportedAt },
  });
}

function winbackRows(userId: string) {
  return prisma.notificationLog.findMany({
    where: { userId, kind: "RETAKE_WINBACK", channel: "inapp" },
  });
}

afterAll(async () => {
  for (const c of cleanups) await c();
  await prisma.$disconnect();
});

describe("computeDueNudges — retake win-back", () => {
  it("a. FAILED 8 Kyiv-days ago → a QUEUED RETAKE_WINBACK row is created", async () => {
    const f = await fixture("winback-emit");
    const userId = f.userId!;
    await setOutcome(userId, "FAILED", EXAM, REPORTED);

    const card = await computeDueNudges(userId, DAY8);
    expect(card?.kind).toBe("RETAKE_WINBACK");

    const rows = await winbackRows(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(card!.id);
    expect(rows[0].status).toBe("QUEUED");
  });

  it("b. one-shot: re-running on day 9 does NOT create a second win-back row", async () => {
    const f = await fixture("winback-oneshot");
    const userId = f.userId!;
    await setOutcome(userId, "FAILED", EXAM, REPORTED);

    const day8 = await computeDueNudges(userId, DAY8);
    expect(day8?.kind).toBe("RETAKE_WINBACK");

    const day9 = await computeDueNudges(userId, DAY9);
    expect(day9).toBeNull(); // window spent by the day-8 impression

    expect(await winbackRows(userId)).toHaveLength(1);
  });

  it("c. PASSED in the same window → no win-back row", async () => {
    const f = await fixture("winback-passed");
    const userId = f.userId!;
    await setOutcome(userId, "PASSED", EXAM, REPORTED);

    expect(await computeDueNudges(userId, DAY8)).toBeNull();
    expect(await winbackRows(userId)).toHaveLength(0);
  });

  it("d. cap competition: 4 rows already in the 7-day window → no win-back row (cap honored)", async () => {
    const f = await fixture("winback-capped");
    const userId = f.userId!;
    await setOutcome(userId, "FAILED", EXAM, REPORTED);
    for (let i = 0; i < 4; i++) {
      await prisma.notificationLog.create({
        data: {
          userId,
          kind: "REVIEW_DUE",
          channel: "inapp",
          status: "SENT",
          sentAt: new Date(DAY8.getTime() - (i + 1) * 86_400_000),
          createdAt: new Date(DAY8.getTime() - (i + 1) * 86_400_000),
          dedupeKey: "winback-filler:" + i + ":" + userId,
        },
      });
    }

    expect(await computeDueNudges(userId, DAY8)).toBeNull();
    expect(await winbackRows(userId)).toHaveLength(0);
  });

  it("e. no outcome set → unchanged behaviour (win-back never interferes)", async () => {
    const f = await fixture("winback-none");
    const userId = f.userId!;
    // A due card so an ordinary REVIEW_DUE still fires with no outcome present.
    await prisma.reviewState.create({
      data: {
        userId,
        questionId: f.questionIds[0],
        stability: 3,
        difficulty: 5,
        state: "review",
        dueAt: new Date(DAY8.getTime() - 60 * 60_000),
        lastReviewedAt: new Date(DAY8.getTime() - 60 * 60_000),
        reps: 1,
      },
    });

    const card = await computeDueNudges(userId, DAY8);
    expect(card?.kind).toBe("REVIEW_DUE");
    expect(await winbackRows(userId)).toHaveLength(0);
  });
});
