import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// ─────────────────────────────────────────────────────────────────────────────
// RESULT PAGE ANON PAYOFF (wave18-01, spec T1) — the /result page must resolve
// identity leniently (real → getAnonUser when VALUE_FIRST_FUNNEL is on →
// requireUser) so a logged-OUT visitor can see the FREE value payoff (score /
// honest stats / «Розбір питань») for a session they OWN, while the readiness
// dial + offer card stay gated exactly as before.
//
// This drives the REAL page component (per the CLAUDE.md dashboard pattern —
// `await ResultPage(...)` runs the loaders + resolver; the returned JSX is never
// rendered, so client-component bodies never execute). Asserts:
//   1. flag ON, no logged-in user, anon owns a COMPLETED session → renders
//      WITHOUT throwing a NEXT_REDIRECT to /login.
//   2. IDOR: an anon requesting a session id owned by a DIFFERENT user → the
//      call throws NEXT_NOT_FOUND (own-session findFirst keys on the resolved id).
//   3. flag OFF + no logged-in user → the call throws the requireUser redirect
//      (digest contains NEXT_REDIRECT and target /login).
//   4. authed real user still renders (existing behaviour unchanged).
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

// Imported AFTER the mocks so the resolver + actions bind to the jar + mocked getCurrentUser.
const { getCurrentUser } = await import("@/lib/auth");
const { startTestAction, finishTestAction } = await import("@/app/actions/test");
const { default: ResultPage } = await import("@/app/(app)/test/[id]/result/page");

let fix: OfficialQuestionFixture;
let anonUserId: string;
let anonSessionId: string;
let realSessionId: string;

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

/** Render ResultPage; return whether it produced an element + the thrown digest (redirect/notFound). */
async function renderResult(id: string): Promise<{ ok: boolean; digest: string }> {
  try {
    const el = await ResultPage({ params: Promise.resolve({ id }) });
    return { ok: el != null, digest: "" };
  } catch (e) {
    return { ok: false, digest: String((e as { digest?: string }).digest ?? (e as Error).message ?? "") };
  }
}

beforeAll(async () => {
  fix = await createOfficialQuestion(prisma, { label: "result-anon", count: 6 });

  // Mint an anon user + a COMPLETED session it OWNS via the real anon-play path.
  jar.clear();
  vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
  vi.mocked(getCurrentUser).mockResolvedValue(null);
  const anonStart = await driveStart("TOPIC_PRACTICE", fix.topicId);
  expect(anonStart).toContain("/test/");
  const anonSession = await prisma.testSession.findFirst({
    where: {
      mode: "TOPIC_PRACTICE",
      user: { isAnonymous: true },
      questions: { some: { question: { topicId: fix.topicId } } },
    },
    orderBy: { startedAt: "desc" },
  });
  anonUserId = anonSession!.userId;
  anonSessionId = anonSession!.id;
  await finishTestAction({ sessionId: anonSessionId }).catch(() => undefined); // redirects → COMPLETED

  // A COMPLETED session owned by the REAL fixture user (the "different owner" for the IDOR case).
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: fix.userId!,
    role: "USER",
    selectedCategoryId: fix.categoryId,
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
  await driveStart("TOPIC_PRACTICE", fix.topicId);
  const realSession = await prisma.testSession.findFirst({
    where: { userId: fix.userId!, mode: "TOPIC_PRACTICE" },
    orderBy: { startedAt: "desc" },
  });
  realSessionId = realSession!.id;
  await finishTestAction({ sessionId: realSessionId }).catch(() => undefined);
});

afterAll(async () => {
  // AnalyticsEvent.userId is onDelete:SetNull — clear the fire-and-forget test_completed rows first
  // so they don't orphan (null userId) and pollute future funnel counts.
  await prisma.analyticsEvent
    .deleteMany({ where: { userId: { in: [anonUserId, fix.userId!] } } })
    .catch(() => undefined);
  // Delete the anon user first — its sessions/answers cascade — then the fixture (which owns the
  // real user + its session).
  await prisma.user.delete({ where: { id: anonUserId } }).catch(() => undefined);
  await fix.cleanup();
  vi.unstubAllEnvs();
  await prisma.$disconnect();
});

describe("result page anon payoff — flag ON", () => {
  it("1. an anon renders their OWN completed session's payoff (no /login redirect)", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await renderResult(anonSessionId);
    expect(res.digest).toBe("");
    expect(res.ok).toBe(true);
  });

  it("2. IDOR: an anon requesting another user's session id → NEXT_NOT_FOUND (no data leak)", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await renderResult(realSessionId);
    expect(res.ok).toBe(false);
    // Next's notFound() throws the 404 fallback digest in this version — never a /login redirect.
    expect(res.digest).toContain("404");
    expect(res.digest).not.toContain("/login");
  });
});

describe("result page — flag OFF (inert): the /login gate stays intact", () => {
  it("3. flag OFF + no logged-in user → the requireUser redirect to /login", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await renderResult(anonSessionId);
    expect(res.ok).toBe(false);
    expect(res.digest).toContain("NEXT_REDIRECT");
    expect(res.digest).toContain("/login");
  });
});

describe("result page — authed real user (unchanged)", () => {
  it("4. a logged-in user still renders their own completed session", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "");
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: fix.userId!,
      role: "USER",
      selectedCategoryId: fix.categoryId,
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

    const res = await renderResult(realSessionId);
    expect(res.digest).toBe("");
    expect(res.ok).toBe(true);
  });
});
