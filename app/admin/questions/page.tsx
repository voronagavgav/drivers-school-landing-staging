import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChartLineUp,
  FileX,
  ListChecks,
  MagnifyingGlass,
  Plus,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import {
  getEditorOptions,
  getQuestionWorkbenchStats,
  listContentVersions,
  listQuestionsFiltered,
  NO_CATEGORY_FILTER,
  NO_TOPIC_FILTER,
  QUESTION_DEMO_FILTERS,
  QUESTION_IMAGE_FILTERS,
  QUESTION_REVIEW_FILTERS,
  QUESTION_SORTS,
  QUESTION_STATUS_FILTERS,
  type QuestionDemoFilter,
  type QuestionImageFilter,
  type QuestionReviewFilter,
  type QuestionSort,
  type QuestionStatusFilter,
} from "@/lib/server/admin";
import { SOURCE_TYPES } from "@/lib/constants";
import { LinkButton, cx } from "@/components/ui";
import { ProductState } from "@/components/product-state";
import {
  AdminMetric,
  AdminPageHeader,
  AdminSectionHeader,
} from "@/app/admin/admin-ui";
import { QuestionsTable } from "@/app/admin/questions/questions-table";

const SORT_LABELS: Record<QuestionSort, string> = {
  newest: "Найновіші",
  oldest: "Найстаріші",
  difficulty_desc: "Складність ↓",
  difficulty_asc: "Складність ↑",
};

const STATUS_LABELS: Record<QuestionStatusFilter, string> = {
  all: "Усі статуси",
  published: "Опубліковані",
  draft: "Чернетки",
  archived: "Архів",
};

const REVIEW_LABELS: Record<QuestionReviewFilter, string> = {
  all: "Будь-яка перевірка",
  reviewed: "Пояснення перевірено",
  unreviewed: "Пояснення не перевірено",
  needs_fix: "Потрібні правки",
  missing: "Без пояснення",
};

const DEMO_LABELS: Record<QuestionDemoFilter, string> = {
  all: "Демо й основний контент",
  demo: "Лише демо",
  official: "Без демо",
};

const IMAGE_LABELS: Record<QuestionImageFilter, string> = {
  all: "Зображення: будь-яке",
  with: "Із зображенням",
  without: "Без зображення",
};

const SOURCE_LABELS: Record<string, string> = {
  DEMO: "Демо",
  OFFICIAL: "Офіційне",
  CUSTOM: "Власне",
};

type SP = {
  q?: string;
  status?: string;
  review?: string;
  demo?: string;
  image?: string;
  source?: string;
  category?: string;
  topic?: string;
  version?: string;
  sort?: string;
  page?: string;
};

function pick<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(value ?? "")
    ? (value as T)
    : fallback;
}

