import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { resolveSessionSecret } from "@/lib/session-secret";

// Email/password auth for the MVP. Sessions are a stateless, HMAC-signed cookie
// (`userId:tokenVersion:expiry` + signature) — no session table needed. Replace SESSION_SECRET
// in prod. The embedded tokenVersion is matched against the user's current `User.tokenVersion`
// on every read (see getCurrentUser): bumping it on a password change invalidates all OLD cookies
// while a freshly re-issued cookie keeps the current session alive.

const COOKIE = "ds_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  // Lazy (request-time) so `next build` doesn't trip the prod guard when the
  // secret is legitimately unset at build time.
  return resolveSessionSecret(process.env);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
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

export async function createSession(userId: string, tokenVersion: number): Promise<void> {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  // Payload is `userId:tokenVersion:expiry`. tokenVersion lets a password change invalidate every
  // previously-minted cookie (getCurrentUser rejects a cookie whose version != the stored one).
  const token = sign(`${userId}:${tokenVersion}:${exp}`);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure ONLY behind real HTTPS. Basing this on NODE_ENV (production under `next start`) set the
    // Secure flag even though this app is self-hosted over plain http:// (Tailscale/LAN) — and browsers
    // won't send a Secure cookie over http, so the session "dropped" on the next request after login.
    // Opt in explicitly (COOKIE_SECURE=true) when actually serving over TLS.
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

type SessionPayload = { userId: string; tokenVersion: number };

/**
 * Parse + validate the signed cookie payload. Expects the 3-field `userId:tokenVersion:expiry`
 * shape. The OLD 2-field `userId:expiry` format (minted before token-versioning) is REJECTED
 * safely (returns null → treated as logged out) rather than mis-parsed: there is no valid
 * tokenVersion to compare, so the user simply re-logs in.
 */
function parseSessionPayload(payload: string): SessionPayload | null {
  const parts = payload.split(":");
  if (parts.length !== 3) return null; // reject legacy 2-field (or any malformed) format
  const [userId, versionStr, expStr] = parts;
  if (!userId) return null;
  const tokenVersion = Number(versionStr);
  const exp = Number(expStr);
  if (!Number.isFinite(tokenVersion) || !Number.isFinite(exp)) return null;
  if (exp < Date.now()) return null;
  return { userId, tokenVersion };
}

/** Returns the validated session payload from the cookie, or null. */
async function getSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const payload = unsign(token);
  if (!payload) return null;
  return parseSessionPayload(payload);
}

/** Back-compat helper: the user id from a valid (3-field) session cookie, else null. */
export async function getSessionUserId(): Promise<string | null> {
  return (await getSessionPayload())?.userId ?? null;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getCurrentUser() {
  const session = await getSessionPayload();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { selectedCategory: true },
  });
  if (!user) return null;
  // Reject a cookie minted before the user's current tokenVersion — e.g. an OLD cookie after a
  // password change. The current session re-issues a matching cookie, so it stays logged in.
  if (user.tokenVersion !== session.tokenVersion) return null;
  return user;
}
