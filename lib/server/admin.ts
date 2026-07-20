import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  summarizeQuestionPerformance,
  type QuestionPerformance,
} from "@/lib/question-stats";
import {
  type AnalyticsRange,
  type TimeBucket,
  type FunnelStep,
  rangeStart,
  bucketUnit,
  bucketEventsOverTime,
  computeFunnel,
  passRate,
  chunk,
  referrerHost,
} from "@/lib/analytics-dashboard";
import { MODE_LABEL } from "@/lib/constants";

// Data helpers + dashboard stats for the admin area. Queries only — mutations live in
// app/admin/actions.ts. Every page that calls these is already protected by
// app/admin/layout.tsx (requireContentManager), but these are read-only regardless.

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function getDashboardStats() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    questionsTotal,
    questionsPublished,
    questionsArchived,
    questionsDemo,
    questionsOfficial,
    categories,
    topics,
    users,
    analyticsLast7d,
  ] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({ where: { isPublished: true, isActive: true } }),
    prisma.question.count({ where: { NOT: { archivedAt: null } } }),
    prisma.question.count({ where: { isDemo: true } }),
    prisma.question.count({ where: { sourceType: "OFFICIAL" } }),
    prisma.category.count(),
    prisma.topic.count(),
    prisma.user.count(),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ]);

  return {
    questionsTotal,
    questionsPublished,
    questionsArchived,
    questionsDemo,
    questionsOfficial,
    categories,
    topics,
    users,
    analyticsLast7d,
  };
}

export async function getRecentAdminActions(limit = 15) {
  return prisma.adminActionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { adminUser: { select: { name: true, email: true } } },
  });
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------
export const QUESTIONS_PAGE_SIZE = 50;

export interface PaginatedQuestions<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Paginated question list for the admin index. The DB now holds ~1693 questions, so loading
 * all of them blocked the page; this takes one page (createdAt desc, same `filter` semantics)
 * via take/skip plus a parallel count. `page` is 1-based and clamped to [1, totalPages].
 */
export async function listQuestions(
  filter: "all" | "published" = "all",
  page = 1,
  pageSize = QUESTIONS_PAGE_SIZE,
) {
  const where = filter === "published" ? { isPublished: true, isActive: true } : {};
  const safePageSize = Math.max(1, Math.trunc(pageSize));

  const total = await prisma.question.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, Math.trunc(page)), totalPages);

  const rows = await prisma.question.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
    include: {
      topic: { select: { id: true, title: true } },
      categories: { select: { id: true, code: true } },
      _count: { select: { options: true } },
    },
  });

  return {
    rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  } satisfies PaginatedQuestions<(typeof rows)[number]>;
}

// ---------------------------------------------------------------------------
// Filtered / searchable / sortable question list (admin index, AUDIT: question mgmt).
// All filters are first-party DB predicates; nothing leaves the server. Search is a
// case-insensitive substring on question text only (never on user data). Sort is
// limited to a small whitelist so an arbitrary `orderBy` can't be injected.
// ---------------------------------------------------------------------------
export const QUESTION_SORTS = [
  "newest",
  "oldest",
  "difficulty_desc",
  "difficulty_asc",
] as const;
export type QuestionSort = (typeof QUESTION_SORTS)[number];

export const QUESTION_STATUS_FILTERS = [
  "all",
  "published",
  "draft",
  "archived",
] as const;
export type QuestionStatusFilter = (typeof QUESTION_STATUS_FILTERS)[number];

export const QUESTION_DEMO_FILTERS = ["all", "demo", "official"] as const;
export type QuestionDemoFilter = (typeof QUESTION_DEMO_FILTERS)[number];

export const QUESTION_IMAGE_FILTERS = ["all", "with", "without"] as const;
export type QuestionImageFilter = (typeof QUESTION_IMAGE_FILTERS)[number];

