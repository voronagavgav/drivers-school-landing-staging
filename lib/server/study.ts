import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  deriveGrade,
  gradePosterior,
  slipAdjustedLapse,
  retrievability,
  schedule,
  REVIEW_ENGINE_VERSION,
  type LearningState,
  type ReviewMemoryState,
} from "@/lib/fsrs";
import { ADAPTIVE_REVIEW_SIZE, DIAGNOSTIC_COUNT, SIGN_TRAINER_TOPIC_ORDERS } from "@/lib/constants";
import {
  selectReviewQueue,
  DEFAULT_NEW_ITEM_SHARE,
  type QueueCandidate,
} from "@/lib/test-engine/queue";
import {
  selectQuickQueue,
  selectMarathonPage,
  selectSignTrainerQueue,
} from "@/lib/test-engine/presets";
import { selectDiagnostic, type DiagnosticCandidate } from "@/lib/test-engine/diagnostic";
import { sectionFromQuestionKey } from "@/lib/content-key";
import { shuffle } from "@/lib/test-engine/selection";
import { blueprintForCategoryCode } from "@/lib/exam-blueprint";
import { recordEvent } from "@/lib/analytics";
import { computeStudyPlan, type StudyPlan } from "@/lib/study-plan";
import { dayKeyInTimezone, getOrCreateProfile } from "./study-profile";
import { requireIntelligenceAccess } from "./entitlements";
// Circular with test-engine.ts (it imports our start* fns) — safe: the class is only referenced
// inside a function body at call time, when the ESM live binding is fully populated.
import { NoQuestionsError } from "./test-engine";

const MS_PER_DAY = 86_400_000;

// The fields `recordReview` needs about a single answer. `latencyMs`/`confidence` feed the inferred
// grade (§2); `mode`/`testSessionId` are telemetry; `clientEventId` is the offline-replay idempotency
// key (§3.4). `topicId` is denormalised onto ReviewLog for the mistake/optimizer feed — never required.
// `easyMs`/`hardMs` are the per-topic latency-band overrides (Wave 11): absent ⇒ deriveGrade's global
// defaults (unchanged behavior for callers that pass none).
export interface RecordReviewParams {
  userId: string;
  questionId: string;
  topicId?: string | null;
  correct: boolean;
  latencyMs?: number;
  confidence?: number;
  mode: string;
  testSessionId?: string | null;
  clientEventId?: string;
  easyMs?: number;
  hardMs?: number;
  // Number of answer options for the honest guess floor (Wave 20): g = min(1/optionCount, cap). Fed to
  // `deriveGrade`/`gradePosterior`. Absent ⇒ the 4-option default (today's behavior preserved).
  optionCount?: number;
  // Stale-replay guard (wave13-review): when true, append the ReviewLog (telemetry/corpus) but do
  // NOT overwrite ReviewState — an offline review older than the state's lastReviewedAt must never
  // regress the FSRS memory backward.
  logOnly?: boolean;
}

// A brand-new card's memory state: `schedule` seeds S/D from the first grade, so the zero stability
// and difficulty here are placeholders that its `state === "new"` branch ignores.
const NEW_STATE: ReviewMemoryState = {
  stability: 0,
  difficulty: 0,
  state: "new",
  dueAt: null,
  lastReviewedAt: null,
  reps: 0,
  lapses: 0,
};

/**
 * Per-user namespacing of the offline idempotency key (spec §D): `ReviewLog.clientEventId` stays
 * globally `@unique`, but the stored value is prefixed with the owning user's id so one user's raw
 * client id can never collide with — or replay-block — another user's. SINGLE owner of the format;
 * every guard lookup and every write must build the stored id through this helper.
 */
export function namespacedEventId(userId: string, clientEventId: string): string {
  return `${userId}:${clientEventId}`;
}

