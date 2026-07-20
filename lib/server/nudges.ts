import "server-only";
import { prisma } from "@/lib/db";
import { NUDGE_KINDS, NUDGE_WINDOW_DAYS } from "@/lib/constants";
import {
  decideNudge,
  winbackEligible,
  type NudgeKind,
  type NudgeInput,
} from "@/lib/nudge-policy";
import { getOrCreateProfile, dayKeyInTimezone } from "@/lib/server/study-profile";
import { countDueReviews } from "@/lib/server/study";

// ---------------------------------------------------------------------------
// Server orchestration for in-app nudges (Wave 14 spec §A). This layer GATHERS
// per-user state (due reviews, exam countdown, streak/StudyDay, the two latest
// readiness snapshots, rolling caps, settings), hands a fully-formed NudgeInput
// to the PURE `decideNudge` (lib/nudge-policy.ts — its oracle vectors are
// frozen), and PERSISTS the decision as a NotificationLog card. All the caps
// and priority live in the pure policy; nothing here decides.
//
// Lifecycle: a shown card is a `{ channel:"inapp", status:"QUEUED" }` row keyed
// by the `<kind>:<day>:<userId>` dedupeKey. Dismissing flips it to
// `status:"SENT", sentAt`. The one-per-day rule counts ANY today row
// (emittedToday); the rolling ≤NUDGE_WEEKLY_CAP cap counts SENT rows in the
// last NUDGE_WINDOW_DAYS. Called from the dashboard page render only — never
// inside a hot-path $transaction.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const READ_CAP = 200;

/** The nudge to render on the dashboard today. */
export type NudgeCard = { id: string; kind: NudgeKind };

/** Today's four candidate dedupeKeys (one per kind) for this user — indexable, no LIKE. */
function todayDedupeKeys(dayKey: string, userId: string): string[] {
  return NUDGE_KINDS.map((kind) => kind + ":" + dayKey + ":" + userId);
}

/** Local hour of day (0..23) for `now` in the given timezone. */
function localHourInTimezone(now: Date, tz: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return Number.parseInt(hour, 10);
}

/** Whole calendar days from `now` to `examDate` in the user's timezone (0 = exam today). */
function examDaysLeft(now: Date, examDate: Date | null, tz: string): number | null {
  if (!examDate) return null;
  const todayKey = dayKeyInTimezone(now, tz);
  const examKey = dayKeyInTimezone(examDate, tz);
  return Math.round((Date.parse(examKey) - Date.parse(todayKey)) / DAY_MS);
}

/**
 * Decide AND persist the day's in-app nudge for a user, returning the card to
 * render (or null). Idempotent per day: a re-render finds the already-queued row
 * and returns it; a dismissed (SENT) day is suppressed via emittedToday.
 */
