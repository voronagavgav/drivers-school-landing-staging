import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { getAnalyticsDashboard } from "@/lib/server/admin";
import { requireContentManager } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/auth";

// Full analytics-DASHBOARD aggregations against the real seeded SQLite DB
// (test:integration config, which stubs `server-only`). We seed a SELF-CONTAINED
// fixture (own user/category/questions/sessions/answers/events all stamped) inside the
// 7d window, then assert getAnalyticsDashboard folds them correctly: KPI counts, exam
// pass-rate, the funnel ordering, the time series, per-question most-answered/most-mistaken,
// device + referrer breakdowns. We also assert the ADMIN-ONLY gate the page relies on
// (requireContentManager) rejects a USER principal. All fixture rows are removed in afterAll.

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

const STAMP = Date.now();
const ANON = `dash-anon-${STAMP}`;

let userId: string;
let categoryId: string;
const questionIds: string[] = [];
const eventIds: string[] = [];

// A timestamp inside the window (1 hour ago) so every fixture row falls in 24h/7d/30d.
const recent = new Date(Date.now() - 60 * 60 * 1000);

async function makeQuestion(label: string): Promise<string> {
  const q = await prisma.question.create({
    data: {
      text: `DASH ${label} ${STAMP}`,
      isDemo: false,
      sourceType: "OFFICIAL",
      isPublished: true,
      isActive: true,
      categories: { connect: { id: categoryId } },
      options: {
        create: [
          { text: "right", isCorrect: true, displayOrder: 0 },
          { text: "wrong", isCorrect: false, displayOrder: 1 },
        ],
      },
    },
  });
  questionIds.push(q.id);
  return q.id;
}

async function makeEvent(eventName: string, extra: Record<string, unknown> = {}) {
  const ev = await prisma.analyticsEvent.create({
    data: {
      eventName,
      userId,
      anonymousId: ANON,
      createdAt: recent,
      ...extra,
    },
  });
  eventIds.push(ev.id);
  return ev;
}

let hotQuestionId: string; // most-answered + most-mistaken
let coldQuestionId: string;

beforeAll(async () => {
  const cat = await prisma.category.create({
    data: { code: `DASH${STAMP}`, title: "Dashboard fixture category" },
  });
  categoryId = cat.id;

  const user = await prisma.user.create({
    data: {
      name: "Dash User",
      email: `dash-${STAMP}@test.local`,
      passwordHash: "x",
      role: "USER",
      createdAt: recent, // counts as a new user in the window
    },
  });
  userId = user.id;

  hotQuestionId = await makeQuestion("hot");
  coldQuestionId = await makeQuestion("cold");

  // ---- Sessions: one passed exam, one failed exam, one practice (all completed) ----
  async function makeSession(opts: {
    mode: string;
    status: string;
    result?: string | null;
    answers: { questionId: string; isCorrect: boolean }[];
  }) {
    const s = await prisma.testSession.create({
      data: {
        userId,
        categoryId,
        mode: opts.mode,
        status: opts.status,
        result: opts.result ?? undefined,
        startedAt: recent,
        finishedAt: opts.status === "COMPLETED" ? recent : undefined,
        totalQuestions: opts.answers.length,
        correctAnswers: opts.answers.filter((a) => a.isCorrect).length,
        wrongAnswers: opts.answers.filter((a) => !a.isCorrect).length,
      },
    });
    for (const a of opts.answers) {
      await prisma.testAnswer.create({
        data: {
          testSessionId: s.id,
          questionId: a.questionId,
          isCorrect: a.isCorrect,
          answeredAt: recent,
        },
      });
    }
    return s.id;
  }

  // Exam #1 PASSED: hot correct, cold correct
  await makeSession({
    mode: "EXAM_SIMULATION",
    status: "COMPLETED",
    result: "PASSED",
    answers: [
      { questionId: hotQuestionId, isCorrect: true },
      { questionId: coldQuestionId, isCorrect: true },
    ],
  });
  // Exam #2 FAILED: hot wrong (the @@unique is per-session, so re-answering hot in a
  // DIFFERENT session is allowed → hot gets 2 answers, 1 wrong).
  await makeSession({
    mode: "EXAM_SIMULATION",
    status: "COMPLETED",
    result: "FAILED",
    answers: [{ questionId: hotQuestionId, isCorrect: false }],
  });
  // A practice session (different mode) — counts toward starts/completions + a category/mode breakdown.
  await makeSession({
    mode: "TOPIC_PRACTICE",
    status: "COMPLETED",
    result: null,
    answers: [{ questionId: hotQuestionId, isCorrect: true }],
  });

  // ---- Analytics events for the funnel + breakdowns ----
  await makeEvent("user_registered");
  await makeEvent("onboarding_completed");
  await makeEvent("test_started");
  await makeEvent("test_completed");
  // Client events with path/device/referrer for the breakdowns + time series. NOISE-PROOFING
  // (UX-FINDINGS / third recurrence): the dashboard breakdowns are TOP-N over the WHOLE shared dev
  // DB, and real browser-audit/UX-run traffic (60+ hits per path) repeatedly displaced a 2-event
  // fixture. Seed enough volume that the fixture path always clears any realistic noise floor.
  await makeEvent("client_event", {
    eventType: "page_view",
    path: `/dashboard?dash=${STAMP}`,
    deviceType: "mobile",
    referrer: "https://www.google.com/search?q=пдр",
  });
  for (let i = 0; i < 200; i++) {
    await makeEvent("client_event", {
      eventType: "page_view",
      path: `/dashboard?dash=${STAMP}`,
      deviceType: "mobile",
      referrer: "https://www.google.com/",
    });
  }
});

