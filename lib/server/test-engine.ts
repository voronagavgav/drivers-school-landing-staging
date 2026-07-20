import "server-only";
import { prisma } from "@/lib/db";
import {
  DEFAULT_EXAM_MAX_ERRORS,
  DEFAULT_EXAM_QUESTION_COUNT,
  DEFAULT_EXAM_TIME_LIMIT_MINUTES,
  DEFAULT_PRACTICE_QUESTION_COUNT,
  type TestMode,
} from "@/lib/constants";
import { selectQuestions, spacedMistakeOrder } from "@/lib/test-engine/selection";
import { selectByBlueprint } from "@/lib/test-engine/blueprint-selection";
import { blueprintForCategoryCode, groupCandidatesByBlock } from "@/lib/exam-blueprint";
import { sectionFromQuestionKey } from "@/lib/content-key";
import { evaluateExam, isAnswerCorrect } from "@/lib/test-engine/scoring";
import { selectResumableSession } from "@/lib/session-resume";
import type { EngineQuestion } from "@/lib/test-engine/types";
import { recordEvent } from "@/lib/analytics";
import { latencyBandsForMedian } from "@/lib/fsrs";
import { recordMistakeOutcome } from "./mistakes";
import {
  namespacedEventId,
  recordReview,
  startAdaptiveReview,
  startSpacedReview,
  startQuickSession,
  startMarathon,
  startSignTrainer,
  startDiagnostic,
} from "./study";
import { computeWeakTopicIds, snapshotProgress } from "./progress";
import { recomputeReadiness, recomputeTopicMastery } from "./mastery-readiness";
import { advanceStreakForGoalMetDay, bumpStudyDay, dayKeyInTimezone, getOrCreateProfile } from "./study-profile";

type QuestionWithOptions = {
  id: string;
  topicId: string | null;
  difficulty: number;
  options: { id: string; isCorrect: boolean }[];
};

function toEngineQuestion(q: QuestionWithOptions): EngineQuestion {
  return {
    id: q.id,
    topicId: q.topicId,
    difficulty: q.difficulty,
    options: q.options.map((o) => ({ id: o.id, isCorrect: o.isCorrect })),
  };
}

export class NoQuestionsError extends Error {
  constructor() {
    super("NO_QUESTIONS");
    this.name = "NoQuestionsError";
  }
}

// The SERVABLE predicate — what makes a question eligible for any user-facing pool.
// Extracted from startSession's baseWhere so other surfaces (e.g. the offline-pack
// endpoint, lib/server/offline-pack.ts) reuse the exact same filter and can never
// drift from what a live session would serve.
export const SERVABLE_QUESTION_WHERE = {
  isActive: true,
  isPublished: true,
  archivedAt: null,
} as const;

/**
 * Create a test session for a mode and return its id. Selects questions via the pure engine,
 * persists the session + ordered question list, sets a time limit for exams, emits analytics.
 */
