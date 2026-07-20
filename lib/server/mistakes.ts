import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { applyAnswer, newMistake, type MistakeState } from "@/lib/mistakes";
import { dueMistakes } from "@/lib/test-engine/selection";
import type { MistakeStatus } from "@/lib/constants";
import { requireIntelligenceAccess } from "./entitlements";

/**
 * Update the user's mistake bank after they answer a question.
 * - first-time correct  → nothing tracked
 * - wrong               → create (count 1) or increment existing
 * - correct on existing → advance the resolve streak (may RESOLVE it)
 */
export async function recordMistakeOutcome(
  userId: string,
  questionId: string,
  topicId: string | null,
  isCorrect: boolean,
  // Optional transaction client so this reconcile can compose inside submitAnswer's dual-write
  // `$transaction`; defaults to the module prisma so existing non-tx callers keep working.
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  const now = Date.now();
  const existing = await tx.userMistake.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });

  if (!existing) {
    if (isCorrect) return; // nothing to track
    const s = newMistake(now);
    await tx.userMistake.create({
      data: {
        userId,
        questionId,
        topicId: topicId ?? undefined,
        mistakeCount: s.mistakeCount,
        correctRepeatCount: s.correctRepeatCount,
        status: s.status,
        lastMistakeAt: new Date(now),
      },
    });
    return;
  }

  const prev: MistakeState = {
    mistakeCount: existing.mistakeCount,
    correctRepeatCount: existing.correctRepeatCount,
    status: existing.status as MistakeStatus,
    resolvedAt: existing.resolvedAt ? existing.resolvedAt.getTime() : null,
  };
  const next = applyAnswer(prev, isCorrect, now);

  await tx.userMistake.update({
    where: { id: existing.id },
    data: {
      mistakeCount: next.mistakeCount,
      correctRepeatCount: next.correctRepeatCount,
      status: next.status,
      resolvedAt: next.resolvedAt ? new Date(next.resolvedAt) : null,
      lastMistakeAt: isCorrect ? existing.lastMistakeAt : new Date(now),
    },
  });
}

/**
 * Count the user's ACTIVE mistakes that are DUE for review now, reusing the pure
 * `dueMistakes` predicate (spaced-repetition ladder) — no due logic lives here.
 * `now` is injectable so tests can pass a fixed clock; the only clock read is the default arg.
 */
export async function countDueMistakes(userId: string, now = Date.now()): Promise<number> {
  const mistakes = await prisma.userMistake.findMany({ where: { userId, status: "ACTIVE" } });
  const mapped = mistakes.map((m) => ({
    questionId: m.questionId,
    topicId: m.topicId,
    mistakeCount: m.mistakeCount,
    correctRepeatCount: m.correctRepeatCount,
    lastMistakeAt: m.lastMistakeAt.getTime(),
  }));
  return dueMistakes(mapped, now).length;
}

/**
 * Bare ACTIVE-mistake count — deliberately UNGATED: it powers the never-gated MISTAKE_PRACTICE
 * entry CTA on /mistakes when the analytics list itself is locked (wave16-08). A count exposes no
 * list content.
 */
export async function countActiveMistakes(userId: string): Promise<number> {
  return prisma.userMistake.count({ where: { userId, status: "ACTIVE" } });
}

/**
 * The mistake ANALYTICS list — a GATED intelligence surface (wave16-08): throws
 * EntitlementRequiredError for a non-entitled user while the master flag is on; inert with the
 * flag off. MISTAKE_PRACTICE session start never reads this (practice is never gated).
 */
export async function listMistakes(userId: string, onlyActive = true) {
  await requireIntelligenceAccess(userId);
  return prisma.userMistake.findMany({
    where: { userId, ...(onlyActive ? { status: "ACTIVE" } : {}) },
    orderBy: [{ mistakeCount: "desc" }, { lastMistakeAt: "desc" }],
    include: {
      question: { include: { topic: true, options: true, explanation: true } },
    },
  });
}
