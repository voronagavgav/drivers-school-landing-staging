"use client";

import { useEffect, useState } from "react";
import { Button, Card, SectionTitle } from "@/components/ui";

// Calm install hint (spec §B): an invitation with memory, never a nag.
// Two lanes because `beforeinstallprompt` is Chromium-only and iOS Safari has no
// programmatic install at all — never fake the Android prompt on iOS.
//   - Android/Chromium: stash the beforeinstallprompt event, offer a real install button.
//   - iOS Safari: short "add to home screen" instructions, no button pretending to install.
//   - Already installed (display-mode: standalone), dismissed, or neither signal: render
//     NOTHING — silence beats a useless card.
// Dismissal is device-scoped on purpose (localStorage, not a cookie/DB): an install hint
// is about THIS device. All detection runs in a mount effect so SSR/hydration stay clean.

const DISMISS_KEY = "ds_install_hint_dismissed";

type BeforeInstallPromptEvent = Event & { prompt(): Promise<void> };

type Lane = "none" | "android" | "ios";

export function InstallHint() {
  const [lane, setLane] = useState<Lane>("none");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) setLane("ios");
    // The event-map overload doesn't know "beforeinstallprompt", so the handler
    // takes a plain Event and narrows.
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setLane("android");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (lane === "none") return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setLane("none");
  };

  const install = () => {
    // A stashed prompt is single-use; hide the card after handing off to the browser.
    // No dismissed-flag write here: declining the browser dialog shouldn't silence
    // the hint forever — only «Приховати» does that.
    void deferred?.prompt();
    setDeferred(null);
    setLane("none");
  };

  return (
    <Card className="max-w-md">
      {lane === "android" ? (
        <>
          <SectionTitle hint="Працює офлайн і відкривається з головного екрана за мить.">
            Застосунок на цьому пристрої
          </SectionTitle>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={install}>
              Встановити застосунок
            </Button>
            <button
              type="button"
              onClick={dismiss}
              className="min-h-[44px] px-2 text-sm text-muted hover:text-ink"
            >
              Приховати
            </button>
          </div>
        </>
      ) : (
        <>
          <SectionTitle hint="Працює офлайн і відкривається з головного екрана за мить.">
            Додати на головний екран
          </SectionTitle>
          <p className="text-sm text-ink">
            У Safari натисніть «Поділитися», потім оберіть «На початковий екран».
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 min-h-[44px] px-2 text-sm text-muted hover:text-ink"
          >
            Приховати
          </button>
        </>
      )}
    </Card>
  );
}
