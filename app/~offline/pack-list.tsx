"use client";

// «Завантажені теми» on /~offline (wave13-17): the client half of the offline
// fallback. Stored packs are IndexedDB truth, so they're read post-hydration
// (a lazy initializer would SSR-mismatch — see components/CLAUDE.md); until
// the read lands — and whenever nothing is downloaded — the invitational
// sentence keeps the page a calm landing, never an error.

import { useEffect, useState } from "react";
import { listPacks, type StoredPack } from "@/lib/offline/packs";

export function OfflinePackList() {
  const [packs, setPacks] = useState<StoredPack[] | null>(null);

  useEffect(() => {
    void listPacks().then(setPacks);
  }, []);

  if (packs == null || packs.length === 0) {
    return (
      <p className="text-sm text-muted">
        Завантажені теми можна буде проходити прямо тут — навіть без інтернету.
      </p>
    );
  }

  return (
    <div className="w-full text-left">
      <h2 className="text-sm font-semibold text-ink">Завантажені теми</h2>
      <ul className="mt-1 divide-y divide-line">
        {[...packs]
          .sort((a, b) => a.title.localeCompare(b.title, "uk"))
          .map((p) => (
            <li key={p.id}>
              {/* plain <a>, not next/link: the runner document is precached, so a
                  full document navigation loads it from the service worker even
                  with the network dead — a client-side RSC transition wouldn't */}
              <a
                href={`/offline-practice?pack=${encodeURIComponent(p.id)}`}
                className="flex min-h-[44px] items-center justify-between gap-3 py-2"
              >
                <span className="truncate text-sm font-semibold text-green-deep underline underline-offset-2">
                  {p.title}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {p.questions.length} питань
                </span>
              </a>
            </li>
          ))}
      </ul>
    </div>
  );
}
