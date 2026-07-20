import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// ─────────────────────────────────────────────────────────────────────────────
// ANON → REAL ACCOUNT MIGRATION (wave17-05) — drives the REAL registerAction.
//
// On account creation, the current anon-play session's accumulated progress is
// migrated to the new account via CONVERT-IN-PLACE (ADR): the cookie-identified
// anon `User` row is UPGRADED in place (email/passwordHash set, isAnonymous:false,
// tokenVersion bumped) rather than a second row created, so every TestSession/
// TestAnswer/… row keyed on that id carries over with zero cross-user reassignment.
//
// Oracle coverage (all literal counts):
//   1. migration    — anon A owns N_A=3 TestAnswer rows; after register the new
//                      account (== the upgraded A row) owns exactly 3, and the total
//                      User count did NOT increase (convert-in-place, 0 extra rows).
//   2. idempotency  — a SECOND claim for the now-converted row is a no-op (returns
//                      null; owned-row count identical to after the first call).
//   3. no-IDOR      — an independent session B (its own cookie / anon user, ≥1 answer)
//                      is UNTOUCHED and still owned by anon user B; the migration takes
//                      no anon-id argument (target derived only from the signed cookie).
//   4. flag-off     — with VALUE_FIRST_FUNNEL unset, register creates a fresh account,
//                      reads no anon cookie, leaves a present anon session untouched,
//                      and still redirects /onboarding.
//
// We can't mint cookies in the node runtime, so we mock next/headers with an
// in-memory jar shared across the anon cookie's set/get/delete (house pattern, see
// anon-session.integration.test.ts) and partial-mock getCurrentUser.
// ─────────────────────────────────────────────────────────────────────────────

const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
  headers: async () => new Headers(),
}));

vi.mock("@/lib/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(),
}));

// Imported AFTER the mocks so the action + lib resolve to the jar + mocked getCurrentUser.
const { getCurrentUser } = await import("@/lib/auth");
const { registerAction } = await import("@/app/actions/auth");
const { getOrCreateAnonUser, claimAnonSession, getAnonPlayCookieName } = await import(
  "@/lib/server/anon-session"
);

const COOKIE = getAnonPlayCookieName();

let fix: OfficialQuestionFixture;
const createdUserIds = new Set<string>();

// Cookie values captured at mint time so a register can present exactly ONE session.
let anonAId: string;
let anonACookie: string;
let anonBId: string;
let anonBCookie: string;
let anonCId: string;
let anonCCookie: string;

/** Mint a fresh isAnonymous user + its signed ds_anon_play cookie; return {id, cookie}. */
async function mintAnon(): Promise<{ id: string; cookie: string }> {
  jar.clear();
  const user = await getOrCreateAnonUser();
  createdUserIds.add(user.id);
  return { id: user.id, cookie: jar.get(COOKIE)! };
}

/** Seed one TestSession + one TestAnswer per given question, owned by `userId`. */
async function seedAnswers(userId: string, questionIds: string[]): Promise<void> {
  const session = await prisma.testSession.create({
    data: { userId, categoryId: fix.categoryId, mode: "TOPIC_PRACTICE", status: "IN_PROGRESS" },
  });
  for (const questionId of questionIds) {
    const q = await prisma.question.findUniqueOrThrow({
      where: { id: questionId },
      include: { options: true },
    });
    await prisma.testAnswer.create({
      data: {
        testSessionId: session.id,
        questionId,
        selectedOptionId: q.options[0].id,
        isCorrect: q.options[0].isCorrect,
      },
    });
  }
}

/** Count TestAnswer rows owned (via their session) by a user. */
function ownedAnswers(userId: string): Promise<number> {
  return prisma.testAnswer.count({ where: { testSession: { userId } } });
}

/** Drive the REAL registerAction; return the NEXT_REDIRECT digest, or the error state on failure. */
async function driveRegister(
  name: string,
  email: string,
  password: string,
): Promise<{ redirect: string } | { error: string }> {
  const fd = new FormData();
  fd.set("name", name);
  fd.set("email", email);
  fd.set("password", password);
  try {
    const state = await registerAction({}, fd);
    return { error: state.error ?? "(no redirect, no error)" };
  } catch (e) {
    return { redirect: String((e as { digest?: string }).digest ?? (e as Error).message ?? "") };
  }
}

beforeAll(async () => {
  // Four throwaway published questions in one category/topic (no owning user needed).
  fix = await createOfficialQuestion(prisma, { label: "anon-mig", count: 4, withUser: false });
  vi.mocked(getCurrentUser).mockResolvedValue(null);

  // Session A: N_A = 3 answers (questions 0,1,2). Session B: 1 answer (question 3).
  const a = await mintAnon();
  anonAId = a.id;
  anonACookie = a.cookie;
  const b = await mintAnon();
  anonBId = b.id;
  anonBCookie = b.cookie;
  const c = await mintAnon();
  anonCId = c.id;
  anonCCookie = c.cookie;

  await seedAnswers(anonAId, fix.questionIds.slice(0, 3));
  await seedAnswers(anonBId, [fix.questionIds[3]]);
  await seedAnswers(anonCId, [fix.questionIds[3]]);
});

