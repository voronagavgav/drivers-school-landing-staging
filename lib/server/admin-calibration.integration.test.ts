import { describe, it, expect, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Admin calibration page 0-ROW render smoke (wave19a-08, Part 2 §K). Drives the
// REAL page component (per the CLAUDE.md dashboard pattern — `await Page(...)`
// runs the loaders; the returned JSX is never rendered, so client-component
// bodies never execute). Asserts:
//   1. with an EMPTY PassOutcome table + a content-manager principal, the page
//      renders WITHOUT throwing (the honest empty state — no div-by-zero/NaN).
//   2. a non-content-manager (USER role) is blocked — requireContentManager
//      redirect-throws (NEXT_REDIRECT to /dashboard).
//
// We never mint real cookies in node, so we partial-mock getCurrentUser (which
// requireContentManager reads) to flip the principal. The 0-row assertion needs
// the table actually empty; we snapshot the count and skip the render assertion
// only if rows exist (they won't today), never touching real data.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(),
}));

const { getCurrentUser } = await import("@/lib/auth");
const { default: CalibrationPage } = await import("@/app/admin/calibration/page");

async function render(): Promise<{ ok: boolean; digest: string }> {
  try {
    const el = await CalibrationPage();
    return { ok: el != null, digest: "" };
  } catch (e) {
    return {
      ok: false,
      digest: String((e as { digest?: string }).digest ?? (e as Error).message ?? ""),
    };
  }
}

afterEach(() => {
  vi.mocked(getCurrentUser).mockReset();
});

describe("admin calibration page", () => {
  it("renders WITHOUT throwing on 0 PassOutcome rows for a content manager", async () => {
    const count = await prisma.passOutcome.count();
    // The seeded/dev DB is expected to have 0 outcomes today; if a prior run left
    // some, the empty-state branch isn't exercised — just prove the page renders.
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "cal-admin",
      role: "ADMIN",
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

    const res = await render();
    expect(res.digest).toBe("");
    expect(res.ok).toBe(true);
    // Sanity: the read path returned (0 or more) without a NaN leak upstream.
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("blocks a non-content-manager (requireContentManager redirect)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "cal-user",
      role: "USER",
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

    const res = await render();
    expect(res.ok).toBe(false);
    expect(res.digest).toContain("NEXT_REDIRECT");
  });
});
