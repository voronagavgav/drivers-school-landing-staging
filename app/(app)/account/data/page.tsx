import { requireUser } from "@/lib/rbac";
import { Card, SectionTitle, Button } from "@/components/ui";
import { DeleteAccountForm } from "./delete-account-form";

// /account/data — the user's data rights (spec §D). Part 1: download a JSON export of your own
// data. Part 2 (wave14-10): irreversible, type-to-confirm account deletion.

export default async function AccountDataPage() {
  await requireUser();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Мої дані</h1>
        <p className="text-sm text-muted">
          Ваші дані належать вам. Завантажте їх копію будь-коли.
        </p>
      </div>

      <Card className="max-w-md">
        <SectionTitle hint="Один файл JSON з вашим прогресом, повтореннями та налаштуваннями.">
          Завантажити мої дані
        </SectionTitle>
        {/* GET the route handler — its attachment header makes the browser save the file. */}
        <form action="/account/data/export" method="get">
          <Button type="submit" variant="secondary">
            Завантажити мої дані
          </Button>
        </form>
        <div className="mt-4 space-y-2 text-sm text-muted">
          <p>
            Знеособлена продуктова телеметрія не входить до експорту — вона прив’язана до
            анонімного ідентифікатора, а не до вашого акаунта.
          </p>
          <p>Дані офлайн-режиму зберігаються лише на вашому пристрої.</p>
        </div>
      </Card>

      <Card className="max-w-md">
        <SectionTitle hint="Повне та незворотне видалення акаунта і всіх даних.">
          Видалити акаунт
        </SectionTitle>
        <p className="mb-4 text-sm text-ink">
          Це незворотно: прогрес, повторення і статистика зникнуть одразу.
        </p>
        <DeleteAccountForm buttonLabel="Видалити акаунт назавжди" />
      </Card>
    </div>
  );
}