export async function startSession(params: {
  userId: string;
  mode: TestMode;
  categoryId: string | null;
  topicId?: string | null;
}): Promise<string> {
  const { userId, mode } = params;
  const categoryId = params.categoryId ?? null;

  // Queue-driven review modes are built by the pure `selectReviewQueue` in study.ts (which owns the
  // ReviewState/TopicMastery load + session persistence) — they bypass the generic baseWhere path.
  if (mode === "ADAPTIVE_REVIEW") return startAdaptiveReview(userId, categoryId);
  if (mode === "SPACED_REVIEW") return startSpacedReview(userId, categoryId);
  // Wave-15 practice modes branch here too (preset-driven, no generic baseWhere path — spec §B).
  if (mode === "QUICK") return startQuickSession(userId, categoryId);
  if (mode === "MARATHON") return startMarathon(userId, categoryId);
  if (mode === "SIGN_TRAINER") return startSignTrainer(userId, categoryId);
  if (mode === "DIAGNOSTIC") return startDiagnostic(userId, categoryId);

  const baseWhere = {
    ...SERVABLE_QUESTION_WHERE,
    ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
  };

  let pool: EngineQuestion[] = [];
  // When set (cat-B EXAM with a blueprint), these ids are the final selection — the generic
  // selectQuestions() shuffle is bypassed. null ⇒ legacy path (uniform-random / practice modes).
  let blueprintIds: string[] | null = null;

  // ── Blueprint EXAM path ────────────────────────────────────────────────────────────────────────
  // A cat-B EXAM_SIMULATION composes its 20 questions by the official subject blueprint instead of
  // uniform-random over the whole category. We resolve the blueprint by the category's CODE; a
  // category without a blueprint (or a non-exam mode) leaves blueprint=null → behaviour unchanged.
  const blueprint =
    mode === "EXAM_SIMULATION" && categoryId
      ? blueprintForCategoryCode(
          (
            await prisma.category.findUnique({
              where: { id: categoryId },
              select: { code: true },
            })
          )?.code,
        )
      : null;

  if (blueprint) {
    // Two-step fetch (same perf shape as the legacy path): (1) lightweight candidates carrying just
    // id + the stable questionKey (so we can bucket by official section via sectionFromQuestionKey,
    // immune to Topic.displayOrder drift) PLUS text + imageUrl (cheap scalars — NOT a full options
    // load, so the two-step perf fix stands) so
    // we can build a CONTENT KEY per candidate; group into blueprint blocks; run the PURE selection
    // with global content-dedup; (2) only the chosen ids' full rows are loaded later by
    // getSessionState — here we persist just the ordered ids.
    const candidates = await prisma.question.findMany({
      where: baseWhere,
      select: { id: true, text: true, imageUrl: true, questionKey: true },
    });
    const availableByBlock = groupCandidatesByBlock(
      blueprint,
      candidates.map((c) => ({ id: c.id, section: sectionFromQuestionKey(c.questionKey ?? "") })),
    );
    // Content key = text + "||" + (imageUrl||"") — identifies a duplicate PROMPT (same wording AND
    // same image). Questions sharing a prompt but with DIFFERENT images get DIFFERENT keys and stay
    // both eligible (e.g. road-sign questions). Drives global within-exam content-dedup in the pure
    // selector so a single cat-B exam never serves two content-identical questions.
    const contentKeyById: Record<string, string> = {};
    for (const c of candidates) contentKeyById[c.id] = `${c.text}||${c.imageUrl ?? ""}`;
    blueprintIds = selectByBlueprint(blueprint, availableByBlock, { contentKeyById }).ids;
  } else if (mode === "MISTAKE_PRACTICE") {
    const mistakes = await prisma.userMistake.findMany({ where: { userId, status: "ACTIVE" } });
    const mapped = mistakes.map((m) => ({
      questionId: m.questionId,
      topicId: m.topicId,
      mistakeCount: m.mistakeCount,
      correctRepeatCount: m.correctRepeatCount,
      lastMistakeAt: m.lastMistakeAt.getTime(),
    }));
    // Spaced-repetition ordering (task 02): the wiring layer supplies the clock.
    const ordered = spacedMistakeOrder(mapped, Date.now());
    const qs = await prisma.question.findMany({
      where: { id: { in: ordered.map((m) => m.questionId) }, isActive: true, isPublished: true },
      include: { options: true },
    });
    const byId = new Map(qs.map((q) => [q.id, q]));
    pool = ordered
      .map((m) => byId.get(m.questionId))
      .filter((q): q is NonNullable<typeof q> => q != null)
      .map((q) => toEngineQuestion(q));
  } else if (mode === "SAVED_QUESTIONS") {
    const saved = await prisma.savedQuestion.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { question: { include: { options: true } } },
    });
    pool = saved
      .map((s) => s.question)
      // A saved question that was later unpublished/archived must not leak back into the pool.
      .filter((q) => q.isActive && q.isPublished && q.archivedAt === null)
      .map(toEngineQuestion);
  } else {
    const where =
      mode === "TOPIC_PRACTICE" && params.topicId
        ? { ...baseWhere, topicId: params.topicId }
        : baseWhere;
    // Lightweight pool fetch (perf): selection for EXAM/TOPIC/MIXED only reads `id`+`topicId`
    // (shuffle/weak-topic banding/filter/slice — never `options`/`difficulty`), so load just those
    // scalar fields for the whole candidate pool instead of every row WITH its options. `options`
    // is a [] placeholder for the EngineQuestion shape; only `q.id` of the chosen rows is persisted
    // below (TestSessionQuestion), and the full question+options are loaded later at render time by
    // getSessionState — so the heavy options join is never paid for the non-selected candidates.
    // This must NOT change selection: the same ids, in the same order, come out for the same rng.
    const candidates = await prisma.question.findMany({
      where,
      select: { id: true, topicId: true, difficulty: true },
    });
    pool = candidates.map((c) => ({
      id: c.id,
      topicId: c.topicId,
      difficulty: c.difficulty,
      options: [],
    }));
  }

  const count =
    mode === "EXAM_SIMULATION" ? DEFAULT_EXAM_QUESTION_COUNT : DEFAULT_PRACTICE_QUESTION_COUNT;
  const weakTopicIds =
    mode === "MIXED_PRACTICE" ? await computeWeakTopicIds(userId, categoryId) : [];

  // Blueprint EXAM yields its own ordered ids (id is all that's persisted); other modes select via
  // the generic pure engine over the lightweight pool. Both produce `{ id }`-bearing rows below.
  const selected: { id: string }[] = blueprintIds
    ? blueprintIds.map((id) => ({ id }))
    : selectQuestions(pool, {
        mode,
        count,
        topicId: params.topicId,
        weakTopicIds,
      });

  if (selected.length === 0) throw new NoQuestionsError();

  const timeLimitSeconds =
    mode === "EXAM_SIMULATION" ? DEFAULT_EXAM_TIME_LIMIT_MINUTES * 60 : null;

  const session = await prisma.testSession.create({
    data: {
      userId,
      categoryId: categoryId ?? undefined,
      mode,
      status: "IN_PROGRESS",
      timeLimitSeconds: timeLimitSeconds ?? undefined,
      totalQuestions: selected.length,
      questions: {
        create: selected.map((q, i) => ({ questionId: q.id, displayOrder: i })),
      },
    },
  });

  void recordEvent("test_started", userId, { mode, sessionId: session.id, count: selected.length });
  if (mode === "TOPIC_PRACTICE") void recordEvent("topic_practice_started", userId, { topicId: params.topicId });
  if (mode === "MISTAKE_PRACTICE") void recordEvent("mistake_practice_started", userId, { sessionId: session.id });

  return session.id;
}

