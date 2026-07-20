"use client";

import { useEffect } from "react";
import { resolveGlassTier, type GlassSignals } from "@/lib/glass-tier";

// Client tier detector for the app shell (Wave-12a §B / `04-design-system.md` §5). Mounted ONCE
// by the `(app)` layout. It builds `GlassSignals` from the live browser capabilities + the
// server-read `override` prop and delegates the DECISION to the pure `resolveGlassTier` (task 04) —
// the capability matrix is NEVER re-implemented here. It sets EXACTLY ONE tier class on the body
// (`glass-real` / `glass-solid`, neither for the emulated CSS base), re-evaluates when an
// accessibility preference changes, and runs the idle-freeze (`bg-idle`) that quiets ambient
// motion after a short lull. Renders nothing.

/** UserSettings.glassTier override, read server-side and passed in (avoids importing server-only). */
type GlassOverride = GlassSignals["override"];

// Non-standard navigator fields (Device Memory API + Network Information API) — absent from lib.dom.
type CapabilityNavigator = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/** No-input dwell before the field is frozen (matches the inline-script / globals cadence). */
const IDLE_MS = 1200;

export function GlassShell({ override }: { override: GlassOverride }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const contrastMore = window.matchMedia("(prefers-contrast: more)");

    // Build the injected signals and let the pure resolver pick the tier.
    const apply = () => {
      const nav = navigator as CapabilityNavigator;
      const signals: GlassSignals = {
        override,
        deviceMemory: nav.deviceMemory ?? 4,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        pointerFine: window.matchMedia("(pointer: fine)").matches,
        saveData: nav.connection?.saveData ?? false,
        reducedMotion: reducedMotion.matches,
        reducedTransparency: reducedTransparency.matches,
        contrastMore: contrastMore.matches,
        viewportWidth: window.innerWidth,
      };
      const tier = resolveGlassTier(signals);
      const { classList } = document.body;
      classList.toggle("glass-real", tier === "real");
      classList.toggle("glass-solid", tier === "solid");
      // emulated → neither class (it is the painted CSS base from task 03).
    };

    apply();

    // Accessibility prefs can flip mid-session (e.g. OS toggle) — re-resolve on change.
    reducedMotion.addEventListener("change", apply);
    reducedTransparency.addEventListener("change", apply);
    contrastMore.addEventListener("change", apply);

    // Idle-freeze: mark <html> `bg-idle` after ~1.2s of no input, clear it on the next interaction
    // (globals uses `animation:none` semantics under `.bg-idle`, not `paused`).
    const root = document.documentElement;
    let idleTimer: ReturnType<typeof setTimeout>;
    const freeze = () => root.classList.add("bg-idle");
    const wake = () => {
      root.classList.remove("bg-idle");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(freeze, IDLE_MS);
    };
    wake();
    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("keydown", wake);
    window.addEventListener("scroll", wake, { passive: true });

    return () => {
      reducedMotion.removeEventListener("change", apply);
      reducedTransparency.removeEventListener("change", apply);
      contrastMore.removeEventListener("change", apply);
      clearTimeout(idleTimer);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("scroll", wake);
    };
  }, [override]);

  return null;
}