export interface QuestionListFilters {
  search?: string;
  status?: QuestionStatusFilter;
  demo?: QuestionDemoFilter;
  image?: QuestionImageFilter;
  /** A specific source type (DEMO/OFFICIAL/CUSTOM); empty = any. */
  sourceType?: string;
  /** Category id; empty = any. */
  categoryId?: string;
  /** Topic id; "__none__" = questions with no topic; empty = any. */
  topicId?: string;
  sort?: QuestionSort;
  page?: number;
  pageSize?: number;
}

const QUESTION_SORT_ORDER: Record<
  QuestionSort,
  Prisma.QuestionOrderByWithRelationInput | Prisma.QuestionOrderByWithRelationInput[]
> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  difficulty_desc: [{ difficulty: "desc" }, { createdAt: "desc" }],
  difficulty_asc: [{ difficulty: "asc" }, { createdAt: "desc" }],
};

/** No-topic sentinel used in the topic filter select (an empty value means "any topic"). */
export const NO_TOPIC_FILTER = "__none__";

/**
 * Build the Prisma `where` for the filtered admin list. Exported (pure given inputs) so
 * the bulk-action "apply to all matching" path can reuse the EXACT same predicate the UI
 * showed, instead of re-deriving it and drifting.
 */
export function buildQuestionWhere(f: QuestionListFilters): Prisma.QuestionWhereInput {
  const where: Prisma.QuestionWhereInput = {};
  const search = f.search?.trim();
  if (search) {
    // SQLite `contains` is case-insensitive for ASCII; Prisma's `mode` is unsupported on SQLite,
    // so we don't pass it. Text search only — never user/answer data.
    where.text = { contains: search };
  }
  switch (f.status) {
    case "published":
      where.isPublished = true;
      where.isActive = true;
      where.archivedAt = null;
      break;
    case "draft":
      where.isPublished = false;
      where.archivedAt = null;
      break;
    case "archived":
      where.NOT = { archivedAt: null };
      break;
    default:
      break;
  }
  if (f.demo === "demo") where.isDemo = true;
  else if (f.demo === "official") where.isDemo = false;

  if (f.image === "with") where.imageUrl = { not: null };
  else if (f.image === "without") where.imageUrl = null;

  const sourceType = f.sourceType?.trim();
  if (sourceType) where.sourceType = sourceType;

  const categoryId = f.categoryId?.trim();
  if (categoryId) where.categories = { some: { id: categoryId } };

  const topicId = f.topicId?.trim();
  if (topicId === NO_TOPIC_FILTER) where.topicId = null;
  else if (topicId) where.topicId = topicId;

  return where;
}

/**
 * Filtered, sorted, paginated question list for the admin index. Same shape as
 * `listQuestions` but driven by `QuestionListFilters`. Page is 1-based, clamped to
 * [1, totalPages]; only whitelisted sorts are honoured.
 */
export async function listQuestionsFiltered(filters: QuestionListFilters) {
  const where = buildQuestionWhere(filters);
  const sort: QuestionSort = QUESTION_SORTS.includes(filters.sort as QuestionSort)
    ? (filters.sort as QuestionSort)
    : "newest";
  const pageSize = Math.max(1, Math.trunc(filters.pageSize ?? QUESTIONS_PAGE_SIZE));

  const total = await prisma.question.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.trunc(filters.page ?? 1)), totalPages);

  const rows = await prisma.question.findMany({
    where,
    orderBy: QUESTION_SORT_ORDER[sort],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      topic: { select: { id: true, title: true } },
      categories: { select: { id: true, code: true } },
      _count: { select: { options: true } },
    },
  });

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
  } satisfies PaginatedQuestions<(typeof rows)[number]>;
}

export async function getQuestionForEdit(id: string) {
  return prisma.question.findUnique({
    where: { id },
    include: {
      categories: { select: { id: true } },
      options: { orderBy: { displayOrder: "asc" } },
      explanation: true,
    },
  });
}

/** Topics + categories needed to populate the editor selects. */
export async function getEditorOptions() {
  const [topics, categories] = await Promise.all([
    prisma.topic.findMany({ orderBy: [{ displayOrder: "asc" }, { title: "asc" }] }),
    prisma.category.findMany({ orderBy: { code: "asc" } }),
  ]);
  return { topics, categories };
}

