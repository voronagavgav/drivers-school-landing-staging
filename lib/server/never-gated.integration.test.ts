import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { submitAnswer } from "@/lib/server/test-engine";
import { startTestAction } from "@/app/actions/test";
import { computeProgress } from "@/lib/server/progress";
import { getTopicMap } from "@/lib/server/topic-map";
import { GET as qImageGET } from "@/app/api/q-image/[key]/route";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_EXAM_QUESTION_COUNT } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────────
// NEVER-GATED-CONTRACT — spec T1 free-forever regression (wave16-09).
//
// This file encodes the spec's "NEVER gated — assert in an integration test that
// stays forever" contract: with the entitlements master flag FULLY ON and a user
// who holds NO Entitlement row, every piece of the FREE-FOREVER set still works
// through the REAL entry paths (questions + all modes, the answer path with
// explanations, images, and progress history). It also re-locks the flag-OFF
// (inert) state. It deliberately imports NOTHING from the entitlement engine or
// its server gate module — the free-forever set must not even consult the gate
// (a verify gate greps this whole file for those import paths).
//
// This test MUST NEVER be weakened or deleted. Its assertions are the free-forever
// promise itself; a future wave's verify gate may grep for the NEVER-GATED-CONTRACT
// marker above to prove it still exists. If any assertion here FAILS, that is a
// gating (wave16-08) bug — fix the CODE, never soften an assertion here.
// ─────────────────────────────────────────────────────────────────────────────

let fix: OfficialQuestionFixture;
const EXPLAIN_SHORT = "коротке пояснення (не обрізане)";
const EXPLAIN_DETAILED = "детальне пояснення для регресії — повний зміст зберігається";

// The free-forever paths (startTestAction → startSession, submitAnswer) call
// requireUser() → getCurrentUser(). We never mint cookies in the node runtime,
// so mock the auth read to the fixture principal (house pattern).
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

// (c) IMAGES: throwaway original-tier image under a unique key (q-image route pattern).
const PUBLIC = path.join(process.cwd(), "public");
const IMG_KEY = `never_gated_qimg_${Date.now()}`;
const IMG_ORIGINAL = path.join(PUBLIC, "official-images", `${IMG_KEY}.png`);
const IMG_BYTES = Buffer.from("NEVER-GATED-PNG-DATA");

function mockPrincipal() {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: fix.userId!,
    role: "USER",
    selectedCategoryId: fix.categoryId,
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
}

/** Drive the REAL startTestAction and return the redirect target (NEXT_REDIRECT digest). */
async function drive(mode: string, topicId?: string | null): Promise<string> {
  mockPrincipal();
  const fd = new FormData();
  fd.set("mode", mode);
  if (topicId) fd.set("topicId", topicId);
  try {
    await startTestAction(fd);
  } catch (e) {
    return String((e as { digest?: string }).digest ?? (e as Error).message ?? "");
  }
  return "";
}

beforeAll(async () => {
  // A fixture user with NO Entitlement row + a throwaway published OFFICIAL pool
  // large enough to fill both a full EXAM (20) and a full practice session.
  fix = await createOfficialQuestion(prisma, {
    label: "never-gated",
    count: DEFAULT_EXAM_QUESTION_COUNT,
  });
  // Attach an explanation to the first question so (b) can prove the immediate-
  // feedback shape carries the FULL explanation content, never trimmed.
  await prisma.questionExplanation.create({
    data: {
      questionId: fix.questionId,
      shortText: EXPLAIN_SHORT,
      detailedText: EXPLAIN_DETAILED,
    },
  });

  mkdirSync(path.dirname(IMG_ORIGINAL), { recursive: true });
  writeFileSync(IMG_ORIGINAL, IMG_BYTES);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  if (existsSync(IMG_ORIGINAL)) rmSync(IMG_ORIGINAL);
  await fix.cleanup();
  await prisma.$disconnect();
});

