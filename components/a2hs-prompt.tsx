"use client";

// Add-to-home-screen invite (spec P1.7). A CLIENT-ONLY, non-blocking prompt shown AFTER a value
// moment — never on arrival, never an interstitial, never a repeated nag. It fails silent: without
// the browser `beforeinstallprompt` event (Firefox/Safari/iOS, or already installed) it renders
// NOTHING, and it never mounts unconditionally at the top of the shell — the parent gates it behind
// a value flag (`show`, e.g. ≥1 completed session or the readiness dial rendered).
//
// Client-bundle trap (root CLAUDE.md, 1st learning): this file imports NOTHING from any server-only
// module (data, auth, or rbac helpers) — pure client, safe in the (app) shell bundle.
//
// Honesty (spec DO-NOT): one calm invite with a real benefit («Додати на головний екран»), one
// green accent, a neutral dismiss that STICKS for the session (localStorage `ds_a2hs_dismissed`).
// Dismiss once and it never returns until the guard is cleared.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

const STORAGE_KEY = "ds_a2hs_dismissed";
const INVITE_COPY = "Додати на головний екран";
const SUBTEXT = "Швидший доступ до підготовки — як застосунок, без магазину.";

// The install event is non-standard (Chromium-only) and absent from TS lib.dom — declare the
// minimal shape we touch.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** True once the neutral dismiss guard is set for this browser. Fails open (shows) on storage errors. */
function wasDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Renders the calm A2HS invite ONLY when all hold: the value moment is reached (`show`), the browser
 * offered `beforeinstallprompt`, and the user hasn't dismissed it. Otherwise returns null.
 */
export function A2hsPrompt({ show = false }: { show?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  // Read the persisted guard after mount (never in a lazy initializer — avoids a hydration mismatch;
  // components/CLAUDE.md 1st learning).
  useEffect(() => {
    setDismissed(wasDismissed());
  }, []);

  // Stash the install event and suppress the browser's default mini-infobar so the invite appears
  // only after our value moment, on our terms.
  useEffect(() => {
    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function handleDismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* storage disabled — the invite simply won't be remembered this session */
    }
    setDismissed(true);
  }

  async function handleInstall() {
    const event = deferred;
    if (!event) return;
    setDeferred(null); // a prompt() can only be consumed once
    try {
      await event.prompt();
    } catch {
      /* install prompt unavailable — no-op, the app is unchanged */
    }
  }

  // Non-blocking gate: nothing renders until the value moment AND a real install offer exist.
  if (!show || !deferred || dismissed) return null;

  return (
    <div className="solid flex items-center gap-3 p-4" role="region" aria-label={INVITE_COPY}>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold text-ink">{INVITE_COPY}</p>
        <p className="mt-0.5 text-xs text-muted">{SUBTEXT}</p>
      </div>
      <Button type="button" variant="primary" onClick={handleInstall}>
        Додати
      </Button>
      <Button type="button" variant="ghost" onClick={handleDismiss} aria-label="Сховати">
        Не зараз
      </Button>
    </div>
  );
}
