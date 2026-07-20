import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { requireUser } from "@/lib/rbac";
import {
  setExamDateSchema,
  setDailyGoalSchema,
  setPrepModeSchema,
  reportExamOutcomeSchema,
  firstIssueMessage,
} from "@/lib/validation";
import { nextStreakState } from "@/lib/streak-policy";
import { recordEvent } from "@/lib/analytics";
import { recordExamOutcome } from "@/lib/server/pass-outcome";

// ---------------------------------------------------------------------------
// Server orchestration for the study profile (Wave 11, spec §F): the profile
// row, the self-only preference actions, and the per-day StudyDay bump. The
// streak/plan MATH stays in the pure modules (lib/streak-policy.ts,
// lib/study-plan.ts); this layer only derives the local day key, reads/writes
// DB rows, and enforces SELF-ONLY identity (requireUser, never a client userId).
//
// The learner UI (dashboard cards / plan panel) is a later wave — the actions
// return STATE only, never punitive copy.
// ---------------------------------------------------------------------------

/** Discriminated result the (later) UI turns into a field message or a redraw. */
export type StudyProfileActionState = { ok: true } | { error: string };

/**
 * Derive the local calendar day key ("YYYY-MM-DD") for `now` in a timezone.
 * `en-CA` formats as `YYYY-MM-DD`, so the parts join into a stable, Slavic-safe
 * day key that the pure streak/plan math parses to a UTC day index. Reads the
 * injected `now` only — the timezone shifts the wall-clock date, not the clock.
 */
export function dayKeyInTimezone(now: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Return the user's `UserStudyProfile`, creating it with schema defaults if
 * absent (upsert — idempotent, safe to call on every read/write path). Accepts
 * an optional transaction client so it composes inside a caller's `$transaction`
 * (e.g. `bumpStudyDay` within `submitAnswer`), else runs standalone.
 */
export async function getOrCreateProfile(userId: string, tx: Prisma.TransactionClient = prisma) {
  return tx.userStudyProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

/**
 * SELF-ONLY: set (or clear) the current user's exam date. Identity comes from
 * `requireUser()` — the client supplies ONLY the date, never a target user id.
 * An empty/null/absent value clears the deadline (back to maintenance mode).
 */
export async function setExamDateAction(formData: FormData): Promise<StudyProfileActionState> {
  const user = await requireUser();
  const raw = formData.get("examDate");
  const parsed = setExamDateSchema.safeParse({ examDate: raw == null ? null : String(raw) });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const value = parsed.data.examDate;
  const examDate = value ? new Date(value) : null;
  await prisma.userStudyProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, examDate },
    update: { examDate },
  });
  return { ok: true };
}

/**
 * SELF-ONLY: set the current user's daily goal (5..100, small dose). Identity is
 * `requireUser()`; the client supplies ONLY the goal, never a target user id.
 */
export async function setDailyGoalAction(formData: FormData): Promise<StudyProfileActionState> {
  const user = await requireUser();
  const parsed = setDailyGoalSchema.safeParse({ dailyGoal: formData.get("dailyGoal") });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const { dailyGoal } = parsed.data;
  await prisma.userStudyProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, dailyGoal },
    update: { dailyGoal },
  });
  return { ok: true };
}

/**
 * SELF-ONLY (spec T4, wave16-12): the OPTIONAL JTBD onboarding exam-date ANSWER. Distinct
 * from `setExamDateAction` (which the account page reuses for silent edits): this one is the
 * onboarding step and emits the typed `onboarding_jtbd_answered` telemetry. Two answer shapes:
 *   - «Ще не записався» → `scheduled === "no"`: writes NOTHING to examDate, event carries
 *     `examDateKnown: false`;
 *   - a date (or empty) via «Продовжити» → delegates the write to `setExamDateAction`, event
 *     carries `examDateKnown` = whether a real date was supplied.
 * SKIP (the «Пропустити» link) never reaches this action, so no event fires — absence IS the
 * skip signal. Payload is enum/bool ONLY (no free text, no PII, no date value — the date itself
 * already lives on the profile). Event is fire-and-forget (void, outside any write) — house rule.
 */
export async function answerOnboardingExamDate(
  formData: FormData,
): Promise<StudyProfileActionState> {
  const user = await requireUser();
  if (formData.get("scheduled") === "no") {
    void recordEvent("onboarding_jtbd_answered", user.id, {
      question: "exam_date",
      examDateKnown: false,
    });
    return { ok: true };
  }
  const result = await setExamDateAction(formData);
  if ("error" in result) return result;
  const raw = formData.get("examDate");
  const examDateKnown = raw != null && String(raw).length > 0;
  void recordEvent("onboarding_jtbd_answered", user.id, {
    question: "exam_date",
    examDateKnown,
  });
  return { ok: true };
}

/**
 * SELF-ONLY (spec T4, wave16-12): persist the OPTIONAL JTBD prep-mode answer «Як готуєшся?»
 * (SCHOOL / SELF / BOTH). Identity is `requireUser()`; the client supplies ONLY the enum, never a
 * target user id. On success emits the typed `onboarding_jtbd_answered` event fire-and-forget with
 * an enum-only payload (no free text, no PII). Reached only when the user actually picks an option —
 * the «Пропустити» link writes nothing and fires nothing.
 */
