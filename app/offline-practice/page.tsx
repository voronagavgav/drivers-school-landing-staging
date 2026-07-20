import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { SvitlykSprite } from "@/components/svitlyk";
import { OfflineSync } from "@/components/offline-sync";
import { OfflinePracticeRunner } from "./runner";

// /offline-practice — the client-only runner over downloaded packs (wave13-17, spec §E).
// Lives OUTSIDE the (app) shell on purpose: the document renders statically with zero
// session/database work so the service worker can precache it and serve it with the
// network fully dead. Everything dynamic (pack, images, progress) is client-side; the
// page never appears in the app nav. The drain lane is mounted here because the (app)
// layout's instance doesn't cover this route.

export const metadata: Metadata = {
  title: "Офлайн-практика — Drivers School",
};

export default function OfflinePracticePage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-6">
      {/* the (app) shell normally owns the sprite; this route is outside it, so mount locally */}
      <SvitlykSprite />
      {/* answers queue in the WAL — drain on mount/reconnect, same lanes as the main runner */}
      <OfflineSync />
      <header className="mb-4 flex items-center justify-between gap-3">
        <Wordmark />
        {/* plain <a>, not next/link: /~offline is precached, so a full document navigation
            loads it from the service worker even with the network dead */}
        <a
          href="/~offline"
          className="inline-flex min-h-[44px] items-center rounded-chip px-3 text-sm font-medium text-green-deep hover:bg-green-soft/20"
        >
          До завантажених тем
        </a>
      </header>
      <OfflinePracticeRunner />
    </div>
  );
}
