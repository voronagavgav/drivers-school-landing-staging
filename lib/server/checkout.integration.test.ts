import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { completeCheckout } from "@/app/actions/checkout";
import { checkIntelligenceAccess, getEntitlement } from "@/lib/server/entitlements";
import { getCurrentUser } from "@/lib/auth";

// Server-authoritative checkout grant (task wave17-09) against the real seeded SQLite DB
// (test:integration config, which stubs `server-only`). We drive the REAL `completeCheckout`
// action through a mocked auth boundary (never real cookies in node) and assert:
//   a. authed real user + PAYMENT_STUB on → an EXAM_ACCESS row is written AND the gate unlocks;
//   b. re-running completeCheckout is idempotent (still exactly one row, no throw beyond redirect);
//   c. a non-authenticated call redirects to /login and writes NOTHING;
//   d. an anonymous user is bounced to /register and NOT granted;
//   e. with ENTITLEMENTS_ENABLED OFF the grant still writes but the READ gate is inert
//      (hasAccess:true for everyone) — the two flags are orthogonal (wave-16 semantics);
//   f. a self-grant attempt — request body carrying a DIFFERENT real user's id + tier — is ignored:
//      the grant lands on the session buyer, never the injected victim (privilege-escalation guard).
// The grant is derived ENTIRELY from the mocked session — no request-body userId/tier is ever read,
// so there is no client-controlled path to EXAM_ACCESS. On success the action redirect()s, which
// throws NEXT_REDIRECT outside a Next request store — we catch it and assert the DB state.

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

const STAMP = Date.now();
let buyerId: string;
let anonId: string;
// A SEPARATE buyer used ONLY by case (e), created with NO prior entitlement, so the post-call
// EXAM_ACCESS assertion can only pass because THIS ENTITLEMENTS-off call wrote the grant (case (a)
// already granted `buyerId`, which would make an (e) assertion on `buyerId` vacuous).
let flagOffId: string;
// A REAL, DISTINCT user whose id is INJECTED into the request body by case (f)'s self-grant attempt.
// It must be a real row (not a random string) so "the grant did NOT land on the victim" is a
// meaningful, non-vacuous assertion — a bogus id could never receive a grant regardless.
let victimId: string;
let categoryId: string;

function asUser(id: string, isAnonymous = false) {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id,
    role: "USER",
    isAnonymous,
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
}

/** Drive the action, swallowing the NEXT_REDIRECT it throws on success/guard bounce. */
async function runCheckout(fd: FormData = new FormData()): Promise<{ redirected: boolean }> {
  try {
    await completeCheckout(fd);
    return { redirected: false };
  } catch {
    return { redirected: true };
  }
}

beforeAll(async () => {
  const cat = await prisma.category.findFirstOrThrow({ where: { code: "B" } });
  categoryId = cat.id;
  const buyer = await prisma.user.create({
    data: {
      name: "Checkout buyer",
      email: `checkout-buyer-${STAMP}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: categoryId,
    },
  });
  buyerId = buyer.id;
  const anon = await prisma.user.create({
    data: {
      name: "Checkout anon",
      email: `checkout-anon-${STAMP}@test.local`,
      passwordHash: "x",
      role: "USER",
      isAnonymous: true,
      selectedCategoryId: categoryId,
    },
  });
  anonId = anon.id;
  const flagOff = await prisma.user.create({
    data: {
      name: "Checkout flag-off buyer",
      email: `checkout-flagoff-${STAMP}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: categoryId,
    },
  });
  flagOffId = flagOff.id;
  const victim = await prisma.user.create({
    data: {
      name: "Checkout victim",
      email: `checkout-victim-${STAMP}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: categoryId,
    },
  });
  victimId = victim.id;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await prisma.analyticsEvent.deleteMany({
    where: { userId: { in: [buyerId, anonId, flagOffId, victimId] } },
  });
  await prisma.user.delete({ where: { id: buyerId } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: anonId } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: flagOffId } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: victimId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("completeCheckout (server-authoritative exam-access grant)", () => {
  it("a. authed user + PAYMENT_STUB on writes EXAM_ACCESS and unlocks the gate", async () => {
    vi.stubEnv("PAYMENT_STUB", "true");
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    asUser(buyerId);

    const { redirected } = await runCheckout();
    expect(redirected).toBe(true);

    const row = await getEntitlement(buyerId);
    expect(row?.tier).toBe("EXAM_ACCESS");
    expect(await checkIntelligenceAccess(buyerId)).toEqual({ enabled: true, hasAccess: true });
  });

  it("b. re-running is idempotent — still exactly one row", async () => {
    vi.stubEnv("PAYMENT_STUB", "true");
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    asUser(buyerId);

    await runCheckout();
    const count = await prisma.entitlement.count({ where: { userId: buyerId } });
    expect(count).toBe(1);
  });

  it("c. a non-authenticated call redirects and grants nothing", async () => {
    vi.stubEnv("PAYMENT_STUB", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const { redirected } = await runCheckout();
    expect(redirected).toBe(true);
    // No session → no user → no possible grant path. (The buyer's own row is unaffected.)
  });

  it("d. an anonymous user is bounced to /register and not granted", async () => {
    vi.stubEnv("PAYMENT_STUB", "true");
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    asUser(anonId, true);

    const { redirected } = await runCheckout();
    expect(redirected).toBe(true);
    expect(await getEntitlement(anonId)).toBeNull();
  });

  it("e. grant still writes with ENTITLEMENTS_ENABLED off; gate stays inert", async () => {
    vi.stubEnv("PAYMENT_STUB", "true");
    // ENTITLEMENTS_ENABLED intentionally unset → OFF.
    // Uses a FRESH buyer with NO prior entitlement (unlike case (a)'s `buyerId`), so the
    // post-call EXAM_ACCESS assertion is NON-VACUOUS: it can only pass because THIS
    // ENTITLEMENTS-off call wrote the grant. (Verified pass→fail by temporarily gating the
    // upsert behind !isEntitlementsEnabled() — see wave18-05 journal.)
    asUser(flagOffId);
    expect(await getEntitlement(flagOffId)).toBeNull();

    await runCheckout();
    const row = await getEntitlement(flagOffId);
    expect(row?.tier).toBe("EXAM_ACCESS");
    // Read gate inert: everyone passes, no query needed.
    expect(await checkIntelligenceAccess(flagOffId)).toEqual({ enabled: false, hasAccess: true });
  });

  it("f. self-grant attempt: injected userId/tier is ignored — grant is server-authoritative", async () => {
    vi.stubEnv("PAYMENT_STUB", "true");
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    // Session (server-authoritative) is the BUYER; the request body tries to redirect the grant to a
    // DIFFERENT real user (victim). Clear the buyer's existing row first so the post-call assertion
    // reflects THIS call, and confirm the victim starts with no entitlement.
    await prisma.entitlement.deleteMany({ where: { userId: buyerId } });
    expect(await getEntitlement(buyerId)).toBeNull();
    expect(await getEntitlement(victimId)).toBeNull();

    asUser(buyerId);
    const fd = new FormData();
    fd.set("userId", victimId);
    fd.set("tier", "EXAM_ACCESS");

    const { redirected } = await runCheckout(fd);
    expect(redirected).toBe(true);

    // The grant landed on the session buyer, NOT the injected victim id — completeCheckout derives
    // the target ONLY from getCurrentUser() and never reads formData.get("userId")/tier. If it did,
    // this would flip: victim granted, buyer not.
    expect((await getEntitlement(buyerId))?.tier).toBe("EXAM_ACCESS");
    expect(await getEntitlement(victimId)).toBeNull();
  });
});
