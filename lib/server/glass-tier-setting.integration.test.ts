import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { setGlassTierAction } from "@/lib/server/user-settings";
import { getCurrentUser, hashPassword } from "@/lib/auth";

// Glass-tier setting proof (wave12b-14, spec §E) against the real seeded SQLite DB
// (test:integration config, which stubs `server-only`). Three cases:
//   1. A valid tier persists to the authenticated user's UserSettings row (upsert: the first
//      submit CREATES the row, a second submit UPDATES it).
//   2. An invalid value is rejected with { error } and performs NO write.
//   3. An unauthenticated call (getCurrentUser → null) redirect()-throws from requireUser()
//      and writes nothing.
// Identity comes from requireUser() → getCurrentUser(), which we mock to the throwaway user;
// the rest of @/lib/auth stays real. A throwaway USER is created in beforeAll / deleted in
// afterAll (User → UserSettings is Cascade, so the settings row goes with it).

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

let userId: string;

function form(glassTier: string): FormData {
  const fd = new FormData();
  fd.set("glassTier", glassTier);
  return fd;
}

function asSessionUser(id: string) {
  return { id, role: "USER" } as unknown as Awaited<ReturnType<typeof getCurrentUser>>;
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      name: "Glass-tier test user",
      email: `gt-${Date.now()}@test.local`,
      passwordHash: await hashPassword("glass-tier-pass-1"),
      role: "USER",
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("setGlassTierAction — valid value persists for the authenticated user", () => {
  it("creates the UserSettings row with the chosen tier, then updates it on resubmit", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(asSessionUser(userId));
    expect(await prisma.userSettings.findUnique({ where: { userId } })).toBeNull();

    expect(await setGlassTierAction(form("solid"))).toEqual({ ok: true });
    const created = await prisma.userSettings.findUniqueOrThrow({ where: { userId } });
    expect(created.glassTier).toBe("solid");

    expect(await setGlassTierAction(form("real"))).toEqual({ ok: true });
    const updated = await prisma.userSettings.findUniqueOrThrow({ where: { userId } });
    expect(updated.glassTier).toBe("real");
  });
});

describe("setGlassTierAction — invalid value is rejected with no write", () => {
  it("returns { error } and leaves the stored row byte-identical", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(asSessionUser(userId));
    const before = await prisma.userSettings.findUniqueOrThrow({ where: { userId } });

    const state = await setGlassTierAction(form("frosted")); // not in the 4-value enum
    expect(state).toHaveProperty("error");
    expect(state).not.toHaveProperty("ok");

    const after = await prisma.userSettings.findUniqueOrThrow({ where: { userId } });
    expect(after.glassTier).toBe(before.glassTier);
    expect(after.updatedAt.toISOString()).toBe(before.updatedAt.toISOString()); // no touch at all
  });
});

describe("setGlassTierAction — unauthenticated call writes nothing", () => {
  it("redirect()-throws from requireUser and creates no settings row", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof getCurrentUser>>,
    );
    const before = await prisma.userSettings.count();

    await expect(setGlassTierAction(form("solid"))).rejects.toThrow();

    expect(await prisma.userSettings.count()).toBe(before);
  });
});
