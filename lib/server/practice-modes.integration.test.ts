import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer, finishSession } from "@/lib/server/test-engine";
import { startTestAction } from "@/app/actions/test";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";
import { getCurrentUser } from "@/lib/auth";
import { sectionFromQuestionKey } from "@/lib/content-key";
import { dayKeyInTimezone } from "@/lib/server/study-profile";
import {
  CATEGORY_B_BLUEPRINT,
  groupCandidatesByBlock,
} from "@/lib/exam-blueprint";
import {
  QUICK_COUNT,
  MARATHON_PAGE,
  SIGN_TRAINER_COUNT,
  DIAGNOSTIC_COUNT,
} from "@/lib/constants";

// wave15-07 — integration proof that the four Wave-15 practice modes (QUICK / MARATHON / SIGN_TRAINER
// / DIAGNOSTIC) are wired into the server start path (spec §B) as preset-driven sessions over the
// existing machinery, exactly like ADAPTIVE/SPACED_REVIEW were in Wave 11. Self-provisions its own
// OFFICIAL fixtures (throwaway category+topic+user, isDemo=false published questions) so it never
// asserts shared-seed content, and asserts SET MEMBERSHIP / COUNTS, never rng-shuffled ordering.
//
// §4 drives the REAL server action `startTestAction`, which calls `requireUser()` → `getCurrentUser()`.
// We never mint cookies in the node runtime, so mock the auth read to the fixture principal.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

let quickFix: OfficialQuestionFixture; // (a)/(g) — ≥12 published, fresh user
let marathonFix: OfficialQuestionFixture; // (c) — ≥25 published
let diagFix: OfficialQuestionFixture; // (d) — 20 published, throwaway category (no blueprint)
let goalFix: OfficialQuestionFixture; // (f) — dailyGoal 1

// (b) SIGN_TRAINER manual fixture (needs topic.displayOrder + imageKey control).
let signCatId: string;
let signTopicId: string;
let signNonSignTopicId: string;
let signMarkingTopicId: string;
let signDecoyTopicId: string;
let signUserId: string;
let signEligibleIds: string[]; // sign/marking topics (displayOrder 134/135) OR imageKey != null
let signExcludedIds: string[]; // non-sign topic, imageKey null
let signAllQuestionIds: string[];

// (e) blueprint fixture: fresh user against the SEEDED category B.
let catBId: string | null = null;
let blueprintUserId: string | null = null;
// The blueprint spread runs against the REAL seeded official cat-B corpus, bucketed by the stable
// questionKey→section (wave19b-06 drift-immune source). Availability is ample in every block, so the
// diagnostic returns the uncapped base Hamilton allocation. It skips ONLY on an empty/shrunken corpus,
// with the expected vector frozen for the CURRENT availability profile.
let blueprintReady = false;
let blueprintAvailability: Record<string, number> = {};

async function sessionQuestionIds(sessionId: string): Promise<string[]> {
  const rows = await prisma.testSessionQuestion.findMany({
    where: { testSessionId: sessionId },
    select: { questionId: true },
  });
  return rows.map((r) => r.questionId);
}

/** A session's pooled questions WITH each topic's displayOrder + official section, in display order. */
async function pooledWithDisplayOrder(sessionId: string) {
  const sqs = await prisma.testSessionQuestion.findMany({
    where: { testSessionId: sessionId },
    orderBy: { displayOrder: "asc" },
    include: {
      question: {
        select: { id: true, questionKey: true, topic: { select: { displayOrder: true } } },
      },
    },
  });
  return sqs.map((sq) => ({
    id: sq.questionId,
    displayOrder: sq.question.topic?.displayOrder ?? null,
    // official наказ section from the stable questionKey (the drift-immune bucketing source)
    section: sectionFromQuestionKey(sq.question.questionKey ?? ""),
  }));
}

/** Make one throwaway published OFFICIAL question on a specific category/topic with an optional image. */
async function makeSignQuestion(
  topicId: string,
  imageKey: string | null,
  i: number,
): Promise<string> {
  const q = await prisma.question.create({
    data: {
      text: `sign-mode Q${i}-${Date.now()}`,
      topicId,
      difficulty: 1,
      sourceType: "OFFICIAL",
      isDemo: false,
      isActive: true,
      isPublished: true,
      imageKey: imageKey ?? undefined,
      categories: { connect: { id: signCatId } },
      options: {
        create: [
          { text: "right", isCorrect: true, displayOrder: 0 },
          { text: "wrong", isCorrect: false, displayOrder: 1 },
        ],
      },
    },
  });
  return q.id;
}

