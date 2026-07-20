"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/login-throttle";
import { recordEvent } from "@/lib/analytics";
import { requireUser } from "@/lib/rbac";
import { isValueFirstFunnelEnabled } from "@/lib/funnel";
import { claimAnonSession, clearAnonPlayCookie } from "@/lib/server/anon-session";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  firstIssueMessage,
} from "@/lib/validation";
import {
  isLoginThrottled,
  noteLoginFailure,
  clearLoginThrottle,
  isIpLoginThrottled,
  noteIpLoginFailure,
  clearIpLoginThrottle,
} from "@/lib/server/login-throttle";

export interface AuthState {
  error?: string;
}

export interface ChangePasswordState {
  error?: string;
  success?: string;
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const parsed = registerSchema.safeParse({ name, email, password });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Користувач з такою поштою вже зареєстрований." };

  const passwordHash = await hashPassword(password);

  // Value-first funnel (Wave 17): when the flag is on AND this request presents a valid
  // ds_anon_play session, CONVERT-IN-PLACE — upgrade that anon `User` row into the new account so
  // every accumulated TestSession/TestAnswer/ReviewState/UserMistake/SavedQuestion/UserStudyProfile/
  // ReadinessSnapshot row carries over with zero cross-user reassignment (no IDOR — the target is
  // derived from the signed cookie, never from form input). Create + claim run in ONE transaction so
  // a partial migration can't leave orphaned ownership. Flag-off or no valid anon cookie →
  // claimAnonSession returns null and we fall through to today's fresh-create path, unchanged.
  const claimed = isValueFirstFunnelEnabled()
    ? await prisma.$transaction((tx) => claimAnonSession({ name, email, passwordHash }, tx))
    : null;

  const user =
    claimed ??
    (await prisma.user.create({
      data: { name, email, passwordHash, role: "USER" },
    }));

  // A successful claim upgraded the anon row into this account — its cookie is now spent, so clear it.
  if (claimed) await clearAnonPlayCookie();

  await createSession(user.id, user.tokenVersion);
  await recordEvent("user_registered", user.id, { email });
  redirect("/onboarding");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Validate shape before touching the DB; keep the generic error so a malformed
  // login never reveals which field failed (no user enumeration).
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) return { error: "Невірна пошта або пароль." };

  // Derive the client IP for the per-IP bucket. Trust the first x-forwarded-for hop, then
  // x-real-ip; on a direct LAN/Tailscale hit with neither header present, `ip` is null and we
  // simply skip per-IP throttling (degrade gracefully — never crash).
  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs.get("x-forwarded-for"), hdrs.get("x-real-ip"));

  // Throttle repeated failures BEFORE any DB/bcrypt work, so a flood of bad passwords can't run
  // unbounded password hashes. TWO independent buckets, BOTH checked first:
  //   - per-email  → targeted brute force against one account (key = normalized email)
  //   - per-IP     → password-spraying: one source guessing across many accounts (key = client IP)
  const emailKey = email;
  if (isLoginThrottled(emailKey) || (ip !== null && isIpLoginThrottled(ip))) {
    return { error: "Завелика кількість спроб входу. Спробуйте пізніше." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // passwordHash is nullable since wave17 (anonymous funnel users carry none); a passwordless
  // row can never authenticate — treat it as an invalid credential, same generic error.
  if (!user || user.passwordHash === null || !(await verifyPassword(password, user.passwordHash))) {
    // Count the miss against BOTH buckets so neither attack pattern slips through.
    noteLoginFailure(emailKey);
    if (ip !== null) noteIpLoginFailure(ip);
    return { error: "Невірна пошта або пароль." };
  }
  // Success: clear BOTH buckets so a legitimate user isn't penalized by earlier typos.
  clearLoginThrottle(emailKey);
  if (ip !== null) clearIpLoginThrottle(ip);
  await createSession(user.id, user.tokenVersion);
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  await recordEvent("user_logged_in", user.id, {});
  redirect(user.role === "ADMIN" || user.role === "CONTENT_MANAGER" ? "/admin" : "/dashboard");
}

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  // Identity comes from the session only — we never read a user id/email from the
  // form, so the action can't be steered at another account (no enumeration surface).
  const user = await requireUser();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  // Verify the current password before any write. A mismatch returns a generic
  // Ukrainian error and performs NO update.
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash ?? ""))) {
    return { error: "Невірний поточний пароль." };
  }

  // Rotate the hash AND bump tokenVersion in one write: every cookie minted at the OLD version
  // (any other device / a stolen pre-change cookie) is now rejected by getCurrentUser.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      tokenVersion: { increment: 1 },
    },
  });

  // Re-issue THIS session's cookie at the new version so the user driving the change stays logged
  // in while every other/old cookie becomes invalid.
  await createSession(updated.id, updated.tokenVersion);

  return { success: "Пароль успішно змінено." };
}

export async function logoutAction(): Promise<void> {
  // Record the logout BEFORE destroying the session (we still have the user id then). The client
  // can't reliably observe its own logout, so this is recorded server-side. Fire-and-forget.
  const user = await getCurrentUser();
  if (user) void recordEvent("user_logged_out", user.id, {});
  await destroySession();
  redirect("/");
}
