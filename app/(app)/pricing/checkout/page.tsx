import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PRICE_UAH } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { completeCheckout } from "@/app/actions/checkout";
import { Button, Card, SectionTitle } from "@/components/ui";

// Checkout surface for the 399 ₴ one-time «доступ до іспиту» (wave17-09, spec P2.2). Reached from the
// offer card / /pricing. Wallet (Apple/Google Pay) is the PRIMARY affordance; email+card is the
// minimum-field fallback with correct mobile keyboard types (inputMode). Every path submits the same
// server-action `<form>` → completeCheckout, which simulates the charge behind PAYMENT_STUB and grants
// EXAM_ACCESS SERVER-SIDE. Honest copy only — no scarcity / countdown / fake-discount, one green
// accent. A purchase requires a REAL account: an anonymous player registers first (the action enforces
// the same, but we bounce here too so the form never renders for them). The price literal lives ONLY
// in lib/constants.ts (PRICE_UAH).

export const metadata: Metadata = {
  title: "Оплата доступу до іспиту",
  description: "Разовий платіж за готовність до іспиту. Не допомогло — повернемо гроші.",
};

const labelClass = "mb-1 block text-sm font-medium text-ink";
const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-green-deep";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isAnonymous) redirect("/register");

  const { error } = await searchParams;

  return (
    <main id="main-content" className="mx-auto w-full max-w-md px-4 py-8">
      <SectionTitle hint="Разовий платіж — доступ відкривається одразу.">
        Оплата доступу
      </SectionTitle>

      <Card className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-muted">Доступ до іспиту</p>
          <p className="mt-1 font-display text-4xl font-bold text-green-ink">{PRICE_UAH} ₴</p>
          <p className="mt-1 text-sm text-muted">разовий платіж, не підписка</p>
        </div>

        <form action={completeCheckout} className="flex flex-col gap-5">
          {error === "unavailable" && (
            <p
              role="alert"
              className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn"
            >
              Оплата тимчасово недоступна. Спробуйте пізніше.
            </p>
          )}

          {/* PRIMARY affordance: wallet. The wallet SDK is out of scope — this button carries the
              intent and submits the same simulated-charge flow. */}
          <Button type="submit" name="method" value="wallet" className="w-full">
            Apple Pay / Google Pay
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" aria-hidden />
            або карткою
            <span className="h-px flex-1 bg-line" aria-hidden />
          </div>

          {/* Fallback: minimum fields only. Anything optional is deferred to the thank-you step. */}
          <label className="block">
            <span className={labelClass}>Email для чека</span>
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Номер картки</span>
            <input
              name="card"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              className={inputClass}
            />
          </label>

          <div>
            <Button type="submit" name="method" value="card" variant="secondary" className="w-full">
              Відкрити доступ до іспиту
            </Button>
            <p className="mt-2 text-center text-xs text-muted">разовий платіж, не підписка</p>
          </div>
        </form>

        {/* Honest guarantee — no scarcity, no fake discount. */}
        <p className="text-center text-sm text-ink">Не допомогло — повернемо гроші</p>
      </Card>
    </main>
  );
}
