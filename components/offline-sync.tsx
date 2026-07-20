"use client";

import { useEffect, useRef } from "react";
import { drainReviewQueue } from "@/lib/offline/drain";
import { queuedCount } from "@/lib/offline/wal";

// Offline-answer drain lane (spec §D). Mounted ONCE in the `(app)` layout. On mount and on every
// `window` "online" event it drains the IndexedDB WAL through the shared `drainReviewQueue`
// (oldest-first batches → POST /api/review-sync; acked items removed, the rest kept). When items
// remain after a drain attempt (still offline, or logged out), it registers the one-shot
// Background Sync tag so the browser retries even if this tab is gone by the time connectivity
// returns — feature-detected, and its absence changes nothing (the "online" listener still owns
// the retry in that case). A simple in-flight flag stops concurrent drains from this tab; the
// SW sync lane may still race this one, which is safe (server idempotency + both delete only
// after ack). Renders nothing.

/** Background Sync one-shot tag; app/sw.ts drains the same queue when it fires. */
const SYNC_TAG = "review-sync";

// Background Sync is absent from lib.dom's ServiceWorkerRegistration (non-standard API).
type SyncCapableRegistration = ServiceWorkerRegistration & {
  sync?: { register(tag: string): Promise<void> };
};

function requestBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => {
      if (!("sync" in registration)) return;
      return (registration as SyncCapableRegistration).sync?.register(SYNC_TAG);
    })
    .catch(() => {
      // Progressive enhancement — a failed registration is a no-op.
    });
}

export function OfflineSync() {
  const drainingRef = useRef(false);

  useEffect(() => {
    const drain = async () => {
      if (drainingRef.current) return;
      drainingRef.current = true;
      try {
        await drainReviewQueue();
        if ((await queuedCount()) > 0) requestBackgroundSync();
      } finally {
        drainingRef.current = false;
      }
    };

    void drain();
    const onOnline = () => void drain();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