const controlClass =
  "min-h-11 w-full min-w-0 max-w-full rounded-card border border-border-light bg-surface px-3 text-sm text-text-primary outline-none transition-colors focus:border-pink-500";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const search = (sp.q ?? "").trim();
  const status = pick(sp.status, QUESTION_STATUS_FILTERS, "all");
  const review = pick(sp.review, QUESTION_REVIEW_FILTERS, "all");
  const demo = pick(sp.demo, QUESTION_DEMO_FILTERS, "all");
  const image = pick(sp.image, QUESTION_IMAGE_FILTERS, "all");
  const sort = pick(sp.sort, QUESTION_SORTS, "newest");
  const sourceType = (SOURCE_TYPES as readonly string[]).includes(
    sp.source ?? "",
  )
    ? (sp.source as string)
    : "";
  const categoryId = sp.category ?? "";
  const topicId = sp.topic ?? "";
  const contentVersionId = sp.version ?? "";
  const requestedPage = Number(sp.page);
  const page =
    Number.isFinite(requestedPage) && requestedPage >= 1
      ? Math.trunc(requestedPage)
      : 1;

  const [{ topics, categories }, versions, questions, stats] =
    await Promise.all([
      getEditorOptions(),
      listContentVersions(),
      listQuestionsFiltered({
        search,
        status,
        review,
        demo,
        image,
        sourceType,
        categoryId,
        topicId,
        contentVersionId,
        sort,
        page,
      }),
      getQuestionWorkbenchStats(),
    ]);

  const { rows, total, page: currentPage, pageSize, totalPages } = questions;
  const firstShown = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastShown = Math.min(currentPage * pageSize, total);
  const activeFilterCount = [
    Boolean(search),
    status !== "all",
    review !== "all",
    demo !== "all",
    image !== "all",
    Boolean(sourceType),
    Boolean(categoryId),
    Boolean(topicId),
    Boolean(contentVersionId),
    sort !== "newest",
  ].filter(Boolean).length;

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);
    if (review !== "all") params.set("review", review);
    if (demo !== "all") params.set("demo", demo);
    if (image !== "all") params.set("image", image);
    if (sourceType) params.set("source", sourceType);
    if (categoryId) params.set("category", categoryId);
    if (topicId) params.set("topic", topicId);
    if (contentVersionId) params.set("version", contentVersionId);
    if (sort !== "newest") params.set("sort", sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `/admin/questions?${query}` : "/admin/questions";
  }

  const tableRows = rows.map((question) => ({
    id: question.id,
    questionKey: question.questionKey,
    text: question.text,
    difficulty: question.difficulty,
    sourceType: question.sourceType,
    isPublished: question.isPublished,
    isDemo: question.isDemo,
    isArchived: question.archivedAt !== null,
    hasImage: Boolean(question.imageUrl || question.imageKey),
    optionCount: question._count.options,
    reviewStatus: question.explanation?.reviewedStatus ?? null,
    updatedAt: question.updatedAt.toISOString(),
    topic: question.topic
      ? { id: question.topic.id, title: question.topic.title }
      : null,
    categories: question.categories.map((category) => ({
      id: category.id,
      code: category.code,
    })),
  }));

  return (
    <div className="space-y-9 pb-10">
      <AdminPageHeader
        eyebrow="Контент / робочий простір"
        title="Банк питань"
        description="Знаходьте прогалини, перевіряйте пояснення й керуйте публікацією без втрати контексту між фільтрами та сторінками."
        action={
          <LinkButton href="/admin/questions/new">
            <Plus size={18} weight="bold" />
            Створити питання
          </LinkButton>
        }
      />

      <section
        aria-label="Стан банку питань"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-light bg-border-light md:grid-cols-5"
      >
        <AdminMetric
          label="Усього"
          value={stats.total}
          detail="включно з архівом"
        />
        <AdminMetric
          label="Опубліковано"
          value={stats.published}
          detail="активні для учнів"
        />
        <AdminMetric
          label="Чернетки"
          value={stats.drafts}
          detail="очікують публікації"
          tone="warning"
        />
        <AdminMetric
          label="Потрібні правки"
          value={stats.needsFix}
          detail="за редакційною оцінкою"
          tone="error"
        />
        <AdminMetric
          label="Без пояснення"
          value={stats.missingExplanation}
          detail="серед неархівованих"
          tone="warning"
          className="col-span-2 md:col-span-1"
        />
      </section>

      <section>
        <AdminSectionHeader
          index="01"
          title="Робочі черги"
          description="Публікація і перевірка — різні стани. Оберіть чергу, з якої почати."
          action={
            <Link
              href="/admin/content-health"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-text-primary"
            >
              Аналітика якості <ChartLineUp size={17} weight="bold" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-light bg-border-light md:grid-cols-5">
          {[
            {
              href: "/admin/questions",
              label: "Увесь банк",
              count: stats.total,
              icon: <ListChecks size={20} weight="duotone" />,
            },
            {
              href: "/admin/questions?status=published",
              label: "Опубліковані",
              count: stats.published,
              icon: <ListChecks size={20} weight="duotone" />,
            },
            {
              href: "/admin/questions?status=draft",
              label: "Чернетки",
              count: stats.drafts,
              icon: <ListChecks size={20} weight="duotone" />,
            },
            {
              href: "/admin/questions?review=needs_fix",
              label: "Потрібні правки",
              count: stats.needsFix,
              icon: <WarningCircle size={20} weight="duotone" />,
            },
            {
              href: "/admin/questions?review=missing",
              label: "Без пояснення",
              count: stats.missingExplanation,
              icon: <FileX size={20} weight="duotone" />,
            },
          ].map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "group flex min-h-24 items-center gap-3 bg-surface px-4 py-4 transition-colors hover:bg-surface-raised",
                index === 4 && "col-span-2 md:col-span-1",
              )}
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-card bg-surface-muted text-text-secondary"
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-text-primary">
                  {item.label}
                </span>
                <span className="mt-1 block font-mono text-lg font-bold tabular-nums text-text-secondary">
                  {item.count}
                </span>
              </span>
              <ArrowRight
                size={16}
                weight="bold"
                className="text-text-disabled transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <AdminSectionHeader
          index="02"
          title="Пошук і фільтри"
          description={`${activeFilterCount ? `Активних фільтрів: ${activeFilterCount}.` : "Показано весь банк."} Стан зберігається в адресі сторінки.`}
        />
        <form
          method="get"
          role="search"
          aria-label="Пошук і фільтри банку питань"
          className="rounded-card border border-border-light bg-surface p-4 shadow-[0_8px_30px_rgba(36,35,48,.04)] sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border-light pb-4">
            <div>
              <p className="text-sm font-semibold text-text-primary">Налаштувати вибірку</p>
              <p className="mt-1 text-xs text-text-secondary">
                Поєднуйте фільтри, щоб швидко знайти чергу для редактури.
              </p>
            </div>
            <span
              className={cx(
                "inline-flex min-h-8 items-center rounded-full border px-3 font-mono text-xs font-semibold tabular-nums",
                activeFilterCount
                  ? "border-pink-200 bg-pink-50 text-pink-700"
                  : "border-border-light bg-surface-muted text-text-secondary",
              )}
            >
              {activeFilterCount ? `${activeFilterCount} активних` : "Без фільтрів"}
            </span>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Пошук за текстом питання</span>
              <MagnifyingGlass
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder="Текст або фрагмент питання"
                className={cx(controlClass, "w-full pl-10")}
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-graphite-900 px-5 text-sm font-semibold text-text-on-dark hover:bg-graphite-800"
            >
              <MagnifyingGlass size={17} weight="bold" />
              Знайти
            </button>
            <Link
              href="/admin/questions"
              className="inline-flex min-h-11 items-center justify-center rounded-card px-4 text-sm font-semibold text-text-secondary hover:bg-surface-muted"
            >
              Скинути
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <select
              name="status"
              defaultValue={status}
              aria-label="Статус публікації"
              className={controlClass}
            >
              {QUESTION_STATUS_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
            <select
              name="review"
              defaultValue={review}
              aria-label="Статус перевірки"
              className={cx(controlClass, "xl:col-span-2")}
            >
              {QUESTION_REVIEW_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {REVIEW_LABELS[value]}
                </option>
              ))}
            </select>
            <select
              name="demo"
              defaultValue={demo}
              aria-label="Тип контенту"
              className={controlClass}
            >
              {QUESTION_DEMO_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {DEMO_LABELS[value]}
                </option>
              ))}
            </select>
            <select
              name="source"
              defaultValue={sourceType}
              aria-label="Джерело"
              className={controlClass}
            >
              <option value="">Будь-яке джерело</option>
              {SOURCE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {SOURCE_LABELS[value] ?? value}
                </option>
              ))}
            </select>
            <select
              name="image"
              defaultValue={image}
              aria-label="Наявність зображення"
              className={controlClass}
            >
              {QUESTION_IMAGE_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {IMAGE_LABELS[value]}
                </option>
              ))}
            </select>
            <select
              name="category"
              defaultValue={categoryId}
              aria-label="Категорія"
              className={cx(controlClass, "xl:col-span-2")}
            >
              <option value="">Будь-яка категорія</option>
              <option value={NO_CATEGORY_FILTER}>Без категорії</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.code} — {category.title}
                </option>
              ))}
            </select>
            <select
              name="topic"
              defaultValue={topicId}
              aria-label="Тема"
              className={cx(controlClass, "xl:col-span-2")}
            >
              <option value="">Будь-яка тема</option>
              <option value={NO_TOPIC_FILTER}>Без теми</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
            <select
              name="sort"
              defaultValue={sort}
              aria-label="Сортування"
              className={controlClass}
            >
              {QUESTION_SORTS.map((value) => (
                <option key={value} value={value}>
                  {SORT_LABELS[value]}
                </option>
              ))}
            </select>
            <select
              name="version"
              defaultValue={contentVersionId}
              aria-label="Версія контенту"
              className={cx(controlClass, "xl:col-span-2")}
            >
              <option value="">Будь-яка версія</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name}
                  {version.isActive ? " · активна" : ""}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="min-h-11 rounded-card border border-border-light bg-surface-muted px-4 text-sm font-semibold text-text-primary hover:bg-pink-100"
            >
              Застосувати
            </button>
          </div>
        </form>
      </section>

      <section>
        <AdminSectionHeader
          index="03"
          title="Результати"
          description={
            total
              ? `Показано ${firstShown}–${lastShown} з ${total}. Масові дії застосовуються лише до обраних рядків.`
              : "За поточним запитом результатів немає."
          }
        />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-card border border-border-light bg-surface-muted px-4 py-3 text-xs text-text-secondary">
          <span>
            {total ? (
              <>
                Знайдено <strong className="font-mono text-text-primary">{total}</strong> питань
              </>
            ) : (
              "Спробуйте змінити критерії пошуку"
            )}
          </span>
          <span className="font-mono tabular-nums text-text-disabled">Сторінка {currentPage} з {totalPages || 1}</span>
        </div>
        {rows.length ? (
          <QuestionsTable
            rows={tableRows}
            topics={topics.map((topic) => ({
              id: topic.id,
              label: topic.title,
            }))}
            categories={categories.map((category) => ({
              id: category.id,
              label: `${category.code} — ${category.title}`,
            }))}
          />
        ) : (
          <ProductState
            icon={<MagnifyingGlass size={22} weight="duotone" />}
            eyebrow="Порожній результат"
            title="Питань із такими ознаками не знайдено"
            description="Змініть один із фільтрів або поверніться до повного банку питань. Жодні дані не було змінено."
            compact
            action={
              <LinkButton href="/admin/questions" variant="secondary">
                Показати весь банк
              </LinkButton>
            }
          />
        )}
      </section>

      {totalPages > 1 ? (
        <nav
          className="flex items-center justify-between gap-3 border-t border-border-light pt-5"
          aria-label="Сторінки питань"
        >
          {currentPage > 1 ? (
            <Link
              href={pageHref(currentPage - 1)}
              className="inline-flex min-h-11 items-center gap-2 rounded-card border border-border-light bg-surface px-4 text-sm font-semibold"
            >
              <ArrowLeft size={16} weight="bold" />
              Попередня
            </Link>
          ) : (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-card border border-border-light bg-surface-muted px-4 text-sm font-semibold text-text-disabled">
              <ArrowLeft size={16} />
              Попередня
            </span>
          )}
          <span className="text-center font-mono text-xs tabular-nums text-text-secondary">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link
              href={pageHref(currentPage + 1)}
              className="inline-flex min-h-11 items-center gap-2 rounded-card border border-border-light bg-surface px-4 text-sm font-semibold"
            >
              Наступна
              <ArrowRight size={16} weight="bold" />
            </Link>
          ) : (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-card border border-border-light bg-surface-muted px-4 text-sm font-semibold text-text-disabled">
              Наступна
              <ArrowRight size={16} />
            </span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
