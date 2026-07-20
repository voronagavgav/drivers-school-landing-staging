import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { chunk } from "@/lib/analytics-dashboard";

// Data rights, part 1 (spec §D): assemble a JSON-serializable snapshot of ONE user's own learning
// data for download. Every read is scoped by userId (or by session ids derived from it) — zero
// cross-user data. Only SAFE user scalars are selected (never the password hash / token version).
//
// AnalyticsEvent is deliberately EXCLUDED: it is pseudonymous product telemetry keyed to an anonymous
// id, not to the account (see the /account/data page copy). Question CONTENT (texts/options) is NOT
// exported — learning STATE is the user's data; the official question bank is not, so we export ids
// only.
//
// This is a snapshot object, not a streaming writer: at ≤200-row chunk reads over one user's data the
// payload is small, and the route serves it as an attachment. Every multi-row read is keyset-paged at
// `PAGE` (Prisma 7 has no auto-chunking; a huge findMany would risk the libsql bound-parameter cap),
// and the session-join reads batch their `in` lists at `IN_BATCH` (P2029 guard).

/** Keyset page size — never an unbounded findMany. */
const PAGE = 200;
/** Max ids per `where: { … in: [...] }` list — under the libsql bound-parameter cap. */
const IN_BATCH = 200;

export const EXPORT_FORMAT = "drivers-school-export-v1";

/** Safe, non-secret user scalars (spec §D.1) — the credential/session-version columns are omitted. */
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  selectedCategoryId: true,
} satisfies Prisma.UserSelect;

/** Minimal structural view of a userId-scoped Prisma delegate — enough to keyset-page it. */
type UserScopedDelegate = {
  findMany: (args: {
    where: { userId: string };
    orderBy: { id: "asc" };
    take: number;
    cursor?: { id: string };
    skip?: number;
  }) => Promise<Array<Record<string, unknown> & { id: string }>>;
};