beforeAll(async () => {
  quickFix = await createOfficialQuestion(prisma, { label: "pm-quick", count: 12 });
  marathonFix = await createOfficialQuestion(prisma, { label: "pm-marathon", count: 25 });
  diagFix = await createOfficialQuestion(prisma, { label: "pm-diag", count: 20 });
  goalFix = await createOfficialQuestion(prisma, { label: "pm-goal", count: 5 });
  await prisma.userStudyProfile.create({ data: { userId: goalFix.userId!, dailyGoal: 1 } });

  // (b) sign fixture bound to the LIVE topic mapping (wave15 review): signs topic at displayOrder 134
  // (§33 ДОРОЖНІ ЗНАКИ) + markings topic at 135 (§34 ДОРОЖНЯ РОЗМІТКА) — both pooled; a
  // technical-state DECOY topic at 132 (the wrong pre-review constant) whose imageless question must
  // be EXCLUDED, so a regression back to [132,133] fails here; plus a plain non-sign topic where only
  // imageKey-bearing questions qualify.
  const stamp = Date.now();
  const cat = await prisma.category.create({
    data: { code: `SIGNMODE_${stamp}`, title: "sign mode", isActive: true },
  });
  signCatId = cat.id;
  const signTopic = await prisma.topic.create({
    data: { title: `sign-topic-${stamp}`, isActive: true, displayOrder: 134 },
  });
  signTopicId = signTopic.id;
  const markingTopic = await prisma.topic.create({
    data: { title: `marking-topic-${stamp}`, isActive: true, displayOrder: 135 },
  });
  signMarkingTopicId = markingTopic.id;
  const decoyTopic = await prisma.topic.create({
    data: { title: `techstate-decoy-topic-${stamp}`, isActive: true, displayOrder: 132 },
  });
  signDecoyTopicId = decoyTopic.id;
  const nonSignTopic = await prisma.topic.create({
    data: { title: `nonsign-topic-${stamp}`, isActive: true, displayOrder: 777 },
  });
  signNonSignTopicId = nonSignTopic.id;

  const signIds: string[] = [];
  for (let i = 0; i < 3; i++) signIds.push(await makeSignQuestion(signTopicId, null, i));
  const markingIds: string[] = [await makeSignQuestion(signMarkingTopicId, null, 5)];
  const imageIds: string[] = [];
  for (let i = 0; i < 3; i++) imageIds.push(await makeSignQuestion(signNonSignTopicId, `img-${stamp}-${i}`, 10 + i));
  signExcludedIds = [];
  for (let i = 0; i < 2; i++) signExcludedIds.push(await makeSignQuestion(signNonSignTopicId, null, 20 + i));
  signExcludedIds.push(await makeSignQuestion(signDecoyTopicId, null, 30)); // decoy@132, imageless
  signEligibleIds = [...signIds, ...markingIds, ...imageIds];
  signAllQuestionIds = [...signEligibleIds, ...signExcludedIds];

  const signUser = await prisma.user.create({
    data: {
      name: "sign mode user",
      email: `sign-mode-${stamp}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: signCatId,
    },
  });
  signUserId = signUser.id;

  // (e) blueprint fixture: seeded category B + fresh user. Ready only when EVERY non-remainder block
  // resolves ≥3 published OFFICIAL cat-B questions (max per-block allocation is 2 at DIAGNOSTIC_COUNT).
  const catB = await prisma.category.findFirst({ where: { code: "B" } });
  if (catB) {
    catBId = catB.id;
    // Availability per block bucketed by the STABLE questionKey → section (the same drift-immune
    // source the diagnostic composer uses since wave19b-06), NOT by Topic.displayOrder — the §8/§16
    // double-import drifts displayOrder by +1/+2, so the old +99 count mis-bucketed nearly everything
    // to pdr and reported a false structure=1 profile.
    const catBPool = await prisma.question.findMany({
      where: {
        isDemo: false,
        isPublished: true,
        isActive: true,
        archivedAt: null,
        categories: { some: { code: "B" } },
      },
      select: { id: true, questionKey: true },
    });
    const availGroups = groupCandidatesByBlock(
      CATEGORY_B_BLUEPRINT,
      catBPool.map((q) => ({ id: q.id, section: sectionFromQuestionKey(q.questionKey ?? "") })),
    );
    blueprintAvailability = Object.fromEntries(
      Object.entries(availGroups).map(([k, ids]) => [k, ids.length]),
    );
    // Ready = the real corpus can fill a 15-question diagnostic AND has enough in each of the FOUR
    // strata (wave19d-03 blueprint: structure 4 · safety 4 · medical 2 · pdr remainder 10) to satisfy
    // the base Hamilton allocation at count 15 (structure 3 · safety 3 · medical 2 · pdr 7) WITHOUT
    // capping. Minimums are set to the FIXED nominal quotas (≥4/≥4/≥2/≥10), well above the count-15
    // allocation, so no block caps. If a future content import drops a block below this, the guard
    // flips to skip with a loud message → re-freeze the vector.
    blueprintReady =
      catBPool.length >= DIAGNOSTIC_COUNT &&
      blueprintAvailability.structure >= 4 &&
      blueprintAvailability.safety >= 4 &&
      blueprintAvailability.medical >= 2 &&
      blueprintAvailability.pdr >= 10;
    const u = await prisma.user.create({
      data: {
        name: "blueprint diag user",
        email: `pm-blueprint-${Date.now()}@test.local`,
        passwordHash: "x",
        role: "USER",
        selectedCategoryId: catBId,
      },
    });
    blueprintUserId = u.id;
  }
});

afterAll(async () => {
  await quickFix.cleanup();
  await marathonFix.cleanup();
  await diagFix.cleanup();
  await goalFix.cleanup();

  // Sign fixture — FK-safe: user (cascades sessions/reviewstate) → questions → topics → category.
  await prisma.user.delete({ where: { id: signUserId } }).catch(() => undefined);
  await prisma.question.deleteMany({ where: { id: { in: signAllQuestionIds } } }).catch(() => undefined);
  await prisma.topic.delete({ where: { id: signTopicId } }).catch(() => undefined);
  await prisma.topic.delete({ where: { id: signMarkingTopicId } }).catch(() => undefined);
  await prisma.topic.delete({ where: { id: signDecoyTopicId } }).catch(() => undefined);
  await prisma.topic.delete({ where: { id: signNonSignTopicId } }).catch(() => undefined);
  await prisma.category.delete({ where: { id: signCatId } }).catch(() => undefined);

  // Blueprint user (its DIAGNOSTIC session cascades); the seeded cat-B content is left untouched.
  if (blueprintUserId) await prisma.user.delete({ where: { id: blueprintUserId } }).catch(() => undefined);

  await prisma.$disconnect();
});

describe("Wave-15 practice modes wired into the server start path (wave15-07)", () => {
  it("QUICK yields exactly QUICK_COUNT rows for a fresh user (a)", async () => {
    const sessionId = await startSession({
      userId: quickFix.userId!,
      mode: "QUICK",
      categoryId: quickFix.categoryId,
    });
    const session = await prisma.testSession.findUnique({ where: { id: sessionId } });
    expect(session!.mode).toBe("QUICK");

    const picked = await sessionQuestionIds(sessionId);
    expect(picked.length).toBe(QUICK_COUNT); // 10
    expect(new Set(picked).size).toBe(picked.length); // no duplicates
    for (const id of picked) expect(quickFix.questionIds).toContain(id);
  });

  it("SIGN_TRAINER pool = sign-topic OR image-bearing questions only (b)", async () => {
    const sessionId = await startSession({
      userId: signUserId,
      mode: "SIGN_TRAINER",
      categoryId: signCatId,
    });
    const session = await prisma.testSession.findUnique({ where: { id: sessionId } });
    expect(session!.mode).toBe("SIGN_TRAINER");

    const picked = await sessionQuestionIds(sessionId);
    const eligible = new Set(signEligibleIds);
    for (const id of picked) expect(eligible.has(id)).toBe(true);
    // The imageKey-less non-sign questions must be ABSENT.
    for (const id of signExcludedIds) expect(picked).not.toContain(id);
    expect(picked.length).toBe(Math.min(SIGN_TRAINER_COUNT, signEligibleIds.length)); // min(20, 6) = 6
  });

  it("MARATHON first page has exactly MARATHON_PAGE rows, IN_PROGRESS (c)", async () => {
    const sessionId = await startSession({
      userId: marathonFix.userId!,
      mode: "MARATHON",
      categoryId: marathonFix.categoryId,
    });
    const session = await prisma.testSession.findUnique({ where: { id: sessionId } });
    expect(session!.mode).toBe("MARATHON");
    expect(session!.status).toBe("IN_PROGRESS");

    const picked = await sessionQuestionIds(sessionId);
    expect(picked.length).toBe(MARATHON_PAGE); // 20
    expect(new Set(picked).size).toBe(picked.length);
  });

  it("DIAGNOSTIC fallback (no blueprint) yields min(DIAGNOSTIC_COUNT, pool) rows (d)", async () => {
    const sessionId = await startSession({
      userId: diagFix.userId!,
      mode: "DIAGNOSTIC",
      categoryId: diagFix.categoryId,
    });
    const session = await prisma.testSession.findUnique({ where: { id: sessionId } });
    expect(session!.mode).toBe("DIAGNOSTIC");

    const picked = await sessionQuestionIds(sessionId);
    expect(picked.length).toBe(Math.min(DIAGNOSTIC_COUNT, diagFix.questionIds.length)); // min(15, 20) = 15
    for (const id of picked) expect(diagFix.questionIds).toContain(id);
  });

  it("DIAGNOSTIC blueprint spread over seeded cat B has the frozen per-block vector (e)", async (ctx) => {
    ctx.skip(
      !blueprintReady,
      "seeded cat-B per-block availability fell below the base allocation — re-freeze the real-data vector",
    );
    const sessionId = await startSession({
      userId: blueprintUserId!,
      mode: "DIAGNOSTIC",
      categoryId: catBId,
    });
    const session = await prisma.testSession.findUnique({ where: { id: sessionId } });
    expect(session!.mode).toBe("DIAGNOSTIC");

    const pooled = await pooledWithDisplayOrder(sessionId);
    expect(pooled).toHaveLength(DIAGNOSTIC_COUNT); // 15

    const grouped = groupCandidatesByBlock(CATEGORY_B_BLUEPRINT, pooled);
    const c: Record<string, number> = {};
    for (const [key, ids] of Object.entries(grouped)) c[key] = ids.length;
    // REAL-DATA frozen vector (wave19d-03 4-strata blueprint, wave19b-06 drift-immune questionKey
    // bucketing). The seeded cat-B corpus has ample supply in every block (structure 50 · safety 177 ·
    // medical 59 · pdr 1471), so NO block is capped and the diagnostic returns the clean base Hamilton
    // allocation at 15: nominal {structure 4, safety 4, medical 2, pdr 10} × 15/20 → {3, 3, 1.5, 7.5},
    // floors {3,3,1,7}=14, +1 largest-remainder seat to medical(.5) (earlier in blueprint.blocks than
    // pdr(.5)) → {3,3,2,7}. Pre-verified via the production selectDiagnostic path (wave19e-04 Log).
    expect(c.structure).toBe(3);
    expect(c.safety).toBe(3);
    expect(c.medical).toBe(2);
    expect(c.pdr).toBe(7);
    // Invariant: no block exceeds what the corpus actually offers.
    for (const key of ["structure", "safety", "medical"] as const) {
      expect(c[key]).toBeLessThanOrEqual(blueprintAvailability[key]);
    }
    expect(c.structure + c.safety + c.medical + c.pdr).toBe(15);
  });

  it("QUICK answers count toward the daily goal (f)", async () => {
    const sessionId = await startSession({
      userId: goalFix.userId!,
      mode: "QUICK",
      categoryId: goalFix.categoryId,
    });
    const picked = await sessionQuestionIds(sessionId);
    const questionId = picked[0];
    const q = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });
    const correctOptionId = q!.options.find((o) => o.isCorrect)!.id;

    await submitAnswer({
      sessionId,
      userId: goalFix.userId!,
      questionId,
      selectedOptionId: correctOptionId,
    });
    await finishSession(sessionId, goalFix.userId!);

    const profile = await prisma.userStudyProfile.findUnique({
      where: { userId: goalFix.userId! },
    });
    const dayKey = dayKeyInTimezone(new Date(), profile!.timezone);
    const studyDay = await prisma.studyDay.findUnique({
      where: { userId_day: { userId: goalFix.userId!, day: dayKey } },
    });
    expect(studyDay).not.toBeNull();
    expect(studyDay!.reviewCount).toBeGreaterThanOrEqual(1);
    expect(studyDay!.goalMet).toBe(true);
  });

  it("QUICK is startable through startTestAction (g production path)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: quickFix.userId!,
      role: "USER",
      selectedCategoryId: quickFix.categoryId,
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

    const fd = new FormData();
    fd.set("mode", "QUICK");
    // On success the action redirect()s to /test/{id}, which throws NEXT_REDIRECT — inspect its digest.
    let redirectTarget = "";
    try {
      await startTestAction(fd);
    } catch (e) {
      redirectTarget = String((e as { digest?: string }).digest ?? (e as Error).message ?? "");
    }
    expect(redirectTarget).toContain("/test/");

    const session = await prisma.testSession.findFirst({
      where: { userId: quickFix.userId!, mode: "QUICK" },
      orderBy: { startedAt: "desc" },
    });
    expect(session).not.toBeNull();
    expect(session!.mode).toBe("QUICK");
  });
});
