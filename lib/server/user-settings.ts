import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { requireUser } from "@/lib/rbac";
import { firstIssueMessage } from "@/lib/validation";
import type { GlassSignals } from "@/lib/glass-tier";
import type { StudyProfileActionState } from "@/lib/server/study-profile";

// ---------------------------------------------------------------------------
// Server read for the user's glass-tier override (Wave-12a §B / `04-design-system.md` §5).
// The `(app)` layout (task 05) calls this SERVER-SIDE so the resolved tier can be emitted
// into the initial HTML with no emulated→real flash. Read-only: no settings row is created
// here — the absence of a row (or an anonymous request) simply means "auto", letting the
// client capability detector (`resolveGlassTier`) decide.
// ---------------------------------------------------------------------------

/** The `UserSettings.glassTier` value — an explicit surface choice or "auto" to let capability decide. */
export type GlassTierOverride = GlassSignals["override"];

/**
 * Return the current user's `glassTier` override, defaulting to `"auto"` when there is no
 * authenticated user or no `UserSettings` row. Never writes.
 */
export async function getGlassTierOverride(): Promise<GlassTierOverride> {
  const userId = await getSessionUserId();
  if (!userId) return "auto";
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { glassTier: true },
  });
  return (settings?.glassTier as GlassTierOverride | undefined) ?? "auto";
}

// The exact set of legal `UserSettings.glassTier` values (§5.4) — `satisfies`
// keeps this tuple in lock-step with the `GlassSignals["override"]` union.
const GLASS_TIER_VALUES = ["auto", "real", "emulated", "solid"] as const satisfies readonly GlassTierOverride[];

const setGlassTierSchema = z.object({
  glassTier: z.enum(GLASS_TIER_VALUES, { error: "Невірне значення скляних ефектів." }),
});

/**
 * SELF-ONLY: set the current user's glass-tier override. Identity comes from
 * `requireUser()` — the client supplies ONLY the tier, never a target user id.
 * An invalid value is rejected with no write. The `(app)` layout maps the
 * stored override to the body class on the next server render, so no
 * client-side tier switching is involved.
 */
export async function setGlassTierAction(formData: FormData): Promise<StudyProfileActionState> {
  const user = await requireUser();
  const parsed = setGlassTierSchema.safeParse({ glassTier: formData.get("glassTier") });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const { glassTier } = parsed.data;
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, glassTier },
    update: { glassTier },
  });
  return { ok: true };
}
