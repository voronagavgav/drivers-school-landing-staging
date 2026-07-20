import { describe, it, expect, afterAll, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// PRICING PAGE AUTH GUARD (wave18-04, spec T4) — /pricing is a real-account
// surface (an anon cannot purchase). Since Wave 17 the (app) shell layout uses
// resolveShellUser() (flag-ON returns anon/null WITHOUT redirecting), so the
// shell no longer bounces anonymous traffic. The page must own an explicit
// requireUser() guard at the top, redirecting any request with no real
// ds_session to /login REGARDLESS of the VALUE_FIRST_FUNNEL flag state.
//
// This drives the REAL page component (per the CLAUDE.md dashboard pattern —
// `await PricingPage()` runs the guard; the returned JSX is never rendered, so
// client-component bodies never execute). requireUser() (from @/lib/rbac) calls
// getCurrentUser() from @/lib/auth, so we partial-mock that to flip anon vs.
// logged-in.
//
// Asserts:
//   1. flag ON, no logged-in user → NEXT_REDIRECT to /login (page does not render).
//   2. flag OFF, no logged-in user → NEXT_REDIRECT to /login (guard is flag-independent).
//   3. authed real user → renders WITHOUT throwing (existing behaviour unchanged).
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(),
}));

// Imported AFTER the mock so requireUser binds to the mocked getCurrentUser.
const { getCurrentUser } = await import("@/lib/auth");
const { default: PricingPage } = await import("@/app/(app)/pricing/page");

/** Render PricingPage; return whether it produced an element + the thrown digest (redirect). */
async function renderPricing(): Promise<{ ok: boolean; digest: string }> {
  try {
    const el = await PricingPage();
    return { ok: el != null, digest: "" };
  } catch (e) {
    return { ok: false, digest: String((e as { digest?: string }).digest ?? (e as Error).message ?? "") };
  }
}

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("pricing page auth guard — logged-out visitor is bounced regardless of flag", () => {
  it("1. flag ON + no logged-in user → NEXT_REDIRECT to /login (no price card)", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await renderPricing();
    expect(res.ok).toBe(false);
    expect(res.digest).toContain("NEXT_REDIRECT");
    expect(res.digest).toContain("/login");
  });

  it("2. flag OFF + no logged-in user → NEXT_REDIRECT to /login (guard is flag-independent)", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await renderPricing();
    expect(res.ok).toBe(false);
    expect(res.digest).toContain("NEXT_REDIRECT");
    expect(res.digest).toContain("/login");
  });
});

describe("pricing page — authed real user (unchanged)", () => {
  it("3. a logged-in user renders the page without a redirect", async () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-pricing-guard",
      role: "USER",
      selectedCategoryId: null,
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

    const res = await renderPricing();
    expect(res.digest).toBe("");
    expect(res.ok).toBe(true);
  });
});
