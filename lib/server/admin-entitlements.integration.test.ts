import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { grantEntitlement, revokeEntitlement } from "@/app/admin/actions";
import { checkIntelligenceAccess, getEntitlement } from "@/lib/server/entitlements";
import { getCurrentUser } from "@/lib/auth";

// Admin grant/revoke proofs (task wave16-06) against the real seeded SQLite DB
// (test:integration config, which stubs `server-only`). We drive the REAL server
// actions through a mocked auth boundary (never real cookies in node) and assert:
//   a. a USER-role caller is rejected (requireContentManager redirect-throws) and NO row is written;
//   b. an admin grant writes an EXAM_ACCESS row and unlocks the intelligence gate (flag ON);
//   c. an admin revoke removes the row and re-locks the gate;
//   d. an invalid tier string returns `{ error }` and writes NOTHING.
// The actions return normally on success → they reach revalidatePath, which throws outside a Next
// request store, so next/cache is stubbed to a no-op. Throwaway users are cleaned up in afterAll
// (deleting the user cascades away its Entitlement row).

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

const STAMP = Date.now();
let adminId: string;
let targetId: string;
let targetEmail: string;
let categoryId: string;

function asAdmin() {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: adminId,
    role: "ADMIN",
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
}
function asUser() {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: targetId,
    role: "USER",
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
}

function fd(entries: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(entries)) form.set(k, v);
  return form;
}

beforeAll(async () => {
  const cat = await prisma.category.findFirstOrThrow({ where: { code: "B" } });
  categoryId = cat.id;
  const admin = await prisma.user.create({
    data: {
      name: "Ent admin",
      email: `ent-admin-${STAMP}@test.local`,
      passwordHash: "x",
      role: "ADMIN",
      selectedCategoryId: categoryId,
    },
  });
  adminId = admin.id;
  targetEmail = `ent-target-${STAMP}@test.local`;
  const target = await prisma.user.create({
    data: {
      name: "Ent target",
      email: targetEmail,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: categoryId,
    },
  });
  targetId = target.id;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: targetId } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: adminId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("grantEntitlement / revokeEntitlement (admin only)", () => {
  it("a. rejects a USER-role caller and writes no Entitlement row", async () => {
    asUser();
    await expect(
      grantEntitlement({}, fd({ email: targetEmail, tier: "EXAM_ACCESS" })),
    ).rejects.toThrow();
    expect(await getEntitlement(targetId)).toBeNull();
  });

  it("b. admin grant writes an EXAM_ACCESS row and unlocks the gate", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    asAdmin();
    const result = await grantEntitlement(
      {},
      fd({ email: targetEmail, tier: "EXAM_ACCESS", source: "MANUAL" }),
    );
    expect(result).toEqual({});
    const row = await getEntitlement(targetId);
    expect(row?.tier).toBe("EXAM_ACCESS");
    expect(row?.source).toBe("MANUAL");
    expect(await checkIntelligenceAccess(targetId)).toEqual({ enabled: true, hasAccess: true });
  });

  it("c. admin revoke removes the row and re-locks the gate", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    asAdmin();
    const result = await revokeEntitlement({}, fd({ email: targetEmail }));
    expect(result).toEqual({});
    expect(await getEntitlement(targetId)).toBeNull();
    expect(await checkIntelligenceAccess(targetId)).toEqual({ enabled: true, hasAccess: false });
  });

  it("c2. revoke is idempotent on a user with no row (no throw)", async () => {
    asAdmin();
    const result = await revokeEntitlement({}, fd({ email: targetEmail }));
    expect(result).toEqual({});
    expect(await getEntitlement(targetId)).toBeNull();
  });

  it("d. an invalid tier string returns { error } and writes nothing", async () => {
    asAdmin();
    const result = await grantEntitlement({}, fd({ email: targetEmail, tier: "BOGUS" }));
    expect(result.error).toBeTruthy();
    expect(await getEntitlement(targetId)).toBeNull();
  });
});
