import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { changePasswordAction } from "@/app/actions/auth";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

// Change-password proof (spec D) against the real seeded SQLite DB (test:integration config,
// which stubs `server-only`). Two cases:
//   1. Wrong current password → the action returns its error result and performs NO write
//      (the stored passwordHash is unchanged).
//   2. Correct current password → the action succeeds, the stored passwordHash CHANGES, and the
//      user can authenticate with the new password (verifyPassword(new) === true) but not the
//      old (verifyPassword(old) === false).
// Identity comes from requireUser() → getCurrentUser(), which we mock to the throwaway user. The
// rest of @/lib/auth stays real so hashPassword/verifyPassword behave exactly as in production.
// changePasswordAction now RE-ISSUES this session's cookie (token-version invalidation), so the
// real createSession calls cookies() — we provide a tiny in-memory cookie jar mock so that write
// succeeds outside a request scope. A throwaway USER is created in beforeAll / deleted in afterAll
// so the seeded DB stays clean.

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

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

const OLD_PASSWORD = "old-password-123";
const NEW_PASSWORD = "new-password-456";

let userId: string;

function form(currentPassword: string, newPassword: string): FormData {
  const fd = new FormData();
  fd.set("currentPassword", currentPassword);
  fd.set("newPassword", newPassword);
  return fd;
}

// Point the mocked session boundary at the throwaway user's CURRENT row (real passwordHash), so
// the action verifies the supplied current password against the actual stored hash.
async function aimSessionAtUser(): Promise<void> {
  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  vi.mocked(getCurrentUser).mockResolvedValue(
    fresh as unknown as Awaited<ReturnType<typeof getCurrentUser>>,
  );
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      name: "Change-password test user",
      email: `cp-${Date.now()}@test.local`,
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

describe("changePasswordAction — wrong current password is rejected and performs no write", () => {
  it("returns an error and leaves the stored passwordHash unchanged", async () => {
    await aimSessionAtUser();
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const result = await changePasswordAction({}, form("totally-wrong-password", NEW_PASSWORD));

    expect(result.error).toBeTruthy();
    expect(result.success).toBeUndefined();

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.passwordHash).toBe(before.passwordHash);
  });
});

describe("changePasswordAction — correct current password rotates the hash", () => {
  it("succeeds; the new password authenticates and the old one no longer does", async () => {
    await aimSessionAtUser();
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const result = await changePasswordAction({}, form(OLD_PASSWORD, NEW_PASSWORD));

    expect(result.success).toBeTruthy();
    expect(result.error).toBeUndefined();

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.passwordHash).not.toBe(before.passwordHash);
    expect(await verifyPassword(NEW_PASSWORD, after.passwordHash ?? "")).toBe(true);
    expect(await verifyPassword(OLD_PASSWORD, after.passwordHash ?? "")).toBe(false);
  });
});
