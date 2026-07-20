import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordEvents } from "@/lib/analytics";
import { trackBatchSchema } from "@/lib/analytics-ingest";
import {
  ANON_ID_COOKIE,
  OPTOUT_COOKIE,
  anonCookieOptions,
  deriveTrackContext,
  isAnalyticsOptedOut,
  isTrackRateLimited,
  noteTrackBatch,
} from "@/lib/server/analytics-ingest";
import { TRACK_MAX_BODY_BYTES } from "@/lib/constants";

// First-party analytics ingest. Accepts a BATCH of lightweight client interaction events, validates
// + size-caps them, rate-limits per source, pseudonymises the IP (hash only) and drops anything not
// in the whitelist, then stores them. NEVER stores a raw IP / password / answer text / form value.
//
// Always returns a small JSON ack (even on reject) so a beacon/fetch from the client can't be used
// to probe internal errors; analytics must never break the user flow.

export const runtime = "nodejs";

function ack(
  status: "ok" | "rejected" | "opted_out" | "rate_limited",
  init?: { status?: number },
): NextResponse {
  return NextResponse.json({ status }, { status: init?.status ?? 200 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Honour opt-out / Do-Not-Track BEFORE doing any work — record nothing, but ack 200 so the client
  // treats it as success and stops retrying.
  const optOut = req.cookies.get(OPTOUT_COOKIE)?.value;
  if (isAnalyticsOptedOut(req.headers, optOut)) {
    return ack("opted_out");
  }

  // Size guard: reject an oversized body before reading/parsing it. We check the declared length
  // first (cheap), then enforce the cap on the actually-read text too (a lying header can't sneak
  // past). On any parse error we reject without leaking details.
  const declaredLen = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLen) && declaredLen > TRACK_MAX_BODY_BYTES) {
    return ack("rejected", { status: 413 });
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return ack("rejected", { status: 400 });
  }
  if (raw.length > TRACK_MAX_BODY_BYTES) {
    return ack("rejected", { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return ack("rejected", { status: 400 });
  }

  const parsed = trackBatchSchema.safeParse(json);
  if (!parsed.success) {
    return ack("rejected", { status: 400 });
  }

  // Derive server-side context (anonymousId from the first-party cookie, hashed IP, device bucket).
  // The anonymousId / hashed IP is the rate-limit source key — checked before we store anything.
  const existingAnonId = req.cookies.get(ANON_ID_COOKIE)?.value;
  const ctx = deriveTrackContext(req.headers, existingAnonId);

  if (isTrackRateLimited(ctx.rateKey)) {
    return ack("rate_limited", { status: 429 });
  }
  noteTrackBatch(ctx.rateKey);

  // Attribute to the logged-in user when there is a valid session; otherwise the events stay
  // anonymous (userId null). A failure to resolve the user must not drop the batch.
  let userId: string | null = null;
  try {
    userId = (await getCurrentUser())?.id ?? null;
  } catch {
    userId = null;
  }

  await recordEvents(parsed.data.events, ctx, userId);

  const res = ack("ok");
  // Persist a freshly-minted first-party anonymousId so the same visitor is correlated next time.
  if (ctx.mintedAnonId) {
    res.cookies.set(ANON_ID_COOKIE, ctx.anonymousId, anonCookieOptions);
  }
  return res;
}