/**
 * Find the user's resumable (IN_PROGRESS) test session, if any. Queries a handful of the user's
 * most-recently-started in-progress sessions (optionally scoped to a category) and delegates the
 * pick to the pure `selectResumableSession`. Returns `null` or `{ id, mode, startedAt }`.
 */
export async function getResumableSession(userId: string, categoryId?: string | null) {
  const sessions = await prisma.testSession.findMany({
    where: {
      userId,
      status: "IN_PROGRESS",
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: { startedAt: "desc" },
    take: 5,
    select: { id: true, mode: true, status: true, startedAt: true },
  });
  return selectResumableSession(sessions);
}

/** Modes that WITHHOLD per-item correctness/explanation until the session finishes (spec §D /
 *  03-learning-regimes §6). Single source of truth so `showsImmediateFeedback` and any
 *  qualifying-answer count (e.g. the activation_aha first-reveal gate) can't drift apart. */
export const WITHHELD_FEEDBACK_MODES = ["EXAM_SIMULATION", "DIAGNOSTIC"] as const;

/** Whether explanations/correctness may be shown during this mode while in progress.
 *  EXAM_SIMULATION and DIAGNOSTIC both withhold per-item correctness until finish (spec §D /
 *  03-learning-regimes §6 "exam/diagnostic withhold until finish") — same withheld response path. */
export function showsImmediateFeedback(mode: string): boolean {
  return !WITHHELD_FEEDBACK_MODES.includes(mode as (typeof WITHHELD_FEEDBACK_MODES)[number]);
}

/** Full state for the test-taking UI. Correct flags/explanations are withheld for an
 *  in-progress exam (only revealed after completion). */
export async function getSessionState(sessionId: string, userId: string) {
  const session = await prisma.testSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      category: true,
      questions: {
        orderBy: { displayOrder: "asc" },
        include: {
          question: {
            include: { options: { orderBy: { displayOrder: "asc" } }, explanation: true, topic: true },
          },
        },
      },
      answers: true,
    },
  });
  if (!session) return null;

  // Correct flags + explanations are revealed only once the session is COMPLETED (result page).
  // During an in-progress practice session, per-answer feedback comes from submitAnswer()'s
  // return value — never from this payload — so the client can't peek at answers.
  const reveal = session.status === "COMPLETED";
  const answersByQ = new Map(session.answers.map((a) => [a.questionId, a]));

  // Which of this session's questions the user has already saved — so the runner can seed the
  // "★ Збережено" state on load instead of always showing "☆ Зберегти" until clicked (one batched
  // query scoped to this session's question ids and this user).
  const questionIds = session.questions.map((sq) => sq.questionId);
  const savedRows = await prisma.savedQuestion.findMany({
    where: { userId, questionId: { in: questionIds } },
    select: { questionId: true },
  });
  const savedSet = new Set(savedRows.map((s) => s.questionId));

  return {
    id: session.id,
    mode: session.mode,
    status: session.status,
    categoryTitle: session.category?.title ?? null,
    timeLimitSeconds: session.timeLimitSeconds,
    startedAt: session.startedAt,
    totalQuestions: session.totalQuestions,
    questions: session.questions.map((sq) => {
      const ans = answersByQ.get(sq.questionId);
      return {
        questionId: sq.questionId,
        displayOrder: sq.displayOrder,
        text: sq.question.text,
        imageUrl: sq.question.imageUrl,
        imageKey: sq.question.imageKey,
        topicId: sq.question.topicId,
        topicTitle: sq.question.topic?.title ?? null,
        isDemo: sq.question.isDemo,
        options: sq.question.options.map((o) => ({
          id: o.id,
          text: o.text,
          // never leak the correct flag for an unanswered/in-progress exam question
          isCorrect: reveal ? o.isCorrect : undefined,
        })),
        explanation: reveal ? sq.question.explanation : null,
        answered: Boolean(ans),
        selectedOptionId: ans?.selectedOptionId ?? null,
        isCorrect: ans?.isCorrect ?? null,
        saved: savedSet.has(sq.questionId),
      };
    }),
  };
}