/**
 * Persist one FSRS review of a question (spec §F): infer the grade, advance the memory state, upsert
 * the per-user `ReviewState`, and append an immutable `ReviewLog` row.
 *
 * Reads the existing `ReviewState` LAZILY on the `@@unique([userId, questionId])` key and starts from
 * a fresh `new` default when absent — no bulk backfill / no scan of all questions.
 *
 * IDEMPOTENT for offline replay: when `clientEventId` is supplied and a `ReviewLog` already carries it,
 * this is a no-op — nothing is appended and the state update is not re-applied. The guard read handles
 * the common replay; the `@unique` on `ReviewLog.clientEventId` still blocks a concurrent double-insert
 * (the losing transaction rolls back, so state is never applied twice).
 *
 * All reads/writes go through the passed transaction client `tx` so the caller can compose this inside
 * one interactive transaction — `recordReview` never opens a transaction of its own. It writes ONLY
 * `ReviewState` + `ReviewLog` (TopicMastery / StudyDay / streak / readiness recompute live in Wave 11).
 */
export async function recordReview(
  tx: Prisma.TransactionClient,
  params: RecordReviewParams,
  now: Date,
): Promise<void> {
  const {
    userId,
    questionId,
    topicId,
    correct,
    latencyMs,
    confidence,
    mode,
    testSessionId,
    clientEventId,
    easyMs,
    hardMs,
    optionCount,
    logOnly,
  } = params;

  // Offline-replay guard: a ReviewLog already bearing this clientEventId means the event was applied.
  // Both the lookup and the write use the per-user namespaced form (spec §D).
  const storedEventId = clientEventId != null ? namespacedEventId(userId, clientEventId) : null;
  if (storedEventId != null) {
    const seen = await tx.reviewLog.findUnique({
      where: { clientEventId: storedEventId },
      select: { id: true },
    });
    if (seen) return;
  }

  // Lazy read of the current memory state; absent → fresh `new` card.
  const existing = await tx.reviewState.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });

  const prior: ReviewMemoryState = existing
    ? {
        stability: existing.stability,
        difficulty: existing.difficulty,
        state: existing.state as LearningState,
        dueAt: existing.dueAt,
        lastReviewedAt: existing.lastReviewedAt,
        reps: existing.reps,
        lapses: existing.lapses,
      }
    : NEW_STATE;

  // Guessing-corrected grade (Wave 19b): the prior belief the learner KNOWS the item is the memory
  // state's retrievability for a card with history, else a NEUTRAL 0.5 for a fresh `new` card (never
  // the R=1 of an unreviewed card). `optionCount` (Wave 20) is threaded from the caller (options are
  // already loaded on the answer path — zero extra DB reads); absent ⇒ deriveGrade's 4-option floor.
  const priorKnow = prior.lastReviewedAt != null ? retrievability(prior, now) : 0.5;
  const grade = deriveGrade({ correct, latencyMs, confidence, priorKnow, optionCount }, { easyMs, hardMs });

  // Slip-adjusted lapse (Wave 20, spec Deliverable 4): a WRONG answer on a card WITH history routes its
  // APPLIED memory state through `slipAdjustedLapse` — the interval crush is softened by the posterior
  // belief the item is still known, `pi = P(knows | wrong)`. The LOGGED `grade` stays the true Again(1)
  // (no Hard-on-wrong is ever fed or logged). A wrong on a fresh `new` card, every CORRECT answer, and
  // the log-only replay path all keep today's behavior via `schedule` — log-only never persists state,
  // so its telemetry-only `scheduledDays` must match the unchanged schedule (spec Deliverable 4 item 5).
  const next =
    !correct && !logOnly && prior.lastReviewedAt != null
      ? slipAdjustedLapse(prior, gradePosterior({ correct: false, priorKnow, optionCount }), now)
      : schedule(prior, grade, now);

  // Log fields: elapsed since the prior review (0 for a first exposure), the pre-review latents the
  // FSRS optimizer needs, and the interval `schedule` just assigned (dueAt − now, in days).
  const elapsedDays = prior.lastReviewedAt
    ? Math.max(0, (now.getTime() - prior.lastReviewedAt.getTime()) / MS_PER_DAY)
    : 0;
  const scheduledDays = next.dueAt
    ? (next.dueAt.getTime() - now.getTime()) / MS_PER_DAY
    : null;

  const stateFields = {
    stability: next.stability,
    difficulty: next.difficulty,
    state: next.state,
    dueAt: next.dueAt,
    lastReviewedAt: next.lastReviewedAt,
    reps: next.reps,
    lapses: next.lapses,
    lastGrade: grade,
    lastConfidence: confidence ?? null,
    lastLatencyMs: latencyMs ?? null,
  };

  if (!logOnly) {
    await tx.reviewState.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: { userId, questionId, ...stateFields },
      update: stateFields,
    });
  }

  await tx.reviewLog.create({
    data: {
      userId,
      questionId,
      topicId: topicId ?? null,
      reviewedAt: now,
      grade,
      elapsedDays,
      priorStability: existing ? existing.stability : null,
      priorDifficulty: existing ? existing.difficulty : null,
      scheduledDays,
      confidence: confidence ?? null,
      latencyMs: latencyMs ?? null,
      mode,
      testSessionId: testSessionId ?? null,
      clientEventId: storedEventId,
      // Grade-semantics version at write time — future weight fits segment/exclude by this.
      engine: REVIEW_ENGINE_VERSION,
    },
  });
}

