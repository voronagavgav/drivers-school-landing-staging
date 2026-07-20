"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePlayableUser } from "@/lib/server/anon-session";
import { recordEvent } from "@/lib/analytics";
import { selectCategorySchema } from "@/lib/validation";
import { startSession, NoQuestionsError } from "@/lib/server/test-engine";
import { isSegmentTiming, isSegmentConfidence } from "@/lib/segment";

// ---------------------------------------------------------------------------
// Server actions for the anon-capable self-segment step (Wave 17, T2/P1.4). Each
// action resolves identity via requirePlayableUser() — a real user stays real, an
// anon visitor (funnel flag on) gets a lazily-minted anon row, and flag-off falls
// through to requireUser()/login (so the whole surface is unreachable anonymously
// when the flag is unset, per Goal §7). Every choice is a TAP submit — no free text.
// Steps advance via ?step=; the final confidence tap opens a REAL tailored session.
// ---------------------------------------------------------------------------

/** Step 1 (required): persist the chosen category, then advance to the timing tap. */
export async function segmentSelectCategoryAction(formData: FormData): Promise<void> {
  const user = await requirePlayableUser();
  const categoryId = String(formData.get("categoryId") ?? "");

  const parsed = selectCategorySchema.safeParse({ categoryId });
  if (!parsed.success) redirect("/segment");

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, isActive: true },
  });
  if (!category) redirect("/segment");

  await prisma.user.update({
    where: { id: user.id },
    data: { selectedCategoryId: category.id },
  });
  await recordEvent("category_selected", user.id, { categoryId: category.id });
  void recordEvent("onboarding_jtbd_answered", user.id, {
    question: "category",
    categoryCode: category.code,
  });
  redirect("/segment?step=timing");
}

/** Step 2 (optional JTBD): record exam timing, advance to confidence. Skippable. */
export async function segmentAnswerTimingAction(formData: FormData): Promise<void> {
  const user = await requirePlayableUser();
  const timing = String(formData.get("timing") ?? "");
  if (isSegmentTiming(timing)) {
    void recordEvent("onboarding_jtbd_answered", user.id, {
      question: "exam_timing",
      timing,
    });
  }
  redirect("/segment?step=confidence");
}

/** Step 3 (optional JTBD, final): record confidence, then open the tailored set. */
export async function segmentAnswerConfidenceAction(formData: FormData): Promise<void> {
  const user = await requirePlayableUser();
  const confidence = String(formData.get("confidence") ?? "");
  if (isSegmentConfidence(confidence)) {
    void recordEvent("onboarding_jtbd_answered", user.id, {
      question: "confidence",
      confidence,
    });
  }
  // segment_complete (wave17-11): the ≤4-tap self-segment is finished at this final confidence tap.
  // Anon-capable — `user.id` may be the lazily-minted anon id. Non-PII payload only (confidence band).
  void recordEvent("segment_complete", user.id, {
    confidence: isSegmentConfidence(confidence) ? confidence : null,
  });

  // Open a REAL question loop scoped to the persisted category — never a placeholder.
  let sessionId: string;
  try {
    sessionId = await startSession({
      userId: user.id,
      mode: "MIXED_PRACTICE",
      categoryId: user.selectedCategoryId ?? null,
      topicId: null,
    });
  } catch (e) {
    if (e instanceof NoQuestionsError) redirect("/dashboard");
    throw e;
  }
  redirect(`/test/${sessionId}`);
}
