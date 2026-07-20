"use client";

// «Офлайн-пакети» on /account (spec §E, governance half): the honest usage
// meter — OUR stored sizeBytes summed via packsUsageBytes(), never
// navigator.storage.estimate() — plus one quiet row per stored pack with a
// small «Видалити». Deletion is calm and reversible: reviews live on the
// server, so a deleted pack can always be downloaded again from /progress.
// Quiet numbers, no alarm bar — red only exists at the download-refusal
// moment (topic-pack-download.tsx), never here.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { deletePack, listPacks, packsUsageBytes, type StoredPack } from "@/lib/offline/packs";
import { Button, Card, SectionTitle } from "@/components/ui";

const MB = 1024 * 1024;

/** «X,X» — one decimal, Ukrainian decimal comma (matches the /progress dialog). */
function mb(bytes: number): string {
  return (bytes / MB).toFixed(1).replace(".", ",");
}

export function OfflinePacksCard() {
  // IndexedDB truth must be read post-hydration (a lazy initializer would
  // SSR-mismatch — see components/CLAUDE.md); null = not read yet, so the
  // first paint shows neither rows nor the empty state.
  const [packs, setPacks] = useState<StoredPack[] | null>(null);
  const [usage, setUsage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [list, bytes] = await Promise.all([listPacks(), packsUsageBytes()]);
    setPacks(list);
    setUsage(bytes);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function remove(id: string) {
    setBusyId(id);
    await deletePack(id);
    await refresh();
    setBusyId(null);
  }

  return (
    <Card className="max-w-md">
      <SectionTitle hint="Теми для навчання без інтернету. Видалений пакет можна завантажити знову — прогрес зберігається на сервері.">
        Офлайн-пакети
      </SectionTitle>

      <p className="text-sm text-muted">
        Використано{" "}
        <span className="font-semibold tabular-nums text-ink">{mb(usage)} з 50 МБ</span>
      </p>

      {packs != null && packs.length === 0 && (
        <p className="mt-3 text-sm text-muted">
          Поки нічого не завантажено — оберіть тему на сторінці{" "}
          <Link href="/progress" className="font-semibold text-green-deep underline underline-offset-2">
            Прогрес
          </Link>
          .
        </p>
      )}

      {packs != null && packs.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {[...packs]
            .sort((a, b) => a.title.localeCompare(b.title, "uk"))
            .map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{p.title}</p>
                  <p className="text-xs tabular-nums text-muted">{mb(p.sizeBytes)} МБ</p>
                </div>
                <Button
                  variant="ghost"
                  className="shrink-0 px-3 text-xs"
                  onClick={() => void remove(p.id)}
                  disabled={busyId != null}
                  aria-label={`Видалити пакет: ${p.title}`}
                >
                  {busyId === p.id ? "Видаляємо…" : "Видалити"}
                </Button>
              </li>
            ))}
        </ul>
      )}
    </Card>
  );
}
