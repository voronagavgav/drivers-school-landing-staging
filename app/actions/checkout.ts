"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordEvent } from "@/lib/analytics";
import { isPaymentStubEnabled } from "@/lib/entitlements";

// T4/P2.2 web checkout for the 399 ₴ one-time «доступ до іспиту». The payment-provider charge is
// STUBBED this wave (dev "simulated success", flag PAYMENT_STUB="true") — there is deliberately NO
// real payment-provider SDK or outbound HTTP call here yet (real wiring is Gate-0 deferred). On a simulated
// success the EXAM_ACCESS entitlement is granted SERVER-SIDE from the authenticated session: the
// client can request checkout but can NEVER assert its own entitlement (no client-sent userId/tier
// is ever read). The read-side gate (checkIntelligenceAccess) independently respects
// ENTITLEMENTS_ENABLED, so the grant may write while the gate stays inert (wave-16 semantics).

// Entitlement provenance written by a self-service purchase — distinct from MANUAL/PROMO admin
// grants (ENTITLEMENT_SOURCES). `source` is a free String on the model (schema.prisma).
const PURCHASE_SOURCE = "PURCHASE";

/**
 * Complete the one-time exam-access purchase. Resolves the buyer from the session (never a body
 * field); an anonymous player must register first; the charge is simulated behind PAYMENT_STUB; on
 * success the one-per-user EXAM_ACCESS row is upserted via the wave-16 grant path (idempotent — a
 * re-run updates in place, never a second row) and the funnel `paid` event is recorded. Wired as a
 * plain `<form action={completeCheckout}>` server action (single FormData arg); on success it
 * redirect()s, so it never returns to the caller on the happy path.
 */
export async function completeCheckout(_formData: FormData): Promise<void> {
  // (a) Server-authoritative identity — a purchase requires a REAL account.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isAnonymous) redirect("/register");

  // (b) STUB charge: no external network call this wave. Absent the dev flag there is no real
  //     provider to charge, so checkout cannot complete (never grant for free in prod).
  if (!isPaymentStubEnabled()) {
    redirect("/pricing/checkout?error=unavailable");
  }
  // Simulated successful charge (no PSP call).

  // (c) Server-side grant: upsert the EXAM_ACCESS entitlement (same wave-16 upsert path).
  await prisma.entitlement.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier: "EXAM_ACCESS",
      source: PURCHASE_SOURCE,
      purchasedAt: new Date(),
    },
    update: {
      tier: "EXAM_ACCESS",
      source: PURCHASE_SOURCE,
    },
  });
  await recordEvent("exam_access_purchased", user.id, { tier: "EXAM_ACCESS", source: PURCHASE_SOURCE });

  redirect("/dashboard?checkout=success");
}
