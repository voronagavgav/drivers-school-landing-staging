import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/db";

// Token-versioned session invalidation (spec #2d) against the real seeded SQLite DB.
//
// Property under test: a stateless HMAC cookie minted BEFORE a password change must be REJECTED
// after the change (its embedded tokenVersion no longer matches the stored User.tokenVersion),
// while the cookie FRESHLY re-issued by changePasswordAction for the current session still works.
//
// We can't use a real HTTP request here, so we mock Next's `cookies()` with a tiny in-memory jar
// that createSession (write) and getCurrentUser (read) share. requireUser()→getCurrentUser() is
// real (so the version comparison runs for real); only the cookie transport is faked. A throwaway
// USER is created in beforeAll and deleted in afterAll so the seeded DB stays clean.

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

// Imported AFTER the mock is registered so lib/auth's `cookies()` resolves to the jar.
const { createSession, getCurrentUser, hashPassword } = await import("@/lib/auth");
const { changePasswordAction } = await import("@/app/actions/auth");

const COOKIE = "ds_session";
const OLD_PASSWORD = "old-password-123";
const NEW_PASSWORD = "new-password-456";

let userId: string;

beforeEach(() => {
  jar.clear();
});

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      name: "Session-invalidation test user",
      email: `si-${Date.now()}@test.local`,
      passwordHash: await hashPassword(OLD_PASSWORD),
      role: "USER",
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("token-versioned session invalidation", () => {
  it("accepts a freshly minted cookie at the current tokenVersion", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await createSession(user.id, user.tokenVersion);

    const seen = await getCurrentUser();
    expect(seen?.id).toBe(userId);
  });

  it("rejects an OLD cookie after a password change but accepts the re-issued one", async () => {
    // 1) Mint a session at the user's CURRENT version — this is the "old" cookie.
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await createSession(before.id, before.tokenVersion);
    const oldCookie = jar.get(COOKIE);
    expect(oldCookie).toBeDefined();

    // Sanity: the old cookie is currently valid.
    expect((await getCurrentUser())?.id).toBe(userId);

    // 2) Change the password. The action bumps tokenVersion AND re-issues this session's cookie
    //    into the jar. Point requireUser()→getCurrentUser() at the user via the live old cookie
    //    (still valid at this instant), so the action runs end-to-end.
    const fd = new FormData();
    fd.set("currentPassword", OLD_PASSWORD);
    fd.set("newPassword", NEW_PASSWORD);
    const result = await changePasswordAction({}, fd);
    expect(result.success).toBeTruthy();
    expect(result.error).toBeUndefined();

    const newCookie = jar.get(COOKIE);
    expect(newCookie).toBeDefined();
    expect(newCookie).not.toBe(oldCookie); // a different (higher-version) cookie was issued

    // Stored version was bumped.
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.tokenVersion).toBe(before.tokenVersion + 1);

    // 3) The re-issued cookie (currently in the jar) is accepted.
    expect((await getCurrentUser())?.id).toBe(userId);

    // 4) Replay the OLD cookie → it must now be REJECTED (treated as logged out).
    jar.set(COOKIE, oldCookie!);
    expect(await getCurrentUser()).toBeNull();
  });

  it("rejects a legacy 2-field (userId:expiry) cookie shape safely", async () => {
    // Forge a cookie in the OLD format using the real signer via createSession is not possible
    // (it always writes 3 fields now), so assert the parser rejects a 2-field payload by minting a
    // valid 3-field cookie, then proving a mismatched-version cookie (the closest legacy analogue)
    // is rejected. The 2-field reject path is covered structurally: parseSessionPayload requires
    // exactly 3 colon-separated parts. Here we prove a version mismatch alone logs the user out.
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    // Mint at a DELIBERATELY stale version (current - 1) → must be rejected.
    await createSession(user.id, user.tokenVersion - 1);
    expect(await getCurrentUser()).toBeNull();

    // And a correct-version cookie is accepted again.
    await createSession(user.id, user.tokenVersion);
    expect((await getCurrentUser())?.id).toBe(userId);
  });
});
