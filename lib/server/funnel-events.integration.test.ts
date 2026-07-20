import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { READINESS_MIN_SEEN } from "@/lib/constants";
import { completeCheckout } from "@/app/actions/checkout";
import DashboardPage from "@/app/(app)/dashboard/page";
import { getCurrentUser } from "@/lib/auth";
import { requireUser } from "@/lib/rbac";

// Wave 17 value-first funnel (task wave17-11): prove the TWO hardest funnel edges fire exactly once
// over the REAL paths (not internal helpers), against the seeded SQLite DB (test:integration config,
// which stubs `server-only`):
//   (a) `completeCheckout` (wave17-09) records `exam_access_purchased` once — the paid conversion edge;
//   (b) rendering the dashboard with a sufficient-data readiness snapshot records `readiness_aha` once.
// Both events are fire-and-forget (house rule: never block the play/purchase path), so we poll with
// vi.waitFor. The auth boundary is mocked (no real cookies in node); on success the action redirect()s,
// which throws NEXT_REDIRECT outside a Next request store — we catch it and assert the DB state.

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});
vi.mock("@/lib/rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rbac")>();
  return { ...actual, requireUser: vi.fn() };
});

const STAMP = Date.now();
let buyerId: string;
let readerId: string;
let categoryId: string;

function asBuyer(id: string) {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id,
    role: "USER",
    isAnonymous: false,
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
}

function asReader(id: string) {
  vi.mocked(requireUser).mockResolvedValue({
    id,
    role: "USER",
    selectedCategoryId: categoryId,
  } as unknown as Awaited<ReturnType<typeof requireUser>>);
}

beforeAll(async () => {
  const cat = await prisma.category.findFirstOrThrow({ where: { code: "B" } });
  categoryId = cat.id;
  const buyer = await prisma.user.create({
    data: {
      name: "Funnel buyer",
      email: `funnel-buyer-${STAMP}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: categoryId,
    },
  });
  buyerId = buyer.id;
  const reader = await prisma.user.create({
    data: {
      name: "Funnel reader",
      email: `funnel-reader-${STAMP}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: categoryId,
    },
  });
  readerId = reader.id;
  // A snapshot whose audit inputs mark the dial as a REAL number → the dashboard fires `readiness_aha`.
  await prisma.readinessSnapshot.create({
    data: {
      userId: readerId,
      categoryId,
      dialPercent: 62,
      inputsJson: JSON.stringify({ sufficientData: true, seenCount: READINESS_MIN_SEEN }),
    },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  // AnalyticsEvent.userId is onDelete:SetNull — clear our rows BEFORE deleting the users (else they
  // orphan with a null userId and pollute future funnel counts).
  await prisma.analyticsEvent.deleteMany({ where: { userId: { in: [buyerId, readerId] } } });
  await prisma.user.delete({ where: { id: buyerId } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: readerId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("wave17-11 funnel events fire once over the real paths", () => {
  it("(a) completeCheckout records exam_access_purchased exactly once", async () => {
    vi.stubEnv("PAYMENT_STUB", "true");
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    asBuyer(buyerId);

    // Success path redirect()s → throws NEXT_REDIRECT, which we swallow.
    await completeCheckout(new FormData()).catch(() => undefined);

    await vi.waitFor(async () => {
      expect(
        await prisma.analyticsEvent.count({
          where: { userId: buyerId, eventName: "exam_access_purchased" },
        }),
      ).toBe(1);
    });
  });

  it("(b) dashboard render with a sufficient-data snapshot records readiness_aha exactly once", async () => {
    // ENTITLEMENTS_ENABLED on + no entitlement → the intelligence gate stays LOCKED, so the render
    // skips the gated study-plan loader; `readiness_aha` depends only on the snapshot's sufficientData.
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    asReader(readerId);

    await DashboardPage({ searchParams: Promise.resolve({}) });

    await vi.waitFor(async () => {
      expect(
        await prisma.analyticsEvent.count({
          where: { userId: readerId, eventName: "readiness_aha" },
        }),
      ).toBe(1);
    });
  });
});
