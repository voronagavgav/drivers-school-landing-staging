import "server-only";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { getLatestReadiness } from "@/lib/server/mastery-readiness";
import { recordExamOutcomeSchema, firstIssueMessage } from "@/lib/validation";
import { recordEvent } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Wave 19a §I — calibration capture. `recordExamOutcome` snapshots the user's
// CURRENT predicted P(pass) and pairs it with the real self-reported exam
// result in a durable `PassOutcome` row, so the admin calibration view (08) can
// score how honest the dial has been.
//
// SELF-ONLY: identity is resolved server-side via requireUser() — there is NO
// userId parameter, so no client-supplied id can redirect the write (IDOR is
// impossible by construction).
//
// THE HONESTY LAW (capture gate = sufficientData): we persist a calibration
// pair ONLY when the user's latest readiness snapshot actually held a REAL
// number (`sufficientData === true`). Below that, the "prediction" is a prior,
// not a forecast, so recording it would poison the calibration score — we skip
// it gracefully (no row, no throw, no event). Every persisted PassOutcome
// therefore carries a genuine prediction↔outcome pair.
//
// This is ADDITIVE to and SEPARATE from `reportExamOutcomeAction`
// (lib/server/study-profile.ts), which writes the PASSED/FAILED profile enum +
// fires `exam_outcome_reported`. The two are composed on ONE user action in
// wave19a-07.
// ---------------------------------------------------------------------------

/** Discriminated result: whether a calibration pair was actually persisted. */
export type RecordExamOutcomeResult =
  | { ok: true; captured: boolean }
  | { error: string };

/**
 * SELF-ONLY: snapshot the current user's predicted P(pass) and record a
 * calibration `PassOutcome` row for the real exam `passed` result.
 *
 * @param passed      the real exam outcome (true = passed).
 * @param categoryId  optional exam category; defaults to the user's selected
 *                    category so the snapshot is scoped to the right exam.
 *
 * Captures a row ONLY when a latest readiness snapshot exists with
 * `sufficientData === true` (the honesty law) — otherwise returns
 * `{ ok: true, captured: false }` without writing or firing an event.
 */
export async function recordExamOutcome(
  passed: boolean,
  categoryId?: string,
): Promise<RecordExamOutcomeResult> {
  const user = await requireUser();

  const parsed = recordExamOutcomeSchema.safeParse({ passed, categoryId });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const scopeCategoryId = parsed.data.categoryId ?? user.selectedCategoryId ?? null;
  const latest = await getLatestReadiness(user.id, scopeCategoryId);

  // The honesty law: only record a calibration pair when the dial held a real
  // number for the user. No snapshot / insufficient data → no row, no throw.
  if (!latest || latest.sufficientData !== true) {
    return { ok: true, captured: false };
  }

  await prisma.passOutcome.create({
    data: {
      userId: user.id,
      predictedPassProbability: latest.snapshot.passProbability,
      passed: parsed.data.passed,
      categoryId: scopeCategoryId,
      // Segmentation key for future recalibration: the snapshot's inputsJson carries the
      // engine/ρ/tier version tags this prediction was computed under (2026-07-13 follow-up).
      readinessSnapshotId: latest.snapshot.id,
      source: "self_report",
    },
  });

  // Fire-and-forget (house rule: never block the write path, outside any tx) —
  // ONLY when a row was actually inserted.
  void recordEvent("pass_outcome_captured", user.id, {
    predictedPassProbability: latest.snapshot.passProbability,
    passed: parsed.data.passed,
    categoryId: scopeCategoryId,
  });

  return { ok: true, captured: true };
}
