"use client";

// Silent auto-cache of the caller's own sets (spec §E, Goal §4): visiting
// /mistakes or /saved quietly refreshes the matching offline pack through the
// SAME downloadPack primitive as topic packs — its overwrite-by-key, stale
// image pruning and 50 МБ budget gate all apply, so the pack shows up in the
// Профіль meter like any other. Only genuinely small packs qualify (≤ 5 MiB);
// the work is idle-scheduled so it never blocks paint, and every failure is
// swallowed — auto-cache is a bonus, never a surfaced error.

import { useEffect } from "react";
import { downloadPack, estimatePack } from "@/lib/offline/packs";

/** Auto-cache ceiling — 5 MiB, a tenth of the overall pack budget. */
const AUTO_CACHE_MAX_BYTES = 5242880;

export function OfflineAutoCache({ scope }: { scope: "mistakes" | "saved" }) {
  useEffect(() => {
    // Same feature-detect as downloadPack, checked early so an unsupported
    // origin (plain-http LAN has no Cache Storage) never fetches an estimate.
    if (typeof indexedDB === "undefined" || typeof caches === "undefined") return;

    let cancelled = false;
    async function run() {
      try {
        const estimate = await estimatePack(scope);
        if (cancelled || !estimate || estimate.totalBytes > AUTO_CACHE_MAX_BYTES) return;
        if (scope === "mistakes") await downloadPack("mistakes");
        else await downloadPack("saved");
      } catch {
        // Silent by contract — no dialog, no error state, try again next visit.
      }
    }

    let cancelSchedule: () => void;
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(() => void run());
      cancelSchedule = () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => void run(), 2000);
      cancelSchedule = () => clearTimeout(id);
    }
    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [scope]);

  return null;
}
