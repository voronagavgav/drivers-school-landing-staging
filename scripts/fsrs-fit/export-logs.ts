// ---------------------------------------------------------------------------
// EXPORTER — per-user `ReviewLog` → the py-fsrs optimizer's CSV schema.
//
// Emits `card_id,review_time,review_rating` rows for one user, one line per
// exported ReviewLog:
//   card_id       = the row's questionId. This per-user export produces ONE card
//                   stream per question, which is all the optimizer needs — a
//                   deliberate choice (no cross-user card identity is invented).
//   review_time   = reviewedAt as epoch milliseconds, ascending per card.
//   review_rating = grade (1..4).
// Rows are sorted by (card_id, review_time).
//
// ENGINE-TAG FILTER: ONLY rows whose `engine == REVIEW_ENGINE_VERSION`
// (`"fsrs6-bkt2"`) are exported. Pre-bkt2 rows — `engine` null (written before
// the column existed) or an older tag (e.g. `"fsrs6-bkt1"`) — are EXCLUDED,
// because the wave20 grade-honesty change moved the grade SEMANTICS (a wrong
// answer on a card with history now routes through slip-adjusted-lapse). Mixing
// pre- and post-boundary grades would poison the weight fit; grade-semantics
// segmentation is exactly what the `engine` column exists for. The filter reads
// REVIEW_ENGINE_VERSION from `@/lib/fsrs` (not a hard-coded literal) so a future
// engine bump follows automatically.
//
// Read-only over ReviewLog: writes no fitted weights, touches no scheduling code.
// Runs under: npx tsx --conditions=react-server scripts/fsrs-fit/export-logs.ts <userId>
// ---------------------------------------------------------------------------

import type { PrismaClient } from "@/lib/generated/prisma/client";
import { REVIEW_ENGINE_VERSION } from "@/lib/fsrs";

export const REVLOG_CSV_HEADER = "card_id,review_time,review_rating";

/**
 * Build the py-fsrs optimizer CSV for one user's current-engine ReviewLog rows.
 * This is the REAL entry the CLI serialises AND the integration test drives, so
 * the engine filter is exercised on the production query path.
 */
export async function exportUserRevlog(prisma: PrismaClient, userId: string): Promise<string> {
  const rows = await prisma.reviewLog.findMany({
    where: { userId, engine: REVIEW_ENGINE_VERSION },
    select: { questionId: true, reviewedAt: true, grade: true },
    orderBy: [{ questionId: "asc" }, { reviewedAt: "asc" }],
  });

  const lines = [REVLOG_CSV_HEADER];
  for (const r of rows) {
    lines.push(`${r.questionId},${r.reviewedAt.getTime()},${r.grade}`);
  }
  return lines.join("\n") + "\n";
}

// CLI entry — only runs when invoked directly (not on import from the test).
if (process.argv[1] && process.argv[1].endsWith("export-logs.ts")) {
  const userId = process.argv[2];
  if (!userId) {
    console.error("usage: tsx --conditions=react-server scripts/fsrs-fit/export-logs.ts <userId>");
    process.exit(1);
  }
  // Import the app db singleton lazily so importing this module for its pure
  // exports never constructs a Prisma client.
  import("@/lib/db")
    .then(async ({ prisma }) => {
      const csv = await exportUserRevlog(prisma, userId);
      process.stdout.write(csv);
      await prisma.$disconnect();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
