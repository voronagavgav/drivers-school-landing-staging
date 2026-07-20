"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/auth";
import { requirePlayableUser, getAnonUser } from "@/lib/server/anon-session";
import { isValueFirstFunnelEnabled } from "@/lib/funnel";
import {
  startSession,
  submitAnswer,
  finishSession,
  NoQuestionsError,
} from "@/lib/server/test-engine";
import { NothingDueError, extendSession, type ExtendSessionResult } from "@/lib/server/study";
import { prisma } from "@/lib/db";
import { saveQuestion, unsaveQuestion } from "@/lib/server/saved";
import {
  startTestSchema,
  submitAnswerSchema,
  setAnswerConfidenceSchema,
  finishTestSchema,
  toggleSaveSchema,
  removeSavedSchema,
  firstIssueMessage,
} from "@/lib/validation";

export async function startTestAction(formData: FormData): Promise<void> {
  // requirePlayableUser: real user → real user; else (flag on) a lazily-minted anon user; else
  // (flag off) the old requireUser()/login redirect. Same engine call for anon and real.
  const user = await requirePlayableUser();
  const mode = String(formData.get("mode") ?? "");
  const topicId = formData.get("topicId") ? String(formData.get("topicId")) : null;

  // Reject an unknown mode before touching the engine; mirror the empty-result
  // path by sending the user back to the dashboard.
  const parsed = startTestSchema.safeParse({ mode, topicId });
  if (!parsed.success) redirect("/dashboard");

  let sessionId: string | null = null;
  try {
    sessionId = await startSession({
      userId: user.id,
      mode: parsed.data.mode,
      categoryId: user.selectedCategoryId ?? null,
      topicId: parsed.data.topicId ?? null,
    });
  } catch (e) {
    // Nothing due for spaced review → the calm "come back tomorrow" state on /practice,
    // right where the spaced card lives (Wave-12b §B) — not a config error.
    if (e instanceof NothingDueError) redirect("/practice?empty=SPACED_REVIEW");
    if (e instanceof NoQuestionsError) redirect(`/dashboard?empty=${parsed.data.mode}`);
    throw e;
  }
  redirect(`/test/${sessionId}`);
}

export async function submitAnswerAction(input: {
  sessionId: string;
  questionId: string;
  selectedOptionId: string | null;
  timeSpentSeconds?: number;
  latencyMs?: number;
  confidence?: number;
  clientEventId?: string;
}) {
  const user = await requirePlayableUser();
  const parsed = submitAnswerSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstIssueMessage(parsed.error));
  return submitAnswer({ ...parsed.data, userId: user.id });
}

/**
 * Late confidence follow-up (Wave 12b §D): attach a 1..4 rating to an
 * already-submitted answer (TestAnswer + that attempt's ReviewLog row).
 * Calibration data only — never creates a ReviewLog row and never touches FSRS
 * scheduling state (the grade was derived at submit time and stays as-is).
 * Returns `{ error }` instead of throwing/redirecting — the chip UI (task 12)
 * treats a failure as non-blocking (the answer itself is already recorded).
 */
export async function setAnswerConfidenceAction(input: {
  sessionId: string;
  questionId: string;
  confidence: number;
}): Promise<{ ok: true } | { error: string }> {
  const parsed = setAnswerConfidenceSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };
  // Non-redirecting resolver: real user, else (flag on) the anon-play user, else null → error string.
  // Flag-off keeps the byte-for-byte "Увійдіть, щоб продовжити." behavior.
  const user = (await getCurrentUser()) ?? (isValueFirstFunnelEnabled() ? await getAnonUser() : null);
  if (!user) return { error: "Увійдіть, щоб продовжити." };
  const { sessionId, questionId, confidence } = parsed.data;

  // Self-only: reject another user's (or a nonexistent) session before any write.
  const session = await prisma.testSession.findFirst({
    where: { id: sessionId, userId: user.id },
    select: { id: true },
  });
  if (!session) return { error: "Невірна сесія." };

  // Confidence follows a submitted answer — the row must already exist.
  const answer = await prisma.testAnswer.findUnique({
    where: { testSessionId_questionId: { testSessionId: sessionId, questionId } },
    select: { id: true },
  });
  if (!answer) return { error: "Відповідь не знайдено." };

  // Both writes land atomically. Updates only, so replays can never duplicate
  // rows — last-write-wins on repeat calls.
  await prisma.$transaction(async (tx) => {
    await tx.testAnswer.update({ where: { id: answer.id }, data: { confidence } });
    // The attempt's ReviewLog row — latest by reviewedAt if the question was
    // somehow logged twice in this session. Absent row (pre-SRS session) → skip.
    const log = await tx.reviewLog.findFirst({
      where: { testSessionId: sessionId, questionId },
      orderBy: { reviewedAt: "desc" },
      select: { id: true },
    });
    if (log) await tx.reviewLog.update({ where: { id: log.id }, data: { confidence } });
  });
  return { ok: true };
}

export async function finishTestAction(input: { sessionId: string }): Promise<void> {
  const user = await requirePlayableUser();
  const parsed = finishTestSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstIssueMessage(parsed.error));
  await finishSession(parsed.data.sessionId, user.id);
  redirect(`/test/${parsed.data.sessionId}/result`);
}

/**
 * Append the next MARATHON page to an IN_PROGRESS session and return ONLY the newly added questions in
 * TestRunner's `questions` prop shape (the frozen wave15-08 contract — wave15-11 consumes it). Pool
 * exhaustion resolves to `{ added: 0, questions: [] }` (calm end-state, never a throw). Guards live in
 * `extendSession` (self-only / MARATHON-only / IN_PROGRESS-only).
 */
export async function extendSessionAction(input: {
  sessionId: string;
}): Promise<ExtendSessionResult> {
  const user = await requirePlayableUser();
  const parsed = finishTestSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstIssueMessage(parsed.error));
  return extendSession(parsed.data.sessionId, user.id);
}

export async function toggleSaveAction(input: {
  questionId: string;
  save: boolean;
}): Promise<{ saved: boolean }> {
  const user = await requirePlayableUser();
  const parsed = toggleSaveSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstIssueMessage(parsed.error));
  if (parsed.data.save) await saveQuestion(user.id, parsed.data.questionId);
  else await unsaveQuestion(user.id, parsed.data.questionId);
  return { saved: parsed.data.save };
}

/** Form-based remove (used on the Saved questions screen). */
export async function removeSavedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const questionId = String(formData.get("questionId") ?? "");
  // An invalid/empty id is a controlled no-op: revalidate but never delete.
  const parsed = removeSavedSchema.safeParse({ questionId });
  if (parsed.success) await unsaveQuestion(user.id, parsed.data.questionId);
  revalidatePath("/saved");
}
