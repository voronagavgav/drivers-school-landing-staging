import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { getCurrentUser, destroySession, hashPassword } from "@/lib/auth";
import { GET } from "@/app/(app)/account/data/export/route";
import { deleteAccountAction } from "@/app/actions/user";
import { loginAction } from "@/app/actions/auth";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// wave14-09: prove the production download path (route GET → exportUserData) over the real seeded DB.
// The teeth (spec §D) are cross-user isolation (B's ids never leak into A's export) and secret
// exclusion (the password hash is never selected). Auth is driven through a partial-mock of
// @/lib/auth (the /api/track house pattern) — the node runtime has no cookies. destroySession is
// stubbed too: deleteAccountAction's success path (wave14-10) calls it, and the real one needs a
// request-scoped cookie jar.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn(), destroySession: vi.fn() };
});

// loginAction (criterion 5c) reads headers() directly and, on success, the REAL createSession
// writes cookies() — neither exists outside a request scope, so both become inert stubs. Reading
// the cookie back is never needed here; the redirect throw is the success signal.
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
    delete: () => undefined,
  }),
}));

// A's password hash — a distinctive sentinel so criterion 4c can assert its literal absence.
const A_PW_HASH = "SENTINEL_PW_HASH_never_exported_9f3a1c";

let fixtureA: OfficialQuestionFixture;
let fixtureB: OfficialQuestionFixture;

// Every seeded A row id, keyed by its pinned export key — asserted present in the export (4a).
const aIds: Record<string, string> = {};
// Every seeded B row id — asserted ABSENT from A's export (4b).
const bIds: string[] = [];

async function seedEveryTable(
  fx: OfficialQuestionFixture,
  bucket: Record<string, string> | string[],
) {
  const userId = fx.userId!;
  const questionId = fx.questionId;
  const topicId = fx.topicId!;
  const record = (key: string, id: string) => {
    if (Array.isArray(bucket)) bucket.push(id);
    else bucket[key] = id;
  };

  record("userStudyProfile", (await prisma.userStudyProfile.create({ data: { userId } })).id);
  record(
    "studyDays",
    (await prisma.studyDay.create({ data: { userId, day: "2026-07-01", goalMet: true } })).id,
  );
  record(
    "reviewStates",
    (await prisma.reviewState.create({ data: { userId, questionId, state: "review" } })).id,
  );
  record(
    "reviewLogs",
    (
      await prisma.reviewLog.create({
        data: { userId, questionId, grade: 3, elapsedDays: 1, mode: "ADAPTIVE_REVIEW" },
      })
    ).id,
  );
  record(
    "topicMasteries",
    (await prisma.topicMastery.create({ data: { userId, topicId, band: "learning" } })).id,
  );
  record(
    "readinessSnapshots",
    (await prisma.readinessSnapshot.create({ data: { userId, dialPercent: 42 } })).id,
  );

  const session = await prisma.testSession.create({
    data: { userId, mode: "EXAM_SIMULATION", status: "COMPLETED" },
  });
  record("testSessions", session.id);
  record(
    "testSessionQuestions",
    (
      await prisma.testSessionQuestion.create({
        data: { testSessionId: session.id, questionId, displayOrder: 0 },
      })
    ).id,
  );
  record(
    "testAnswers",
    (
      await prisma.testAnswer.create({
        data: { testSessionId: session.id, questionId, isCorrect: true },
      })
    ).id,
  );

  record(
    "userMistakes",
    (await prisma.userMistake.create({ data: { userId, questionId } })).id,
  );
  record(
    "savedQuestions",
    (await prisma.savedQuestion.create({ data: { userId, questionId } })).id,
  );
  record("userSettings", (await prisma.userSettings.create({ data: { userId } })).id);
  record(
    "notificationLog",
    (await prisma.notificationLog.create({ data: { userId, kind: "REVIEW_DUE" } })).id,
  );
  // wave14-review major: ProgressSnapshot was OMITTED from the export while still actively written —
  // the old test mirrored the implementation's list one-for-one, so it was structurally blind. This
  // seed makes the gap impossible to reintroduce silently.
  record(
    "progressSnapshots",
    (await prisma.progressSnapshot.create({ data: { userId } })).id,
  );
}

