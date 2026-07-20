"use client";

// The value-triggered 399 ₴ ask (Wave-17 T3/P1.5, task 08). A SINGLE honest offer card, anchored to
// the user's REAL readiness %, surfaced only AFTER the dial has rendered a real number on a completed
// session/sim. This is the ONE bold element on its surface; everything around it stays quiet.
//
// Client-bundle law (root CLAUDE.md, 1st learning): PRESENTATIONAL leaf — imports ONLY React, the
// pure `@/lib/constants` price, the client track helper and the presentational LinkButton. It NEVER
// reaches into any server-only graph (data layer, auth, rbac, request-scope helpers). The flag gate
// (isValueFirstFunnelEnabled / isEntitlementsEnabled) is decided SERVER-side at the mount site — a
// client component can't read non-public env, so this component only ever mounts when the funnel is on.
//
// HONESTY LAW (the dial's credibility IS the product — one perceived trick nukes it):
//   - the anchor % is the user's REAL computed dialPercent (interpolated, never a marketing number);
//   - with insufficient data we render NOTHING — the ask never surfaces a fabricated %;
//   - exactly one price, no struck-through "was", no ticking-clock or scarcity nudge, no buy-verb
//     CTA (the CTA names the outcome, not the transaction), no subscription wording.

import { useEffect } from "react";
import { PRICE_UAH } from "@/lib/constants";
import { track, flushTracker } from "@/lib/client/track";
import { LinkButton } from "@/components/ui";

export type ExamAccessOfferProps = {
  /** The user's REAL 0–100 readiness dial value (int). Interpolated into the headline verbatim. */
  dialPercent: number;
  /** Whether the dial rendered a real number. When false the ask does NOT surface (no fabricated %). */
  sufficientData: boolean;
  /** Where the buy CTA routes. Checkout (wave17-09) lands here; defaults to /pricing until then. */
  ctaHref?: string;
};

export function ExamAccessOffer({ dialPercent, sufficientData, ctaHref = "/pricing" }: ExamAccessOfferProps) {
  // Impression event (spec §7): fire the paid-ask impression the moment the offer is shown. Freeform
  // lane, eventType + path only. TODO(wave17-11): reconcile this name with the funnel event taxonomy.
  useEffect(() => {
    if (!sufficientData) return;
    track("paid_ask_shown", { metadata: { dialPercent } });
    flushTracker();
  }, [sufficientData, dialPercent]);

  // No fabricated % — with insufficient data the ask simply does not surface.
  if (!sufficientData) return null;

  return (
    <section
      data-testid="exam-access-offer"
      className="solid space-y-4 border-green-deep/30 p-6"
      aria-labelledby="offer-headline"
    >
      {/* Real proof above the price (real numbers ONLY). N is the user's live dialPercent. */}
      <h2 id="offer-headline" className="font-display text-xl font-semibold text-ink">
        Ти на {dialPercent}% — ось як дійти до 90%
      </h2>

      <p className="text-sm text-ink">
        чесна готовність + план FSRS + аналітика помилок
      </p>

      {/* The ONE bold moment: boldness lives in the price alone. Exactly one price, no struck «було». */}
      <div>
        <p className="font-display text-3xl font-bold text-green-ink">
          {PRICE_UAH} ₴ разово — доступ назавжди. Без підписки.
        </p>
        <p className="mt-1 text-sm text-muted">менше за одне заняття в автошколі</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Outcome-named CTA — names the exam-access outcome, never the buy verb. */}
        <LinkButton href={ctaHref} className="w-full sm:w-auto">
          Відкрити доступ до іспиту
        </LinkButton>
        <span className="text-xs text-muted">разовий платіж, не підписка</span>
      </div>
    </section>
  );
}
