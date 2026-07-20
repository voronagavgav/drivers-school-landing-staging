import { describe, it, expect, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";

// Anonymous value-first-funnel session library (wave17-03) against the real seeded SQLite DB.
//
// Under test: getOrCreateAnonUser mints exactly ONE isAnonymous:true User carrying NO PII and is
// idempotent against the cookie it sets; requirePlayableUser is flag-gated (redirects with the flag
// off) and passes a real logged-in user straight through, minting no anon row.
//
// We can't use a real HTTP request, so we mock Next's `cookies()` with a tiny in-memory jar that the
// module's cookie read/write share (house pattern, see session-invalidation.integration.test.ts).
// getCurrentUser is partial-mocked so we can flip logged-in vs. anonymous; everything else (the real
// mint, cookie sign/verify, prisma) runs for real.

// In-memory cookie jar shared by the mocked cookies() store across set/get/delete.
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
}));

vi.mock("@/lib/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(),
}));

// Imported AFTER the mocks are registered so the module resolves to the jar + mocked getCurrentUser.
const { getCurrentUser } = await import("@/lib/auth");
const { getOrCreateAnonUser, getAnonUser, requirePlayableUser, getAnonPlayCookieName } =
  await import("@/lib/server/anon-session");

const COOKIE = getAnonPlayCookieName();
const createdUserIds = new Set<string>();

afterAll(async () => {
  for (const id of createdUserIds) {
    await prisma.user.delete({ where: { id } }).catch(() => undefined);
  }
  vi.unstubAllEnvs();
  await prisma.$disconnect();
});

describe("anon-session library", () => {
  it("mints exactly one isAnonymous user carrying no PII on first call, and sets the cookie", async () => {
    jar.clear();
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");

    const before = await prisma.user.count({ where: { isAnonymous: true } });
    const user = await getOrCreateAnonUser();
    createdUserIds.add(user.id);
    const after = await prisma.user.count({ where: { isAnonymous: true } });

    expect(after).toBe(before + 1);
    expect(user.isAnonymous).toBe(true);
    expect(user.email).toBeNull();
    expect(user.passwordHash).toBeNull();
    // The read-only accessor resolves the same row from the cookie the mint just set.
    expect(jar.get(COOKIE)).toBeDefined();
    expect((await getAnonUser())?.id).toBe(user.id);
  });

  it("is idempotent: a second call with the set cookie returns the same row and mints no second user", async () => {
    jar.clear();
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");

    const first = await getOrCreateAnonUser();
    createdUserIds.add(first.id);
    const countAfterFirst = await prisma.user.count({ where: { isAnonymous: true } });

    const second = await getOrCreateAnonUser(); // cookie now present in the jar
    createdUserIds.add(second.id);
    const countAfterSecond = await prisma.user.count({ where: { isAnonymous: true } });

    expect(second.id).toBe(first.id);
    expect(countAfterSecond).toBe(countAfterFirst);
  });

  it("redirects (flag-gated) when the flag is off and there is no session", async () => {
    jar.clear();
    vi.stubEnv("VALUE_FIRST_FUNNEL", "");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await expect(requirePlayableUser()).rejects.toThrow();
    expect(jar.get(COOKIE)).toBeUndefined(); // no anon cookie issued on the fallback path
  });

  it("passes a real logged-in user through and mints no anon row (flag on or off)", async () => {
    const realUser = { id: "real-user-not-persisted", role: "USER", isAnonymous: false } as Awaited<
      ReturnType<typeof getCurrentUser>
    >;

    for (const flag of ["true", ""]) {
      jar.clear();
      vi.stubEnv("VALUE_FIRST_FUNNEL", flag);
      vi.mocked(getCurrentUser).mockResolvedValue(realUser);

      const before = await prisma.user.count({ where: { isAnonymous: true } });
      const resolved = await requirePlayableUser();
      const after = await prisma.user.count({ where: { isAnonymous: true } });

      expect(resolved.id).toBe("real-user-not-persisted");
      expect(after).toBe(before);
      expect(jar.get(COOKIE)).toBeUndefined();
    }
  });
});