// ── Queue-driven review sessions (spec §4 / §G) ───────────────────────────────────────────────────
// ADAPTIVE_REVIEW and SPACED_REVIEW are real sessions built by the PURE `selectReviewQueue`
// (lib/test-engine/queue.ts, unchanged). This layer only loads the DB shape the pure picker needs
// (the user's ReviewState per question + TopicMastery weakness), passes the two parameterizations,
// and persists the ordered questions — it never re-derives scoring.

/**
 * Thrown by `startSpacedReview` when the user has NO seen cards to review (empty due-only queue).
 * Distinct from `NoQuestionsError` (a category with no published content) so the action can map it
 * to the "nothing due right now" empty state rather than a real config error.
 */
export class NothingDueError extends Error {
  constructor() {
    super("NOTHING_DUE");
    this.name = "NothingDueError";
  }
}

// Map a TopicMastery band to a 0..1 weakness factor for the queue's weak-topic boost. A topic with
// no mastery row yet is treated as mid ("learning") — neither prioritised nor suppressed.
const BAND_WEAKNESS: Record<string, number> = { weak: 1, learning: 0.5, strong: 0 };
const DEFAULT_TOPIC_WEAKNESS = 0.5;

/**
 * Build the pure `QueueCandidate[]` for a user × category: every published question in the category,
 * carrying its FSRS `state` (seen ⇒ the ReviewState memory; unseen ⇒ null) and its topic weakness.
 * Loads the user's ReviewState / TopicMastery via `where: { userId }` scans + a JS join — NEVER an
 * id-list `{ in: [...] }` over the (potentially 1k+) question ids (P2029, see CLAUDE.md).
 */
async function loadReviewCandidates(
  userId: string,
  categoryId: string | null,
): Promise<QueueCandidate[]> {
  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      isPublished: true,
      archivedAt: null,
      ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
    },
    select: { id: true, topicId: true },
  });

  const states = await prisma.reviewState.findMany({ where: { userId } });
  const stateByQuestion = new Map(states.map((s) => [s.questionId, s]));

  const mastery = await prisma.topicMastery.findMany({
    where: { userId },
    select: { topicId: true, band: true },
  });
  const weaknessByTopic = new Map(
    mastery.map((m) => [m.topicId, BAND_WEAKNESS[m.band] ?? DEFAULT_TOPIC_WEAKNESS]),
  );

  return questions.map((q) => {
    const s = stateByQuestion.get(q.id);
    return {
      questionId: q.id,
      topicId: q.topicId ?? "",
      topicWeakness:
        (q.topicId ? weaknessByTopic.get(q.topicId) : undefined) ?? DEFAULT_TOPIC_WEAKNESS,
      state: s
        ? { stability: s.stability, lastReviewedAt: s.lastReviewedAt, dueAt: s.dueAt }
        : null,
    };
  });
}

