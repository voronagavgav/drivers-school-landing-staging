import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { Card } from "@/components/ui";
import { SvitlykSprite } from "@/components/svitlyk";

// /goodbye — shown once, right after account deletion. OUTSIDE the (app) shell on purpose: the
// session cookie is already destroyed, so this page does zero auth/DB work. Genuinely calm —
// one sentence, one link. No guilt, no "come back" plea.

export const metadata: Metadata = {
  title: "Дані видалено — Drivers School",
};

export default function GoodbyePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      {/* the (app) shell normally owns the sprite; this route is outside it, so mount locally */}
      <SvitlykSprite />
      <div className="mb-6">
        <Wordmark />
      </div>
      <Card className="flex w-full max-w-sm flex-col items-center gap-4 py-8 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Ваші дані видалено</h1>
          <p className="mt-1 text-sm text-muted">
            Акаунт, прогрес і статистику видалено назавжди. Дякуємо, що вчилися з нами.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill bg-green-soft px-5 py-3 text-sm font-semibold text-green-ink hover:brightness-[.97] active:scale-[.985]"
        >
          На головну
        </a>
      </Card>
    </div>
  );
}
