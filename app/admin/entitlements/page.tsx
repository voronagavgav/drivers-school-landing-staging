import { Card, SectionTitle } from "@/components/ui";
import {
  GrantEntitlementForm,
  RevokeEntitlementForm,
} from "@/app/admin/entitlements/entitlement-form";

// Minimal internal admin page for manual/promo entitlement grants (task wave16-06).
// RBAC is enforced by the admin layout + the server actions themselves; there is
// no client-side gate here.
export default function EntitlementsAdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
        Доступи
      </h1>

      <p className="text-sm text-muted">
        Ручне надання «Доступу до іспиту» (MANUAL/PROMO). Без оплат — це внутрішній
        інструмент для видачі доступу вручну.
      </p>

      <section>
        <SectionTitle>Надати доступ</SectionTitle>
        <Card>
          <GrantEntitlementForm />
        </Card>
      </section>

      <section>
        <SectionTitle>Відкликати доступ</SectionTitle>
        <Card>
          <RevokeEntitlementForm />
        </Card>
      </section>
    </div>
  );
}