afterAll(async () => {
  // Analytics events (userId is SetNull) must be cleared BEFORE the users, or they orphan.
  await prisma.analyticsEvent
    .deleteMany({ where: { userId: { in: [...createdUserIds] } } })
    .catch(() => undefined);
  // Users first: cascades TestSession → TestAnswer, freeing the (non-cascade) question FKs.
  for (const id of createdUserIds) {
    await prisma.user.delete({ where: { id } }).catch(() => undefined);
  }
  await fix.cleanup();
  vi.unstubAllEnvs();
  await prisma.$disconnect();
});

describe("anon → account migration (convert-in-place) via registerAction", () => {
  const emailA = `anon-mig-a-${Date.now()}@test.local`;

  it("migration: the account IS the upgraded anon-A row and owns exactly N_A=3 answers; User count unchanged", async () => {
    jar.clear();
    jar.set(COOKIE, anonACookie); // present ONLY session A's cookie
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const userCountBefore = await prisma.user.count();

    const res = await driveRegister("Аня", emailA, "Password12345");
    expect(res).toEqual({ redirect: expect.stringContaining("/onboarding") });

    const account = await prisma.user.findUnique({ where: { email: emailA } });
    expect(account).not.toBeNull();
    // Convert-in-place: the account IS anon A's row, now a real user.
    expect(account!.id).toBe(anonAId);
    expect(account!.isAnonymous).toBe(false);
    expect(account!.passwordHash).not.toBeNull();

    // It owns EXACTLY the 3 answers seeded on the anon session — carried over untouched.
    expect(await ownedAnswers(anonAId)).toBe(3);

    // No second User row was created (0 extra beyond the upgraded one).
    expect(await prisma.user.count()).toBe(userCountBefore);

    // The spent cookie is cleared after a successful claim.
    expect(jar.get(COOKIE)).toBeUndefined();
  });

  it("idempotency: a SECOND claim for the now-converted row is a no-op (null; owned count still 3)", async () => {
    // Re-present A's original cookie: the row is now non-anon with a bumped tokenVersion, so
    // getAnonUser rejects it and claimAnonSession returns null — nothing re-migrates.
    jar.clear();
    jar.set(COOKIE, anonACookie);
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");

    const before = await ownedAnswers(anonAId);
    const claimed = await claimAnonSession({
      name: "Аня",
      email: emailA,
      passwordHash: "x",
    });
    expect(claimed).toBeNull();
    expect(await ownedAnswers(anonAId)).toBe(before);
    expect(before).toBe(3);
  });

  it("no-IDOR: session B is UNTOUCHED — still an anon user owning its own 1 answer", async () => {
    // The register above presented A's cookie; B was never named (the signature takes no anon-id).
    const b = await prisma.user.findUnique({ where: { id: anonBId } });
    expect(b).not.toBeNull();
    expect(b!.isAnonymous).toBe(true);
    expect(b!.email).toBeNull();
    expect(await ownedAnswers(anonBId)).toBe(1);
    // The B session's rows still belong to anon B, not to the new account.
    const bSession = await prisma.testSession.findFirst({ where: { userId: anonBId } });
    expect(bSession).not.toBeNull();
  });

  it("flag-off: register creates a FRESH account and leaves a present anon session untouched", async () => {
    jar.clear();
    jar.set(COOKIE, anonCCookie); // an anon session IS present…
    vi.stubEnv("VALUE_FIRST_FUNNEL", ""); // …but the funnel is off, so it must be ignored
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const emailC = `anon-mig-c-${Date.now()}@test.local`;
    const res = await driveRegister("Богдан", emailC, "Password12345");
    expect(res).toEqual({ redirect: expect.stringContaining("/onboarding") });

    const account = await prisma.user.findUnique({ where: { email: emailC } });
    expect(account).not.toBeNull();
    createdUserIds.add(account!.id);
    // A brand-new row — NOT the anon session's row (no convert-in-place with the flag off).
    expect(account!.id).not.toBe(anonCId);

    // Anon C is untouched: still anonymous, still owns its answer, cookie NOT cleared.
    const c = await prisma.user.findUnique({ where: { id: anonCId } });
    expect(c!.isAnonymous).toBe(true);
    expect(await ownedAnswers(anonCId)).toBe(1);
    expect(jar.get(COOKIE)).toBe(anonCCookie);
  });
});
