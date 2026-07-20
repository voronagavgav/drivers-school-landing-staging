import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { GET } from "@/app/api/offline-pack/[scope]/route";
import { createOfficialQuestion, type OfficialQuestionFixture } from "./__testutils__/official-question";

// Integration coverage for GET /api/offline-pack/[scope] (spec §E backend half):
//  - an authed topic fetch returns EXACTLY the topic's PUBLISHED servable questions
//    (an unpublished sibling is excluded), options carry isCorrect, and
//    estimatedImageBytes is a real number ≥ 0;
//  - no session → 401 { ok: false }; a garbage scope → 404 { ok: false };
//  - the "mistakes" literal returns only the caller's ACTIVE-mistake questions.
// Fixtures are throwaway via the shared createOfficialQuestion helper; the topic is
// fixture-owned so the pack's question set is fully deterministic.

// getCurrentUser reads the request cookie store (next/headers) which isn't available in
// the test runtime, so we mock it: default anonymous, overridden per-case to the fixture user.
vi.mock("@/lib/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(async () => null),
}));
import { getCurrentUser } from "@/lib/auth";

// Build a NextRequest and the Next 16 async-params shape, then call the handler.
function call(scope: string): Promise<Response> {
  const req = new NextRequest(`http://localhost/api/offline-pack/${encodeURIComponent(scope)}`);
  return GET(req, { params: Promise.resolve({ scope }) });
}

function loginAs(userId: string) {
  vi.mocked(getCurrentUser).mockResolvedValue({ id: userId } as never);
}

let fixture: OfficialQuestionFixture;
let unpublished: OfficialQuestionFixture;
let userId: string;

beforeAll(async () => {
  // Three published servable questions in a throwaway topic, plus the owning user.
  fixture = await createOfficialQuestion(prisma, { label: "offpack", count: 3 });
  userId = fixture.userId!;
  // An UNPUBLISHED sibling in the SAME topic/category — must never enter a pack.
  unpublished = await createOfficialQuestion(prisma, {
    label: "offpack-unpub",
    categoryId: fixture.categoryId,
    topicId: fixture.topicId,
    withUser: false,
    isPublished: false,
  });
  // One ACTIVE mistake (drives the "mistakes" scope) and one RESOLVED (must be excluded).
  await prisma.userMistake.create({
    data: { userId, questionId: fixture.questionIds[0], status: "ACTIVE" },
  });
  await prisma.userMistake.create({
    data: { userId, questionId: fixture.questionIds[1], status: "RESOLVED" },
  });
});

afterAll(async () => {
  // User-first cleanup cascades the UserMistake rows (User→UserMistake is Cascade).
  await unpublished.cleanup();
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("GET /api/offline-pack/[scope]", () => {
  it("returns 401 { ok: false } without a session", async () => {
    const res = await call(fixture.topicId!);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false });
  });

  it("returns 404 { ok: false } for a garbage scope", async () => {
    loginAs(userId);
    const res = await call("nope123");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false });
  });

  it("serves a topic pack with exactly the published questions, isCorrect options and a real size estimate", async () => {
    loginAs(userId);
    const res = await call(fixture.topicId!);
    expect(res.status).toBe(200);
    const pack = await res.json();

    expect(pack.ok).toBe(true);
    expect(pack.scope).toMatchObject({ type: "topic", id: fixture.topicId });
    expect(pack.truncated).toBe(false);

    // EXACTLY the fixture's published ids — the unpublished sibling is excluded.
    const ids = pack.questions.map((q: { id: string }) => q.id).sort();
    expect(ids).toEqual([...fixture.questionIds].sort());
    expect(ids).not.toContain(unpublished.questionId);

    // Options carry isCorrect (offline practice needs immediate feedback).
    for (const q of pack.questions) {
      expect(q.options.length).toBeGreaterThan(0);
      for (const o of q.options) expect(typeof o.isCorrect).toBe("boolean");
      expect(q.options.some((o: { isCorrect: boolean }) => o.isCorrect)).toBe(true);
    }

    // Honest size estimate: a real number (fixture questions have no imageKey → 0 is fine).
    expect(typeof pack.estimatedImageBytes).toBe("number");
    expect(pack.estimatedImageBytes).toBeGreaterThanOrEqual(0);
  });

  it("serves the caller's ACTIVE mistakes only for the 'mistakes' scope", async () => {
    loginAs(userId);
    const res = await call("mistakes");
    expect(res.status).toBe(200);
    const pack = await res.json();

    expect(pack.ok).toBe(true);
    expect(pack.scope.type).toBe("mistakes");
    // Only the ACTIVE mistake — not the RESOLVED one, not the rest of the topic.
    // (The seeded dev DB holds no mistakes for this throwaway user, so the set is exact.)
    expect(pack.questions.map((q: { id: string }) => q.id)).toEqual([fixture.questionIds[0]]);
  });
});
