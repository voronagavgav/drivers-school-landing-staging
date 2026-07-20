import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { recordEvents } from "@/lib/analytics";
import { deriveTrackContext, _resetTrackRateStore } from "@/lib/server/analytics-ingest";
import { TRACK_RATE_MAX_BATCHES } from "@/lib/constants";

// Integration coverage for the batched /api/track ingest:
//  - recordEvents persists whitelisted, pseudonymised rows (hashed IP, never raw) and no PII;
//  - the route handler validates/size-caps/rate-limits, mints a first-party anon cookie, honours
//    Do-Not-Track, and attributes to the logged-in user when there is one.
// A throwaway user is created/deleted; we tag rows with a unique anonymousId and delete only those.

// getCurrentUser reads the request cookie store (next/headers) which isn't available in the test
// runtime, so we mock it: default anonymous, overridden per-case to a logged-in user.
vi.mock("@/lib/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(async () => null),
}));
import { getCurrentUser } from "@/lib/auth";

const TAG = `itest-anon-${Date.now()}`;
let userId: string;

async function rowsForTag() {
  return prisma.analyticsEvent.findMany({ where: { anonymousId: { startsWith: TAG } } });
}

beforeAll(async () => {
  const u = await prisma.user.create({
    data: { name: "Track Tester", email: `track-${Date.now()}@example.com`, passwordHash: "x" },
  });
  userId = u.id;
});

afterEach(async () => {
  _resetTrackRateStore();
  vi.mocked(getCurrentUser).mockResolvedValue(null as never);
  await prisma.analyticsEvent.deleteMany({ where: { anonymousId: { startsWith: TAG } } });
});

afterAll(async () => {
  await prisma.analyticsEvent.deleteMany({ where: { anonymousId: { startsWith: TAG } } });
  await prisma.user.delete({ where: { id: userId } });
});

describe("recordEvents persistence", () => {
  it("stores a batch with whitelisted + pseudonymised fields, tied to the user, with NO raw PII", async () => {
    const ctx = {
      anonymousId: `${TAG}-A`,
      mintedAnonId: false,
      ipHash: "a".repeat(64),
      deviceType: "mobile",
      userAgent: "UA/1.0",
      rateKey: `${TAG}-A`,
    };
    await recordEvents(
      [
        { eventType: "page_view", path: "/dashboard", referrer: "/login" },
        { eventType: "click", elementType: "button", elementLabel: "start-exam", durationMs: 1200 },
      ],
      ctx,
      userId,
    );

    const rows = await rowsForTag();
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.eventName).toBe("client_event");
      expect(r.userId).toBe(userId);
      expect(r.anonymousId).toBe(`${TAG}-A`);
      expect(r.ipHash).toBe("a".repeat(64));
      expect(r.deviceType).toBe("mobile");
      // No raw-IP / password / answer columns exist on the model — assert the hash is stored, not an IP.
      expect(r.ipHash).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
    }
    const pv = rows.find((r) => r.eventType === "page_view")!;
    expect(pv.path).toBe("/dashboard");
    expect(pv.referrer).toBe("/login");
    const click = rows.find((r) => r.eventType === "click")!;
    expect(click.elementLabel).toBe("start-exam");
    expect(click.durationMs).toBe(1200);
  });

  it("stores anonymous events (userId null) when there is no user", async () => {
    const ctx = {
      anonymousId: `${TAG}-B`,
      mintedAnonId: false,
      ipHash: null,
      deviceType: null,
      userAgent: null,
      rateKey: `${TAG}-B`,
    };
    await recordEvents([{ eventType: "ping" }], ctx, null);
    const rows = await rowsForTag();
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBeNull();
    expect(rows[0].ipHash).toBeNull();
  });
});

describe("deriveTrackContext", () => {
  it("hashes the forwarded IP (never the raw IP) and buckets the device", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148",
    });
    const ctx = deriveTrackContext(headers, undefined, { ANALYTICS_SALT: "test-salt" } as never);
    expect(ctx.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(ctx.ipHash).not.toContain("203.0.113.7");
    expect(ctx.deviceType).toBe("mobile");
    expect(ctx.mintedAnonId).toBe(true); // no existing cookie → minted
    expect(ctx.anonymousId).toBeTruthy();
  });

  it("reuses an existing anonymousId cookie (does not mint a new one)", () => {
    const ctx = deriveTrackContext(new Headers(), "existing-anon-id", {} as never);
    expect(ctx.anonymousId).toBe("existing-anon-id");
    expect(ctx.mintedAnonId).toBe(false);
  });
});

