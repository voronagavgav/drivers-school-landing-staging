"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { destroySession } from "@/lib/auth";
import { requireUser } from "@/lib/rbac";
import { recordEvent } from "@/lib/analytics";
import { selectCategorySchema } from "@/lib/validation";
import { deleteUserAccount } from "@/lib/server/data-rights";
import { OPTOUT_COOKIE, optOutCookieOptions } from "@/lib/server/analytics-ingest";

export async function selectCategoryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const categoryId = String(formData.get("categoryId") ?? "");

  // Reject a missing/empty categoryId before the DB lookup; mirror the
  // not-found path by sending the user back to onboarding.
  const parsed = selectCategorySchema.safeParse({ categoryId });
  if (!parsed.success) redirect("/onboarding");

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, isActive: true },
  });
  if (!category) redirect("/onboarding");

  const firstTime = !user.selectedCategoryId;
  await prisma.user.update({ where: { id: user.id }, data: { selectedCategoryId: category.id } });
  await recordEvent("category_selected", user.id, { categoryId: category.id });
  if (firstTime) await recordEvent("onboarding_completed", user.id, {});
  // Continue the onboarding stepper (exam date → daily goal → first plan) instead of
  // jumping straight to the dashboard; both optional steps are skippable links.
  redirect("/onboarding?step=2");
}

/** Read the current analytics opt-out preference (first-party cookie). */
export async function getAnalyticsOptOut(): Promise<boolean> {
  const v = (await cookies()).get(OPTOUT_COOKIE)?.value;
  return Boolean(v && v !== "0");
}

/**
 * Persist the analytics opt-out preference server-side (durable, first-party cookie). Setting it
 * here means the server's /api/track ingest suppresses events even if client JS is bypassed; the
 * client toggle also mirrors it into a non-httpOnly cookie so the running tracker stops at once.
 * Returns the new state for the calling form. No PII is recorded for this preference change.
 */
export async function setAnalyticsOptOutAction(optedOut: boolean): Promise<{ optedOut: boolean }> {
  await requireUser();
  const jar = await cookies();
  jar.set(OPTOUT_COOKIE, optedOut ? "1" : "0", optOutCookieOptions);
  return { optedOut };
}

export interface DeleteAccountState {
  error?: string;
}

/** The exact confirmation word for account deletion — Cyrillic, compared code-point-exact. */
const DELETE_CONFIRM_WORD = "ВИДАЛИТИ";

/**
 * Irreversibly delete the signed-in user's account (spec §D, type-to-confirm). The confirmation
 * check lives HERE, not in the client (`required` there is UX only): the value must equal
 * «ВИДАЛИТИ» exactly after trimming — case- and alphabet-exact, so a Latin-lookalike spelling
 * fails the code-point comparison. On success the schema cascades wipe every learning-state row
 * with the user; deliberately NO analytics event (the user is gone — no orphan write), then the
 * session cookie is destroyed and the browser lands on /goodbye. A double-submit is safe: the
 * second call finds no session user and requireUser() bounces to /login instead of throwing.
 */
export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await requireUser();

  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== DELETE_CONFIRM_WORD) {
    return { error: "Щоб підтвердити, введіть слово ВИДАЛИТИ" };
  }

  await deleteUserAccount(user.id);
  await destroySession();
  redirect("/goodbye");
}
