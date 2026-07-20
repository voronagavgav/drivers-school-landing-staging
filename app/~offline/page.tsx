import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { Card } from "@/components/ui";
import { Svitlyk, SvitlykSprite } from "@/components/svitlyk";
import { OfflinePackList } from "./pack-list";

// /~offline — the navigation fallback the service worker (wave13-03) precaches and serves
// when a page request fails without network. Lives OUTSIDE the (app) shell on purpose: an
// offline visitor gets no session round-trip, so this page renders statically with zero
// auth/DB work. Tone is an invitation, not an apology (spec §A).

export const metadata: Metadata = {
  title: "Ви офлайн — Drivers School",
};

export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      {/* the (app) shell normally owns the sprite; this route is outside it, so mount locally */}
      <SvitlykSprite />
      <div className="mb-6">
        <Wordmark />
      </div>
      <Card className="flex w-full max-w-sm flex-col items-center gap-4 py-8 text-center">
        <Svitlyk size={112} />
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Ви офлайн</h1>
          <p className="mt-1 text-sm text-muted">
            Мережа зникла, а знання лишаються з вами. Щойно з&apos;явиться зв&apos;язок —
            продовжимо з того самого місця.
          </p>
        </div>
        {/* plain <a>, not next/link: a full document navigation actually retries the network
            when it returns, while a client-side transition on a fallback page can dead-end */}
        <a
          href="/dashboard"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill bg-green-soft px-5 py-3 text-sm font-semibold text-green-ink hover:brightness-[.97] active:scale-[.985]"
        >
          Спробувати знову
        </a>
        {/* client-side pack list (wave13-17); zero packs → the invitational sentence */}
        <OfflinePackList />
      </Card>
    </div>
  );
}
