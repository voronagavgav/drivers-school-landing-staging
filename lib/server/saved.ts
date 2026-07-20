import "server-only";
import { prisma } from "@/lib/db";
import { recordEvent } from "@/lib/analytics";

export async function listSavedQuestions(userId: string) {
  return prisma.savedQuestion.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      question: { include: { topic: true, options: { orderBy: { displayOrder: "asc" } }, explanation: true } },
    },
  });
}

export async function isSaved(userId: string, questionId: string): Promise<boolean> {
  const row = await prisma.savedQuestion.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });
  return Boolean(row);
}

export async function saveQuestion(userId: string, questionId: string): Promise<void> {
  await prisma.savedQuestion.upsert({
    where: { userId_questionId: { userId, questionId } },
    update: {},
    create: { userId, questionId },
  });
  void recordEvent("question_saved", userId, { questionId });
}

export async function unsaveQuestion(userId: string, questionId: string): Promise<void> {
  await prisma.savedQuestion
    .delete({ where: { userId_questionId: { userId, questionId } } })
    .catch(() => undefined); // ignore if already gone
  void recordEvent("question_unsaved", userId, { questionId });
}
