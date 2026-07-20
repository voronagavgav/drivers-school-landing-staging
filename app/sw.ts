/// <reference lib="webworker" />
// Service worker (bundled by @serwist/next on the webpack build path — SPIKES.md §1).
// Caching policy (spec §A): precache the build manifest + /~offline; question images are
// CacheFirst with a bounded expiration; analytics/review-sync and every non-GET request go
// straight to the network; HTML documents are NEVER runtime-cached (a stale dashboard is
// worse than the offline page) — a failed navigation falls back to the precached /~offline.
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";
import { drainReviewQueue } from "@/lib/offline/drain";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// Background Sync is absent from lib.webworker (non-standard API) — minimal local shape.
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Analytics ingest + offline review sync: always the network, never a cache.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin &&
        (url.pathname.startsWith("/api/track") || url.pathname.startsWith("/api/review-sync")),
      handler: new NetworkOnly(),
    },
    // Question-image VARIANTS (?w=…): content-addressed by key+width+format → truly immutable,
    // CacheFirst with a long bounded store.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/api/q-image/") && url.searchParams.has("w"),
      handler: new CacheFirst({
        cacheName: "q-images",
        plugins: [
          new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        ],
      }),
    },
    // Question-image ORIGINALS: a key's image CAN change (the image-overrides tier) — the route
    // deliberately serves max-age=3600, and a 30-day CacheFirst here silently defeated that
    // (wave13-review). StaleWhileRevalidate keeps offline reads working while refreshing promptly.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/api/q-image/") && !url.searchParams.has("w"),
      handler: new StaleWhileRevalidate({
        cacheName: "q-images-original",
        plugins: [new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 60 * 60 })],
      }),
    },
    // Documents: network only. The route must exist so that a failed (offline) navigation
    // reaches the fallbacks catch handler below.
    {
      matcher: ({ request }) => request.destination === "document",
      handler: new NetworkOnly(),
    },
    // Non-GET requests (server actions, beacons): network only.
    ...(["POST", "PUT", "DELETE", "PATCH"] as const).map((method) => ({
      matcher: () => true,
      handler: new NetworkOnly(),
      method,
    })),
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Background Sync drain lane (spec §D): when the OfflineSync component registered the one-shot
// "review-sync" tag (items were left queued), the browser fires this on reconnect — even with no
// tab open. Same queue, same shared drain as the component lane; racing the component is safe
// (server clientEventId idempotency + both lanes delete only acked items). `drainReviewQueue`
// never rejects, so waitUntil can't surface a bogus retry-worthy failure for an EMPTY queue.
self.addEventListener("sync", (event) => {
  const sync = event as SyncEvent;
  if (sync.tag !== "review-sync") return;
  sync.waitUntil(drainReviewQueue());
});
