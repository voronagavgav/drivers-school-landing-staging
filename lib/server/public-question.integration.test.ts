import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getPublicQuestion } from "@/lib/server/public-question";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Spec T5 (loader half, wave16-13): prove the PUBLIC `/q/[key]` loader `getPublicQuestion` is the
// access boundary for the unauthenticated route — it returns the full render shape ONLY for a
// question in the servable set (`isPublished && isActive && archivedAt === null`) matched by an exact
// `questionKey`, and `null` for every excluded case.
//
// The shared createOfficialQuestion fixture leaves `questionKey` null, so we PATCH a unique key (and a
// QuestionExplanation study-aid) onto the fixture question before the assertions. We flip one gating
// flag at a time and assert null, restoring the servable state after each so the cases are independent.

let fixture: OfficialQuestionFixture;
let questionId: string;
const KEY = `q_pub_${Date.now()}`; // per-run unique so a leftover row from a crashed run can't collide

// Two options with KNOWN displayOrder (out of insertion order) so we can prove the loader orders them.
const OPTIONS = [
  { text: "друга (правильна)", isCorrect: true, displayOrder: 1 },
  { text: "перша (хибна)", isCorrect: false, displayOrder: 0 },
];

beforeAll(async () => {
  fixture = await createOfficialQuestion(prisma, { label: "pubq", options: OPTIONS });
  questionId = fixture.questionId;
  await prisma.question.update({ where: { id: questionId }, data: { questionKey: KEY } });
  await prisma.questionExplanation.create({
    data: {
      questionId,
      shortText: "Коротке пояснення",
      detailedText: "Детальне пояснення для навчання",
      legalReference: "п. 1.1",
    },
  });
});

afterAll(async () => {
  await prisma.questionExplanation.deleteMany({ where: { questionId } }).catch(() => undefined);
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("getPublicQuestion", () => {
  it("returns the full public shape for a published/active/unarchived key", async () => {
    const q = await getPublicQuestion(KEY);
    expect(q).not.toBeNull();
    expect(q!.questionKey).toBe(KEY);
    expect(q!.text).toContain("pubq");
    // Options come back sorted by displayOrder ascending (0 then 1), NOT insertion order.
    expect(q!.options.map((o) => o.displayOrder)).toEqual([0, 1]);
    expect(q!.options[0].text).toBe("перша (хибна)");
    expect(q!.options[0].isCorrect).toBe(false);
    expect(q!.options[1].text).toBe("друга (правильна)");
    expect(q!.options[1].isCorrect).toBe(true);
    // Explanation relation is loaded.
    expect(q!.explanation?.shortText).toBe("Коротке пояснення");
    expect(q!.explanation?.detailedText).toBe("Детальне пояснення для навчання");
    expect(q!.explanation?.legalReference).toBe("п. 1.1");
  });

  it("returns null when the question is not published", async () => {
    await prisma.question.update({ where: { id: questionId }, data: { isPublished: false } });
    expect(await getPublicQuestion(KEY)).toBeNull();
    await prisma.question.update({ where: { id: questionId }, data: { isPublished: true } });
  });

  it("returns null when the question is inactive", async () => {
    await prisma.question.update({ where: { id: questionId }, data: { isActive: false } });
    expect(await getPublicQuestion(KEY)).toBeNull();
    await prisma.question.update({ where: { id: questionId }, data: { isActive: true } });
  });

  it("returns null when the question is archived", async () => {
    await prisma.question.update({ where: { id: questionId }, data: { archivedAt: new Date() } });
    expect(await getPublicQuestion(KEY)).toBeNull();
    await prisma.question.update({ where: { id: questionId }, data: { archivedAt: null } });
  });

  it("returns null for an unknown key", async () => {
    expect(await getPublicQuestion("q_definitely_absent_key")).toBeNull();
  });

  it("returns null for a malformed (non-q_) key without hitting the DB", async () => {
    expect(await getPublicQuestion("../etc/passwd")).toBeNull();
  });
});
