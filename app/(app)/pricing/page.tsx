import type { Metadata } from "next";
import { PRICE_UAH } from "@/lib/constants";
import { requireUser } from "@/lib/rbac";
import { Card, SectionTitle } from "@/components/ui";
import { PricingCta } from "./pricing-cta";

// Spec T2: the /pricing page — ONE plan card, interest-capture CTA, NO checkout / payment provider.
// The plan frames the purchase as buying READINESS for a dated exam, not content: the content is
// free. The price literal lives ONLY in lib/constants.ts (PRICE_UAH) — never hardcode it here.
//
// Placement note (task constraint, wave18 T4): the audience is logged-in users — pricing is a
// real-account surface (an anon cannot purchase). The page owns its own requireUser() guard at
// the top: since Wave 17 the (app) shell layout uses resolveShellUser() (flag-ON returns anon/null
// WITHOUT redirecting), so the shell no longer bounces anonymous traffic. The explicit guard here
// redirects any request with no real ds_session to /login REGARDLESS of VALUE_FIRST_FUNNEL state.
// No nav entry this wave (flag OFF ⇒ zero visual change anywhere).

export const metadata: Metadata = {
  title: "Доступ до іспиту",
  description: "Одна ціна за готовність до іспиту. Контент лишається безкоштовним.",
};

const TRUST = ["прогрес не зникає", "без автосписань", "одна ціна"];

export default async function PricingPage() {
  await requireUser();
  return (
    <main id="main-content" className="mx-auto w-full max-w-lg px-4 py-8">
      <SectionTitle hint="Готовність до іспиту — одна ціна, без підписок.">
        Доступ до іспиту
      </SectionTitle>

      <Card className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-muted">Готовність до іспиту</p>
          {/* The ONE bold moment (taste law): boldness lives in the price alone. */}
          <p className="mt-1 font-display text-4xl font-bold text-green-ink">
            {PRICE_UAH} ₴
          </p>
          <p className="mt-1 text-sm text-muted">одноразово, без автопродовження</p>
        </div>

        <p className="text-sm text-ink">
          Ти платиш за впевненість у день іспиту, а не за питання. Уся база питань і практика
          лишаються безкоштовними — доступ відкриває персональний план готовності до дати іспиту.
        </p>

        <ul className="flex flex-col gap-2">
          {TRUST.map((line) => (
            <li key={line} className="flex items-center gap-2 text-sm text-ink">
              <span aria-hidden className="text-green-deep">
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>

        <PricingCta />
      </Card>

      {/* COPY-PENDING-L1: draft completion-offer copy — needs lawyer review before it ships. */}
      <p className="mt-4 text-xs text-muted">
        Пройшов весь план, але не склав — доступ безкоштовно до наступної спроби. Умови уточнюються.
      </p>
    </main>
  );
}