export interface QuestionPerformanceRow extends QuestionPerformance {
  text: string;
  topicTitle: string;
  isDemo: boolean;
}

/**
 * Per-question performance for the admin "hardest questions" view. Reads real
 * TestAnswer rows, summarizes them via the pure summarizer (hardest-first), then
 * enriches each entry with question text/topic/isDemo. Only answered questions
 * are reported (never-answered ones are not injected); order is preserved.
 */
export async function getQuestionPerformance(): Promise<QuestionPerformanceRow[]> {
  const rows = await prisma.testAnswer.findMany({
    select: { questionId: true, isCorrect: true },
  });

  const stats = summarizeQuestionPerformance(rows);
  if (stats.length === 0) return [];

  const questions = await prisma.question.findMany({
    where: { id: { in: stats.map((s) => s.questionId) } },
    select: {
      id: true,
      text: true,
      isDemo: true,
      topic: { select: { title: true } },
    },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));

  return stats.map((s) => {
    const q = byId.get(s.questionId);
    return {
      ...s,
      text: q?.text ?? "",
      topicTitle: q?.topic?.title ?? "Без теми",
      isDemo: q?.isDemo ?? false,
    };
  });
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { questions: true } } },
  });
}

export async function getCategory(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------
export async function listTopics() {
  return prisma.topic.findMany({
    orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    include: {
      parent: { select: { id: true, title: true } },
      _count: { select: { questions: true } },
    },
  });
}

export async function getTopic(id: string) {
  return prisma.topic.findUnique({ where: { id } });
}

// ---------------------------------------------------------------------------
// Content versions
// ---------------------------------------------------------------------------
export async function listContentVersions() {
  return prisma.contentVersion.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
}

export async function getContentVersion(id: string) {
  return prisma.contentVersion.findUnique({ where: { id } });
}

// ---------------------------------------------------------------------------
// Analytics (first-party, privacy-preserving aggregates only)
// ---------------------------------------------------------------------------
export interface AnalyticsCount {
  name: string;
  count: number;
}

export interface AnalyticsSummary {
  total: number;
  last7d: number;
  last24h: number;
  /** Distinct first-party visitors (anonymousId) seen in the last 7 days. */
  visitors7d: number;
  topEvents: AnalyticsCount[];
  byDevice: AnalyticsCount[];
}

/**
 * Aggregate-only analytics for the admin view. Returns COUNTS and groupings —
 * never raw rows, IPs (only ever stored hashed) or per-user trails. Honours the
 * first-party privacy model: we read the own DB and surface totals, not identities.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

  const [total, last7d, last24h, visitorGroups, topEventGroups, deviceGroups] =
    await Promise.all([
      prisma.analyticsEvent.count(),
      prisma.analyticsEvent.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.analyticsEvent.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.analyticsEvent.groupBy({
        by: ["anonymousId"],
        where: { createdAt: { gte: sevenDaysAgo }, NOT: { anonymousId: null } },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["eventName"],
        _count: { _all: true },
        orderBy: { _count: { eventName: "desc" } },
        take: 8,
      }),
      prisma.analyticsEvent.groupBy({
        by: ["deviceType"],
        where: { NOT: { deviceType: null } },
        _count: { _all: true },
        orderBy: { _count: { deviceType: "desc" } },
      }),
    ]);

  return {
    total,
    last7d,
    last24h,
    visitors7d: visitorGroups.length,
    topEvents: topEventGroups.map((g) => ({
      name: g.eventName,
      count: g._count._all,
    })),
    byDevice: deviceGroups.map((g) => ({
      name: g.deviceType ?? "—",
      count: g._count._all,
    })),
  };
}

// ---------------------------------------------------------------------------
// Full analytics DASHBOARD (date-range filtered, aggregate-only). Powers
// /admin/analytics. Every figure is a COUNT or grouping over the own DB — no raw
// rows, no raw IPs (only ever stored hashed), no per-user trails leave this layer.
// Efficiency: groupBy + count aggregations over the new indexes; the time-series
// fetches only `createdAt` for the window; large IN() lookups (question labels) are
// batched under the libsql bound-parameter limit via chunk().
// ---------------------------------------------------------------------------

/** Max ids per IN() batch — keeps Prisma's bound-param count well under the libsql limit. */
const IN_BATCH_SIZE = 400;

export interface LabeledCount {
  name: string;
  count: number;
}

export interface QuestionStatRow {
  questionId: string;
  text: string;
  timesAnswered: number;
  wrong: number;
  accuracy: number; // 0..1
  isDemo: boolean;
}

export interface AnalyticsDashboard {
  range: AnalyticsRange;
  windowStart: Date;
  // KPI cards
  totalUsers: number;
  newUsers: number; // registered within the window
  activeDau: number; // distinct active visitors in the last 24h
  activeWau: number; // distinct active visitors in the last 7d
  totalEvents: number; // events within the window
  testStarts: number; // sessions started within the window
  testCompletions: number;
  examPassRate: number; // 0..1 over completed exams in the window
  // Funnel + series
  funnel: FunnelStep[];
  eventsOverTime: TimeBucket[];
  timeUnit: "hour" | "day";
  // Breakdowns
  topEventTypes: LabeledCount[];
  topPaths: LabeledCount[];
  byDevice: LabeledCount[];
  byReferrer: LabeledCount[];
  topCategories: LabeledCount[];
  topTopics: LabeledCount[];
  mostAnswered: QuestionStatRow[];
  mostMistaken: QuestionStatRow[];
}

/** Distinct active "actors" in a window: a logged-in userId OR an anonymous visitor id. */
async function countActiveActors(since: Date): Promise<number> {
  const [byUser, byAnon] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since }, NOT: { userId: null } },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["anonymousId"],
      where: { createdAt: { gte: since }, userId: null, NOT: { anonymousId: null } },
    }),
  ]);
  // Logged-in users are counted by userId; remaining anonymous traffic by anonymousId.
  // These two partitions are disjoint (the anon group filters userId:null), so summing
  // their distinct cardinalities is a sound active-actor estimate without per-row joins.
  return byUser.length + byAnon.length;
}

