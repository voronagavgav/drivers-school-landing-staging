// lib/study-plan.ts — PURE finite study-plan math.
//
// From an exam date + due/unseen counts, derive an HONEST daily quota with a
// feasibility flag. No clock / DB / randomness / JSX; self-contained (no
// path-alias imports) so the frozen oracle smoke resolves via a relative import.
// Day keys
// are parsed deterministically to UTC day indices — never a live clock read.

/** Sustainable daily ceiling — above this the plan flags infeasible rather than lying. */
export const MAX_DAILY_QUOTA = 40;

export type StudyPlanInput = {
  examDate: string | null;
  todayKey: string;
  dueCount: number;
  unseenCount: number;
  defaultGoal: number;
  /**
   * Estimated cards that come DUE each day from the user's already-seen deck —
   * the steady review tax (sum of 1/stability over seen cards, capped at the
   * seen count; see the wave21 reviewLoad estimator). Added to the fresh-learning
   * pace so the quota reflects both new work AND daily reviews, not new work alone.
   */
  reviewLoad: number;
};

export type StudyPlan = {
  daysLeft: number | null;
  dailyQuota: number;
  feasible: boolean;
  message: string;
};

/** Parse a `YYYY-MM-DD` day key to a UTC day index (days since epoch). */
function dayIndex(key: string): number {
  const [y, m, d] = key.split("-").map((p) => parseInt(p, 10));
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function computeStudyPlan(input: StudyPlanInput): StudyPlan {
  const { examDate, todayKey, dueCount, unseenCount, defaultGoal, reviewLoad } = input;

  // No exam date: steady maintenance at the user's chosen goal.
  if (examDate === null) {
    return {
      daysLeft: null,
      dailyQuota: defaultGoal,
      feasible: true,
      message: `Без дати іспиту — тримайте темп ${defaultGoal} питань на день.`,
    };
  }

  const daysLeft = Math.max(0, dayIndex(examDate) - dayIndex(todayKey));

  // Exam is today (or overdue): everything remaining lands on one day. Feasible
  // if it fits the user's chosen goal; the displayed quota is still capped at the
  // sustainable ceiling so the UI never shows an absurd one-day number.
  if (daysLeft === 0) {
    const raw = unseenCount + dueCount;
    const feasible = raw <= defaultGoal;
    return {
      daysLeft,
      dailyQuota: Math.min(raw, MAX_DAILY_QUOTA),
      feasible,
      message: feasible
        ? `Іспит сьогодні — залишилось ${raw} питань, ви встигаєте.`
        : `Іспит сьогодні, а залишилось ${raw} питань — за один день не встигнете все опрацювати.`,
    };
  }

  // Nothing new to learn: maintenance mode. The daily load is just the review
  // tax — carry it truthfully, never clamped (a heavy but real review flow is
  // still honest work, not a failure).
  if (unseenCount === 0) {
    return {
      daysLeft,
      dailyQuota: reviewLoad,
      feasible: true,
      message: `Ви все опрацювали — до іспиту повторюйте ~${reviewLoad} питань на день.`,
    };
  }

  // Fresh learning still ahead: spread the unseen work over the remaining days
  // and add the daily review tax on top. Infeasible when that exceeds the ceiling.
  const base = Math.ceil(unseenCount / daysLeft) + reviewLoad;
  const feasible = base <= MAX_DAILY_QUOTA;
  const dailyQuota = Math.min(base, MAX_DAILY_QUOTA);
  return {
    daysLeft,
    dailyQuota,
    feasible,
    message: feasible
      ? `Щоб устигнути до іспиту, опрацьовуйте ${dailyQuota} питань на день (${daysLeft} дн.).`
      : `Матеріалу багато — зосередьтесь на найважливішому: ${dailyQuota} питань на день, чергу підбере слабкі теми першими.`,
  };
}
