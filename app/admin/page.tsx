import Link from "next/link";
import { getDashboardStats, getRecentAdminActions } from "@/lib/server/admin";
import { Badge, Card, SectionTitle, Stat } from "@/components/ui";
import { LegalDisclaimer } from "@/components/brand";

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

// Human-readable Ukrainian labels for the `entity.verb` action codes written by
// logAdminAction (see app/admin/actions.ts). Falls back to the raw code if unknown.
const ACTION_LABELS: Record<string, string> = {
  "question.create": "Створено питання",
  "question.update": "Оновлено питання",
  "question.publish": "Опубліковано питання",
  "question.unpublish": "Знято з публікації",
  "question.archive": "Архівовано питання",
  "category.create": "Створено категорію",
  "category.update": "Оновлено категорію",
  "category.activate": "Активовано категорію",
  "category.deactivate": "Деактивовано категорію",
  "topic.create": "Створено тему",
  "topic.update": "Оновлено тему",
  "contentVersion.create": "Створено версію контенту",
  "contentVersion.update": "Оновлено версію контенту",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

const QUICK_LINKS: { href: string; label: string; hint: string }[] = [
  { href: "/admin/questions/new", label: "Додати питання", hint: "Нове питання з варіантами" },
  { href: "/admin/questions", label: "Усі питання", hint: "Перегляд і редагування" },
  { href: "/admin/topics", label: "Теми", hint: "Структура тем" },
  { href: "/admin/categories", label: "Категорії", hint: "Категорії прав" },
  { href: "/admin/content-versions", label: "Версії контенту", hint: "Джерела та публікації" },
  { href: "/admin/analytics", label: "Аналітика", hint: "Перші-сторонні метрики" },
];

export default async function AdminDashboardPage() {
  const [stats, actions] = await Promise.all([getDashboardStats(), getRecentAdminActions()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
          Огляд
        </h1>
        <p className="text-sm text-muted">Стан контенту, швидкі дії та останні зміни.</p>
      </div>

      {/* KPI cards */}
      <section>
        <SectionTitle hint="Опубліковані = активні та видимі користувачам.">Питання</SectionTitle>
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Усього" value={stats.questionsTotal} />
            <Stat label="Опубліковано" value={stats.questionsPublished} />
            <Stat label="Демо" value={stats.questionsDemo} sub="Демо-контент" />
            <Stat label="Офіційні" value={stats.questionsOfficial} sub="sourceType=OFFICIAL" />
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Каталог і користувачі</SectionTitle>
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Теми" value={stats.topics} />
            <Stat label="Категорії" value={stats.categories} />
            <Stat label="Користувачі" value={stats.users} />
            <Stat label="Архів" value={stats.questionsArchived} sub="Архівовані питання" />
          </div>
        </Card>
      </section>

      {/* Quick links */}
      <section>
        <SectionTitle hint="Найчастіші дії в один клік.">Швидкі дії</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-line bg-card p-4 shadow-sm transition-colors hover:border-green-deep hover:bg-field"
            >
              <div className="font-semibold text-ink group-hover:text-green-deep">{link.label}</div>
              <div className="mt-0.5 text-xs text-muted">{link.hint}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <SectionTitle hint="Журнал змін контенту адміністраторами.">Остання активність</SectionTitle>
          <Link href="/admin/analytics" className="shrink-0 text-sm font-semibold text-green-deep hover:underline">
            Аналітика →
          </Link>
        </div>
        <Card>
          {actions.length === 0 ? (
            <p className="text-sm text-muted">Поки що немає записів.</p>
          ) : (
            <ul className="divide-y divide-line">
              {actions.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <div>
                    <span className="font-semibold text-ink">{actionLabel(a.action)}</span>{" "}
                    <Badge tone="neutral">{a.entityType}</Badge>
                    {a.entityId && (
                      <span className="ml-1 text-xs text-muted tabular-nums">
                        {a.entityId.slice(0, 8)}
                      </span>
                    )}
                    <div className="text-xs text-muted">
                      {a.adminUser?.name ?? a.adminUser?.email ?? "—"}
                    </div>
                  </div>
                  <time className="shrink-0 text-xs text-muted">{formatDateTime(a.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <LegalDisclaimer />
    </div>
  );
}