/** Record one answer. Returns feedback (correctness + explanation) only for practice modes.
 *
 *  The new `latencyMs`/`confidence`/`clientEventId` params are OPTIONAL and additive — existing
 *  callers (`test-runner.tsx`) are unchanged. When supplied they feed the FSRS `recordReview`
 *  dual-write (spec §F); `confidence` is also persisted onto the `TestAnswer` row itself.
 *
 *  `reviewedAt` (spec §D, offline replay): a CLAMPED client-reported review time. It replaces the
 *  `now` fed to `recordReview` ONLY — FSRS intervals should reflect when the user actually recalled,
 *  not when connectivity returned. TestAnswer rows and session bookkeeping (StudyDay/streak) keep
 *  server wall-clock. Callers must clamp it first (`clampReviewedAt`); this fn trusts its input. */
export async function submitAnswer(params: {
  sessionId: string;
  userId: string;
  questionId: string;
  selectedOptionId: string | null;
  timeSpentSeconds?: number;
  latencyMs?: number;
  confidence?: number;
  clientEventId?: string;
  reviewedAt?: Date;
}) {
  const session = await prisma.testSession.findFirst({
    where: { id: params.sessionId, userId: params.userId },
  });
  if (!session) throw new Error("INVALID_SESSION");
  // Owned but no longer answerable (finished/abandoned) — a DISTINCT error class so the offline
  // review-sync drain can fall back to the SRS-only lane instead of losing the queued answer
  // (wave13-review: finish-before-drain race). Foreign/unknown stays INVALID_SESSION above.
  if (session.status !== "IN_PROGRESS") throw new Error("SESSION_NOT_ACTIVE");

  const question = await prisma.question.findUnique({
    where: { id: params.questionId },
    include: { options: true, explanation: true, topic: true },
  });
  if (!question) throw new Error("INVALID_QUESTION");

  const correct = isAnswerCorrect(toEngineQuestion(question), params.selectedOptionId);
  const now = new Date();

  // Dual-write (spec §F): the answer row, the mistake-bank reconcile, and the FSRS review commit
  // TOGETHER in one transaction so a partial failure can't leave the SRS state out of sync with the
  // recorded answer. Analytics stays fire-and-forget OUTSIDE the tx (never blocks the answer path).
  const replayed = await prisma.$transaction(async (tx) => {
    // Offline-replay guard hoisted to the WHOLE transaction (spec §E3): when `clientEventId` is
    // present and a ReviewLog already carries it, the event was already applied — treat the ENTIRE
    // transaction as a no-op so a replay can't rewrite `TestAnswer` or double-advance the mistake
    // bank. `recordReview` keeps its own inner guard as belt-and-suspenders.
    if (params.clientEventId != null) {
      const seen = await tx.reviewLog.findUnique({
        where: { clientEventId: namespacedEventId(params.userId, params.clientEventId) },
      });
      if (seen) return true;
    }

    // First-attempt-only FSRS (post-wave10f-review fix): retrieval happens ONCE per question per
    // session — an answer CHANGE (the exam allows re-selection; a mis-tap correction) is
    // deliberation, not a new memory event. Re-recording would double-advance or spuriously lapse
    // the FSRS state. The TestAnswer row still updates (the FINAL choice is what the exam scores);
    // only the SRS write is gated to the first attempt.
    const priorAttempt = await tx.testAnswer.findUnique({
      where: {
        testSessionId_questionId: { testSessionId: params.sessionId, questionId: params.questionId },
      },
      select: { id: true },
    });

    await tx.testAnswer.upsert({
      where: {
        testSessionId_questionId: { testSessionId: params.sessionId, questionId: params.questionId },
      },
      update: {
        selectedOptionId: params.selectedOptionId ?? undefined,
        isCorrect: correct,
        timeSpentSeconds: params.timeSpentSeconds,
        confidence: params.confidence ?? undefined,
        answeredAt: now,
      },
      create: {
        testSessionId: params.sessionId,
        questionId: params.questionId,
        selectedOptionId: params.selectedOptionId ?? undefined,
        isCorrect: correct,
        timeSpentSeconds: params.timeSpentSeconds,
        confidence: params.confidence ?? undefined,
      },
    });

    await recordMistakeOutcome(params.userId, params.questionId, question.topicId, correct, tx);

    if (!priorAttempt) {
      // Per-topic latency bands (wave11-07): one indexed `@@unique([userId, topicId])` read of the
      // user's median answer latency for this topic feeds `deriveGrade`'s Easy/Hard thresholds. No
      // row (or null median) → `latencyBandsForMedian` returns the global 5000/30000 defaults.
      const mastery = question.topicId
        ? await tx.topicMastery.findUnique({
            where: { userId_topicId: { userId: params.userId, topicId: question.topicId } },
            select: { medianLatencyMs: true },
          })
        : null;
      const { easyMs, hardMs } = latencyBandsForMedian(mastery?.medianLatencyMs ?? null);

      await recordReview(
        tx,
        {
          userId: params.userId,
          questionId: params.questionId,
          topicId: question.topicId,
          correct,
          latencyMs: params.latencyMs,
          confidence: params.confidence,
          mode: session.mode,
          testSessionId: params.sessionId,
          clientEventId: params.clientEventId,
          easyMs,
          hardMs,
          // Honest guess floor (Wave 20): the options are already loaded on this question fetch, so
          // pass the count with ZERO extra DB reads. Feeds deriveGrade/gradePosterior's g = 1/count.
          optionCount: question.options.length,
        },
        params.reviewedAt ?? now,
      );

      // StudyDay bump (Wave 11 §F): count today's review toward the streak/goal ring, keyed in the
      // user's profile timezone. First-attempt-only (mirrors recordReview) — re-selecting an option
      // is deliberation, not a new review — and inside the tx so the day rollup can't drift from the
      // recorded answer. bumpStudyDay is the single owner of the profile upsert + timezone (Wave 12b
      // §G de-dupe — one getOrCreateProfile per first-attempt answer, never two).
      await bumpStudyDay(params.userId, tx, now);
    }
    return false;
  });

  // A pure replay is not a new answer — don't emit a second analytics event.
  if (!replayed) {
    void recordEvent("question_answered", params.userId, {
      sessionId: params.sessionId,
      questionId: params.questionId,
      correct,
    });

    // activation_aha (wave18-03): the funnel's aha moment is the FIRST answered question whose
    // explanation is revealed (practice reveal). Fire once per user — on their first QUALIFYING
    // answer: one in a feedback mode (NOT withheld exam/diagnostic) whose question has an
    // explanation. The outer guard already proves THIS answer qualifies, so the count only needs to
    // count the user's TOTAL qualifying answers (including this one) and fire when it equals 1.
    // Scoping the count to qualifying answers (not the GLOBAL testAnswer count) fixes the
    // diagnostic-first cohort: a user whose first answer was a DIAGNOSTIC/EXAM question used to bump
    // the global count past 1 without ever entering this block, so activation_aha never fired for
    // exactly the onboarding/diagnostic-first cohort the funnel exists to instrument. Anon or real;
    // fire-and-forget, off the hot path (the count runs in a detached async), non-PII payload.
    if (showsImmediateFeedback(session.mode) && question.explanation) {
      void (async () => {
        const qualifying = await prisma.testAnswer.count({
          where: {
            testSession: {
              userId: params.userId,
              mode: { notIn: [...WITHHELD_FEEDBACK_MODES] },
            },
            question: { explanation: { isNot: null } },
          },
        });
        if (qualifying === 1) {
          void recordEvent("activation_aha", params.userId, {
            questionId: params.questionId,
            mode: session.mode,
          });
        }
      })();
    }
  }

  if (!showsImmediateFeedback(session.mode)) {
    return { recorded: true as const };
  }
  return {
    recorded: true as const,
    isCorrect: correct,
    correctOptionId: question.options.find((o) => o.isCorrect)?.id ?? null,
    explanation: question.explanation,
  };
}