// Count every enumerated learning-state row for one user. TestAnswer/TestSessionQuestion have no
// userId column, so their counts go through EXPLICIT session ids — captured BEFORE any deletion
// (deriving them post-delete would count over an empty `in` list and pass vacuously).
async function countUserRows(userId: string, sessionIds: string[]) {
  const [
    user,
    userStudyProfile,
    studyDay,
    reviewState,
    reviewLog,
    topicMastery,
    readinessSnapshot,
    testSession,
    testAnswer,
    testSessionQuestion,
    userMistake,
    savedQuestion,
    userSettings,
    notificationLog,
  ] = await Promise.all([
    prisma.user.count({ where: { id: userId } }),
    prisma.userStudyProfile.count({ where: { userId } }),
    prisma.studyDay.count({ where: { userId } }),
    prisma.reviewState.count({ where: { userId } }),
    prisma.reviewLog.count({ where: { userId } }),
    prisma.topicMastery.count({ where: { userId } }),
    prisma.readinessSnapshot.count({ where: { userId } }),
    prisma.testSession.count({ where: { userId } }),
    prisma.testAnswer.count({ where: { testSessionId: { in: sessionIds } } }),
    prisma.testSessionQuestion.count({ where: { testSessionId: { in: sessionIds } } }),
    prisma.userMistake.count({ where: { userId } }),
    prisma.savedQuestion.count({ where: { userId } }),
    prisma.userSettings.count({ where: { userId } }),
    prisma.notificationLog.count({ where: { userId } }),
  ]);
  return {
    user,
    userStudyProfile,
    studyDay,
    reviewState,
    reviewLog,
    topicMastery,
    readinessSnapshot,
    testSession,
    testAnswer,
    testSessionQuestion,
    userMistake,
    savedQuestion,
    userSettings,
    notificationLog,
  };
}

beforeAll(async () => {
  fixtureA = await createOfficialQuestion(prisma, { label: "data-A" });
  fixtureB = await createOfficialQuestion(prisma, { label: "data-B" });
  await prisma.user.update({
    where: { id: fixtureA.userId! },
    data: { passwordHash: A_PW_HASH },
  });
  await seedEveryTable(fixtureA, aIds);
  await seedEveryTable(fixtureB, bIds);
});

afterAll(async () => {
  // Cleanup deletes the user first, cascading every seeded child (sessions/state/logs/…), which frees
  // the Restrict question FK before the questions are removed. House pattern.
  await fixtureA.cleanup();
  await fixtureB.cleanup();
  await prisma.$disconnect();
});

describe("GET /account/data/export (wave14-09)", () => {
  it("exports one row under every enumerated table key for the authed user (4a)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: fixtureA.userId! } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.format).toBe("drivers-school-export-v1");
    expect(typeof json.exportedAt).toBe("string");

    // Direct-keyed tables: each seeded id present under its pinned key.
    for (const key of [
      "userStudyProfile",
      "studyDays",
      "reviewStates",
      "reviewLogs",
      "topicMasteries",
      "readinessSnapshots",
      "userMistakes",
      "savedQuestions",
      "userSettings",
      "notificationLog",
    ]) {
      expect(JSON.stringify(json[key])).toContain(aIds[key]);
    }

    // Session join rows are embedded on the session, not top-level.
    const sessions = json.testSessions as Array<Record<string, unknown>>;
    const session = sessions.find((s) => s.id === aIds.testSessions)!;
    expect(session).toBeTruthy();
    expect(JSON.stringify(session.answers)).toContain(aIds.testAnswers);
    expect(JSON.stringify(session.questions)).toContain(aIds.testSessionQuestions);
  });

  it("never leaks another user's rows (4b)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: fixtureA.userId! } as never);
    const body = await (await GET()).text();
    for (const id of bIds) {
      expect(body).not.toContain(id);
    }
    // The other user's id itself must not appear either.
    expect(body).not.toContain(fixtureB.userId!);
  });

  it("never exports the password hash (4c)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: fixtureA.userId! } as never);
    const body = await (await GET()).text();
    expect(body).not.toContain(A_PW_HASH);
    expect(body).not.toContain("passwordHash");
  });

  it("rejects an unauthenticated request (4d)", async () => {
    // requireUser redirects to /login when there's no session — GET rejects (NEXT_REDIRECT throw).
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    await expect(GET()).rejects.toThrow();
  });
});

