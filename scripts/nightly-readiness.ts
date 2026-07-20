import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { recomputeReadiness, recomputeTopicMastery } from "../lib/server/mastery-readiness";
import { refreshCalibrationSlope } from "../lib/server/calibration";
import { recomputeElo } from "../lib/server/elo";
import { pruneAnalyticsEvents } from "../lib/analytics-prune";

// ---------------------------------------------------------------------------
// On-box nightly recompute job (Wave 11 §D, wave11-14).
//
// Standalone Prisma client with the libsql adapter — this script runs under tsx,
// NOT Next, so it must NOT import lib/db (which pulls in `server-only`). It owns
// its own client exactly like prisma/seed.ts and PASSES it into the wave11-08
// recompute fns (`recomputeTopicMastery` / `recomputeReadiness`), so the nightly
// path is the SAME code as the finish path — no duplicated / divergent recompute.
//
// The recompute fns are `server-only`-tainted (via lib/server/mastery-readiness,
// which imports the app db client), so it runs under `tsx --conditions=react-server`
// (see ops/README + the launchd plist), which resolves the marker to its empty
// stub instead of throwing outside a server runtime.
//
// Every id-list read is chunked ≤200 to stay under the libsql param cap (P2029).
// ---------------------------------------------------------------------------

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

// Bound on both the user page size and any `{ id: { in: [...] } }` id-list read.
const CHUNK = 200;

async function main() {
  let processed = 0;
  let cursor: string | undefined;

  for (;;) {
    // Page users who have ≥1 ReviewState (the FSRS spine) — id-ordered, cursor-paged.
    const users = await prisma.user.findMany({
      where: { reviewStates: { some: {} } },
      select: { id: true, selectedCategoryId: true },
      orderBy: { id: "asc" },
      take: CHUNK,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (users.length === 0) break;

    for (const user of users) {
      // Distinct topics the user has seen (from their ReviewState questions), chunked.
      const states = await prisma.reviewState.findMany({
        where: { userId: user.id },
        select: { questionId: true },
      });
      const questionIds = [...new Set(states.map((s) => s.questionId))];
      const topicIds = new Set<string>();
      for (let i = 0; i < questionIds.length; i += CHUNK) {
        const questions = await prisma.question.findMany({
          where: { id: { in: questionIds.slice(i, i + CHUNK) } },
          select: { topicId: true },
        });
        for (const q of questions) if (q.topicId) topicIds.add(q.topicId);
      }

      // Refresh the calibration slope BEFORE readiness so tonight's snapshot uses tonight's slope
      // (recomputeReadiness reads UserStudyProfile.calibrationSlope). Insufficient data is a no-op.
      await refreshCalibrationSlope(user.id, prisma);
      // SAME fns the finish path calls — passing our own client keeps the two in lockstep.
      await recomputeTopicMastery(user.id, [...topicIds], prisma);
      await recomputeReadiness(user.id, user.selectedCategoryId ?? null, prisma);
      processed += 1;
    }

    if (users.length < CHUNK) break;
    cursor = users[users.length - 1].id;
  }

  // Server-authoritative Elo/Rasch item-difficulty recompute (Wave 22, wave22-08) — a FULL
  // deterministic batch replay over the whole answer stream. Runs once per nightly pass (NOT
  // per-user); chunking/writeback lives inside `recomputeElo`. Same code as the manual
  // scripts/elo-recompute.ts entry point.
  const elo = await recomputeElo(prisma);

  // Prune AnalyticsEvent rows past the retention window (Wave 14 §F) — chunked, standalone client.
  const pruned = await pruneAnalyticsEvents(prisma, new Date());

  // Exactly ONE summary line per run (plus the elo + pruned counts, greppable).
  console.log(
    `nightly-readiness: processed ${processed} user(s) with ReviewState, ` +
      `elo recompute folded ${elo.answersFolded} answer(s) wrote ${elo.itemsWritten} item(s), ` +
      `pruned ${pruned} analytics event(s)`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("nightly-readiness: FAILED", err);
    await prisma.$disconnect();
    process.exit(1);
  });