/** Complete a session: compute totals, set result for exams, snapshot progress, emit analytics. */
export async function finishSession(sessionId: string, userId: string) {
  const session = await prisma.testSession.findFirst({
    where: { id: sessionId, userId },
    include: { answers: true },
  });
  if (!session) throw new Error("INVALID_SESSION");

  // Idempotency guard: only act on an IN_PROGRESS session. A repeat finish on an already
  // COMPLETED/ABANDONED session returns the stored summary WITHOUT re-snapshotting progress
  // or re-firing analytics (spec section F — duplicate ProgressSnapshot / double-counted events).
  if (session.status !== "IN_PROGRESS") {
    // Re-drive the idempotent finalize for COMPLETED sessions (wave12b-review: the "retryable"
    // recovery was UNREACHABLE in production — this early return skipped it, so a transient
    // recompute/streak failure could never be healed by re-hitting finish. finalizeSession is a
    // no-op when aggregates are already consistent.)
    if (session.status === "COMPLETED") await finalizeSession(sessionId);
    return {
      total: session.totalQuestions,
      correct: session.correctAnswers,
      wrong: session.wrongAnswers,
      result: session.result as "PASSED" | "FAILED" | null,
      mode: session.mode,
    };
  }

  const total = session.totalQuestions || session.answers.length;
  const correct = session.answers.filter((a) => a.isCorrect).length;
  const wrong = total - correct;

  let result: "PASSED" | "FAILED" | null = null;
  if (session.mode === "EXAM_SIMULATION") {
    result = evaluateExam(correct, total, DEFAULT_EXAM_MAX_ERRORS).result;
  }

  await prisma.testSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      finishedAt: new Date(),
      correctAnswers: correct,
      wrongAnswers: wrong,
      result: result ?? undefined,
    },
  });

  void recordEvent("test_completed", userId, { sessionId, mode: session.mode, correct, total });
  if (session.mode === "EXAM_SIMULATION") {
    void recordEvent(result === "PASSED" ? "exam_simulation_passed" : "exam_simulation_failed", userId, {
      sessionId,
    });
  }
  // DIAGNOSTIC finish reveal (spec §D): fire ONCE, here in the IN_PROGRESS status-flip branch so a
  // repeat finish on an already-COMPLETED session (early-return above) can never re-emit it.
  if (session.mode === "DIAGNOSTIC") {
    void recordEvent("diagnostic_completed", userId, { sessionId, correct, total });
  }

  await finalizeSession(sessionId);

  return { total, correct, wrong, result, mode: session.mode };
}