// ---- Route handler end-to-end ----
async function postTrack(
  body: unknown,
  opts: { cookie?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  const { POST } = await import("@/app/api/track/route");
  const headers = new Headers({ "content-type": "application/json", ...(opts.headers ?? {}) });
  if (opts.cookie) headers.set("cookie", opts.cookie);
  const req = new NextRequest("http://localhost/api/track", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/track route", () => {
  it("accepts a valid batch, stores it, and mints a first-party anon cookie", async () => {
    const res = await postTrack({ events: [{ eventType: `pv`, path: "/x" }] });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok" });
    // It minted an anonymousId cookie (no incoming ds_anon).
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/ds_anon=/);

    // The stored row's anonymousId is the minted UUID — tag the row for cleanup by overwriting it.
    const recent = await prisma.analyticsEvent.findMany({
      where: { eventName: "client_event", eventType: "pv", path: "/x" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    expect(recent).toHaveLength(1);
    expect(recent[0].anonymousId).toBeTruthy();
    await prisma.analyticsEvent.update({
      where: { id: recent[0].id },
      data: { anonymousId: `${TAG}-route` },
    });
  });

  it("rejects an invalid batch with 400 and stores nothing", async () => {
    const before = (await rowsForTag()).length;
    const res = await postTrack({ events: [{ path: "/no-eventType" }] });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ status: "rejected" });
    expect((await rowsForTag()).length).toBe(before);
  });

  it("honours Do-Not-Track: records nothing but acks 200", async () => {
    const res = await postTrack(
      { events: [{ eventType: "pv", path: "/dnt" }] },
      { headers: { dnt: "1" } },
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "opted_out" });
    const dntRows = await prisma.analyticsEvent.findMany({
      where: { eventName: "client_event", path: "/dnt" },
    });
    expect(dntRows).toHaveLength(0);
  });

  it("rate-limits a flooding source with 429 once the cap is reached", async () => {
    const cookie = "ds_anon=flooder-1";
    let last: Response | undefined;
    for (let i = 0; i < TRACK_RATE_MAX_BATCHES; i++) {
      last = await postTrack({ events: [{ eventType: "flood" }] }, { cookie });
      expect(last.status).toBe(200);
    }
    // The next batch crosses the cap.
    const limited = await postTrack({ events: [{ eventType: "flood" }] }, { cookie });
    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toEqual({ status: "rate_limited" });
    // cleanup the flooder rows
    await prisma.analyticsEvent.deleteMany({ where: { anonymousId: "flooder-1" } });
  });

  it("attributes events to the logged-in user when a session resolves", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: userId } as never);
    const res = await postTrack(
      { events: [{ eventType: "authed", path: "/auth-attr" }] },
      { cookie: `ds_anon=${TAG}-authed` },
    );
    expect(res.status).toBe(200);
    const rows = await prisma.analyticsEvent.findMany({
      where: { anonymousId: `${TAG}-authed` },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userId);
  });

  it("records pricing_interest but STRIPS a smuggled PII key (zod whitelist)", async () => {
    // The /pricing CTA sends { eventType: "pricing_interest", path: "/pricing" }. A hostile client
    // could try to smuggle PII (email) into the event — the object schema strips unknown keys, so
    // exactly one row lands and the smuggled key is nowhere in the stored row / metadata.
    const res = await postTrack(
      { events: [{ eventType: "pricing_interest", path: "/pricing", email: "leak@example.com" }] },
      { cookie: `ds_anon=${TAG}-price` },
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok" });

    const rows = await prisma.analyticsEvent.findMany({ where: { anonymousId: `${TAG}-price` } });
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe("pricing_interest");
    expect(row.path).toBe("/pricing");
    // The smuggled key is absent from EVERY stored column (metadata is freeform JSON — check it too).
    expect(row.metadata ?? "").not.toContain("leak@example.com");
    expect(JSON.stringify(row)).not.toContain("leak@example.com");
    expect(JSON.stringify(row).toLowerCase()).not.toContain("email");
  });

  it("REJECTS PII smuggled through the whitelisted metadata record (wave16-review)", async () => {
    // The top-level-key strip (previous test) is zod's default; the real exposure was the freeform
    // `metadata` record, whose string values persist verbatim. The schema now caps values at 64
    // chars and forbids `@`, so an email inside metadata fails the parse, the whole event is
    // rejected, and a batch with no valid events gets the route's standard 400.
    const res = await postTrack(
      {
        events: [
          {
            eventType: "pricing_interest",
            path: "/pricing",
            metadata: { contact: "leak@example.com" },
          },
        ],
      },
      { cookie: `ds_anon=${TAG}-meta-smuggle` },
    );
    expect(res.status).toBe(400);

    const rows = await prisma.analyticsEvent.findMany({
      where: { anonymousId: `${TAG}-meta-smuggle` },
    });
    expect(rows).toHaveLength(0);

    // Sanity: a legit short-token metadata record still lands.
    const ok = await postTrack(
      {
        events: [{ eventType: "pricing_interest", path: "/pricing", metadata: { arm: "uah_399" } }],
      },
      { cookie: `ds_anon=${TAG}-meta-ok` },
    );
    expect(ok.status).toBe(200);
    const okRows = await prisma.analyticsEvent.findMany({
      where: { anonymousId: `${TAG}-meta-ok` },
    });
    expect(okRows).toHaveLength(1);
    expect(okRows[0].metadata ?? "").toContain("uah_399");
  });
});