/** The user's daily goal (small dose, autonomy) if set, else the ADAPTIVE_REVIEW default size. */
async function resolveReviewSize(userId: string): Promise<number> {
  const profile = await prisma.userStudyProfile.findUnique({
    where: { userId },
    select: { dailyGoal: true },
  });
  return profile?.dailyGoal || ADAPTIVE_REVIEW_SIZE;
}

/** Persist an ordered queue as a review `TestSession` (+ `TestSessionQuestion` rows), return its id. */
async function createReviewSession(
  userId: string,
  categoryId: string | null,
  mode: "ADAPTIVE_REVIEW" | "SPACED_REVIEW" | "QUICK" | "MARATHON" | "SIGN_TRAINER" | "DIAGNOSTIC",
  questionIds: string[],
): Promise<string> {
  const session = await prisma.testSession.create({
    data: {
      userId,
      categoryId: categoryId ?? undefined,
      mode,
      status: "IN_PROGRESS",
      totalQuestions: questionIds.length,
      questions: {
        create: questionIds.map((id, i) => ({ questionId: id, displayOrder: i })),
      },
    },
  });
  void recordEvent("test_started", userId, {
    mode,
    sessionId: session.id,
    count: questionIds.length,
  });
  return session.id;
}

/**
 * Start an ADAPTIVE_REVIEW session: interleave due/weak SEEN cards with a bounded share of UNSEEN
 * items (`newItemShare: DEFAULT_NEW_ITEM_SHARE`, `backfillWithNew: true` so it fills to size). If the
 * queue comes back empty (nothing seen, no new), fall back to unseen-first published selection — this
 * mode NEVER throws for a category that HAS published questions. `now` is injected (deterministic).
 */
export async function startAdaptiveReview(
  userId: string,
  categoryId: string | null,
  now: Date = new Date(),
): Promise<string> {
  const candidates = await loadReviewCandidates(userId, categoryId);
  const size = await resolveReviewSize(userId);

  let queue = selectReviewQueue(candidates, {
    now,
    size,
    newItemShare: DEFAULT_NEW_ITEM_SHARE,
    backfillWithNew: true,
  });

  // Defensive fallback: an empty queue with published questions present should still yield a session
  // (unseen-first). `backfillWithNew` already fills from unseen, so this only bites truly odd states.
  if (queue.length === 0) {
    queue = candidates
      .filter((c) => c.state == null)
      .slice(0, size)
      .map((c) => c.questionId);
    if (queue.length === 0) queue = candidates.slice(0, size).map((c) => c.questionId);
  }

  // A category with ZERO published questions must surface the standard empty-state redirect, not a
  // broken 0-question session (wave11-review finding).
  if (queue.length === 0) throw new NoQuestionsError();

  return createReviewSession(userId, categoryId, "ADAPTIVE_REVIEW", queue);
}

/**
 * Start a SPACED_REVIEW session: DUE cards ONLY (spec §4.5 — pool filter is "due", not "seen";
 * `newItemShare: 0`, `backfillWithNew: false` so no new items are ever injected). A seen-but-not-due
 * card must NOT be served early: reviewing ahead of schedule wastes the spacing effect, and the honest
 * «нічого не заплановано — повертайся пізніше» finish is a stated calm/finite differentiator. An empty
 * DUE set throws the typed `NothingDueError` (wave11-review major: previously ALL seen cards scored
 * positively via the forgetting/tiebreak terms, so this fired only at zero SEEN cards). `now` injected.
 */
export async function startSpacedReview(
  userId: string,
  categoryId: string | null,
  now: Date = new Date(),
): Promise<string> {
  const candidates = await loadReviewCandidates(userId, categoryId);
  const size = await resolveReviewSize(userId);

  // Due-only pre-filter: keep seen cards whose dueAt has arrived.
  const due = candidates.filter(
    (c) => c.state?.dueAt != null && c.state.dueAt.getTime() <= now.getTime(),
  );

  const queue = selectReviewQueue(due, {
    now,
    size,
    newItemShare: 0,
    backfillWithNew: false,
  });

  if (queue.length === 0) throw new NothingDueError();

  return createReviewSession(userId, categoryId, "SPACED_REVIEW", queue);
}

