import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { generateMetadata } from "@/app/q/[key]/page";
import sitemap from "@/app/sitemap";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Spec T5 (SEO gate half, wave16-14): drive the REAL `generateMetadata` (app/q/[key]/page.tsx) and
// `sitemap` (app/sitemap.ts) exports against the seeded DB, flipping `APP_ORIGIN` with vi.stubEnv to
// prove Gate 0. CLOSED (unset) → the page metadata carries `robots: noindex` and the sitemap lists
// ZERO `/q/` question URLs; OPEN (a public origin) → no noindex, and every servable public question
// (published+active+non-archived with a questionKey) appears in the sitemap, its count matching the
// DB count exactly (dynamic — seed-size-proof).
//
// The shared createOfficialQuestion fixture leaves `questionKey` null, so we PATCH a unique key onto
// the fixture question; it then counts as one servable public question in both the sitemap and the DB.

let fixture: OfficialQuestionFixture;
let questionId: string;
const KEY = `q_seo_${Date.now()}`; // per-run unique so a leftover row from a crashed run can't collide
const ORIGIN = "https://example.com";

beforeAll(async () => {
  fixture = await createOfficialQuestion(prisma, { label: "seoq" });
  questionId = fixture.questionId;
  await prisma.question.update({ where: { id: questionId }, data: { questionKey: KEY } });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("generateMetadata (app/q/[key]/page.tsx)", () => {
  it("emits robots noindex while the gate is closed (APP_ORIGIN unset)", async () => {
    vi.stubEnv("APP_ORIGIN", "");
    const meta = await generateMetadata({ params: Promise.resolve({ key: KEY }) });
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toBeUndefined();
  });

  it("drops noindex and advertises a canonical URL when the gate is open", async () => {
    vi.stubEnv("APP_ORIGIN", ORIGIN);
    const meta = await generateMetadata({ params: Promise.resolve({ key: KEY }) });
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toBe(`${ORIGIN}/q/${KEY}`);
  });
});

describe("sitemap (app/sitemap.ts)", () => {
  it("lists ZERO /q/ URLs while the gate is closed", async () => {
    vi.stubEnv("APP_ORIGIN", "");
    const entries = await sitemap();
    expect(entries.some((e) => e.url.includes("/q/"))).toBe(false);
    // The static landing entry is always present.
    expect(entries.some((e) => e.url.endsWith("/"))).toBe(true);
  });

  it("lists every servable public question when the gate is open, count matching the DB", async () => {
    vi.stubEnv("APP_ORIGIN", ORIGIN);
    const entries = await sitemap();
    const qUrls = entries.filter((e) => e.url.includes("/q/"));

    // The fixture key is present.
    expect(qUrls.some((e) => e.url === `${ORIGIN}/q/${KEY}`)).toBe(true);

    // The count equals the DB count of published+active+non-archived questions with a questionKey.
    const dbCount = await prisma.question.count({
      where: { isPublished: true, isActive: true, archivedAt: null, questionKey: { not: null } },
    });
    expect(qUrls.length).toBe(dbCount);
  });
});
