import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle,
  ClipboardText,
  FolderOpen,
  NotePencil,
  Tag,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import {
  getDashboardStats,
  getRecentAdminActions,
  getRecentDraftQuestions,
} from "@/lib/server/admin";
import { Badge, LinkButton, RoadProgress } from "@/components/ui";
import {
  AdminMetric,
  AdminPageHeader,
  AdminQueueLink,
  AdminSectionHeader,
} from "@/app/admin/admin-ui";

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

const ACTION_LABELS: Record<string, string> = {
  "question.create": "Створено питання",
  "question.update": "Оновлено питання",
  "question.publish": "Опубліковано питання",
  "question.unpublish": "Знято з публікації",
  "question.archive": "Архівовано питання",
  "question.unarchive": "Відновлено питання",
  "category.create": "Створено категорію",
  "category.update": "Оновлено категорію",
  "topic.create": "Створено тему",
  "topic.update": "Оновлено тему",
  "contentVersion.create": "Створено версію контенту",
  "contentVersion.update": "Оновлено версію контенту",
  "lesson.create": "Створено урок",
  "lesson.update": "Оновлено урок",
  "lesson.publish": "Опубліковано урок",
  "lesson.unpublish": "Знято урок з публікації",
  "lesson.archive": "Архівовано урок",
  "lesson.restore": "Відновлено урок",
};

function actionLabel(action: string): string {
  if (action.startsWith("question.bulk.")) return "Масово оновлено питання";
  return ACTION_LABELS[action] ?? action;
}

function reviewLabel(value: string | undefined): {
  label: string;
  tone: "neutral" | "go" | "danger" | "lane";
} {
  if (value === "REVIEWED") return { label: "Перевірено", tone: "go" };
  if (value === "NEEDS_FIX")
    return { label: "Потрібні правки", tone: "danger" };
  return { label: value ? "Не перевірено" : "Без пояснення", tone: "lane" };
}

