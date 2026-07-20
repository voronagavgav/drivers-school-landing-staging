import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import type { Role } from "@/lib/constants";

// Server-side access control. UI may also hide controls, but every protected route/action
// MUST call one of these — never rely on the client.

export function canManageContent(role: string): boolean {
  return role === "ADMIN" || role === "CONTENT_MANAGER";
}

/** Require a logged-in user, else redirect to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require one of the given roles, else redirect (to /dashboard for authed users). */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) redirect("/dashboard");
  return user;
}

/** ADMIN or CONTENT_MANAGER (content editing). */
export async function requireContentManager(): Promise<SessionUser> {
  return requireRole(["ADMIN", "CONTENT_MANAGER"]);
}
