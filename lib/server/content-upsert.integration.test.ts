import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { importOfficial } from "@/scripts/import-official";

// Spec F — the headline data-preservation guarantee, as a real integration test.
//
// The official-content loader (importOfficial, scripts/import-official.ts) UPSERTS every
// question/option by its stable content key (lib/content-key.ts) and NEVER deletes a
// user-progress row. This suite proves that contract end to end: it attaches real progress to
// a KNOWN already-seeded OFFICIAL question — a UserMistake, a SavedQuestion, and a TestAnswer
// whose selectedOptionId points at a real option (via a throwaway TestSession) — captures the
// question and option ids, then re-runs importOfficial and asserts the question/option ids are
// UNCHANGED and all three rows still exist and still reference valid (existing) ids.
//
// It also exercises the corrections-override layer (task 06): writing an override file for that
// questionKey and re-importing changes the question text IN PLACE (same id) while the same
// progress rows survive.
//
// A throwaway user holds all the progress (deleted in afterAll → its sessions/answers/mistakes/
// saved cascade). The known official question is NOT deleted: its original text is restored and
// the throwaway override file removed, so db:seed state and sibling suites are unaffected.

const OVERRIDE_DIR = path.join(process.cwd(), ".content-import", "overrides");

let userId: string;
let questionId: string;
let qKey: string;
let originalText: string;
let optionId: string;
let optKey: string;
let answerId: string;
let overridePath: string;

beforeAll(async () => {
  // Pick the known question by QUERY (robust to content changes), not a hard-coded key: the
  // first OFFICIAL question with a non-null questionKey and at least one keyed option.
  const known = await prisma.question.findFirstOrThrow({
    where: {
      sourceType: "OFFICIAL",
      questionKey: { not: null },
      options: { some: { optionKey: { not: null } } },
    },
    orderBy: { questionKey: "asc" },
    select: {
      id: true,
      questionKey: true,
      text: true,
      options: {
        where: { optionKey: { not: null } },
        select: { id: true, optionKey: true },
        take: 1,
      },
    },
  });
  questionId = known.id;
  qKey = known.questionKey!;
  originalText = known.text;
  optionId = known.options[0].id;
  optKey = known.options[0].optionKey!;
  overridePath = path.join(OVERRIDE_DIR, `${qKey}.json`);

  const u = await prisma.user.create({
    data: {
      name: "Content Upsert Test",
      email: `content-upsert-${Date.now()}@test.local`,
      passwordHash: "x",
      role: "USER",
    },
  });
  userId = u.id;

  // Real user progress on the known official question: a mistake, a save, and an answered
  // question (TestAnswer.selectedOptionId → a real option, via a throwaway session).
  await prisma.userMistake.create({ data: { userId, questionId } });
  await prisma.savedQuestion.create({ data: { userId, questionId } });
  const session = await prisma.testSession.create({
    data: { userId, mode: "EXAM_SIMULATION", status: "COMPLETED" },
  });
  const answer = await prisma.testAnswer.create({
    data: { testSessionId: session.id, questionId, selectedOptionId: optionId, isCorrect: false },
  });
  answerId = answer.id;
});

afterAll(async () => {
  // Remove the throwaway override file FIRST so no later import (e.g. db:seed) re-applies it.
  if (overridePath && existsSync(overridePath)) rmSync(overridePath, { force: true });
  // Delete the throwaway user — cascades its TestSession→TestAnswer, UserMistake, SavedQuestion.
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  // Restore the official question's original text (the override-edit test changed it in place)
  // so db:seed state and sibling suites are unaffected. The question itself is NOT deleted.
  await prisma.question
    .update({ where: { questionKey: qKey }, data: { text: originalText } })
    .catch(() => undefined);
  await prisma.$disconnect();
});

// Assert the three progress rows still exist AND still reference existing question/option ids.
async function expectProgressPreserved() {
  const mistake = await prisma.userMistake.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });
  expect(mistake).not.toBeNull();
  const saved = await prisma.savedQuestion.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });
  expect(saved).not.toBeNull();
  const answer = await prisma.testAnswer.findUnique({ where: { id: answerId } });
  expect(answer).not.toBeNull();
  // The answer still points at the SAME (valid, existing) question + option rows.
  expect(answer!.questionId).toBe(questionId);
  expect(answer!.selectedOptionId).toBe(optionId);
  const refQ = await prisma.question.findUnique({ where: { id: answer!.questionId } });
  expect(refQ).not.toBeNull();
  const refO = await prisma.questionOption.findUnique({
    where: { id: answer!.selectedOptionId! },
  });
  expect(refO).not.toBeNull();
}

describe("importOfficial re-import preserves ids and user progress (Spec F)", () => {
  it(
    "re-importing keeps the SAME question/option ids and all progress rows survive",
    async () => {
      await importOfficial(prisma);

      const q = await prisma.question.findUnique({
        where: { questionKey: qKey },
        select: { id: true },
      });
      expect(q?.id).toBe(questionId); // upsert-by-key preserved the question id

      const o = await prisma.questionOption.findUnique({
        where: { optionKey: optKey },
        select: { id: true },
      });
      expect(o?.id).toBe(optionId); // option id preserved too — selectedOptionId stays valid

      await expectProgressPreserved();
    },
    180_000,
  );

  it(
    "an override edit changes the question text in place (same id) and progress survives",
    async () => {
      const newText = `[wave7-08 override] ${originalText}`;
      writeFileSync(overridePath, JSON.stringify({ text: newText }), "utf-8");

      await importOfficial(prisma);

      const q = await prisma.question.findUnique({
        where: { questionKey: qKey },
        select: { id: true, text: true },
      });
      expect(q?.id).toBe(questionId); // edit-in-place: id unchanged
      expect(q?.text).toBe(newText); // ...but the text was replaced by the override file

      await expectProgressPreserved();
    },
    180_000,
  );
});
