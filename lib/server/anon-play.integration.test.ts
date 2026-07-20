import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// ─────────────────────────────────────────────────────────────────────────────
// ANON PLAY PATH (wave17-04) — a logged-OUT visitor plays a real question loop
// behind the VALUE_FIRST_FUNNEL flag, through the REAL server actions.
//
// startTestAction/submitAnswerAction resolve the acting user via
// requirePlayableUser(): a real user if logged in, else (flag ON) a lazily-minted
// isAnonymous:true user, else (flag OFF) the old requireUser()→/login gate. This
// drives those actions with NO logged-in user and asserts:
//   a. flag ON  → a TestSession owned by a fresh isAnonymous user (→ /test/, NOT /login),
//   b. submitAnswerAction records a TestAnswer for that anon session (real transport),
//   c. flag OFF → the same startTestAction redirects to /login,
//   5. content parity: the anon pool == a real user's for the same category/topic.
//
// We can't mint cookies in the node runtime, so we mock next/headers with an
// in-memory jar shared across the anon cookie's set/get (house pattern, see
// anon-session.integration.test.ts) and partial-mock getCurrentUser to flip
// anonymous vs. logged-in.
// ─────────────────────────────────────────────────────────────────────────────

const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
}));

vi.mock("@/lib/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(),
}));

// Imported AFTER the mocks so the actions resolve to the jar + mocked getCurrentUser.
const { getCurrentUser } = await import("@/lib/auth");
const { startTestAction, submitAnswerAction } = await import("@/app/actions/test");

let fix: OfficialQuestionFixture;
let anonUserId: string | null = null;
let anonSessionId: string;

/** Drive the REAL startTestAction and return the redirect target (NEXT_REDIRECT digest). */
async function driveStart(mode: string, topicId?: string | null): Promise<string> {
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
  fix = await createOfficialQuestion(prisma, { label: "anon-play", count: 6 });
  vi.mocked(getCurrentUser).mockResolvedValue(null);
});

afterAll(async () => {
  // Delete the anon user first — its sessions/answers cascade — then the fixture.
  if (anonUserId) await prisma.user.delete({ where: { id: anonUserId } }).catch(() => undefined);
  await fix.cleanup();
  vi.unstubAllEnvs();
  await prisma.$disconnect();
});

describe("anon play path — flag ON", () => {
  it("a. an anonymous visitor starts a TOPIC_PRACTICE loop on a freshly-minted isAnonymous user (→ /test/, not /login)", async () => {
    jar.clear();
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const target = await driveStart("TOPIC_PRACTICE", fix.topicId);
    expect(target).toContain("/test/");
    expect(target).not.toContain("/login");

    const session = await prisma.testSession.findFirst({
      where: {
        mode: "TOPIC_PRACTICE",
        user: { isAnonymous: true },
        questions: { some: { question: { topicId: fix.topicId } } },
      },
      orderBy: { startedAt: "desc" },
      include: { user: true },
    });
    expect(session).not.toBeNull();
    expect(session!.user.isAnonymous).toBe(true);
    // The no-PII guarantee: the anon owner carries no email/passwordHash.
    expect(session!.user.email).toBeNull();
    expect(session!.user.passwordHash).toBeNull();

    anonUserId = session!.userId;
    anonSessionId = session!.id;
  });

  it("b. submitAnswerAction records a TestAnswer for the anon session over the real transport", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const question = await prisma.question.findUniqueOrThrow({
      where: { id: fix.questionId },
      include: { options: true },
    });
    const optionId = question.options[0].id;

    const result = await submitAnswerAction({
      sessionId: anonSessionId,
      questionId: fix.questionId,
      selectedOptionId: optionId,
    });
    expect(result.recorded).toBe(true);

    const answer = await prisma.testAnswer.findUnique({
      where: {
        testSessionId_questionId: { testSessionId: anonSessionId, questionId: fix.questionId },
      },
    });
    expect(answer).not.toBeNull();
    expect(answer!.selectedOptionId).toBe(optionId);
  });

  it("5. content parity: the anon session's question count equals a real user's for the same category/topic", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: fix.userId!,
      role: "USER",
      selectedCategoryId: fix.categoryId,
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

    const target = await driveStart("TOPIC_PRACTICE", fix.topicId);
    expect(target).toContain("/test/");

    const realSession = await prisma.testSession.findFirst({
      where: { userId: fix.userId!, mode: "TOPIC_PRACTICE" },
      orderBy: { startedAt: "desc" },
    });
    const anonSession = await prisma.testSession.findUnique({ where: { id: anonSessionId } });

    expect(realSession).not.toBeNull();
    expect(anonSession!.totalQuestions).toBe(realSession!.totalQuestions);
  });
});

describe("anon play path — flag OFF (inert): the /login gate stays intact", () => {
  it("c. the same startTestAction (no session) redirects to /login", async () => {
    jar.clear();
    vi.stubEnv("VALUE_FIRST_FUNNEL", "");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const target = await driveStart("TOPIC_PRACTICE", fix.topicId);
    expect(target).toContain("/login");
    // No anon cookie is ever minted on the fallback path.
    expect(jar.size).toBe(0);
  });
});
