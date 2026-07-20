import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// ─────────────────────────────────────────────────────────────────────────────
// TEST PAGE — NO MINT ON RENDER (wave18-02, spec T2). `app/(app)/test/[id]/page.tsx`
// used the mint-capable `requirePlayableUser()`; a cookieless anon DIRECT-navigating
// to /test/<id> triggered getOrCreateAnonUser() → setAnonCookie() → cookies().set()
// DURING a Server Component GET render, which Next 16 forbids (500 + a wasted orphan
// anon User row). The fix: resolve identity with the READ-ONLY, flag-aware resolver
// (real → getAnonUser when VALUE_FIRST_FUNNEL on → requireUser). Minting stays in the
// "use server" actions (startTestAction / segment), which run BEFORE their redirect.
//
// This drives the REAL page component (per the CLAUDE.md dashboard pattern —
// `await TestPage(...)` runs the loaders + resolver; the returned JSX is never
// rendered, so client-component bodies never execute). Asserts, with the crux being
// the DATA-INTEGRITY property (User-row count around the render):
//   1. flag ON, no logged-in user, NO ds_anon_play cookie, render a non-owned id →
//      the call throws (NEXT_NOT_FOUND or NEXT_REDIRECT — NEVER a render that mints),
//      AND prisma.user.count() is UNCHANGED (no orphan anon row created by the render).
//   2. the real anon-play flow still works: drive the real startTestAction (which
//      mints via the ACTION) to create a session, then render TestPage for that owned
//      id → resolves WITHOUT throwing a /login redirect.
//
// We can't mint cookies in the node runtime, so we mock next/headers with an
// in-memory jar shared across the anon cookie's set/get (house pattern, see
// result-anon.integration.test.ts) and partial-mock getCurrentUser to flip
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
const { startTestAction } = await import("@/app/actions/test");
const { default: TestPage } = await import("@/app/(app)/test/[id]/page");

let fix: OfficialQuestionFixture;
let anonUserId: string;
let anonSessionId: string;
let anonCookie: string; // the ds_anon_play token minted by the action (restored for case 2)

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

/** Render TestPage; return whether it produced an element + the thrown digest (redirect/notFound). */
async function renderPage(id: string): Promise<{ ok: boolean; digest: string }> {
  try {
    const el = await TestPage({ params: Promise.resolve({ id }) });
    return { ok: el != null, digest: "" };
  } catch (e) {
    return { ok: false, digest: String((e as { digest?: string }).digest ?? (e as Error).message ?? "") };
  }
}

beforeAll(async () => {
  fix = await createOfficialQuestion(prisma, { label: "test-page-no-mint", count: 6 });

  // Mint an anon user + an IN_PROGRESS session it OWNS via the real anon-play ACTION path.
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
  anonCookie = jar.get("ds_anon_play")!;
  expect(anonCookie).toBeTruthy();
});

afterAll(async () => {
  // AnalyticsEvent.userId is onDelete:SetNull — clear any fire-and-forget rows first so they don't
  // orphan (null userId) and pollute future funnel counts.
  await prisma.analyticsEvent
    .deleteMany({ where: { userId: { in: [anonUserId, fix.userId!] } } })
    .catch(() => undefined);
  // Delete the anon user first — its sessions/answers cascade — then the fixture.
  await prisma.user.delete({ where: { id: anonUserId } }).catch(() => undefined);
  await fix.cleanup();
  vi.unstubAllEnvs();
  await prisma.$disconnect();
});

describe("test page no-mint — flag ON, cookieless anon direct-nav (data-integrity crux)", () => {
  it("1. renders read-only: no cookie set, no orphan User row minted by the render", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    jar.clear(); // cookieless: no ds_anon_play → getAnonUser() returns null → requireUser() → /login

    const before = await prisma.user.count();
    const res = await renderPage("nonexistent-session-id");
    const after = await prisma.user.count();

    // It must THROW (notFound / redirect) rather than render a null user or mint a cookie.
    expect(res.ok).toBe(false);
    expect(res.digest).toMatch(/NEXT_REDIRECT|404|NEXT_HTTP_ERROR_FALLBACK/);
    // The CRUX: the render created NO anon User row.
    expect(after).toBe(before);
    // And it never set the anon-play cookie during the GET render.
    expect(jar.has("ds_anon_play")).toBe(false);
  });
});

describe("test page no-mint — the real anon-play flow still works", () => {
  it("2. an anon renders their OWN in-progress session (minted by the ACTION, no /login redirect)", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    jar.set("ds_anon_play", anonCookie); // restore the action-minted cookie (case 1 cleared the jar)

    const res = await renderPage(anonSessionId);
    expect(res.digest).toBe("");
    expect(res.ok).toBe(true);
  });
});
