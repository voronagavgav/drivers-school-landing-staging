import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { bulkQuestionAction } from "@/app/admin/actions";
import { listQuestionsFiltered, NO_TOPIC_FILTER } from "@/lib/server/admin";
import { getCurrentUser } from "@/lib/auth";

// Admin question SEARCH/FILTER + BULK-ACTION proofs against the real seeded SQLite DB
// (test:integration config, which stubs `server-only`). We drive bulkQuestionAction as an ADMIN
// principal through a mocked auth boundary (we never drive real cookies in the node runtime) and
// assert: each bulk op makes the expected data change; archive is a SOFT archive (the row still
// exists, just flagged); search/filter predicates return the right rows; and a USER-role caller is
// rejected with NO write. A unique tag in each throwaway question's text lets us filter to exactly
// our fixtures so the seeded ~1691 questions never interfere. Everything is cleaned up in afterAll.

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

// bulkQuestionAction returns normally (no redirect) on success, so it reaches revalidatePath —
// which throws ("static generation store missing") outside a Next request store in the node test
// runtime. Stub next/cache to a no-op so we can exercise the real DB mutation + return value.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

const STAMP = Date.now();
const TAG = `BULKTEST-${STAMP}`; // unique substring embedded in every fixture question's text

let adminId: string;
let userId: string;
let categoryId: string;
let otherCategoryId: string;
let topicId: string;
const throwawayQuestionIds: string[] = [];

function asAdmin() {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: adminId,
    role: "ADMIN",
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
}
function asUser() {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: userId,
    role: "USER",
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
}

async function makeQuestion(opts: {
  suffix: string;
  isPublished?: boolean;
  isDemo?: boolean;
  imageUrl?: string | null;
}): Promise<string> {
  const q = await prisma.question.create({
    data: {
      text: `${TAG} ${opts.suffix}`,
      isDemo: opts.isDemo ?? false,
      sourceType: opts.isDemo ? "DEMO" : "OFFICIAL",
      isPublished: opts.isPublished ?? false,
      isActive: true,
      archivedAt: null,
      imageUrl: opts.imageUrl ?? null,
      categories: { connect: { id: categoryId } },
      options: {
        create: [
          { text: "right", isCorrect: true, displayOrder: 0 },
          { text: "wrong", isCorrect: false, displayOrder: 1 },
        ],
      },
    },
  });
  throwawayQuestionIds.push(q.id);
  return q.id;
}

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: {
      name: "Bulk Admin",
      email: `bulk-admin-${STAMP}@test.local`,
      passwordHash: "x",
      role: "ADMIN",
    },
  });
  adminId = admin.id;
  const user = await prisma.user.create({
    data: {
      name: "Bulk User",
      email: `bulk-user-${STAMP}@test.local`,
      passwordHash: "x",
      role: "USER",
    },
  });
  userId = user.id;
  const cat = await prisma.category.create({
    data: { code: `BLK${STAMP}`, title: "Bulk throwaway category" },
  });
  categoryId = cat.id;
  const cat2 = await prisma.category.create({
    data: { code: `BLZ${STAMP}`, title: "Bulk other category" },
  });
  otherCategoryId = cat2.id;
  const topic = await prisma.topic.create({
    data: { title: `Bulk topic ${STAMP}` },
  });
  topicId = topic.id;
  asAdmin();
});