/**
 * Enrich a list of `{ questionId, timesAnswered, wrong, accuracy }` with question text/isDemo,
 * batching the IN() lookup so a large id set stays under the libsql param limit. Order preserved.
 */
async function enrichQuestionStats(
  stats: { questionId: string; timesAnswered: number; wrong: number; accuracy: number }[],
): Promise<QuestionStatRow[]> {
  if (stats.length === 0) return [];
  const ids = stats.map((s) => s.questionId);
  const byId = new Map<string, { text: string; isDemo: boolean }>();
  for (const batch of chunk(ids, IN_BATCH_SIZE)) {
    const rows = await prisma.question.findMany({
      where: { id: { in: batch } },
      select: { id: true, text: true, isDemo: true },
    });
    for (const r of rows) byId.set(r.id, { text: r.text, isDemo: r.isDemo });
  }
  return stats.map((s) => ({
    questionId: s.questionId,
    text: byId.get(s.questionId)?.text ?? "",
    isDemo: byId.get(s.questionId)?.isDemo ?? false,
    timesAnswered: s.timesAnswered,
    wrong: s.wrong,
    accuracy: s.accuracy,
  }));
}

/** Map category ids → "CODE · Title" labels for the top-categories breakdown. */
async function labelCategories(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const batch of chunk(ids, IN_BATCH_SIZE)) {
    const rows = await prisma.category.findMany({
      where: { id: { in: batch } },
      select: { id: true, code: true, title: true },
    });
    for (const r of rows) out.set(r.id, `${r.code} · ${r.title}`);
  }
  return out;
}

