import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { getStudyPlan } from "@/lib/server/study";
import { listMistakes } from "@/lib/server/mistakes";
import { getCalibrationForUser } from "@/lib/server/calibration";

// Loader-layer gate proofs (wave16-08 Goal 4) through the REAL gated loaders — not the guard in
// isolation (that is entitlements.integration.test.ts). Proves: flag ON + no entitlement → the
// typed ENTITLEMENT_REQUIRED rejection; a granted open-ended EXAM_ACCESS row unlocks; flag unset
// → inert (a user with NO row resolves). One throwaway user; deleting it cascades its
// Entitlement/StudyProfile/ReviewState rows.

let userId: string;

beforeAll(async () => {
  const cat = await prisma.category.findFirstOrThrow({ where: { code: "B" } });
  const user = await prisma.user.create({
    data: {
      name: "Gating test user",
      email: `gating-${Date.now()}@test.local`,
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

describe("intelligence-surface loader gating", () => {
  it("a. flag ON, no entitlement → every gated loader rejects with the typed error", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    await expect(getStudyPlan(userId)).rejects.toMatchObject({ code: "ENTITLEMENT_REQUIRED" });
    await expect(listMistakes(userId)).rejects.toMatchObject({ code: "ENTITLEMENT_REQUIRED" });
    await expect(getCalibrationForUser(userId)).rejects.toMatchObject({
      code: "ENTITLEMENT_REQUIRED",
    });
  });

  it("b. flag ON, open-ended EXAM_ACCESS row → every gated loader resolves", async () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    await prisma.entitlement.create({
      data: { userId, tier: "EXAM_ACCESS", validUntil: null },
    });
    const plan = await getStudyPlan(userId);
    expect(typeof plan.dailyQuota).toBe("number");
    expect(typeof plan.message).toBe("string");
    await expect(listMistakes(userId)).resolves.toEqual([]);
    const calibration = await getCalibrationForUser(userId);
    expect(calibration.sufficient).toBe(false);
  });

  it("c. flag unset, NO entitlement row → inert: every loader resolves as before", async () => {
    await prisma.entitlement.delete({ where: { userId } });
    vi.stubEnv("ENTITLEMENTS_ENABLED", undefined as unknown as string);
    const plan = await getStudyPlan(userId);
    expect(typeof plan.dailyQuota).toBe("number");
    await expect(listMistakes(userId)).resolves.toEqual([]);
    await expect(getCalibrationForUser(userId)).resolves.toMatchObject({ sufficient: false });
  });
});