// The whole free-forever set, proven with entitlements FULLY ON and NO grant.
describe("NEVER-GATED-CONTRACT — flag ON, no entitlement: the free-forever set still works", () => {
  it("a/e. QUESTIONS + MODES + SIMULATOR: startTestAction succeeds for TOPIC_PRACTICE and EXAM_SIMULATION", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");

    // TOPIC_PRACTICE on the fixture topic → session row created.
    const practiceTarget = await drive("TOPIC_PRACTICE", fix.topicId);
    expect(practiceTarget).toContain("/test/");
    const practice = await prisma.testSession.findFirst({
      where: { userId: fix.userId!, mode: "TOPIC_PRACTICE" },
      orderBy: { startedAt: "desc" },
    });
    expect(practice).not.toBeNull();
    expect(practice!.status).toBe("IN_PROGRESS");

    // EXAM_SIMULATION (the exam simulator) → session row created with the exam count.
    const examTarget = await drive("EXAM_SIMULATION");
    expect(examTarget).toContain("/test/");
    const exam = await prisma.testSession.findFirst({
      where: { userId: fix.userId!, mode: "EXAM_SIMULATION" },
      orderBy: { startedAt: "desc" },
    });
    expect(exam).not.toBeNull();
    expect(exam!.mode).toBe("EXAM_SIMULATION");
    // (e) SIMULATOR proof: it actually started with the full exam question count.
    expect(exam!.totalQuestions).toBe(DEFAULT_EXAM_QUESTION_COUNT);
  });

  it("b. ANSWER PATH + EXPLANATIONS: submitAnswer returns the immediate-feedback shape with full explanation content", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");

    // Start a fresh practice session through the real action, then answer the
    // explanation-bearing question (in the pool, since count == pool size).
    await drive("TOPIC_PRACTICE", fix.topicId);
    const session = await prisma.testSession.findFirst({
      where: { userId: fix.userId!, mode: "TOPIC_PRACTICE" },
      orderBy: { startedAt: "desc" },
    });
    expect(session).not.toBeNull();

    const question = await prisma.question.findUniqueOrThrow({
      where: { id: fix.questionId },
      include: { options: true },
    });
    const correctOptionId = question.options.find((o) => o.isCorrect)!.id;

    const result = await submitAnswer({
      sessionId: session!.id,
      userId: fix.userId!,
      questionId: fix.questionId,
      selectedOptionId: correctOptionId,
    });

    // Immediate-feedback shape (TOPIC_PRACTICE reveals correctness at submit).
    expect(result.recorded).toBe(true);
    expect(result).toHaveProperty("isCorrect", true);
    expect(result).toHaveProperty("correctOptionId", correctOptionId);
    // Explanation content is returned in FULL — never trimmed away.
    expect(result).toHaveProperty("explanation");
    const explanation = (result as { explanation: { shortText: string | null; detailedText: string | null } | null })
      .explanation;
    expect(explanation).not.toBeNull();
    expect(explanation!.shortText).toBe(EXPLAIN_SHORT);
    expect(explanation!.detailedText).toBe(EXPLAIN_DETAILED);
  });

  it("c. IMAGES: the q-image route GET returns 200 for a live image key", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    const req = new NextRequest(`http://localhost/api/q-image/${encodeURIComponent(IMG_KEY)}`);
    const res = await qImageGET(req, { params: Promise.resolve({ key: IMG_KEY }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(IMG_BYTES)).toBe(true);
  });

  it("d. PROGRESS HISTORY: computeProgress and getTopicMap resolve for the non-entitled user", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    const progress = await computeProgress(fix.userId!, fix.categoryId);
    expect(typeof progress.totalAnswered).toBe("number");
    expect(typeof progress.accuracy).toBe("number");
    expect(Array.isArray(progress.topicStats)).toBe(true);

    const map = await getTopicMap(fix.userId!, fix.categoryId);
    expect(Array.isArray(map.weak)).toBe(true);
    expect(Array.isArray(map.learning)).toBe(true);
    expect(Array.isArray(map.strong)).toBe(true);
  });
});

// The SAME assertions, re-locked with the flag OFF (inert). Both states stay green forever.
describe("NEVER-GATED-CONTRACT — flag OFF (inert): the free-forever set still works", () => {
  it("a. QUESTIONS + MODES: startTestAction succeeds with the flag unset", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", undefined as unknown as string);

    const practiceTarget = await drive("TOPIC_PRACTICE", fix.topicId);
    expect(practiceTarget).toContain("/test/");
    const examTarget = await drive("EXAM_SIMULATION");
    expect(examTarget).toContain("/test/");
    const exam = await prisma.testSession.findFirst({
      where: { userId: fix.userId!, mode: "EXAM_SIMULATION" },
      orderBy: { startedAt: "desc" },
    });
    expect(exam!.totalQuestions).toBe(DEFAULT_EXAM_QUESTION_COUNT);
  });

  it("d. PROGRESS HISTORY: computeProgress and getTopicMap resolve with the flag unset", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", undefined as unknown as string);
    const progress = await computeProgress(fix.userId!, fix.categoryId);
    expect(typeof progress.totalAnswered).toBe("number");
    const map = await getTopicMap(fix.userId!, fix.categoryId);
    expect(Array.isArray(map.weak)).toBe(true);
  });
});
