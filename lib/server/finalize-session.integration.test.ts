import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer, finishSession, finalizeSession } from "@/lib/server/test-engine";
import { dayKeyInTimezone } from "@/lib/server/study-profile";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Wave 12b §G — finalizeSession retryability, proven through the PRODUCTION paths (real
// startSession/submitAnswer/finishSession over a self-provisioned OFFICIAL fixture):
//   (a) one real finish writes the streak fields, the completion day's StudyDay and TopicMastery;
//   (b) calling finalizeSession(sessionId) a SECOND time throws nothing and leaves streakCurrent/
//       streakBest and the day's StudyDay reviewCount/goalMet exactly as the finish left them
//       (the streak step is goalMet-gated + forward-only, so a retry can't double-advance);
//   (c) TopicMastery values are unchanged by the re-run (recompute converges — same answer spine).
// Snapshot rows (Progress/Readiness) are append-by-design and deliberately NOT asserted here.

const KYIV = "Europe/Kyiv";

async function correctOption(questionId: string) {
  const opts = await prisma.questionOption.findMany({ where: { questionId } });
  return opts.find((o) => o.isCorrect)!;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("finalizeSession — finish writes + re-run idempotence (§G)", () => {
  let fixture: OfficialQuestionFixture;
  let userId: string;
  let topicId: string;
  let sessionId: string;
  let today: string;

  beforeAll(async () => {
    fixture = await createOfficialQuestion(prisma, { label: "finalize", count: 2 });
    userId = fixture.userId!;
    topicId = fixture.topicId!;
    // dailyGoal 1 so the finish day's StudyDay is goalMet — since §G the streak advances ONLY on a
    // goal-met day, so without this the "streak written" half of (a) would never fire.
    await prisma.userStudyProfile.create({ data: { userId, dailyGoal: 1, timezone: KYIV } });
    today = dayKeyInTimezone(new Date(), KYIV);

    // ONE real finish flow: answer every fixture question correctly, then finish (which calls
    // finalizeSession inline). All assertions below observe this single flow's writes.
    sessionId = await startSession({
      userId,
      mode: "TOPIC_PRACTICE",
      categoryId: fixture.categoryId,
      topicId,
    });
    for (const questionId of fixture.questionIds) {
      const opt = await correctOption(questionId);
      await submitAnswer({ sessionId, userId, questionId, selectedOptionId: opt.id });
    }
    await finishSession(sessionId, userId);
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("(a) finish writes streak, the day's StudyDay and TopicMastery", async () => {
    const profile = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId } });
    expect(profile.streakCurrent).toBe(1); // fresh profile, goal met today → streak starts
    expect(profile.streakBest).toBe(1);
    expect(profile.lastStudyDay).toBe(today);

    const day = await prisma.studyDay.findUniqueOrThrow({
      where: { userId_day: { userId, day: today } },
    });
    expect(day.reviewCount).toBe(fixture.questionIds.length); // one bump per first-attempt answer
    expect(day.goalMet).toBe(true); // 2 answers ≥ goal 1

    const mastery = await prisma.topicMastery.findFirst({ where: { userId, topicId } });
    expect(mastery).not.toBeNull(); // touched-topic recompute materialised a row
    expect(mastery!.itemsSeen).toBe(fixture.questionIds.length);
  });

  it("(b)+(c) a second finalizeSession leaves streak/StudyDay/TopicMastery unchanged", async () => {
    const profileBefore = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId } });
    const dayBefore = await prisma.studyDay.findUniqueOrThrow({
      where: { userId_day: { userId, day: today } },
    });
    const masteryBefore = await prisma.topicMastery.findFirstOrThrow({ where: { userId, topicId } });

    // The retry path: same session id, no captured state — must not throw.
    await expect(finalizeSession(sessionId)).resolves.toBeUndefined();

    const profileAfter = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId } });
    expect(profileAfter.streakCurrent).toBe(profileBefore.streakCurrent); // no double-advance
    expect(profileAfter.streakBest).toBe(profileBefore.streakBest);
    expect(profileAfter.lastStudyDay).toBe(profileBefore.lastStudyDay);
    expect(profileAfter.freezeTokens).toBe(profileBefore.freezeTokens);

    const dayAfter = await prisma.studyDay.findUniqueOrThrow({
      where: { userId_day: { userId, day: today } },
    });
    expect(dayAfter.reviewCount).toBe(dayBefore.reviewCount); // no double-count
    expect(dayAfter.goalMet).toBe(dayBefore.goalMet);

    const masteryAfter = await prisma.topicMastery.findFirstOrThrow({ where: { userId, topicId } });
    expect(masteryAfter.meanR).toBe(masteryBefore.meanR); // recompute converges to the same values
    expect(masteryAfter.coverage).toBe(masteryBefore.coverage);
    expect(masteryAfter.band).toBe(masteryBefore.band);
    expect(masteryAfter.itemsSeen).toBe(masteryBefore.itemsSeen);
    expect(masteryAfter.itemsTotal).toBe(masteryBefore.itemsTotal);
  });
});
