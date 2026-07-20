"use client";

import { useEffect } from "react";

// Service-worker registration. Mounted ONCE in the root layout (next.config.ts passes
// `register: false` to withSerwistInit, so the app owns registration here). Registers /sw.js
// only when:
//   - the browser supports it ("serviceWorker" in navigator — also false on insecure contexts
//     like the plain-http LAN origin, where the property simply isn't exposed), and
//   - the build is production (dev runs Turbopack, where the Serwist plugin is a no-op and
//     no sw.js exists; dev SW caching is unwanted anyway).
//
// Registration failure is caught and swallowed: the app must run identically when the SW
// cannot register. Renders nothing.

export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is progressive enhancement — a failed registration is a no-op.
    });
  }, []);

  return null;
}