// wave14-10: account deletion through the REAL action (spec §D part 2). A third fixture user C is
// seeded into every learning-state table, then deleted via deleteAccountAction with the exact
// confirm word — proving the schema's User cascades wipe everything (5a), wrong confirm values are
// inert (5b), the old credentials stop working (5c), user B is untouched (5d) and the official
// content C reviewed survives its Restrict FKs (5e).
describe("deleteAccountAction (wave14-10)", () => {
  const C_PASSWORD = "delete-me-Passw0rd-1";
  const CONFIRM_ERROR = "Щоб підтвердити, введіть слово ВИДАЛИТИ";

  let fixtureC: OfficialQuestionFixture;
  let cEmail: string;
  let cSessionIds: string[];
  let bSessionIds: string[];
  let bBefore: Awaited<ReturnType<typeof countUserRows>>;
  const cIds: Record<string, string> = {};

  beforeAll(async () => {
    // Lowercase label: loginAction (5c) lowercases the submitted email before the lookup, so the
    // fixture email must be lowercase to be findable.
    fixtureC = await createOfficialQuestion(prisma, { label: "data-c" });
    await seedEveryTable(fixtureC, cIds);
    const cUser = await prisma.user.update({
      where: { id: fixtureC.userId! },
      data: { passwordHash: await hashPassword(C_PASSWORD) },
    });
    cEmail = cUser.email!;
    // Session ids captured BEFORE deletion — the only handle on the join tables afterwards.
    cSessionIds = [cIds.testSessions];
    bSessionIds = (
      await prisma.testSession.findMany({
        where: { userId: fixtureB.userId! },
        select: { id: true },
      })
    ).map((s) => s.id);
    bBefore = await countUserRows(fixtureB.userId!, bSessionIds);
  });

  afterAll(async () => {
    // The user row is already gone on the success path; cleanup's .catch()es make this a no-op for
    // it while still removing C's throwaway question/topic/category.
    await fixtureC.cleanup();
  });

  it("rejects wrong confirm values without deleting anything (5b)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: fixtureC.userId! } as never);
    for (const wrong of ["видалити", "VYDALYTY", ""]) {
      const fd = new FormData();
      fd.set("confirm", wrong);
      const result = await deleteAccountAction({}, fd);
      expect(result.error).toBe(CONFIRM_ERROR);
    }
    // Nothing was deleted: the user and every seeded child row are still present.
    const counts = await countUserRows(fixtureC.userId!, cSessionIds);
    for (const [table, n] of Object.entries(counts)) {
      expect(n, table).toBeGreaterThanOrEqual(1);
    }
  });

  it("accepts the credentials BEFORE deletion (5c precondition)", async () => {
    // Success redirect()s to the dashboard, which throws NEXT_REDIRECT — the throw IS the success
    // signal (a credential failure RETURNS an error state instead). This anchors 5c: the later
    // post-delete failure is caused by the deletion, not by a broken fixture password.
    const fd = new FormData();
    fd.set("email", cEmail);
    fd.set("password", C_PASSWORD);
    await expect(loginAction({}, fd)).rejects.toThrow();
  });

  it("wipes the user and every learning-state row via the real action (5a)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: fixtureC.userId! } as never);
    const fd = new FormData();
    fd.set("confirm", "ВИДАЛИТИ");

    // On success the action redirect()s to /goodbye, which throws NEXT_REDIRECT.
    let threw = false;
    try {
      await deleteAccountAction({}, fd);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(vi.mocked(destroySession)).toHaveBeenCalled();

    const counts = await countUserRows(fixtureC.userId!, cSessionIds);
    for (const [table, n] of Object.entries(counts)) {
      expect(n, table).toBe(0);
    }
  });

  it("cannot log in with the old credentials after deletion (5c)", async () => {
    const fd = new FormData();
    fd.set("email", cEmail);
    fd.set("password", C_PASSWORD);
    const result = await loginAction({}, fd);
    expect(result.error).toBe("Невірна пошта або пароль.");
  });

  it("leaves user B completely untouched (5d)", async () => {
    const after = await countUserRows(fixtureB.userId!, bSessionIds);
    expect(after).toEqual(bBefore);
    for (const [table, n] of Object.entries(after)) {
      expect(n, table).toBeGreaterThanOrEqual(1);
    }
  });

  it("official content referenced by the deleted user's ReviewLogs survives (5e)", async () => {
    expect(await prisma.question.count({ where: { id: fixtureC.questionId } })).toBe(1);
    expect(await prisma.topic.count({ where: { id: fixtureC.topicId! } })).toBe(1);
    expect(await prisma.category.count({ where: { id: fixtureC.categoryId } })).toBe(1);
  });
});
