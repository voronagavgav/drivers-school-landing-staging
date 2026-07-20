"use client";

// Interest-capture CTA for /pricing (spec T2 §4). NO checkout, NO payment provider, NO email
// capture — a single click records interest through the freeform /api/track lane, then the button
// swaps to a calm confirmation state.
//
// Client-bundle trap (root CLAUDE.md, 1st learning): imports ONLY React, the client track helper
// and the presentational Button — never lib/server, lib/auth, lib/rbac or lib/db.
//
// PRIVACY: the payload carries eventType + path only. No PII, no form values; the server zod
// whitelist (lib/analytics-ingest.ts) is the backstop that strips anything else.

import { useState } from "react";
import { track, flushTracker } from "@/lib/client/track";
import { Button } from "@/components/ui";

export function PricingCta() {
  const [interested, setInterested] = useState(false);

  function onClick() {
    // Freeform lane: eventType + path, nothing else. Flush so it leaves before the tab might close.
    track("pricing_interest", { path: "/pricing" });
    flushTracker();
    setInterested(true);
  }

  if (interested) {
    return (
      <p className="text-sm font-medium text-green-deep" role="status">
        Дякуємо! Повідомимо, коли відкриємо оплату.
      </p>
    );
  }

  return (
    <Button type="button" onClick={onClick} className="w-full sm:w-auto">
      Хочу доступ до іспиту
    </Button>
  );
}
