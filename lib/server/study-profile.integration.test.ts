import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer, finishSession } from "@/lib/server/test-engine";
import { setDailyGoalAction, setExamDateAction, dayKeyInTimezone } from "@/lib/server/study-profile";
import { getCurrentUser } from "@/lib/auth";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Wave 11 §F — proving the study-profile / streak / StudyDay logic through the PRODUCTION entry paths
// against the real seeded SQLite DB (test:integration config, which stubs `server-only`). Concerns:
//   §2 PROFILE ACTIONS (self-only RBAC): setDailyGoalAction/setExamDateAction mutate ONLY the
//      authenticated user's row (never a target userId), and reject invalid input without corrupting it.
//   §3 STUDYDAY BUMP: a real submitAnswer increments today's StudyDay.reviewCount and flips goalMet
//      once reviewCount >= dailyGoal.
//   §4 STREAK + FREEZE: three synthetic transitions driven through the real finishSession by seeding
//      profile.lastStudyDay/freezeTokens relative to today's Kyiv day key before each finish.
//
// Every fixture self-provisions OFFICIAL (isDemo=false) content via createOfficialQuestion (unique
// category/topic/codes per run) and tears it down FK-safely, so the suite never asserts shared content.

const MS_PER_DAY = 86_400_000;
const KYIV = "Europe/Kyiv";

// The actions read identity through getCurrentUser (via requireUser) — we never drive real cookies in
// the node runtime, so partial-mock the auth boundary and point it at the fixture user under test.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

/** ISO `YYYY-MM-DD` key `n` calendar days before `todayKey` (UTC-day-index math, DST-independent). */
function dayKeyMinus(todayKey: string, n: number): string {
  const [y, m, d] = todayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) - n * MS_PER_DAY);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

async function correctOption(questionId: string) {
  const opts = await prisma.questionOption.findMany({ where: { questionId } });
  return opts.find((o) => o.isCorrect)!;
}

function asSessionUser(id: string) {
  return { id, role: "USER" } as unknown as Awaited<ReturnType<typeof getCurrentUser>>;
}

afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// §2 — profile actions are SELF-ONLY: A's action mutates A's row, never B's.
// ---------------------------------------------------------------------------
describe("profile actions — self-only RBAC (§2)", () => {
  let fixtureA: OfficialQuestionFixture;
  let fixtureB: OfficialQuestionFixture;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    fixtureA = await createOfficialQuestion(prisma, { label: "sp-a", count: 1 });
    fixtureB = await createOfficialQuestion(prisma, { label: "sp-b", count: 1 });
    userAId = fixtureA.userId!;
    userBId = fixtureB.userId!;
    // Give BOTH users a materialised profile at schema defaults so "B unchanged" is a real assertion.
    await prisma.userStudyProfile.create({ data: { userId: userAId } });
    await prisma.userStudyProfile.create({ data: { userId: userBId } });
    // Every action call in this block authenticates as user A (self-only — no target-user param exists).
    vi.mocked(getCurrentUser).mockResolvedValue(asSessionUser(userAId));
  });

  afterAll(async () => {
    await fixtureA.cleanup();
    await fixtureB.cleanup();
  });

  it("setDailyGoalAction updates ONLY the authenticated user's goal", async () => {
    const fd = new FormData();
    fd.append("dailyGoal", "25");
    const state = await setDailyGoalAction(fd);
    expect(state).toEqual({ ok: true });

    const a = await prisma.userStudyProfile.findUnique({ where: { userId: userAId } });
    const b = await prisma.userStudyProfile.findUnique({ where: { userId: userBId } });
    expect(a!.dailyGoal).toBe(25);
    expect(b!.dailyGoal).toBe(15); // B untouched (schema default) — no cross-user write
  });

  it("setExamDateAction updates ONLY the authenticated user's exam date", async () => {
    const fd = new FormData();
    fd.append("examDate", "2026-12-01");
    const state = await setExamDateAction(fd);
    expect(state).toEqual({ ok: true });

    const a = await prisma.userStudyProfile.findUnique({ where: { userId: userAId } });
    const b = await prisma.userStudyProfile.findUnique({ where: { userId: userBId } });
    expect(a!.examDate?.toISOString().startsWith("2026-12-01")).toBe(true);
    expect(b!.examDate).toBeNull(); // B untouched
  });

  it("rejects an out-of-range daily goal without corrupting the row", async () => {
    const before = await prisma.userStudyProfile.findUnique({ where: { userId: userAId } });
    const fd = new FormData();
    fd.append("dailyGoal", "200"); // > max 100
    const state = await setDailyGoalAction(fd);
    expect(state).toHaveProperty("error");

    const after = await prisma.userStudyProfile.findUnique({ where: { userId: userAId } });
    expect(after!.dailyGoal).toBe(before!.dailyGoal); // unchanged — no write on invalid input
  });

  it("rejects a malformed exam date without corrupting the row", async () => {
    const before = await prisma.userStudyProfile.findUnique({ where: { userId: userAId } });
    const fd = new FormData();
    fd.append("examDate", "not-a-date");
    const state = await setExamDateAction(fd);
    expect(state).toHaveProperty("error");

    const after = await prisma.userStudyProfile.findUnique({ where: { userId: userAId } });
    expect(after!.examDate?.toISOString()).toBe(before!.examDate?.toISOString()); // unchanged
  });
});