export default async function AdminDashboardPage() {
  const [stats, actions, drafts] = await Promise.all([
    getDashboardStats(),
    getRecentAdminActions(8),
    getRecentDraftQuestions(5),
  ]);
  const activeQuestions = Math.max(
    0,
    stats.questionsTotal - stats.questionsArchived,
  );
  const reviewedExplanations = Math.max(
    0,
    activeQuestions -
      stats.explanationsUnreviewed -
      stats.explanationsNeedFix -
      stats.explanationsMissing,
  );
  const reviewCoverage =
    activeQuestions > 0
      ? Math.round((reviewedExplanations / activeQuestions) * 100)
      : 0;
  const attentionSignals =
    stats.explanationsNeedFix +
    stats.publishedWithoutExplanation +
    stats.questionsWithoutTopic +
    stats.questionsWithoutCategory +
    stats.lessonsNeedFix;

  return (
    <div className="space-y-10 pb-10">
      <AdminPageHeader
        eyebrow="Контентні операції"
        title="Редакційна станція"
        description="Один робочий огляд того, що готове до публікації, що блокує якість і де редактору варто почати сьогодні."
        action={
          <LinkButton href="/admin/questions/new">Створити питання</LinkButton>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]">
        <div className="relative overflow-hidden rounded-card bg-graphite-900 p-6 text-text-on-dark sm:p-8">
          <ClipboardText
            size={150}
            weight="thin"
            className="absolute -right-4 -top-6 opacity-10"
            aria-hidden="true"
          />
          <div className="relative max-w-2xl">
            <p className="text-sm font-medium text-pink-300">Стан редакції</p>
            <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-2">
              <p className="font-mono text-5xl font-bold tabular-nums">
                {attentionSignals}
              </p>
              <p className="max-w-md pb-1 text-sm leading-6 text-text-on-dark-muted">
                сигналів потребують редакторської уваги перед наступним випуском
                контенту.
              </p>
            </div>
            <div className="mt-7 max-w-xl border-t border-white/10 pt-5">
              <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                <span className="text-text-on-dark-muted">
                  Перевірка пояснень
                </span>
                <span className="font-mono tabular-nums">
                  {reviewCoverage}%
                </span>
              </div>
              <RoadProgress value={reviewCoverage} />
              <p className="mt-3 text-xs leading-5 text-text-on-dark-muted">
                Показник описує редакційне покриття, а не якість відповідей
                користувачів.
              </p>
            </div>
            <Link
              href="/admin/questions?review=needs_fix"
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-text-on-dark"
            >
              Відкрити чергу правок <ArrowRight size={17} weight="bold" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-light bg-border-light xl:grid-cols-1">
          <AdminMetric
            label="Опубліковано"
            value={stats.questionsPublished}
            detail={`з ${stats.questionsTotal} питань у банку`}
          />
          <AdminMetric
            label="Чернетки"
            value={stats.questionsDraft}
            detail="не опубліковані й не архівовані"
            tone="warning"
          />
          <AdminMetric
            label="Уроки"
            value={`${stats.lessonsPublished}/${stats.lessonsPublished + stats.lessonsDraft}`}
            detail="опубліковано у навчальному каталозі"
          />
          <AdminMetric
            label="Події за 7 днів"
            value={stats.analyticsLast7d}
            detail="знеособлені продуктові сигнали"
          />
        </div>
      </section>

      <section className="rounded-card border border-border-light bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs text-text-disabled">00</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">
              Наступний крок
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Три короткі дії, щоб швидко просунути редакцію вперед.
            </p>
          </div>
          <Link
            href="/admin/content-health"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold"
          >
            Відкрити огляд якості <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Link
            href="/admin/questions?review=needs_fix"
            className="group rounded-card border border-error/20 bg-error-surface p-4 transition-colors hover:border-error/40"
          >
            <p className="font-mono text-2xl font-bold tabular-nums text-error">
              {stats.explanationsNeedFix}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-primary">Почати з правок</p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">Пояснення, позначені редактором</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-error">
              Відкрити чергу <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href="/admin/questions?status=draft"
            className="group rounded-card border border-warning/20 bg-warning-surface p-4 transition-colors hover:border-warning/40"
          >
            <p className="font-mono text-2xl font-bold tabular-nums text-warning">{stats.questionsDraft}</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">Повернутися до чернеток</p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">Питання, які очікують публікації</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-warning">
              Переглянути <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href="/admin/questions/new"
            className="group rounded-card border border-border-light bg-surface-muted p-4 transition-colors hover:border-border"
          >
            <p className="font-mono text-2xl font-bold tabular-nums text-text-primary">+</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">Додати питання</p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">Поповнити банк для наступного тесту</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-text-primary">
              Створити <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      <section>
        <AdminSectionHeader
          index="01"
          title="Черга редакції"
          description="Сигнали можуть перетинатися: одне питання іноді потребує кількох виправлень."
          action={
            <Link
              href="/admin/content-health"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
            >
              Вся якість контенту <ArrowRight size={16} weight="bold" />
            </Link>
          }
        />
        <div className="divide-y divide-border-light overflow-hidden rounded-card border border-border-light bg-surface">
          <AdminQueueLink
            href="/admin/questions?review=needs_fix"
            icon={<WarningCircle size={21} weight="duotone" />}
            title="Пояснення потребують правок"
            description="Редактор уже позначив проблему, але її ще не виправлено."
            count={stats.explanationsNeedFix}
            tone="error"
          />
          <AdminQueueLink
            href="/admin/questions?status=published&review=missing"
            icon={<NotePencil size={21} weight="duotone" />}
            title="Опубліковано без пояснення"
            description="Питання доступні учням, але не мають навчального розбору."
            count={stats.publishedWithoutExplanation}
            tone="warning"
          />
          <AdminQueueLink
            href="/admin/questions?topic=__none__"
            icon={<Tag size={21} weight="duotone" />}
            title="Не призначено тему"
            description="Такі питання складніше знайти, аналізувати й включати в точну практику."
            count={stats.questionsWithoutTopic}
            tone="info"
          />
          <AdminQueueLink
            href="/admin/questions?category=__none_category__"
            icon={<FolderOpen size={21} weight="duotone" />}
            title="Не призначено категорію"
            description="Питання не потрапить у категорійні тести, доки не отримає категорію."
            count={stats.questionsWithoutCategory}
            tone="warning"
          />
          <AdminQueueLink
            href="/admin/lessons?review=NEEDS_FIX"
            icon={<BookOpenText size={21} weight="duotone" />}
            title="Уроки потребують правок"
            description="Навчальні матеріали мають редакційний сигнал і не готові до наступного випуску."
            count={stats.lessonsNeedFix}
            tone="error"
          />
        </div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div>
          <AdminSectionHeader
            index="02"
            title="Останні чернетки"
            description="Нещодавно змінені питання, які ще не опубліковані."
            action={
              <Link
                href="/admin/questions?status=draft"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
              >
                Усі чернетки <ArrowRight size={16} weight="bold" />
              </Link>
            }
          />
          {drafts.length ? (
            <div className="divide-y divide-border-light overflow-hidden rounded-card border border-border-light bg-surface">
              {drafts.map((draft) => {
                const review = reviewLabel(draft.explanation?.reviewedStatus);
                return (
                  <Link
                    key={draft.id}
                    href={`/admin/questions/${draft.id}`}
                    className="group flex min-h-20 items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-raised sm:px-5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-card bg-surface-muted">
                      <NotePencil size={20} weight="duotone" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm font-semibold text-text-primary">
                        {draft.text}
                      </span>
                      <span className="mt-1 block text-xs text-text-secondary">
                        {draft.topic?.title ?? "Без теми"} ·{" "}
                        {draft._count.options} вар. · {draft._count.categories}{" "}
                        кат.
                      </span>
                    </span>
                    <Badge tone={review.tone}>{review.label}</Badge>
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className="text-text-disabled transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-card border border-success/25 bg-success-surface p-5 text-sm text-success">
              <CheckCircle size={20} weight="fill" className="mb-2" />
              Немає активних чернеток.
            </div>
          )}
        </div>

        <aside>
          <AdminSectionHeader
            index="03"
            title="Останні зміни"
            description="Хто й коли змінював редакційні сутності."
          />
          <div className="divide-y divide-border-light overflow-hidden rounded-card border border-border-light bg-surface">
            {actions.length ? (
              actions.map((action) => (
                <div
                  key={action.id}
                  className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {actionLabel(action.action)}
                    </p>
                    <p className="mt-1 truncate text-xs text-text-secondary">
                      {action.adminUser?.name ?? action.adminUser?.email ?? "—"}
                    </p>
                  </div>
                  <time className="font-mono text-[11px] tabular-nums text-text-disabled">
                    {formatDateTime(action.createdAt)}
                  </time>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-text-secondary">
                Журнал змін поки порожній.
              </p>
            )}
          </div>
        </aside>
      </section>

      <section>
        <AdminSectionHeader
          index="04"
          title="Робочі простори"
          description="Детальна робота залишається у спеціалізованих розділах."
        />
        <div className="grid gap-px overflow-hidden rounded-card border border-border-light bg-border-light sm:grid-cols-2 lg:grid-cols-5">
          {[
            [
              "/admin/questions",
              "Банк питань",
              "Фільтри, масові дії, редакційні статуси",
            ],
            [
              "/admin/lessons",
              "Уроки",
              "Структура, перевірка й публікація матеріалів",
            ],
            [
              "/admin/content-health",
              "Якість контенту",
              "Прапорці, складність і розподіл відповідей",
            ],
            [
              "/admin/content-versions",
              "Версії",
              "Джерела, випуски й активний набір",
            ],
            [
              "/admin/learning-health",
              "Навчальна якість",
              "Стан пояснень і навчальних сигналів",
            ],
          ].map(([href, title, description]) => (
            <Link
              key={href}
              href={href}
              className="group min-h-32 bg-surface p-5 transition-colors hover:bg-surface-raised"
            >
              <BookOpenText size={22} weight="duotone" />
              <h3 className="mt-4 font-semibold text-text-primary">{title}</h3>
              <p className="mt-1 text-sm leading-5 text-text-secondary">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
