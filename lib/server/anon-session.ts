import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { requireUser } from "@/lib/rbac";
import { isValueFirstFunnelEnabled } from "@/lib/funnel";
import { resolveSessionSecret } from "@/lib/session-secret";

// ---------------------------------------------------------------------------
// Anonymous value-first-funnel session (Wave 17). A logged-out visitor must be
// able to play a real question loop before creating an account. We back that
// with a lazily-minted anonymous `User` row (isAnonymous:true, NO email/passwordHash
// — the no-PII guarantee) so every gameplay/progress FK works UNCHANGED.
//
// Identity is a NEW cookie `ds_anon_play`, DISTINCT from the real-auth `ds_session`
// (lib/auth.ts) and the analytics `ds_anon` (lib/server/analytics-ingest.ts). It
// reuses the same HMAC-signed stateless scheme as ds_session — a signed
// `anonUserId:tokenVersion:expiry` payload — with its own issue/verify helpers
// here. Possession of a validly-signed cookie IS the anon identity: no caller can
// pass a target anon-id (no IDOR surface).
// See docs/strategy/wave17-anon-funnel-adr.md (Cookie & identity, Unblock strategy).
// ---------------------------------------------------------------------------

const ANON_COOKIE = "ds_anon_play";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, matching ds_session

/** The single source of truth for the anon-play cookie name (tests/audit bind here). */
export function getAnonPlayCookieName(): string {
  return ANON_COOKIE;
}

function secret(): string {
  // Lazy (request-time) so `next build` doesn't trip the prod guard when the
  // secret is legitimately unset at build time.
  return resolveSessionSecret(process.env);
}

function sign(payload: string): string {
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function unsign(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return payload;
}

type AnonPayload = { userId: string; tokenVersion: number };

/** Parse + validate the signed anon cookie payload (`anonUserId:tokenVersion:expiry`), or null. */
async function readAnonPayload(): Promise<AnonPayload | null> {
  const store = await cookies();
  const token = store.get(ANON_COOKIE)?.value;
  if (!token) return null;
  const payload = unsign(token);
  if (!payload) return null;
  const parts = payload.split(":");
  if (parts.length !== 3) return null;
  const [userId, versionStr, expStr] = parts;
  if (!userId) return null;
  const tokenVersion = Number(versionStr);
  const exp = Number(expStr);
  if (!Number.isFinite(tokenVersion) || !Number.isFinite(exp)) return null;
  if (exp < Date.now()) return null;
  return { userId, tokenVersion };
}

/** Issue a fresh signed anon-play cookie for the given anon user. */
async function setAnonCookie(userId: string, tokenVersion: number): Promise<void> {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const token = sign(`${userId}:${tokenVersion}:${exp}`);
  const store = await cookies();
  store.set(ANON_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure ONLY behind real HTTPS (identical policy to ds_session) — off by default so LAN/http
    // play works, per the REAL-TRANSPORT learnings.
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Read-only: the anon user for the current `ds_anon_play` cookie, or null. Never mints, never sets
 * a cookie. Rejects a cookie that resolves to a missing row, a non-anonymous row (already converted),
 * or a stale tokenVersion.
 */
export async function getAnonUser(): Promise<SessionUser | null> {
  const payload = await readAnonPayload();
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { selectedCategory: true },
  });
  if (!user) return null;
  if (!user.isAnonymous) return null;
  if (user.tokenVersion !== payload.tokenVersion) return null;
  return user;
}

/**
 * Return the anon user for the current cookie if valid; otherwise mint a NEW anonymous `User`
 * (isAnonymous:true, no email/passwordHash) and issue the `ds_anon_play` cookie. Idempotent: a
 * second call with the cookie this set returns the SAME row and creates no second user.
 */
export async function getOrCreateAnonUser(): Promise<SessionUser> {
  const existing = await getAnonUser();
  if (existing) return existing;
  // No PII: the anon row carries a placeholder display name only — no email, no passwordHash.
  const user = await prisma.user.create({
    data: { name: "Гість", role: "USER", isAnonymous: true },
    include: { selectedCategory: true },
  });
  await setAnonCookie(user.id, user.tokenVersion);
  return user;
}

/** Delete the `ds_anon_play` cookie (called after a successful claim, once the row is a real user). */
export async function clearAnonPlayCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ANON_COOKIE);
}

/** Account fields written onto the upgraded row when an anon session is claimed. */
export interface AnonAccountInput {
  name: string;
  email: string;
  passwordHash: string;
}

/**
 * CONVERT-IN-PLACE (ADR: Migration & IDOR). Upgrade the anon `User` row identified by the current
 * `ds_anon_play` cookie into a real account: set `email`/`passwordHash`/`name`, flip
 * `isAnonymous:false`, and bump `tokenVersion` on the SAME row — so every accumulated
 * `TestSession`/`TestAnswer`/`ReviewState`/`UserMistake`/`SavedQuestion`/`UserStudyProfile`/
 * `ReadinessSnapshot` row (all keyed on that id) carries over automatically with ZERO cross-user
 * row reassignment.
 *
 * NO IDOR: the target is derived ONLY from the signed cookie the browser presents (via
 * `getAnonUser`) — the caller passes NO anon-id. Forging another visitor's session would require
 * their HMAC-signed cookie (infeasible without the server secret).
 *
 * SAFE NO-OP + IDEMPOTENT: returns `null` when there is no valid anon session to claim (no cookie,
 * stale/forged token, missing row, or a row already converted to a real user). Because a successful
 * claim flips the row to `isAnonymous:false` and bumps `tokenVersion`, a second call resolves to
 * `null` — re-running register/convert duplicates nothing.
 *
 * Composable inside a caller's `$transaction` via the optional trailing `tx` (defaults to `prisma`).
 */
export async function claimAnonSession(
  input: AnonAccountInput,
  tx: Prisma.TransactionClient = prisma,
): Promise<SessionUser | null> {
  // Identity is cookie-only: read + verify the signed ds_anon_play payload (no request-supplied
  // anon-id anywhere), then resolve/validate the row THROUGH `tx`. Routing this read via the same
  // transaction client (not the module-global `prisma`) is what keeps a caller's interactive
  // $transaction deadlock-free — a global-prisma read inside an open SQLite write-tx blocks on the
  // connection until the tx times out. Reject a missing / already-converted / stale-version row.
  const payload = await readAnonPayload();
  if (!payload) return null;
  const anon = await tx.user.findUnique({
    where: { id: payload.userId },
    include: { selectedCategory: true },
  });
  if (!anon || !anon.isAnonymous || anon.tokenVersion !== payload.tokenVersion) return null;
  const upgraded = await tx.user.update({
    where: { id: anon.id },
    data: {
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      isAnonymous: false,
      tokenVersion: { increment: 1 },
    },
    include: { selectedCategory: true },
  });
  return upgraded;
}

/**
 * The single play-path resolver (adopted by wave17-04). Returns the real logged-in user if there is
 * one; else, WHEN the value-first funnel flag is on, the (possibly freshly-minted) anon user; else
 * falls back to requireUser() — byte-for-byte the old redirect-to-/login behavior. Flag-off keeps
 * today's auth gate intact.
 */
export async function requirePlayableUser(): Promise<SessionUser> {
  const real = await getCurrentUser();
  if (real) return real;
  if (isValueFirstFunnelEnabled()) return getOrCreateAnonUser();
  return requireUser();
}