/**
 * The full first-party analytics dashboard for the given range. One call fans out a fixed
 * set of aggregate queries (no per-row scans beyond the windowed timestamp pull for the
 * series). All breakdowns are top-N capped. Privacy: aggregate counts/groupings only.
 */
export async function getAnalyticsDashboard(
  range: AnalyticsRange,
  now: number = Date.now(),
): Promise<AnalyticsDashboard> {
  const windowStart = rangeStart(range, now);
  const unit = bucketUnit(range);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const inWindow = { createdAt: { gte: windowStart } };

  const [
    totalUsers,
    newUsers,
    activeDau,
    activeWau,
    totalEvents,
    testStarts,
    testCompletions,
    examTotal,
    examPassed,
    // Funnel raw counts (distinct users where it matters)
    funnelRegistered,
    funnelOnboarded,
    funnelFirstTest,
    funnelCompleted,
    // Breakdowns
    eventTypeGroups,
    pathGroups,
    deviceGroups,
    referrerGroups,
    categoryGroups,
    topicGroups,
    answerRows,
    seriesRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: windowStart } } }),
    countActiveActors(dayAgo),
    countActiveActors(weekAgo),
    prisma.analyticsEvent.count({ where: inWindow }),
    prisma.testSession.count({ where: { startedAt: { gte: windowStart } } }),
    prisma.testSession.count({
      where: { status: "COMPLETED", finishedAt: { gte: windowStart } },
    }),
    prisma.testSession.count({
      where: { mode: "EXAM_SIMULATION", status: "COMPLETED", finishedAt: { gte: windowStart } },
    }),
    prisma.testSession.count({
      where: {
        mode: "EXAM_SIMULATION",
        status: "COMPLETED",
        result: "PASSED",
        finishedAt: { gte: windowStart },
      },
    }),
    // FUNNEL — distinct users reaching each step (events are scoped to the window).
    prisma.analyticsEvent
      .groupBy({ by: ["userId"], where: { ...inWindow, eventName: "user_registered", NOT: { userId: null } } })
      .then((g) => g.length),
    prisma.analyticsEvent
      .groupBy({ by: ["userId"], where: { ...inWindow, eventName: "onboarding_completed", NOT: { userId: null } } })
      .then((g) => g.length),
    prisma.analyticsEvent
      .groupBy({ by: ["userId"], where: { ...inWindow, eventName: "test_started", NOT: { userId: null } } })
      .then((g) => g.length),
    prisma.analyticsEvent
      .groupBy({ by: ["userId"], where: { ...inWindow, eventName: "test_completed", NOT: { userId: null } } })
      .then((g) => g.length),
    // Top event TYPES: the typed `eventName` (registered/answered/…) is the most useful axis.
    prisma.analyticsEvent.groupBy({
      by: ["eventName"],
      where: inWindow,
      _count: { _all: true },
      orderBy: { _count: { eventName: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["path"],
      where: { ...inWindow, NOT: { path: null } },
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["deviceType"],
      where: { ...inWindow, NOT: { deviceType: null } },
      _count: { _all: true },
      orderBy: { _count: { deviceType: "desc" } },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["referrer"],
      where: inWindow,
      _count: { _all: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 50, // grouped further by host below
    }),
    // Sessions by category/topic (mode) in the window — top categories/topics by activity.
    prisma.testSession.groupBy({
      by: ["categoryId"],
      where: { startedAt: { gte: windowStart }, NOT: { categoryId: null } },
      _count: { _all: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: 10,
    }),
    prisma.testSession.groupBy({
      by: ["mode"],
      where: { startedAt: { gte: windowStart } },
      _count: { _all: true },
      orderBy: { _count: { mode: "desc" } },
    }),
    // Per-question answer rows in the window (questionId + isCorrect only — no identity).
    prisma.testAnswer.findMany({
      where: { answeredAt: { gte: windowStart } },
      select: { questionId: true, isCorrect: true },
    }),
    // Time series: pull ONLY the timestamps in the window (indexed), bucket in-memory.
    prisma.analyticsEvent.findMany({
      where: inWindow,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // ----- Funnel -----
  const funnel = computeFunnel([
    { key: "registered", label: "Реєстрація", count: funnelRegistered },
    { key: "onboarded", label: "Онбординг", count: funnelOnboarded },
    { key: "first_test", label: "Перший тест", count: funnelFirstTest },
    { key: "completed", label: "Завершення тесту", count: funnelCompleted },
  ]);

  // ----- Time series -----
  const eventsOverTime = bucketEventsOverTime(
    seriesRows.map((r) => ({ at: r.createdAt })),
    windowStart.getTime(),
    now,
    unit,
  );

  // ----- Referrers: fold raw values into hosts, then top 8 -----
  const refByHost = new Map<string, number>();
  for (const g of referrerGroups) {
    const host = referrerHost(g.referrer);
    refByHost.set(host, (refByHost.get(host) ?? 0) + g._count._all);
  }
  const byReferrer: LabeledCount[] = [...refByHost.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ----- Most-answered / most-mistaken questions -----
  const perQuestion = new Map<string, { timesAnswered: number; wrong: number; correct: number }>();
  for (const a of answerRows) {
    const e = perQuestion.get(a.questionId) ?? { timesAnswered: 0, wrong: 0, correct: 0 };
    e.timesAnswered += 1;
    if (a.isCorrect) e.correct += 1;
    else e.wrong += 1;
    perQuestion.set(a.questionId, e);
  }
  const allStats = [...perQuestion.entries()].map(([questionId, v]) => ({
    questionId,
    timesAnswered: v.timesAnswered,
    wrong: v.wrong,
    accuracy: v.timesAnswered > 0 ? v.correct / v.timesAnswered : 0,
  }));
  const mostAnsweredStats = [...allStats]
    .sort((a, b) => b.timesAnswered - a.timesAnswered)
    .slice(0, 10);
  const mostMistakenStats = [...allStats]
    .filter((s) => s.wrong > 0)
    .sort((a, b) => (b.wrong !== a.wrong ? b.wrong - a.wrong : b.timesAnswered - a.timesAnswered))
    .slice(0, 10);
  // Enrich the UNION once (shared lookup), then re-slice per list.
  const unionIds = [
    ...new Set([...mostAnsweredStats, ...mostMistakenStats].map((s) => s.questionId)),
  ];
  const enrichedUnion = await enrichQuestionStats(
    unionIds.map((id) => allStats.find((s) => s.questionId === id)!),
  );
  const enrichedById = new Map(enrichedUnion.map((r) => [r.questionId, r]));
  const mostAnswered = mostAnsweredStats.map((s) => enrichedById.get(s.questionId)!);
  const mostMistaken = mostMistakenStats.map((s) => enrichedById.get(s.questionId)!);

  // ----- Top categories (label the ids) -----
  const catIds = categoryGroups.map((g) => g.categoryId!).filter(Boolean);
  const catLabels = await labelCategories(catIds);
  const topCategories: LabeledCount[] = categoryGroups.map((g) => ({
    name: catLabels.get(g.categoryId ?? "") ?? "—",
    count: g._count._all,
  }));

  const topTopics: LabeledCount[] = topicGroups.map((g) => ({
    name: MODE_LABEL[g.mode as keyof typeof MODE_LABEL] ?? g.mode,
    count: g._count._all,
  }));

  return {
    range,
    windowStart,
    totalUsers,
    newUsers,
    activeDau,
    activeWau,
    totalEvents,
    testStarts,
    testCompletions,
    examPassRate: passRate(examPassed, examTotal),
    funnel,
    eventsOverTime,
    timeUnit: unit,
    topEventTypes: eventTypeGroups.map((g) => ({ name: g.eventName, count: g._count._all })),
    topPaths: pathGroups.map((g) => ({ name: g.path ?? "—", count: g._count._all })),
    byDevice: deviceGroups.map((g) => ({ name: g.deviceType ?? "—", count: g._count._all })),
    byReferrer,
    topCategories,
    topTopics,
    mostAnswered,
    mostMistaken,
  };
}