afterAll(async () => {
  vi.mocked(getCurrentUser).mockReset();
  for (const id of eventIds) {
    await prisma.analyticsEvent.delete({ where: { id } }).catch(() => undefined);
  }
  // Delete the user first → sessions/answers cascade, freeing the questions.
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  for (const id of questionIds) {
    await prisma.question.delete({ where: { id } }).catch(() => undefined);
  }
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("getAnalyticsDashboard — KPI + pass rate", () => {
  it("counts new users, events, starts/completions and exam pass rate in the window", async () => {
    const d = await getAnalyticsDashboard("7d");

    expect(d.range).toBe("7d");
    expect(d.totalUsers).toBeGreaterThanOrEqual(1);
    expect(d.newUsers).toBeGreaterThanOrEqual(1); // our fixture user
    // 3 sessions started, all completed.
    expect(d.testStarts).toBeGreaterThanOrEqual(3);
    expect(d.testCompletions).toBeGreaterThanOrEqual(3);
    expect(d.testCompletions).toBeLessThanOrEqual(d.testStarts);
    // 6 fixture events at least.
    expect(d.totalEvents).toBeGreaterThanOrEqual(6);
    // Exam pass rate is a clamped fraction (we have 1 passed of 2 completed exams in our
    // fixture; other seeded data may shift the global figure, so just assert the [0,1] range).
    expect(d.examPassRate).toBeGreaterThanOrEqual(0);
    expect(d.examPassRate).toBeLessThanOrEqual(1);
    // Active actors are non-negative.
    expect(d.activeDau).toBeGreaterThanOrEqual(0);
    expect(d.activeWau).toBeGreaterThanOrEqual(d.activeDau === 0 ? 0 : 0);
  });
});

describe("getAnalyticsDashboard — funnel", () => {
  it("orders the four steps and keeps conversion rates in [0,1]", async () => {
    const d = await getAnalyticsDashboard("7d");
    expect(d.funnel.map((s) => s.key)).toEqual([
      "registered",
      "onboarded",
      "first_test",
      "completed",
    ]);
    expect(d.funnel[0].rateFromTop).toBe(1);
    for (const s of d.funnel) {
      expect(s.rateFromTop).toBeGreaterThanOrEqual(0);
      expect(s.rateFromTop).toBeLessThanOrEqual(1);
      expect(s.rateFromPrev).toBeGreaterThanOrEqual(0);
      expect(s.rateFromPrev).toBeLessThanOrEqual(1);
      expect(Number.isFinite(s.rateFromPrev)).toBe(true);
    }
    // Our fixture user reached every funnel step → each count ≥ 1.
    for (const s of d.funnel) expect(s.count).toBeGreaterThanOrEqual(1);
  });
});

describe("getAnalyticsDashboard — time series + breakdowns", () => {
  it("returns a contiguous bucket series summing to ≤ total events", async () => {
    const d = await getAnalyticsDashboard("7d");
    expect(d.timeUnit).toBe("day");
    expect(d.eventsOverTime.length).toBeGreaterThan(0);
    const seriesTotal = d.eventsOverTime.reduce((a, b) => a + b.count, 0);
    expect(seriesTotal).toBeGreaterThanOrEqual(6); // our fixture events
    expect(seriesTotal).toBeLessThanOrEqual(d.totalEvents);
    // 24h range buckets hourly.
    const d24 = await getAnalyticsDashboard("24h");
    expect(d24.timeUnit).toBe("hour");
  });

  it("surfaces our fixture path, device, and referrer host in the breakdowns", async () => {
    const d = await getAnalyticsDashboard("7d");
    const path = d.topPaths.find((p) => p.name === `/dashboard?dash=${STAMP}`);
    expect(path?.count).toBeGreaterThanOrEqual(2);

    const mobile = d.byDevice.find((x) => x.name === "mobile");
    expect(mobile?.count ?? 0).toBeGreaterThanOrEqual(2);

    // Both referrers normalise to google.com host → folded into one bucket of ≥2.
    const google = d.byReferrer.find((r) => r.name === "www.google.com");
    expect(google?.count ?? 0).toBeGreaterThanOrEqual(2);

    // Category breakdown includes our fixture category (3 sessions).
    const cat = d.topCategories.find((c) => c.name.startsWith(`DASH${STAMP}`));
    expect(cat?.count ?? 0).toBeGreaterThanOrEqual(3);
  });
});

describe("getAnalyticsDashboard — per-question stats", () => {
  it("ranks the hot question as most-answered and most-mistaken with enriched labels", async () => {
    const d = await getAnalyticsDashboard("7d");

    const hotAnswered = d.mostAnswered.find((q) => q.questionId === hotQuestionId);
    expect(hotAnswered).toBeDefined();
    // hot was answered in 3 sessions → 3 answers.
    expect(hotAnswered!.timesAnswered).toBe(3);
    expect(hotAnswered!.text).toContain(`DASH hot ${STAMP}`);
    expect(hotAnswered!.isDemo).toBe(false);

    const hotMistaken = d.mostMistaken.find((q) => q.questionId === hotQuestionId);
    expect(hotMistaken).toBeDefined();
    expect(hotMistaken!.wrong).toBe(1); // one wrong answer (the failed exam)

    // The cold question was answered once, always correct → never in the mistaken list.
    const coldMistaken = d.mostMistaken.find((q) => q.questionId === coldQuestionId);
    expect(coldMistaken).toBeUndefined();

    // Every reported question stat is an aggregate, never an identity/raw row.
    for (const q of [...d.mostAnswered, ...d.mostMistaken]) {
      expect(typeof q.questionId).toBe("string");
      expect(typeof q.timesAnswered).toBe("number");
      expect(typeof q.wrong).toBe("number");
      expect(q.accuracy).toBeGreaterThanOrEqual(0);
      expect(q.accuracy).toBeLessThanOrEqual(1);
    }
  });
});

describe("getAnalyticsDashboard — ADMIN-ONLY gate", () => {
  it("requireContentManager (the page's gate) rejects a USER principal", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: userId,
      role: "USER",
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
    // requireContentManager redirect()s a USER → throws in the node runtime.
    await expect(requireContentManager()).rejects.toThrow();
  });

  it("allows an ADMIN principal through the gate", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: userId,
      role: "ADMIN",
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
    const u = await requireContentManager();
    expect(u.role).toBe("ADMIN");
  });
});
