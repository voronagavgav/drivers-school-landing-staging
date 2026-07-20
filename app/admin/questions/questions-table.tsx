"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkQuestionAction } from "@/app/admin/actions";
import { Badge, DemoBadge, cx } from "@/components/ui";

export interface QuestionRow {
  id: string;
  text: string;
  isPublished: boolean;
  isDemo: boolean;
  isArchived: boolean;
  hasImage: boolean;
  optionCount: number;
  topic: { id: string; title: string } | null;
  categories: { id: string; code: string }[];
}

export interface SelectOption {
  id: string;
  label: string;
}

type BulkKind =
  | "publish"
  | "unpublish"
  | "archive"
  | "assignTopic"
  | "clearTopic"
  | "assignCategory";

/**
 * Admin question list with row selection + a bulk-action toolbar. Selection state is
 * client-only; every mutation goes through the `bulkQuestionAction` server action (which
 * re-checks RBAC and upholds the demo/official guard — the UI never bypasses the server).
 * Archive is confirmed in-UI because it soft-archives official content.
 */
export function QuestionsTable({
  rows,
  topics,
  categories,
}: {
  rows: QuestionRow[];
  topics: SelectOption[];
  categories: SelectOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [topicTarget, setTopicTarget] = useState<string>("");
  const [categoryTarget, setCategoryTarget] = useState<string>("");

  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (pageIds.every((id) => prev.has(id))) {
        const next = new Set(prev);
        for (const id of pageIds) next.delete(id);
        return next;
      }
      return new Set([...prev, ...pageIds]);
    });
  }

  function run(action: BulkKind, targetId?: string) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (action === "archive") {
      const ok = window.confirm(
        `Архівувати ${ids.length} питань? Це м'яке архівування — питання можна відновити, контент не видаляється.`,
      );
      if (!ok) return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await bulkQuestionAction({ action, ids, targetId: targetId ?? null });
      if (res.ok) {
        setFeedback({ tone: "ok", text: `Готово: оновлено ${res.affected ?? ids.length} питань.` });
        setSelected(new Set());
        router.refresh();
      } else {
        setFeedback({ tone: "err", text: res.error ?? "Не вдалося виконати дію." });
      }
    });
  }

  const toolbarBtn =
    "rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-field disabled:opacity-50 disabled:pointer-events-none";

  return (
    <div className="space-y-3">
      {/* Bulk toolbar — only meaningful with a selection. */}
      <div
        className={cx(
          "sticky top-0 z-10 rounded-xl border bg-card p-3 shadow-sm transition-opacity",
          someSelected ? "border-green-deep" : "border-line opacity-70",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink">
            Обрано: {selected.size}
          </span>
          {someSelected && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-semibold text-green-deep hover:underline"
            >
              Скинути вибір
            </button>
          )}
          <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
          <button type="button" disabled={!someSelected || pending} className={toolbarBtn} onClick={() => run("publish")}>
            Опублікувати
          </button>
          <button type="button" disabled={!someSelected || pending} className={toolbarBtn} onClick={() => run("unpublish")}>
            Зняти з публікації
          </button>
          <button
            type="button"
            disabled={!someSelected || pending}
            className={cx(toolbarBtn, "text-warn")}
            onClick={() => run("archive")}
          >
            Архівувати
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            aria-label="Тема для призначення"
            value={topicTarget}
            onChange={(e) => setTopicTarget(e.target.value)}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm outline-none focus:border-green-deep"
          >
            <option value="">— тема —</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!someSelected || pending || !topicTarget}
            className={toolbarBtn}
            onClick={() => run("assignTopic", topicTarget)}
          >
            Призначити тему
          </button>
          <button
            type="button"
            disabled={!someSelected || pending}
            className={toolbarBtn}
            onClick={() => run("clearTopic")}
          >
            Очистити тему
          </button>
          <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
          <select
            aria-label="Категорія для призначення"
            value={categoryTarget}
            onChange={(e) => setCategoryTarget(e.target.value)}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm outline-none focus:border-green-deep"
          >
            <option value="">— категорія —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!someSelected || pending || !categoryTarget}
            className={toolbarBtn}
            onClick={() => run("assignCategory", categoryTarget)}
          >
            Додати категорію
          </button>
        </div>

        {feedback && (
          <p
            className={cx(
              "mt-2 rounded-lg px-3 py-2 text-sm",
              feedback.tone === "ok"
                ? "bg-green-deep/10 text-green-deep"
                : "bg-warn/10 text-warn",
            )}
            role="status"
          >
            {feedback.text}
          </p>
        )}
      </div>

      {/* Select-all for this page. */}
      <label className="flex items-center gap-2 px-1 text-sm text-muted">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          aria-label="Обрати всі на сторінці"
          className="h-4 w-4"
        />
        Обрати всі на цій сторінці
      </label>

      <ul className="space-y-2">
        {rows.map((q) => {
          const checked = selected.has(q.id);
          return (
            <li
              key={q.id}
              className={cx(
                "flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors",
                checked ? "border-green-deep" : "border-line",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleOne(q.id)}
                aria-label={`Обрати питання: ${q.text.slice(0, 40)}`}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <a href={`/admin/questions/${q.id}`} className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink line-clamp-2">{q.text}</p>
                  <span className="shrink-0 text-xs text-muted">{q.optionCount} відп.</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {q.isPublished && !q.isArchived ? (
                    <Badge tone="go">Опубліковано</Badge>
                  ) : (
                    <Badge tone="neutral">Чернетка</Badge>
                  )}
                  {q.isArchived && <Badge tone="danger">Архів</Badge>}
                  {q.isDemo && <DemoBadge />}
                  {q.hasImage && <Badge tone="sign">Зображення</Badge>}
                  {q.topic && <Badge tone="sign">{q.topic.title}</Badge>}
                  {q.categories.map((c) => (
                    <Badge key={c.id} tone="lane">
                      {c.code}
                    </Badge>
                  ))}
                </div>
              </a>
            </li>
          );
        })}
      </ul>

      {pending && <p className="text-sm text-muted">Виконуємо…</p>}
      <div className="sr-only" aria-live="polite">
        {feedback?.text}
      </div>
      <noscript>
        <p className="text-sm text-muted">Масові дії потребують увімкненого JavaScript.</p>
      </noscript>
    </div>
  );
}