// ── Wave-15 practice-mode sessions (spec §B) ───────────────────────────────────────────────────────
// QUICK / MARATHON / SIGN_TRAINER are thin PARAMETERIZATIONS of the pure `selectReviewQueue` presets
// (lib/test-engine/presets) over the same QueueCandidate load the review modes use; DIAGNOSTIC composes
// a one-shot blueprint spread via the pure `selectDiagnostic`. All four persist through the SAME
// `createReviewSession` path, so `test_started` fires exactly once from the single owner. No new engine.

/**
 * Start a QUICK session: a short warm-up page (QUICK_COUNT) drawn from the user's review candidates —
 * mostly unseen for a fresh user, interleaving any due/weak seen cards. `now` injected (deterministic).
 */
export async function startQuickSession(
  userId: string,
  categoryId: string | null,
  now: Date = new Date(),
): Promise<string> {
  const candidates = await loadReviewCandidates(userId, categoryId);
  const queue = selectQuickQueue(candidates, { now });
  if (queue.length === 0) throw new NoQuestionsError();
  return createReviewSession(userId, categoryId, "QUICK", queue);
}

/**
 * Start a MARATHON session: the FIRST page (MARATHON_PAGE) of endless practice. Later pages append via
 * `extendSession` (wave15-08); the initial page excludes nothing. `now` injected (deterministic).
 */
export async function startMarathon(
  userId: string,
  categoryId: string | null,
  now: Date = new Date(),
): Promise<string> {
  const candidates = await loadReviewCandidates(userId, categoryId);
  const queue = selectMarathonPage(candidates, new Set(), { now });
  if (queue.length === 0) throw new NoQuestionsError();
  return createReviewSession(userId, categoryId, "MARATHON", queue);
}

/**
 * The element shape of TestRunner's `questions` prop (the frozen wave15-08 client contract — see
 * `/test/[id]/page.tsx`'s mapping and `components/test-runner.tsx`'s `RunnerQuestion`). `extendSession`
 * returns the newly appended MARATHON items in EXACTLY this shape; `isCorrect`/`explanation` are OMITTED
 * (fresh, unanswered items in an in-progress session never carry correctness — same withholding as
 * getSessionState's in-progress payload).
 */
export interface RunnerQuestionPayload {
  questionId: string;
  text: string;
  imageUrl: string | null;
  imageKey: string | null;
  topicTitle: string | null;
  isDemo: boolean;
  options: { id: string; text: string }[];
  answered: boolean;
  selectedOptionId: string | null;
  saved: boolean;
}

/** The frozen `extendSession`/`extendSessionAction` result (wave15-08). `added === questions.length`;
 *  `added: 0` + `questions: []` signals pool exhaustion (calm end-state, never a throw). */
export interface ExtendSessionResult {
  added: number;
  total: number;
  questions: RunnerQuestionPayload[];
}

/**
 * Extend an IN_PROGRESS MARATHON session by one page: append up to MARATHON_PAGE fresh questions (never
 * one already in the session) as new TestSessionQuestion rows continuing displayOrder from the current
 * max + 1, bump `totalQuestions`, and return ONLY the newly appended items in the RunnerQuestionPayload
 * shape. Selection is the pure `selectMarathonPage` preset over the session category's candidates with
 * `excludeIds` = ALL questionIds already in the session (JS set-diff — no DB `notIn` over the id list),
 * so the `@@unique([testSessionId, questionId])` constraint holds by construction, never by
 * catch-on-conflict. Pool exhaustion returns `{ added: 0, questions: [] }` — the calm end-state, never
 * a throw. Guards: THROWS for a session owned by another user, a non-MARATHON session, or a
 * non-IN_PROGRESS session. `now` injected (deterministic).
 */