/** Keyset-page a userId-scoped table to completion, `PAGE` rows at a time. */
async function pageAll(
  delegate: UserScopedDelegate,
  userId: string,
): Promise<Array<Record<string, unknown> & { id: string }>> {
  const rows: Array<Record<string, unknown> & { id: string }> = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await delegate.findMany({
      where: { userId },
      orderBy: { id: "asc" },
      take: PAGE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    rows.push(...page);
    if (page.length < PAGE) break;
    cursor = page[page.length - 1].id;
  }
  return rows;
}

/** Minimal structural view of a session-join delegate (TestAnswer / TestSessionQuestion). */
type SessionJoinDelegate = {
  findMany: (args: {
    where: { testSessionId: { in: string[] } };
    orderBy: { id: "asc" };
  }) => Promise<Array<Record<string, unknown> & { testSessionId: string }>>;
};

/** Read every row of a session-join table for the given session ids, batching the `in` list at
 *  `IN_BATCH`. Grouped by `testSessionId` for embedding. */
async function joinBySession(
  delegate: SessionJoinDelegate,
  sessionIds: string[],
): Promise<Map<string, Array<Record<string, unknown>>>> {
  const bySession = new Map<string, Array<Record<string, unknown>>>();
  for (const batch of chunk(sessionIds, IN_BATCH)) {
    const rows = await delegate.findMany({
      where: { testSessionId: { in: batch } },
      orderBy: { id: "asc" },
    });
    for (const row of rows) {
      const list = bySession.get(row.testSessionId);
      if (list) list.push(row);
      else bySession.set(row.testSessionId, [row]);
    }
  }
  return bySession;
}

// Prisma's per-model delegates are heavily overloaded generics; the two helpers above only need the
// narrow findMany shapes above. These casts view a concrete delegate through that minimal structural
// lens (the runtime call is identical) — the row objects still carry every scalar column.
const scoped = (d: unknown) => d as UserScopedDelegate;
const joined = (d: unknown) => d as SessionJoinDelegate;

/**
 * Assemble the full own-data export for `userId`. Returns a plain JSON-serializable object with one
 * top-level key per enumerated table (plus `exportedAt` + `format`). Every embedded TestSession
 * carries its own `answers` and `questions` join rows.
 */
export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER_SELECT,
  });

  const userStudyProfile = await prisma.userStudyProfile.findUnique({ where: { userId } });
  const userSettings = await prisma.userSettings.findUnique({ where: { userId } });

  const [
    studyDays,
    reviewStates,
    reviewLogs,
    topicMasteries,
    readinessSnapshots,
    sessions,
    userMistakes,
    savedQuestions,
    notificationLog,
    progressSnapshots,
    pushSubscriptions,
    entitlements,
  ] = await Promise.all([
    pageAll(scoped(prisma.studyDay), userId),
    pageAll(scoped(prisma.reviewState), userId),
    pageAll(scoped(prisma.reviewLog), userId),
    pageAll(scoped(prisma.topicMastery), userId),
    pageAll(scoped(prisma.readinessSnapshot), userId),
    pageAll(scoped(prisma.testSession), userId),
    pageAll(scoped(prisma.userMistake), userId),
    pageAll(scoped(prisma.savedQuestion), userId),
    pageAll(scoped(prisma.notificationLog), userId),
    // wave14-review major: ProgressSnapshot is user-owned readiness/accuracy HISTORY written on every
    // finish — "download all my data" without it was incomplete. PushSubscription included for the
    // same completeness principle (empty until Web Push ships).
    pageAll(scoped(prisma.progressSnapshot), userId),
    pageAll(scoped(prisma.pushSubscription), userId),
    // wave16-review: Entitlement is a user-owned purchase/access record (tier, purchasedAt,
    // examDate, validUntil) — "download all my data" must include it, same completeness
    // principle as ProgressSnapshot above. Delete path already cascades (Entitlement.user FK).
    pageAll(scoped(prisma.entitlement), userId),
  ]);

  // TestAnswer/TestSessionQuestion have no userId column — read them via THIS user's session ids
  // (chunked `in`), then embed each session's rows. Scoping by session ids keeps it own-data-only.
  const sessionIds = sessions.map((s) => s.id);
  const [answersBySession, questionsBySession] = await Promise.all([
    joinBySession(joined(prisma.testAnswer), sessionIds),
    joinBySession(joined(prisma.testSessionQuestion), sessionIds),
  ]);
  const testSessions = sessions.map((session) => ({
    ...session,
    answers: answersBySession.get(session.id) ?? [],
    questions: questionsBySession.get(session.id) ?? [],
  }));

  return {
    format: EXPORT_FORMAT,
    exportedAt: new Date().toISOString(),
    user,
    userStudyProfile,
    studyDays,
    reviewStates,
    reviewLogs,
    topicMasteries,
    readinessSnapshots,
    testSessions,
    userMistakes,
    savedQuestions,
    userSettings,
    notificationLog,
    progressSnapshots,
    pushSubscriptions,
    entitlements,
    // Stated exclusions (wave14-review nit — nothing is silently absent): AnalyticsEvent is
    // pseudonymous product telemetry, not account data; AdminActionLog is the platform's
    // operational audit trail (admin roles only, keyed by adminUserId), not learning data.
    excluded: {
      analyticsEvents: "pseudonymous product telemetry (not account data)",
      adminActionLog: "operational audit trail (admin roles only)",
    },
  };
}

/**
 * Data rights, part 2 (spec §D): irreversibly delete the account and ALL of its learning state.
 * A single row delete is sufficient — every user-scoped table cascades from User in the schema
 * (wave14-01 finding 1g audited the full chain: 14/14 Cascade, no manual child sweeps needed).
 * The only Restrict FKs point at Question, so the official content bank is untouched; the user's
 * AnalyticsEvent rows survive anonymized (SetNull, by design — they were never keyed to the
 * account). No soft-delete or grace period: a deliberate product decision.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}
