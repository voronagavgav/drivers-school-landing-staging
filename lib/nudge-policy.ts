import {
  NUDGE_EVENING_HOUR,
  NUDGE_EXAM_COUNTDOWN_DAYS,
  NUDGE_KINDS,
  NUDGE_READINESS_MILESTONES,
  NUDGE_WEEKLY_CAP,
  WINBACK_WINDOW_END_DAY,
  WINBACK_WINDOW_START_DAY,
} from "@/lib/constants";

const DAY_MS = 86_400_000;

/** Local-date key `YYYY-MM-DD` for `d` in `timezone` (pure; no server-only Intl dependency). */
function dayKeyIn(d: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Retake win-back window predicate (Wave 16 spec T3). True iff the learner
 * self-reported a FAILED exam and TODAY is exactly WINBACK_WINDOW_START_DAY (8)
 * or WINBACK_WINDOW_END_DAY (9) CALENDAR days after the exam — the day count is
 * taken in the user's `timezone` (Kyiv-calendar-day math, NOT a UTC-naive diff:
 * a 21:30Z "now" is already the next Kyiv day). No I/O; `now` is injected.
 */
export function winbackEligible(
  outcome: string | null,
  examOutcomeDate: Date | null,
  now: Date,
  timezone: string,
): boolean {
  if (outcome !== "FAILED" || examOutcomeDate === null) return false;
  const daysSince = Math.round(
    (Date.parse(dayKeyIn(now, timezone)) -
      Date.parse(dayKeyIn(examOutcomeDate, timezone))) /
      DAY_MS,
  );
  return (
    daysSince === WINBACK_WINDOW_START_DAY || daysSince === WINBACK_WINDOW_END_DAY
  );
}

// ---------------------------------------------------------------------------
// Pure nudge decision policy (Wave 14 spec §A). No DB, no wall clock — every
// piece of state is injected by the caller (the server layer derives dayKey,
// localHour, examDaysLeft, counts, and settings; see lib/server/nudges.ts).
// Nudges are in-app dashboard cards rendered on visit, NOT pushes, so the
// account quiet-hours settings are deliberately out of scope here.
// ---------------------------------------------------------------------------

export type NudgeKind = (typeof NUDGE_KINDS)[number];

export interface NudgeInput {
  /** Local-date key `YYYY-MM-DD` of "today" for this user (drives the dedupeKey). */
  dayKey: string;
  userId: string;
  /** Review-queue cards currently due for this user. */
  dueCount: number;
  /** Whole days until the learner's exam date; null when no date is set. */
  examDaysLeft: number | null;
  streakAlive: boolean;
  yesterdayGoalMet: boolean;
  /** Reviews the user has already done today (a day-off offer needs an empty day). */
  todayReviewCount: number;
  /** User-local hour of day, 0..23. */
  localHour: number;
  /** Readiness estimate (0..100) at the previous snapshot; null when unknown. */
  readinessPrev: number | null;
  /** Current readiness estimate (0..100); null when unknown. */
  readinessCurr: number | null;
  /** Whether the readiness estimate rests on enough data to celebrate. */
  sufficientData: boolean;
  /**
   * Whether the retake win-back window is open for this user (day 8/9 after a
   * FAILED exam), already ONE-SHOT-filtered by the server (a prior win-back
   * impression for the same reported failure clears it). Precomputed via the
   * pure `winbackEligible` above so the policy stays timezone-free.
   */
  winbackEligible: boolean;
  /** Nudges already sent in the rolling 7-day window (caps at NUDGE_WEEKLY_CAP). */
  sentLast7Days: number;
  /** Whether a nudge was already emitted today (hard one-per-day rule). */
  emittedToday: boolean;
  settings: {
    notifReviewDue: boolean;
    notifExamCountdown: boolean;
    notifStudyReminder: boolean;
  };
}

function qualifiesExamCountdown(input: NudgeInput): boolean {
  return (
    input.settings.notifExamCountdown &&
    input.examDaysLeft !== null &&
    NUDGE_EXAM_COUNTDOWN_DAYS.some((d) => d === input.examDaysLeft)
  );
}

function qualifiesReviewDue(input: NudgeInput): boolean {
  return input.settings.notifReviewDue && input.dueCount > 0;
}

function qualifiesReadinessMilestone(input: NudgeInput): boolean {
  return (
    input.settings.notifStudyReminder &&
    input.sufficientData &&
    input.readinessPrev !== null &&
    input.readinessCurr !== null &&
    NUDGE_READINESS_MILESTONES.some(
      (m) => input.readinessPrev! < m && input.readinessCurr! >= m,
    )
  );
}

function qualifiesDayOffOffer(input: NudgeInput): boolean {
  return (
    input.settings.notifStudyReminder &&
    input.streakAlive &&
    input.yesterdayGoalMet &&
    input.todayReviewCount === 0 &&
    input.localHour >= NUDGE_EVENING_HOUR
  );
}

/**
 * Decide which nudge (if any) to show today. Global suppressors first — at most
 * one nudge per day and at most NUDGE_WEEKLY_CAP per rolling window (the cap
 * wins even over an open win-back window) — then the highest-priority qualifying
 * kind wins:
 * RETAKE_WINBACK > EXAM_COUNTDOWN > REVIEW_DUE > READINESS_MILESTONE > DAY_OFF_OFFER.
 * RETAKE_WINBACK leads because its window is only two days wide (spec T3), so it
 * must not be crowded out by a longer-lived candidate.
 *
 * The dedupeKey matches the NotificationLog shape `<kind>:<day>:<userId>`.
 */
export function decideNudge(
  input: NudgeInput,
): { kind: NudgeKind; dedupeKey: string } | null {
  if (input.emittedToday) return null;
  if (input.sentLast7Days >= NUDGE_WEEKLY_CAP) return null;

  let kind: NudgeKind | null = null;
  if (input.winbackEligible) kind = "RETAKE_WINBACK";
  else if (qualifiesExamCountdown(input)) kind = "EXAM_COUNTDOWN";
  else if (qualifiesReviewDue(input)) kind = "REVIEW_DUE";
  else if (qualifiesReadinessMilestone(input)) kind = "READINESS_MILESTONE";
  else if (qualifiesDayOffOffer(input)) kind = "DAY_OFF_OFFER";
  if (kind === null) return null;

  return { kind, dedupeKey: kind + ":" + input.dayKey + ":" + input.userId };
}
