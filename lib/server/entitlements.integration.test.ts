import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  checkIntelligenceAccess,
  requireIntelligenceAccess,
  getEntitlement,
} from "@/lib/server/entitlements";

// Entitlement gate proofs (Goal 4) through the REAL server module (server-only stubbed by the
// test:integration config). The pure decision core is covered by the frozen oracle
// (lib/entitlements.test.ts); here we prove the DB read + master-flag inertness end to end.
// One throwaway user; deleting it cascades away its Entitlement row.

let userId: string;

beforeAll(async () => {
  const cat = await prisma.category.findFirstOrThrow({ where: { code: "B" } });
  const user = await prisma.user.create({
    data: {
      name: "Ent test user",
      email: `ent-${Date.now()}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: cat.id,
    },
  });
  userId = user.id;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("checkIntelligenceAccess / requireIntelligenceAccess", () => {
  it("a. flag ON, no entitlement row → denied", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    expect(await getEntitlement(userId)).toBeNull();
    expect(await checkIntelligenceAccess(userId)).toEqual({ enabled: true, hasAccess: false });
    await expect(requireIntelligenceAccess(userId)).rejects.toMatchObject({
      code: "ENTITLEMENT_REQUIRED",
    });
  });

  it("b. flag ON, open-ended EXAM_ACCESS row → allowed", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    await prisma.entitlement.create({
      data: { userId, tier: "EXAM_ACCESS", validUntil: null },
    });
    expect(await checkIntelligenceAccess(userId)).toEqual({ enabled: true, hasAccess: true });
    await expect(requireIntelligenceAccess(userId)).resolves.toBeUndefined();
  });

  it("c. flag OFF, no row → inert (everyone passes)", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", undefined as unknown as string);
    // Even for a fresh user with no row the gate is inert while the flag is off.
    const fresh = await prisma.user.create({
      data: {
        name: "Ent inert user",
        email: `ent-inert-${Date.now()}@test.local`,
        passwordHash: "x",
        role: "USER",
        selectedCategoryId: (await prisma.category.findFirstOrThrow({ where: { code: "B" } })).id,
      },
    });
    try {
      expect(await checkIntelligenceAccess(fresh.id)).toEqual({ enabled: false, hasAccess: true });
      await expect(requireIntelligenceAccess(fresh.id)).resolves.toBeUndefined();
    } finally {
      await prisma.user.delete({ where: { id: fresh.id } }).catch(() => undefined);
    }
  });

  it("d. flag ON, expired EXAM_ACCESS row → denied", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    const past = new Date("2020-01-01T00:00:00.000Z");
    await prisma.entitlement.update({
      where: { userId },
      data: { tier: "EXAM_ACCESS", validUntil: past },
    });
    expect(await checkIntelligenceAccess(userId, new Date("2026-07-04T12:00:00.000Z"))).toEqual({
      enabled: true,
      hasAccess: false,
    });
  });
});