/**
 * Post-completion side effects for a COMPLETED session, keyed off the session ROW (no captured
 * in-memory state) so it is RETRYABLE (Wave 12b §G): a transient failure after `finishSession`'s
 * status flip is recoverable by calling this again with the same session id. Runs the progress
 * snapshot, touched-topic mastery recompute, category readiness recompute, and the streak update.
 *
 * Idempotence contract (over user-visible aggregates — streak fields, StudyDay, TopicMastery
 * values): recomputes are derived from the answer spine, so re-running converges to the same
 * values; the streak step is guarded (see below) so it never double-advances. ProgressSnapshot is
 * append-only, so the re-drive path GUARDS it (skipped when a snapshot already exists at/after this
 * session's finishedAt) — a repeat finish must not duplicate snapshots (the finish-idempotency
 * contract), while a finalize that crashed BEFORE snapshotting still re-drives fully.
 */
export async function finalizeSession(sessionId: string, now: Date = new Date()): Promise<void> {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { answers: { select: { questionId: true } } },
  });
  if (!session) throw new Error("INVALID_SESSION");
  // Only a COMPLETED session has anything to finalize (never runs on IN_PROGRESS/ABANDONED).
  if (session.status !== "COMPLETED") return;
  const userId = session.userId;

  const finishedAt = session.finishedAt ?? now;
  const alreadySnapshotted = await prisma.progressSnapshot.findFirst({
    where: { userId, createdAt: { gte: finishedAt } },
    select: { id: true },
  });
  if (!alreadySnapshotted) await snapshotProgress(userId, session.categoryId);

  // Server-authoritative recompute from the FSRS spine (Wave 11 §D). Derive the touched topics from
  // this session's answered questions, then materialise TopicMastery (touched topics) + a fresh
  // ReadinessSnapshot for the session's category. Runs once at finish (per-answer tx stays lean).
  const answeredQuestionIds = [...new Set(session.answers.map((a) => a.questionId))];
  const touchedTopics =
    answeredQuestionIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: answeredQuestionIds } },
          select: { topicId: true },
        })
      : [];
  const touchedTopicIds = [
    ...new Set(touchedTopics.map((q) => q.topicId).filter((id): id is string => !!id)),
  ];
  // Reference time comes from the session ROW (finishedAt), not the wall clock, so a retry
  // recomputes the exact same retrievability numbers — mastery reflects the state at completion.
  const refNow = session.finishedAt ?? now;
  await recomputeTopicMastery(userId, touchedTopicIds, prisma, refNow);
  await recomputeReadiness(userId, session.categoryId, prisma, refNow);

  // Detoxified streak (Wave 11 §F, reconciled Wave 12b §G): StudyDay rows are the single source of
  // truth for "studied and met the goal on day X" — the streak advances ONLY when the session's
  // completion day has a goalMet StudyDay row, so the streak walk and the goal ring can never
  // disagree. The day key derives from the SESSION's finishedAt (not the wall clock) and the walk
  // only moves forward (lastStudyDay < day), so a re-run for the same session is a no-op: no double
  // advance, no StudyDay rewrite, no throw. The pure policy (freeze tokens etc.) is unchanged.
  const profile = await getOrCreateProfile(userId);
  const dayKey = dayKeyInTimezone(session.finishedAt ?? now, profile.timezone);
  const studyDay = await prisma.studyDay.findUnique({
    where: { userId_day: { userId, day: dayKey } },
    select: { goalMet: true },
  });
  // Shared idempotent walk (wave12b-review): the PRIMARY credit now happens in bumpStudyDay at the
  // goalMet flip (covers goal-met days with no completed session + the timezone-midnight edge);
  // this finish-path walk stays as the belt-and-suspenders re-drive and is a no-op when already credited.
  if (studyDay?.goalMet) {
    await advanceStreakForGoalMetDay(userId, dayKey, prisma, profile);
  }
}