export async function extendSession(
  sessionId: string,
  userId: string,
  now: Date = new Date(),
): Promise<ExtendSessionResult> {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, mode: true, status: true, categoryId: true },
  });
  if (!session || session.userId !== userId) throw new Error("Сесію не знайдено.");
  if (session.mode !== "MARATHON") throw new Error("Продовжити можна лише марафон.");
  if (session.status !== "IN_PROGRESS") throw new Error("Сесія вже завершена.");

  // Already-served ids (answered or not) → the exclude set; also the current row count and max order.
  const existing = await prisma.testSessionQuestion.findMany({
    where: { testSessionId: sessionId },
    select: { questionId: true, displayOrder: true },
  });
  const excludeIds = new Set(existing.map((r) => r.questionId));
  const currentTotal = existing.length;
  const maxOrder = existing.reduce((m, r) => Math.max(m, r.displayOrder), -1);

  const candidates = await loadReviewCandidates(userId, session.categoryId);
  const nextIds = selectMarathonPage(candidates, excludeIds, { now });

  // Pool exhausted → calm end-state (finite MARATHON): no rows appended, no throw.
  if (nextIds.length === 0) return { added: 0, total: currentTotal, questions: [] };

  // Append the page (displayOrder continues from max + 1) and bump the session's total atomically.
  await prisma.$transaction([
    prisma.testSessionQuestion.createMany({
      data: nextIds.map((id, i) => ({
        testSessionId: sessionId,
        questionId: id,
        displayOrder: maxOrder + 1 + i,
      })),
    }),
    prisma.testSession.update({
      where: { id: sessionId },
      data: { totalQuestions: { increment: nextIds.length } },
    }),
  ]);

  // Load the appended questions' full rows in the RunnerQuestionPayload shape (nextIds ≤ MARATHON_PAGE,
  // so the `in` is well under the P2029 param cap).
  const rows = await prisma.question.findMany({
    where: { id: { in: nextIds } },
    include: { options: { orderBy: { displayOrder: "asc" } }, topic: true },
  });
  const byId = new Map(rows.map((q) => [q.id, q]));

  const savedRows = await prisma.savedQuestion.findMany({
    where: { userId, questionId: { in: nextIds } },
    select: { questionId: true },
  });
  const savedSet = new Set(savedRows.map((s) => s.questionId));

  const questions: RunnerQuestionPayload[] = nextIds.map((id) => {
    const q = byId.get(id)!;
    return {
      questionId: q.id,
      text: q.text,
      imageUrl: q.imageUrl,
      imageKey: q.imageKey,
      topicTitle: q.topic?.title ?? null,
      isDemo: q.isDemo,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      answered: false,
      selectedOptionId: null,
      saved: savedSet.has(q.id),
    };
  });

  return { added: questions.length, total: currentTotal + questions.length, questions };
}

/**
 * Build the SIGN_TRAINER pool: published/active/non-archived questions of the category whose topic is a
 * road-signs section (displayOrder ∈ SIGN_TRAINER_TOPIC_ORDERS) OR that carry an imageKey. Loads the
 * user's ReviewState / TopicMastery via `where: { userId }` scans + JS joins (never an id-list `in` over
 * the full pool — P2029, see CLAUDE.md), then filters to the sign pool BEFORE the pure preset ranks it.
 */
async function loadSignTrainerCandidates(
  userId: string,
  categoryId: string | null,
): Promise<QueueCandidate[]> {
  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      isPublished: true,
      archivedAt: null,
      ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
    },
    select: { id: true, topicId: true, imageKey: true, topic: { select: { displayOrder: true } } },
  });
  const signOrders = new Set<number>(SIGN_TRAINER_TOPIC_ORDERS);
  const eligible = questions.filter(
    (q) =>
      (q.topic?.displayOrder != null && signOrders.has(q.topic.displayOrder)) || q.imageKey != null,
  );

  const states = await prisma.reviewState.findMany({ where: { userId } });
  const stateByQuestion = new Map(states.map((s) => [s.questionId, s]));
  const mastery = await prisma.topicMastery.findMany({
    where: { userId },
    select: { topicId: true, band: true },
  });
  const weaknessByTopic = new Map(
    mastery.map((m) => [m.topicId, BAND_WEAKNESS[m.band] ?? DEFAULT_TOPIC_WEAKNESS]),
  );

  return eligible.map((q) => {
    const s = stateByQuestion.get(q.id);
    return {
      questionId: q.id,
      topicId: q.topicId ?? "",
      topicWeakness:
        (q.topicId ? weaknessByTopic.get(q.topicId) : undefined) ?? DEFAULT_TOPIC_WEAKNESS,
      state: s
        ? { stability: s.stability, lastReviewedAt: s.lastReviewedAt, dueAt: s.dueAt }
        : null,
    };
  });
}

