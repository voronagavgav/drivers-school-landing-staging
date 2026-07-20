import {
  getEditorOptions,
  getQuestionPerformance,
  listQuestionsFiltered,
  NO_TOPIC_FILTER,
  QUESTION_SORTS,
  QUESTION_STATUS_FILTERS,
  QUESTION_DEMO_FILTERS,
  QUESTION_IMAGE_FILTERS,
  type QuestionDemoFilter,
  type QuestionImageFilter,
  type QuestionSort,
  type QuestionStatusFilter,
} from "@/lib/server/admin";
import { SOURCE_TYPES } from "@/lib/constants";
import { Card, DemoBadge, LinkButton, SectionTitle } from "@/components/ui";
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

const DEMO_LABELS: Record<QuestionDemoFilter, string> = {
  all: "Демо й офіційні",
  demo: "Лише демо",
  official: "Лише офіційні",
};

const IMAGE_LABELS: Record<QuestionImageFilter, string> = {
  all: "З зображенням і без",
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
  demo?: string;
  image?: string;
  source?: string;
  category?: string;
  topic?: string;
  sort?: string;
  page?: string;
};

function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value ?? "") ? (value as T) : fallback;
}

const selectClass =
  "rounded-lg border border-line bg-white px-2.5 py-2 text-sm outline-none focus:border-green-deep";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const search = (sp.q ?? "").trim();
  const status = pick(sp.status, QUESTION_STATUS_FILTERS, "all");
  const demo = pick(sp.demo, QUESTION_DEMO_FILTERS, "all");
  const image = pick(sp.image, QUESTION_IMAGE_FILTERS, "all");
  const sort = pick(sp.sort, QUESTION_SORTS, "newest");
  const sourceType = (SOURCE_TYPES as readonly string[]).includes(sp.source ?? "")
    ? (sp.source as string)
    : "";
  const categoryId = sp.category ?? "";
  const topicId = sp.topic ?? "";
  const requestedPage = Number(sp.page);
  const page = Number.isFinite(requestedPage) && requestedPage >= 1 ? Math.trunc(requestedPage) : 1;

  const [{ topics, categories }, questions, performance] = await Promise.all([
    getEditorOptions(),
    listQuestionsFiltered({
      search,
      status,
      demo,
      image,
      sourceType,
      categoryId,
      topicId,
      sort,
      page,
    }),
    getQuestionPerformance(),
  ]);

  const { rows, total, page: currentPage, pageSize, totalPages } = questions;
  const firstShown = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastShown = Math.min(currentPage * pageSize, total);

  // Preserve all active filters across pagination links.
  function pageHref(p: number): string {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);
    if (demo !== "all") params.set("demo", demo);
    if (image !== "all") params.set("image", image);
    if (sourceType) params.set("source", sourceType);
    if (categoryId) params.set("category", categoryId);
    if (topicId) params.set("topic", topicId);
    if (sort !== "newest") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/questions?${qs}` : "/admin/questions";
  }

  const pagerClass = (enabled: boolean) =>
    enabled
      ? "rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-field"
      : "rounded-lg border border-line bg-field px-3 py-1.5 text-sm font-semibold text-muted opacity-60";

  const tableRows = rows.map((q) => ({
    id: q.id,
    text: q.text,
    isPublished: q.isPublished,
    isDemo: q.isDemo,
    isArchived: q.archivedAt !== null,
    hasImage: q.imageUrl !== null && q.imageUrl !== "",
    optionCount: q._count.options,
    topic: q.topic ? { id: q.topic.id, title: q.topic.title } : null,
    categories: q.categories.map((c) => ({ id: c.id, code: c.code })),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
          Питання
        </h1>
        <LinkButton href="/admin/questions/new">Створити питання</LinkButton>
      </div>

      {/* Search / filter / sort — a GET form so state lives in the URL (shareable, back-button safe). */}
      <Card>
        <form method="get" className="space-y-3">
          {/* Reset paging whenever filters change. */}
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Пошук за текстом питання…"
              aria-label="Пошук за текстом питання"
              className="min-w-[12rem] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-green-deep"
            />
            <button
              type="submit"
              className="rounded-lg bg-green-soft px-4 py-2 text-sm font-semibold text-green-ink hover:brightness-[.97]"
            >
              Знайти
            </button>
            <a
              href="/admin/questions"
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-field"
            >
              Скинути
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <select name="status" defaultValue={status} aria-label="Статус" className={selectClass}>
              {QUESTION_STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select name="demo" defaultValue={demo} aria-label="Тип контенту" className={selectClass}>
              {QUESTION_DEMO_FILTERS.map((d) => (
                <option key={d} value={d}>
                  {DEMO_LABELS[d]}
                </option>
              ))}
            </select>
            <select name="source" defaultValue={sourceType} aria-label="Джерело" className={selectClass}>
              <option value="">Будь-яке джерело</option>
              {SOURCE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s] ?? s}
                </option>
              ))}
            </select>
            <select name="image" defaultValue={image} aria-label="Зображення" className={selectClass}>
              {QUESTION_IMAGE_FILTERS.map((i) => (
                <option key={i} value={i}>
                  {IMAGE_LABELS[i]}
                </option>
              ))}
            </select>
            <select name="category" defaultValue={categoryId} aria-label="Категорія" className={selectClass}>
              <option value="">Будь-яка категорія</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
            <select name="topic" defaultValue={topicId} aria-label="Тема" className={selectClass}>
              <option value="">Будь-яка тема</option>
              <option value={NO_TOPIC_FILTER}>Без теми</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <select name="sort" defaultValue={sort} aria-label="Сортування" className={selectClass}>
              {QUESTION_SORTS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-field"
            >
              Застосувати
            </button>
          </div>
        </form>
      </Card>

      {total > 0 && (
        <p className="text-sm text-muted">
          Показано {firstShown}–{lastShown} з {total}
        </p>
      )}

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Питань за цим запитом не знайдено.</p>
        </Card>
      ) : (
        <QuestionsTable
          rows={tableRows}
          topics={topics.map((t) => ({ id: t.id, label: t.title }))}
          categories={categories.map((c) => ({ id: c.id, label: `${c.code} — ${c.title}` }))}
        />
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Сторінки питань">
          {currentPage > 1 ? (
            <a href={pageHref(currentPage - 1)} className={pagerClass(true)}>
              ← Попередня
            </a>
          ) : (
            <span className={pagerClass(false)}>← Попередня</span>
          )}
          <span className="text-sm text-muted">
            Сторінка {currentPage} з {totalPages}
          </span>
          {currentPage < totalPages ? (
            <a href={pageHref(currentPage + 1)} className={pagerClass(true)}>
              Наступна →
            </a>
          ) : (
            <span className={pagerClass(false)}>Наступна →</span>
          )}
        </nav>
      )}

      <Card>
        <SectionTitle hint="Найскладніші питання за часткою правильних відповідей">
          Статистика питань
        </SectionTitle>
        {performance.length === 0 ? (
          <p className="text-sm text-muted">
            Поки немає відповідей для аналізу статистики.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {performance.map((p) => (
              <li
                key={p.questionId}
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink line-clamp-2">{p.text}</p>
                  {p.isDemo && (
                    <div className="mt-1">
                      <DemoBadge />
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-lg font-bold tabular-nums text-ink">
                    {Math.round(p.accuracy * 100)}%
                  </div>
                  <div className="text-xs text-muted">{p.timesAnswered} відп.</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