export async function setPrepModeAction(formData: FormData): Promise<StudyProfileActionState> {
  const user = await requireUser();
  const parsed = setPrepModeSchema.safeParse({ prepMode: formData.get("prepMode") });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const { prepMode } = parsed.data;
  await prisma.userStudyProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, prepMode },
    update: { prepMode },
  });
  void recordEvent("onboarding_jtbd_answered", user.id, { question: "prep_mode", prepMode });
  return { ok: true };
}

/**
 * SELF-ONLY (spec T3, wave16-10): record the current user's self-reported real-exam
 * outcome. Identity comes from `requireUser()` — the action takes NO userId parameter and
 * ignores any client-supplied user identifier, so cross-user writes are impossible by
 * construction (the IDOR probe proves smuggled ids are inert). Writes ONLY the session
 * user's outcome fields; `examOutcomeReportedAt` is stamped server-side. Latest wins
 * (one row per user, no history table this wave). On success records the typed
 * `exam_outcome_reported` analytics event fire-and-forget (OUTSIDE any transaction —
 * house rule), payload limited to the enum + ISO date (no free text).
 *
 * CALIBRATION CAPTURE (wave19a-07, spec §J): the honest report the user already makes here
 * is ALSO the capture surface for a calibration `PassOutcome` pair — we compose (not merge)
 * `recordExamOutcome` (lib/server/pass-outcome.ts), AWAITED for durability. It is SELF-ONLY
 * (re-resolves identity via requireUser) and self-gating: it writes a row ONLY when the user
 * has a sufficient-data readiness snapshot (the honesty law), else no-ops gracefully. No new
 * client control — the capture is a silent, honest consequence of the report.
 */
export async function reportExamOutcomeAction(
  formData: FormData,
): Promise<StudyProfileActionState> {
  const user = await requireUser();
  const parsed = reportExamOutcomeSchema.safeParse({
    outcome: formData.get("outcome"),
    examDate: formData.get("examDate"),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const { outcome, examDate } = parsed.data;
  const examOutcomeDate = new Date(examDate);
  const reportedAt = new Date();
  await prisma.userStudyProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      examOutcome: outcome,
      examOutcomeDate,
      examOutcomeReportedAt: reportedAt,
    },
    update: { examOutcome: outcome, examOutcomeDate, examOutcomeReportedAt: reportedAt },
  });
  // Compose the calibration capture — AWAITED so the PassOutcome row is durable. Self-only
  // and self-gating (no-ops when the dial never held a real number). Only the analytics event
  // below stays fire-and-forget (house rule).
  await recordExamOutcome(outcome === "PASSED");
  void recordEvent("exam_outcome_reported", user.id, { outcome, examDate });
  return { ok: true };
}

/**
 * Upsert today's `StudyDay` for a user: increment `reviewCount` and recompute
 * `goalMet` (reviewCount >= profile.dailyGoal). SINGLE OWNER of the profile
 * upsert on the answer path (Wave 12b §G de-dupe): the day key's timezone is
 * derived from the profile it fetches itself — callers pass no `tz`. Routes
 * every delegate call through `tx` so it can run inside `submitAnswer`'s
 * interactive transaction; `now` is injected (default `new Date()`) for
 * deterministic tests.
 */
export async function bumpStudyDay(
  userId: string,
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date(),
): Promise<void> {
  const profile = await getOrCreateProfile(userId, tx);
  const day = dayKeyInTimezone(now, profile.timezone);
  const existing = await tx.studyDay.findUnique({
    where: { userId_day: { userId, day } },
    select: { reviewCount: true, goalMet: true },
  });
  const reviewCount = (existing?.reviewCount ?? 0) + 1;
  const goalMet = reviewCount >= profile.dailyGoal;
  await tx.studyDay.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, reviewCount, goalMet },
    update: { reviewCount, goalMet },
  });
  // Streak credit at the moment the day FLIPS to goalMet (wave12b-review: crediting only in
  // finishSession missed goal-met days with no completed session, and mis-credited across a
  // timezone midnight — here the streak day always equals the StudyDay that earned it). Runs at
  // most once per day per user (flip edge) and is guarded again inside the helper.
  if (goalMet && !existing?.goalMet) {
    await advanceStreakForGoalMetDay(userId, day, tx, profile);
  }
}

/**
 * Advance the detoxified streak for a day whose `StudyDay.goalMet` is true. Idempotent: the
 * `lastStudyDay < day` guard makes a repeat call (or a later finishSession walk over the same day)
 * a no-op. Accepts a preloaded `profile` so the answer-path caller doesn't re-upsert it (§G de-dupe).
 */
export async function advanceStreakForGoalMetDay(
  userId: string,
  day: string,
  tx: Prisma.TransactionClient = prisma,
  profile?: Awaited<ReturnType<typeof getOrCreateProfile>>,
): Promise<void> {
  const p = profile ?? (await getOrCreateProfile(userId, tx));
  if (!(p.lastStudyDay === null || p.lastStudyDay < day)) return;
  const streak = nextStreakState(
    { current: p.streakCurrent, best: p.streakBest, lastDay: p.lastStudyDay },
    day,
    p.freezeTokens,
  );
  await tx.userStudyProfile.update({
    where: { userId },
    data: {
      streakCurrent: streak.current,
      streakBest: streak.best,
      lastStudyDay: streak.lastDay,
      freezeTokens: streak.freezeTokens,
      ...(streak.usedFreeze ? { freezeAutoUsedOn: day } : {}),
    },
  });
}
