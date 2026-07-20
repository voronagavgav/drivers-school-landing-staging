import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// ─────────────────────────────────────────────────────────────────────────────
// SELF-SEGMENT ACTIONS (wave18-07) — the anon-capable ≤4-tap onboarding step
// (app/actions/segment.ts) driven through the REAL server actions.
//
// Each action resolves identity via requirePlayableUser(): a real user if logged
// in, else (flag ON) a lazily-minted isAnonymous user, else (flag OFF) the old
// requireUser()→/login gate. We assert:
//   a. flag ON  → segmentSelectCategoryAction mints an anon user, PERSISTS
//      selectedCategoryId on it, and redirects to /segment?step=timing,
//   b. flag OFF → the SAME action redirects to /login and mints NO anon row,
//   c. invalid timing/confidence values are DROPPED from the JTBD analytics; valid
//      ones fire onboarding_jtbd_answered (polled — it is `void recordEvent`),
//   d. the final confidence tap opens a REAL MIXED_PRACTICE session → /test/<id>.
//
// We can't mint cookies in the node runtime, so we mock next/headers with an
// in-memory jar shared across the anon cookie's set/get (house pattern, see
// anon-play.integration.test.ts) and partial-mock getCurrentUser to flip
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
const {
  segmentSelectCategoryAction,
  segmentAnswerTimingAction,
  segmentAnswerConfidenceAction,
} = await import("@/app/actions/segment");

let fix: OfficialQuestionFixture;
let anonUserId: string | null = null;

/** Drive a segment action and return its redirect target (NEXT_REDIRECT digest), or "". */
async function drive(
  action: (fd: FormData) => Promise<void>,
  entries: Record<string, string>,
): Promise<string> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  try {
    await action(fd);
  } catch (e) {
    return String((e as { digest?: string }).digest ?? (e as Error).message ?? "");
  }
  return "";
}

/** Count onboarding_jtbd_answered rows for a user whose payload names the given JTBD question. */
function jtbdCount(userId: string, question: string): Promise<number> {
  return prisma.analyticsEvent.count({
    where: {
      userId,
      eventName: "onboarding_jtbd_answered",
      payloadJson: { contains: `"question":"${question}"` },
    },
  });
}

beforeAll(async () => {
  fix = await createOfficialQuestion(prisma, { label: "segment", count: 6 });
  vi.mocked(getCurrentUser).mockResolvedValue(null);
});

afterAll(async () => {
  // Analytics FIRST (AnalyticsEvent.userId is SetNull — orphans would leak into other suites),
  // then the anon user (cascade sessions/answers), then the fixture.
  const ids = [anonUserId, fix.userId].filter(Boolean) as string[];
  if (ids.length) {
    await prisma.analyticsEvent
      .deleteMany({ where: { userId: { in: ids } } })
      .catch(() => undefined);
  }
  if (anonUserId) await prisma.user.delete({ where: { id: anonUserId } }).catch(() => undefined);
  await fix.cleanup();
  vi.unstubAllEnvs();
  await prisma.$disconnect();
});

describe("self-segment actions — flag ON (anon-reachable)", () => {
  it("a. segmentSelectCategoryAction mints an anon user, persists selectedCategoryId, redirects to timing", async () => {
    jar.clear();
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const target = await drive(segmentSelectCategoryAction, { categoryId: fix.categoryId });
    expect(target).toContain("/segment?step=timing");

    // A fresh anon row now owns the chosen (fixture) category — its selectedCategoryId proves persist.
    const anon = await prisma.user.findFirst({
      where: { isAnonymous: true, selectedCategoryId: fix.categoryId },
      orderBy: { createdAt: "desc" },
    });
    expect(anon).not.toBeNull();
    expect(anon!.selectedCategoryId).toBe(fix.categoryId);
    // The no-PII guarantee: the anon owner carries no email/passwordHash.
    expect(anon!.email).toBeNull();
    expect(anon!.passwordHash).toBeNull();

    anonUserId = anon!.id;
  });

  it("c. an invalid timing is dropped from JTBD analytics; a valid one fires it", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    // Invalid value → no onboarding_jtbd_answered for exam_timing, but still advances to confidence.
    const invalid = await drive(segmentAnswerTimingAction, { timing: "tomorrow" });
    expect(invalid).toContain("/segment?step=confidence");
    expect(await jtbdCount(anonUserId!, "exam_timing")).toBe(0);

    // Valid value → the JTBD row fires (void recordEvent → poll).
    const valid = await drive(segmentAnswerTimingAction, { timing: "week" });
    expect(valid).toContain("/segment?step=confidence");
    await vi.waitFor(async () => {
      expect(await jtbdCount(anonUserId!, "exam_timing")).toBe(1);
    });
  });

  it("c. an invalid confidence is dropped from JTBD analytics", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    // The confidence action also opens a session + redirects — we only assert the JTBD drop here.
    await drive(segmentAnswerConfidenceAction, { confidence: "maybe" });
    expect(await jtbdCount(anonUserId!, "confidence")).toBe(0);
  });

  it("d. the final valid confidence tap fires JTBD and opens a real MIXED_PRACTICE session (→ /test/)", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const before = await prisma.testSession.count({
      where: { userId: anonUserId!, mode: "MIXED_PRACTICE" },
    });

    const target = await drive(segmentAnswerConfidenceAction, { confidence: "confident" });
    expect(target).toContain("/test/");
    expect(target).not.toContain("/login");

    await vi.waitFor(async () => {
      expect(await jtbdCount(anonUserId!, "confidence")).toBe(1);
    });

    const after = await prisma.testSession.count({
      where: { userId: anonUserId!, mode: "MIXED_PRACTICE" },
    });
    expect(after).toBe(before + 1);
  });
});

describe("self-segment actions — flag OFF (inert): the /login gate stays intact", () => {
  it("b. segmentSelectCategoryAction redirects to /login and mints no anon row", async () => {
    jar.clear();
    vi.stubEnv("VALUE_FIRST_FUNNEL", "");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const before = await prisma.user.count();
    const target = await drive(segmentSelectCategoryAction, { categoryId: fix.categoryId });
    expect(target).toContain("/login");

    const after = await prisma.user.count();
    expect(after).toBe(before);
    // No anon cookie is ever minted on the fallback path.
    expect(jar.size).toBe(0);
  });
});