afterAll(async () => {
  for (const id of throwawayQuestionIds) {
    await prisma.question.delete({ where: { id } }).catch(() => undefined);
  }
  await prisma.topic.delete({ where: { id: topicId } }).catch(() => undefined);
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
  await prisma.category.delete({ where: { id: otherCategoryId } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: adminId } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("listQuestionsFiltered — search & filters", () => {
  it("search by text returns only matching questions; published filter narrows further", async () => {
    asAdmin();
    const draftId = await makeQuestion({ suffix: "search-draft", isPublished: false });
    const pubId = await makeQuestion({ suffix: "search-pub", isPublished: true });

    const all = await listQuestionsFiltered({ search: TAG, pageSize: 500 });
    const ids = all.rows.map((r) => r.id);
    expect(ids).toContain(draftId);
    expect(ids).toContain(pubId);
    // The tag is unique to our fixtures, so total equals exactly what we created so far.
    expect(all.total).toBe(throwawayQuestionIds.length);

    const publishedOnly = await listQuestionsFiltered({
      search: TAG,
      status: "published",
      pageSize: 500,
    });
    const pubIds = publishedOnly.rows.map((r) => r.id);
    expect(pubIds).toContain(pubId);
    expect(pubIds).not.toContain(draftId);
  });

  it("demo, image and category filters select the right rows", async () => {
    asAdmin();
    const demoId = await makeQuestion({ suffix: "demo", isDemo: true });
    const imageId = await makeQuestion({ suffix: "img", imageUrl: "https://example.com/x.png" });

    const demoOnly = await listQuestionsFiltered({ search: TAG, demo: "demo", pageSize: 500 });
    expect(demoOnly.rows.map((r) => r.id)).toContain(demoId);
    expect(demoOnly.rows.every((r) => r.isDemo)).toBe(true);

    const officialOnly = await listQuestionsFiltered({ search: TAG, demo: "official", pageSize: 500 });
    expect(officialOnly.rows.map((r) => r.id)).not.toContain(demoId);

    const withImage = await listQuestionsFiltered({ search: TAG, image: "with", pageSize: 500 });
    expect(withImage.rows.map((r) => r.id)).toContain(imageId);
    expect(withImage.rows.every((r) => r.imageUrl)).toBe(true);

    const withoutImage = await listQuestionsFiltered({ search: TAG, image: "without", pageSize: 500 });
    expect(withoutImage.rows.map((r) => r.id)).not.toContain(imageId);

    // All fixtures are connected to categoryId; filtering by it returns them all.
    const byCat = await listQuestionsFiltered({ search: TAG, categoryId, pageSize: 500 });
    expect(byCat.total).toBe(throwawayQuestionIds.length);
  });

  it("no-topic filter sentinel returns questions with no topic", async () => {
    asAdmin();
    const noTopic = await listQuestionsFiltered({
      search: TAG,
      topicId: NO_TOPIC_FILTER,
      pageSize: 500,
    });
    // None of our fixtures have a topic yet, so the no-topic filter returns them all.
    expect(noTopic.total).toBe(throwawayQuestionIds.length);
    expect(noTopic.rows.every((r) => r.topic === null)).toBe(true);
  });
});

describe("bulkQuestionAction — mutations as an ADMIN principal", () => {
  it("publish then unpublish flips isPublished for the selected ids only", async () => {
    asAdmin();
    const a = await makeQuestion({ suffix: "bulk-pub-a", isPublished: false });
    const b = await makeQuestion({ suffix: "bulk-pub-b", isPublished: false });
    const untouched = await makeQuestion({ suffix: "bulk-pub-untouched", isPublished: false });

    const pub = await bulkQuestionAction({ action: "publish", ids: [a, b] });
    expect(pub.ok).toBe(true);
    expect(pub.affected).toBe(2);
    expect((await prisma.question.findUniqueOrThrow({ where: { id: a } })).isPublished).toBe(true);
    expect((await prisma.question.findUniqueOrThrow({ where: { id: b } })).isPublished).toBe(true);
    expect((await prisma.question.findUniqueOrThrow({ where: { id: untouched } })).isPublished).toBe(false);

    const unpub = await bulkQuestionAction({ action: "unpublish", ids: [a] });
    expect(unpub.ok).toBe(true);
    expect((await prisma.question.findUniqueOrThrow({ where: { id: a } })).isPublished).toBe(false);
    expect((await prisma.question.findUniqueOrThrow({ where: { id: b } })).isPublished).toBe(true);
  });

  it("archive is a SOFT archive — the row still exists, flagged archived/inactive/unpublished", async () => {
    asAdmin();
    const id = await makeQuestion({ suffix: "bulk-archive", isPublished: true });
    const res = await bulkQuestionAction({ action: "archive", ids: [id] });
    expect(res.ok).toBe(true);

    const row = await prisma.question.findUnique({ where: { id } });
    expect(row).not.toBeNull(); // NOT hard-deleted
    expect(row?.archivedAt).not.toBeNull();
    expect(row?.isActive).toBe(false);
    expect(row?.isPublished).toBe(false);
  });

  it("assignTopic sets topicId; clearTopic removes it", async () => {
    asAdmin();
    const id = await makeQuestion({ suffix: "bulk-topic" });

    const bad = await bulkQuestionAction({ action: "assignTopic", ids: [id], targetId: "" });
    expect(bad.ok).toBe(false); // missing target rejected

    const assigned = await bulkQuestionAction({ action: "assignTopic", ids: [id], targetId: topicId });
    expect(assigned.ok).toBe(true);
    expect((await prisma.question.findUniqueOrThrow({ where: { id } })).topicId).toBe(topicId);

    const cleared = await bulkQuestionAction({ action: "clearTopic", ids: [id] });
    expect(cleared.ok).toBe(true);
    expect((await prisma.question.findUniqueOrThrow({ where: { id } })).topicId).toBeNull();
  });

  it("assignCategory is additive — it adds a category without dropping existing ones", async () => {
    asAdmin();
    const id = await makeQuestion({ suffix: "bulk-cat" }); // already connected to categoryId
    const res = await bulkQuestionAction({
      action: "assignCategory",
      ids: [id],
      targetId: otherCategoryId,
    });
    expect(res.ok).toBe(true);

    const row = await prisma.question.findUniqueOrThrow({
      where: { id },
      include: { categories: { select: { id: true } } },
    });
    const catIds = row.categories.map((c) => c.id);
    expect(catIds).toContain(categoryId); // original preserved
    expect(catIds).toContain(otherCategoryId); // new one added
  });

  it("rejects an empty id list and an unknown topic/category target", async () => {
    asAdmin();
    const empty = await bulkQuestionAction({ action: "publish", ids: [] });
    expect(empty.ok).toBe(false);

    const id = await makeQuestion({ suffix: "bulk-bad-target" });
    const badTopic = await bulkQuestionAction({
      action: "assignTopic",
      ids: [id],
      targetId: "does-not-exist",
    });
    expect(badTopic.ok).toBe(false);
    const badCat = await bulkQuestionAction({
      action: "assignCategory",
      ids: [id],
      targetId: "does-not-exist",
    });
    expect(badCat.ok).toBe(false);
  });
});

describe("bulkQuestionAction — RBAC", () => {
  it("rejects a USER-role caller and performs no write", async () => {
    asAdmin();
    const id = await makeQuestion({ suffix: "rbac", isPublished: false });

    asUser();
    // requireContentManager() redirects (throws) a USER caller before any DB write.
    await expect(bulkQuestionAction({ action: "publish", ids: [id] })).rejects.toThrow();

    asAdmin();
    expect((await prisma.question.findUniqueOrThrow({ where: { id } })).isPublished).toBe(false);
  });
});