export async function computeDueNudges(
  userId: string,
  now: Date = new Date(),
): Promise<NudgeCard | null> {
  const profile = await getOrCreateProfile(userId);
  const tz = profile.timezone;
  const dayKey = dayKeyInTimezone(now, tz);
  const dedupeKeys = todayDedupeKeys(dayKey, userId);

  // Every NotificationLog row (any status) for one of today's four dedupeKeys.
  // A QUEUED one is the card already shown (idempotent re-render); the presence
  // of ANY row means a nudge was emitted today (hard one-per-day suppressor).
  const todayRows = await prisma.notificationLog.findMany({
    where: { userId, channel: "inapp", dedupeKey: { in: dedupeKeys } },
    select: { id: true, kind: true, status: true },
    take: READ_CAP,
  });
  const queued = todayRows.find((r) => r.status === "QUEUED");
  if (queued) return { id: queued.id, kind: queued.kind as NudgeKind };
  const emittedToday = todayRows.length > 0;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { selectedCategoryId: true },
  });
  const categoryId = user?.selectedCategoryId ?? null;

  const yesterdayKey = dayKeyInTimezone(new Date(now.getTime() - DAY_MS), tz);
  const [dueCount, todayDay, yesterdayDay, snapshots, settings, sentLast7Days] =
    await Promise.all([
      categoryId ? countDueReviews(userId, categoryId, now) : Promise.resolve(0),
      prisma.studyDay.findUnique({
        where: { userId_day: { userId, day: dayKey } },
        select: { reviewCount: true },
      }),
      prisma.studyDay.findUnique({
        where: { userId_day: { userId, day: yesterdayKey } },
        select: { goalMet: true },
      }),
      prisma.readinessSnapshot.findMany({
        where: { userId, ...(categoryId ? { categoryId } : {}) },
        orderBy: { createdAt: "desc" },
        select: { dialPercent: true, inputsJson: true },
        take: 2,
      }),
      prisma.userSettings.findUnique({
        where: { userId },
        select: {
          notifReviewDue: true,
          notifExamCountdown: true,
          notifStudyReminder: true,
        },
      }),
      // Rolling calm cap counts IMPRESSIONS — every nudge row CREATED in the window, regardless of
      // dismissal (wave14-review major: counting only status:SENT let a user who ignores the card
      // accrue one nudge per qualifying day, 7/7d, breaking the ≤4/7d promise; a shown-but-ignored
      // nudge is still an interruption).
      prisma.notificationLog.count({
        where: {
          userId,
          channel: "inapp",
          createdAt: { gte: new Date(now.getTime() - NUDGE_WINDOW_DAYS * DAY_MS) },
        },
      }),
    ]);

  // Retake win-back (Wave 16 spec T3): the day-8/9 window after a self-reported FAILED exam.
  // The pure predicate owns the Kyiv-calendar-day math; the server adds the ONE-SHOT rule —
  // once ANY RETAKE_WINBACK impression exists at/after the current reported failure
  // (createdAt >= examOutcomeReportedAt), the window is spent, so a day-8 card suppresses day 9.
  // A NEW reported failure (later examOutcomeReportedAt) can win the learner back again.
  const inWinbackWindow = winbackEligible(
    profile.examOutcome,
    profile.examOutcomeDate,
    now,
    tz,
  );
  let winbackOpen = inWinbackWindow;
  if (inWinbackWindow) {
    const priorWinback = await prisma.notificationLog.count({
      where: {
        userId,
        kind: "RETAKE_WINBACK",
        ...(profile.examOutcomeReportedAt
          ? { createdAt: { gte: profile.examOutcomeReportedAt } }
          : {}),
      },
    });
    winbackOpen = priorWinback === 0;
  }

  const readinessCurr = snapshots[0]?.dialPercent ?? null;
  const readinessPrev = snapshots[1]?.dialPercent ?? null;
  let sufficientData = false;
  if (snapshots[0]) {
    try {
      sufficientData = JSON.parse(snapshots[0].inputsJson)?.sufficientData ?? false;
    } catch {
      sufficientData = false;
    }
  }

  const input: NudgeInput = {
    dayKey,
    userId,
    dueCount,
    examDaysLeft: examDaysLeft(now, profile.examDate, tz),
    streakAlive: profile.streakCurrent > 0,
    yesterdayGoalMet: yesterdayDay?.goalMet ?? false,
    todayReviewCount: todayDay?.reviewCount ?? 0,
    localHour: localHourInTimezone(now, tz),
    readinessPrev,
    readinessCurr,
    sufficientData,
    winbackEligible: winbackOpen,
    sentLast7Days,
    emittedToday,
    settings: {
      notifReviewDue: settings?.notifReviewDue ?? true,
      notifExamCountdown: settings?.notifExamCountdown ?? true,
      notifStudyReminder: settings?.notifStudyReminder ?? true,
    },
  };

  const decision = decideNudge(input);
  if (!decision) return null;

  try {
    const row = await prisma.notificationLog.create({
      data: {
        userId,
        kind: decision.kind,
        channel: "inapp",
        status: "QUEUED",
        dedupeKey: decision.dedupeKey,
      },
      select: { id: true },
    });
    return { id: row.id, kind: decision.kind };
  } catch (e) {
    // Unique race on dedupeKey (P2002): another concurrent render already queued
    // today's card — read it back rather than throw to the page.
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      const existing = await prisma.notificationLog.findUnique({
        where: { dedupeKey: decision.dedupeKey },
        select: { id: true, kind: true },
      });
      if (existing) return { id: existing.id, kind: existing.kind as NudgeKind };
    }
    throw e;
  }
}

/**
 * Dismiss a nudge card: flip its row to `status:"SENT", sentAt:now`. Scoped by
 * BOTH id AND userId (updateMany) so a client can never dismiss another user's
 * row by guessing an id. A no-match update is a silent no-op.
 */
export async function dismissNudge(
  userId: string,
  id: string,
  now: Date = new Date(),
): Promise<void> {
  await prisma.notificationLog.updateMany({
    where: { id, userId },
    data: { status: "SENT", sentAt: now },
  });
}