/** Start a SIGN_TRAINER session over the sign pool (size = min(SIGN_TRAINER_COUNT, eligible pool)). */
export async function startSignTrainer(
  userId: string,
  categoryId: string | null,
  now: Date = new Date(),
): Promise<string> {
  const candidates = await loadSignTrainerCandidates(userId, categoryId);
  const queue = selectSignTrainerQueue(candidates, { now });
  if (queue.length === 0) throw new NoQuestionsError();
  return createReviewSession(userId, categoryId, "SIGN_TRAINER", queue);
}

/**
 * DIAGNOSTIC candidate load: id + difficulty + official section (from the stable questionKey) for the
 * blueprint spread. Reads NO ReviewState/TopicMastery — a diagnostic is taken at the very start of a
 * journey, before any review history exists (spec §B). Same `where: { userId }`-free published-pool
 * query shape as the review loads.
 */
async function loadDiagnosticCandidates(
  categoryId: string | null,
): Promise<DiagnosticCandidate[]> {
  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      isPublished: true,
      archivedAt: null,
      ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
    },
    select: { id: true, difficulty: true, questionKey: true },
  });
  return questions.map((q) => ({
    id: q.id,
    difficulty: q.difficulty,
    section: sectionFromQuestionKey(q.questionKey ?? ""),
  }));
}

/**
 * Start a DIAGNOSTIC session: a one-shot start-of-journey spread across the exam blueprint. With a
 * category blueprint, compose the spread via the pure `selectDiagnostic` (blueprint blocks scaled to
 * DIAGNOSTIC_COUNT by largest-remainder). Without one, fall back to the generic path — a plain shuffle
 * capped at DIAGNOSTIC_COUNT (no new spread logic). Requires no prior ReviewState/TopicMastery.
 */
export async function startDiagnostic(
  userId: string,
  categoryId: string | null,
  rng: () => number = Math.random,
): Promise<string> {
  const category = categoryId
    ? await prisma.category.findUnique({ where: { id: categoryId }, select: { code: true } })
    : null;
  const blueprint = blueprintForCategoryCode(category?.code);
  const candidates = await loadDiagnosticCandidates(categoryId);

  const ids = blueprint
    ? selectDiagnostic(blueprint, candidates, { count: DIAGNOSTIC_COUNT, rng })
    : shuffle([...candidates], rng)
        .slice(0, DIAGNOSTIC_COUNT)
        .map((c) => c.id);

  if (ids.length === 0) throw new NoQuestionsError();
  return createReviewSession(userId, categoryId, "DIAGNOSTIC", ids);
}

/**
 * Has this user ever finished a DIAGNOSTIC? Derived from the session table — NO new schema
 * (spec §D). Gates the onboarding DIAGNOSTIC CTA and the dashboard «Стартова перевірка» card:
 * once a diagnostic is COMPLETED, both entry points quietly retire.
 */
export async function hasCompletedDiagnostic(userId: string): Promise<boolean> {
  const done = await prisma.testSession.findFirst({
    where: { userId, mode: "DIAGNOSTIC", status: "COMPLETED" },
    select: { id: true },
  });
  return done != null;
}

/**
 * Count the user's DUE review cards in a category (spec §B, the /practice badge): `ReviewState` rows
 * with `dueAt <= now` whose question is published, active, non-archived and in the category — the same
 * `baseWhere` shape the queue loaders use. Communicates «заплановано на сьогодні» to the learner; the
 * SPACED queue itself stays due-only too, so badge and session agree. `now` injected (deterministic).
 *
 * Loads the user's ReviewState via a `where: { userId }` scan + a JS join against the category's
 * published question ids — never an id-list `{ in: [...] }` over the full pool (P2029, see CLAUDE.md).
 */
