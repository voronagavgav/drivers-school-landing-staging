import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  computeCalibration,
  type CalibrationResult,
  type CalibrationRow,
} from "@/lib/calibration";
import { requireIntelligenceAccess } from "./entitlements";

// DB aggregation → the pure computeCalibration (Wave 14 spec §B). Reads the user's ReviewLog rows
// that carry a confidence rating (offline reviews have `confidence: null` and are excluded, per §B)
// and maps the FSRS grade to correctness: correct = grade >= 2 (deriveGrade assigns 1 to a wrong
// answer). The pure fn owns all the bucketing / verdict / slope math.

/** Cursor page size — never an unbounded findMany (Prisma 7 param-limit + memory safety). */
const CHUNK = 200;

export type { CalibrationResult };

// Cursor-paged scan: only rows WITH a confidence rating, selecting just the two fields the mapping
// needs. Keyset paging on the cuid `id` keeps each query bounded at CHUNK rows. Routed through `tx`
// so the slope refresh can compose inside a caller's transaction (default = module client).
async function loadCalibrationRows(
  userId: string,
  tx: Prisma.TransactionClient,
): Promise<CalibrationRow[]> {
  const rows: CalibrationRow[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await tx.reviewLog.findMany({
      where: { userId, confidence: { not: null } },
      select: { id: true, confidence: true, grade: true },
      orderBy: { id: "asc" },
      take: CHUNK,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const r of page) {
      rows.push({ confidence: r.confidence, correct: r.grade >= 2 });
    }
    if (page.length < CHUNK) break;
    cursor = page[page.length - 1].id;
  }

  return rows;
}

/**
 * The /progress calibration surface — GATED (wave16-08): throws EntitlementRequiredError for a
 * non-entitled user while the master flag is on; inert with the flag off. The nightly
 * `refreshCalibrationSlope` persist path below stays ungated by design (stored computations never
 * vary by entitlement).
 */
export async function getCalibrationForUser(userId: string): Promise<CalibrationResult> {
  await requireIntelligenceAccess(userId);
  return computeCalibration(await loadCalibrationRows(userId, prisma));
}

/**
 * Nightly (wave14-07): recompute the user's calibration slope and persist it to
 * `UserStudyProfile.calibrationSlope`, which `recomputeReadiness` reads to discount readiness
 * (lib/server/mastery-readiness.ts). Returns the slope written, or null when there aren't enough
 * sampled confidence answers yet.
 *
 * Insufficient data PRESERVES any existing slope (never nulls out learned data on a quiet week) —
 * a learner who pauses confidence sampling keeps their earned discount. So we only ever WRITE on a
 * sufficient result; an insufficient one is a no-op that returns null.
 */
export async function refreshCalibrationSlope(
  userId: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<number | null> {
  const result = computeCalibration(await loadCalibrationRows(userId, tx));
  if (!result.sufficient) return null;

  await tx.userStudyProfile.upsert({
    where: { userId },
    create: { userId, calibrationSlope: result.slope },
    update: { calibrationSlope: result.slope },
  });
  return result.slope;
}
