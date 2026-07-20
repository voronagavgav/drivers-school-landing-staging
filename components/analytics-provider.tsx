"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initTracker, trackPageView } from "@/lib/client/track";

// First-party analytics bootstrap. Mounted ONCE in the root layout. It:
//   - inits the client tracker on mount (attaches the single delegated click listener + flush
//     triggers, but only if the visitor hasn't opted out / set DNT — see lib/client/track.ts), and
//   - emits a page_view on every App Router navigation (pathname/search change).
//
// Renders nothing. All suppression (DNT / GPC / opt-out cookie) is handled inside the tracker,
// so this component is safe to mount unconditionally.

function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Initial mount fires once; afterwards every path/search change fires a page view.
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    initTracker();
  }, []);

  useEffect(() => {
    const qs = searchParams?.toString();
    const key = qs ? `${pathname}?${qs}` : pathname;
    if (lastKey.current === key) return; // de-dupe Strict-Mode double-effect / no-op renders
    lastKey.current = key;
    trackPageView(key);
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider() {
  // useSearchParams() requires a Suspense boundary in the App Router; the tracker renders nothing
  // so the fallback is null and there is no layout impact.
  return (
    <Suspense fallback={null}>
      <RouteTracker />
    </Suspense>
  );
}