export async function countDueReviews(
  userId: string,
  categoryId: string,
  now: Date = new Date(),
): Promise<number> {
  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      isPublished: true,
      archivedAt: null,
      categories: { some: { id: categoryId } },
    },
    select: { id: true },
  });
  const questionIds = new Set(questions.map((q) => q.id));

  const states = await prisma.reviewState.findMany({
    where: { userId },
    select: { questionId: true, dueAt: true },
  });

  let dueCount = 0;
  for (const s of states) {
    if (!questionIds.has(s.questionId)) continue;
    if (s.dueAt != null && s.dueAt.getTime() <= now.getTime()) dueCount++;
  }
  return dueCount;
}

// ── Finite study plan (spec §F) ───────────────────────────────────────────────────────────────────

/**
 * The learner's finite study plan: gather the exam date, the count of DUE review cards, and the count
 * of UNSEEN questions for the user's selected category, then hand them to the PURE `computeStudyPlan`
 * for the honest daily-quota math. This layer only loads DB shape — it never re-derives the plan; the
 * message is plain, non-punitive copy from the pure module. `now` is injected (deterministic tests).
 *
 * Loads the user's ReviewState via a `where: { userId }` scan + a JS join against the category's
 * published question ids — never an id-list `{ in: [...] }` over the full pool (P2029, see CLAUDE.md).
 *
 * Intelligence gate (wave16-08): the plan is a GATED surface — throws EntitlementRequiredError for
 * a non-entitled user while the master flag is on; inert (everyone passes) with the flag off. The
 * ONE free caller is the onboarding first-plan screen (wave16-01 Findings 1a-ii: a brand-new user
 * cannot have heard of pricing yet), which passes `skipEntitlementGate`.
 */
export async function getStudyPlan(
  userId: string,
  now: Date = new Date(),
  opts: { skipEntitlementGate?: boolean } = {},
): Promise<StudyPlan> {
  if (!opts.skipEntitlementGate) await requireIntelligenceAccess(userId, now);
  const profile = await getOrCreateProfile(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { selectedCategoryId: true },
  });
  const categoryId = user?.selectedCategoryId ?? null;

  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      isPublished: true,
      archivedAt: null,
      ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
    },
    select: { id: true },
  });
  const questionIds = new Set(questions.map((q) => q.id));

  // DUE = a seen card whose dueAt has arrived; UNSEEN = a published question with no ReviewState.
  // `stability` rides the SAME query (a scalar on the row — no new findMany, no id-list `in`) so the
  // reviewLoad estimate accumulates in this one scan (P2029 / query-count discipline, see CLAUDE.md).
  const states = await prisma.reviewState.findMany({
    where: { userId },
    select: { questionId: true, dueAt: true, stability: true },
  });
  const seen = new Set<string>();
  let dueCount = 0;
  // Steady review tax (wave21-01 estimator): sum of 1/stability over seen cards, capped at the seen
  // count. A low-stability card comes due often (≈1/S per day), so Σ 1/max(1,S) approximates the daily
  // reviews owed; the min-cap keeps it honest (you can never owe more reviews/day than cards you've seen).
  let sumInvStability = 0;
  for (const s of states) {
    if (!questionIds.has(s.questionId)) continue;
    seen.add(s.questionId);
    sumInvStability += 1 / Math.max(1, s.stability);
    if (s.dueAt != null && s.dueAt.getTime() <= now.getTime()) dueCount++;
  }
  const unseenCount = questions.length - seen.size;
  const reviewLoad = Math.min(seen.size, Math.round(sumInvStability));

  // The pure math works in local day keys — derive both today and the exam date in the profile tz.
  const todayKey = dayKeyInTimezone(now, profile.timezone);
  const examDate = profile.examDate ? dayKeyInTimezone(profile.examDate, profile.timezone) : null;

  return computeStudyPlan({
    examDate,
    todayKey,
    dueCount,
    unseenCount,
    defaultGoal: profile.dailyGoal,
    reviewLoad,
  });
}