// ---------------------------------------------------------------------------
// §3 — submitAnswer bumps today's StudyDay and flips goalMet at the threshold.
// ---------------------------------------------------------------------------
describe("StudyDay bump on submitAnswer (§3)", () => {
  let fixture: OfficialQuestionFixture;
  let userId: string;
  let categoryId: string;
  let topicId: string;
  let sessionId: string;
  const DAILY_GOAL = 3;

  beforeAll(async () => {
    fixture = await createOfficialQuestion(prisma, { label: "sp-day", count: DAILY_GOAL });
    userId = fixture.userId!;
    categoryId = fixture.categoryId;
    topicId = fixture.topicId!;
    // A small goal so the whole fixture pool crosses it — set via the real profile row.
    await prisma.userStudyProfile.create({ data: { userId, dailyGoal: DAILY_GOAL } });
    sessionId = await startSession({ userId, mode: "TOPIC_PRACTICE", categoryId, topicId });
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("increments today's reviewCount and flips goalMet at the goal", async () => {
    const today = dayKeyInTimezone(new Date(), KYIV);

    for (let i = 0; i < fixture.questionIds.length; i++) {
      const opt = await correctOption(fixture.questionIds[i]);
      await submitAnswer({ sessionId, userId, questionId: fixture.questionIds[i], selectedOptionId: opt.id });

      const row = await prisma.studyDay.findUnique({ where: { userId_day: { userId, day: today } } });
      expect(row).not.toBeNull();
      expect(row!.reviewCount).toBe(i + 1); // one bump per first-attempt answer
      expect(row!.goalMet).toBe(i + 1 >= DAILY_GOAL); // false until the goal is reached
    }
  });
});

// ---------------------------------------------------------------------------
// §4 — streak transitions through the real finishSession, one finish per case.
// ---------------------------------------------------------------------------
describe("streak + freeze via finishSession (§4)", () => {
  let fixture: OfficialQuestionFixture;
  let userId: string;
  let categoryId: string;
  let topicId: string;
  let today: string;

  beforeAll(async () => {
    fixture = await createOfficialQuestion(prisma, { label: "sp-streak", count: 6 });
    userId = fixture.userId!;
    categoryId = fixture.categoryId;
    topicId = fixture.topicId!;
    // dailyGoal 1 so the single answered question flips today's StudyDay.goalMet — since the Wave
    // 12b §G reconcile (finalizeSession) the streak advances ONLY on a goal-met StudyDay, never on
    // a bare finish (journal wave12b-04 criterion 5: goalMet days are exactly the streak's days).
    await prisma.userStudyProfile.create({ data: { userId, dailyGoal: 1 } });
    today = dayKeyInTimezone(new Date(), KYIV);
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  // Drive one real IN_PROGRESS session to a single finishSession (answers ≥1 question so today's
  // StudyDay meets the goal-1 threshold and the finish path has content to snapshot); the streak
  // transition is then decided by the seeded profile fields.
  async function runFinish() {
    const sessionId = await startSession({ userId, mode: "TOPIC_PRACTICE", categoryId, topicId });
    const opt = await correctOption(fixture.questionIds[0]);
    await submitAnswer({ sessionId, userId, questionId: fixture.questionIds[0], selectedOptionId: opt.id });
    await finishSession(sessionId, userId);
    return prisma.userStudyProfile.findUniqueOrThrow({ where: { userId } });
  }

  it("consecutive day (last = today−1): streak increments, no freeze", async () => {
    await prisma.userStudyProfile.update({
      where: { userId },
      data: {
        streakCurrent: 5,
        streakBest: 5,
        lastStudyDay: dayKeyMinus(today, 1),
        freezeTokens: 2,
        freezeAutoUsedOn: null,
      },
    });
    const after = await runFinish();
    expect(after.streakCurrent).toBe(6); // consecutive → +1
    expect(after.freezeTokens).toBe(2); // no token spent
    expect(after.freezeAutoUsedOn).toBeNull();
    expect(after.lastStudyDay).toBe(today);
    expect(after.streakBest).toBeGreaterThanOrEqual(5); // best never decreases
  });

  it("one missed day (last = today−2) with a token: auto-freeze preserves the streak", async () => {
    await prisma.userStudyProfile.update({
      where: { userId },
      data: {
        streakCurrent: 5,
        streakBest: 6,
        lastStudyDay: dayKeyMinus(today, 2),
        freezeTokens: 1,
        freezeAutoUsedOn: null,
      },
    });
    const after = await runFinish();
    expect(after.streakCurrent).toBe(6); // preserved (advances), NOT reset to 1
    expect(after.freezeTokens).toBe(0); // token consumed
    expect(after.freezeAutoUsedOn).toBe(today); // auto-freeze recorded
    expect(after.streakBest).toBeGreaterThanOrEqual(6); // best never decreases
  });

  it("multiple missed days (last = today−3): streak resets, tokens untouched", async () => {
    await prisma.userStudyProfile.update({
      where: { userId },
      data: {
        streakCurrent: 5,
        streakBest: 7,
        lastStudyDay: dayKeyMinus(today, 3),
        freezeTokens: 2,
        freezeAutoUsedOn: null,
      },
    });
    const after = await runFinish();
    expect(after.streakCurrent).toBe(1); // reset
    expect(after.freezeTokens).toBe(2); // no token spent on a ≥3-day gap
    expect(after.freezeAutoUsedOn).toBeNull();
    expect(after.streakBest).toBe(7); // best preserved (never decreases)
  });
});
