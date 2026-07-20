import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// ---------------------------------------------------------------------------
// audit-seed-nudge.ts — REAL-TRANSPORT gate fixture (Wave 14 spec §G).
//
// Standalone tsx client (like prisma/seed.ts — it runs under tsx, not Next, so
// it must NOT import lib/db, which pulls in `server-only` and would throw
// outside a server runtime). Environment setup for `npm run audit:browser`, not
// production code.
//
// For the seeded audit user (user@drivers.school) it makes the dashboard nudge
// deterministic across REPEATED audit runs:
//   (a) upserts ONE DUE ReviewState (state "review", stability > 0, dueAt in the
//       past) on a published question of the user's selected category — so
//       countDueReviews > 0 and the pure policy picks REVIEW_DUE;
//   (b) DELETES the user's NotificationLog rows from the last 7 days — clearing
//       the one-per-day (emittedToday) and rolling weekly (sentLast7Days)
//       suppressors, so a card dismissed on the previous run can't suppress
//       today's card and flake the gate.
//
// Touches ONLY the audit user's rows; the upsert is re-runnable (no-op-safe).
// ---------------------------------------------------------------------------

const AUDIT_EMAIL = process.env.DS_USER ?? "user@drivers.school";
const DAY_MS = 86_400_000;

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

async function main() {
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { email: AUDIT_EMAIL },
    select: { id: true, selectedCategoryId: true },
  });
  if (!user) throw new Error(`audit user ${AUDIT_EMAIL} not found — run npm run db:seed first`);
  if (!user.selectedCategoryId)
    throw new Error(`audit user ${AUDIT_EMAIL} has no selected category`);

  // (a) One due review card on a published question of the user's category.
  const question = await prisma.question.findFirst({
    where: {
      isActive: true,
      isPublished: true,
      archivedAt: null,
      categories: { some: { id: user.selectedCategoryId } },
    },
    select: { id: true },
    orderBy: { id: "asc" }, // deterministic pick across runs
  });
  if (!question)
    throw new Error(`no published question in category ${user.selectedCategoryId}`);

  const dueAt = new Date(now.getTime() - DAY_MS); // overdue by a day
  await prisma.reviewState.upsert({
    where: { userId_questionId: { userId: user.id, questionId: question.id } },
    update: { state: "review", stability: 5, dueAt, lastReviewedAt: dueAt },
    create: {
      userId: user.id,
      questionId: question.id,
      state: "review",
      stability: 5,
      difficulty: 5,
      dueAt,
      lastReviewedAt: dueAt,
      reps: 1,
    },
  });

  // (b) Reset the daily/weekly nudge suppressors: drop the user's recent
  // NotificationLog rows (both freshly-created and recently-sent).
  const cutoff = new Date(now.getTime() - 7 * DAY_MS);
  const cleared = await prisma.notificationLog.deleteMany({
    where: {
      userId: user.id,
      OR: [{ createdAt: { gte: cutoff } }, { sentAt: { gte: cutoff } }],
    },
  });

  console.log(
    `audit-seed-nudge: due ReviewState on question ${question.id} for ${AUDIT_EMAIL}; ` +
      `cleared ${cleared.count} NotificationLog row(s) from the last 7 days.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
