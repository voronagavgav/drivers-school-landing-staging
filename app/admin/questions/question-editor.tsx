"use client";

import { useActionState, useMemo, useState } from "react";
import { createQuestion, updateQuestion, type FormState } from "@/app/admin/actions";
import { Button } from "@/components/ui";
import { REVIEW_STATUS, SOURCE_TYPES } from "@/lib/constants";
import { safeImageUrl } from "@/lib/sanitize";

const SOURCE_LABELS: Record<string, string> = {
  DEMO: "Демо",
  OFFICIAL: "Офіційне",
  CUSTOM: "Власне",
};

const REVIEW_LABELS: Record<string, string> = {
  UNREVIEWED: "Не переглянуто",
  REVIEWED: "Переглянуто",
  NEEDS_FIX: "Потребує виправлення",
};

const MAX_OPTIONS = 5;
const MIN_OPTIONS = 2;

export interface EditorOption {
  text: string;
  isCorrect: boolean;
}

export interface QuestionEditorData {
  id?: string;
  text: string;
  topicId: string | null;
  difficulty: number;
  imageUrl: string | null;
  sourceType: string;
  isDemo: boolean;
  contentVersionId: string | null;
  categoryIds: string[];
  options: EditorOption[];
  explanation: {
    shortText: string | null;
    detailedText: string | null;
    legalReference: string | null;
    reviewedStatus: string;
  } | null;
}

export interface SelectOption {
  id: string;
  label: string;
}

function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
      {message}
    </p>
  );
}

function labelClass() {
  return "mb-1 block text-sm font-medium text-ink";
}

function inputClass() {
  return "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-green-deep";
}

export function QuestionEditor({
  mode,
  data,
  topics,
  categories,
  contentVersions,
}: {
  mode: "create" | "edit";
  data: QuestionEditorData;
  topics: SelectOption[];
  categories: SelectOption[];
  contentVersions: SelectOption[];
}) {
  const action = mode === "create" ? createQuestion : updateQuestion;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  // Local option rows so we can add/remove and pick the single correct one.
  const initialOptions: EditorOption[] =
    data.options.length >= MIN_OPTIONS
      ? data.options
      : [
          ...data.options,
          ...Array.from({ length: MIN_OPTIONS - data.options.length }, () => ({
            text: "",
            isCorrect: false,
          })),
        ];
  const [options, setOptions] = useState<EditorOption[]>(initialOptions);
  const [correctIndex, setCorrectIndex] = useState<number>(() => {
    const idx = initialOptions.findIndex((o) => o.isCorrect);
    return idx >= 0 ? idx : 0;
  });

  // Demo/official label consistency: isDemo is DERIVED from sourceType (DEMO ⇔ demo) so the editor
  // can never submit an inconsistent combo. The server still re-validates (lib/validation.ts).
  const [sourceType, setSourceType] = useState<string>(data.sourceType);
  const isDemo = sourceType === "DEMO";

  // Live image URL so we can preview it and surface an inline scheme/host warning before submit.
  const [imageUrl, setImageUrl] = useState<string>(data.imageUrl ?? "");
  const [text, setText] = useState<string>(data.text);
  const trimmedImage = imageUrl.trim();
  const safeImage = useMemo(() => (trimmedImage ? safeImageUrl(trimmedImage) : null), [trimmedImage]);
  const imageRejected = trimmedImage !== "" && safeImage === null;

  // Inline validation mirrors the server schema (lib/validation.ts) so the admin sees problems
  // before submitting; the server still re-validates and is the source of truth.
  const filledOptions = options.filter((o) => o.text.trim().length > 0);
  const validationIssues: string[] = [];
  if (text.trim().length < 3) validationIssues.push("Текст питання має містити щонайменше 3 символи.");
  if (filledOptions.length < MIN_OPTIONS)
    validationIssues.push(`Заповніть щонайменше ${MIN_OPTIONS} варіанти відповіді.`);
  const correctFilled =
    correctIndex >= 0 && correctIndex < options.length && options[correctIndex].text.trim().length > 0;
  if (!correctFilled) validationIssues.push("Позначте одну правильну (та заповнену) відповідь.");
  if (imageRejected)
    validationIssues.push("Посилання на зображення має починатися з http:// або https:// (або бути «/шлях»).");
  const canSubmit = validationIssues.length === 0;

  function updateOptionText(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, text: value } : o)));
  }
  function addOption() {
    setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, { text: "", isCorrect: false }] : prev));
  }
  function removeOption(i: number) {
    setOptions((prev) => {
      if (prev.length <= MIN_OPTIONS) return prev;
      const next = prev.filter((_, idx) => idx !== i);
      return next;
    });
    setCorrectIndex((prev) => (prev === i ? 0 : prev > i ? prev - 1 : prev));
  }

  return (
    <form action={formAction} className="space-y-6">
      <ErrorNote message={state.error} />
      {data.id && <input type="hidden" name="id" value={data.id} />}

      <div>
        <label className={labelClass()} htmlFor="text">
          Текст питання
        </label>
        <textarea
          id="text"
          name="text"
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className={inputClass()}
        />
        {text.trim().length > 0 && text.trim().length < 3 && (
          <p className="mt-1 text-xs text-warn">Щонайменше 3 символи.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass()} htmlFor="topicId">
            Тема
          </label>
          <select id="topicId" name="topicId" defaultValue={data.topicId ?? ""} className={inputClass()}>
            <option value="">— без теми —</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass()} htmlFor="difficulty">
            Складність (1–5)
          </label>
          <input
            id="difficulty"
            name="difficulty"
            type="number"
            min={1}
            max={5}
            defaultValue={data.difficulty}
            className={inputClass()}
          />
        </div>
      </div>

      <div>
        <span className={labelClass()}>Категорії</span>
        {categories.length === 0 ? (
          <p className="text-sm text-muted">Спершу створіть категорії.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <label key={c.id} className="inline-flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={c.id}
                  defaultChecked={data.categoryIds.includes(c.id)}
                  className="h-4 w-4"
                />
                {c.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass()} htmlFor="sourceType">
            Джерело
          </label>
          <select
            id="sourceType"
            name="sourceType"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className={inputClass()}
          >
            {SOURCE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass()} htmlFor="imageUrl">
            Посилання на зображення
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://… або /official-images/…"
            aria-invalid={imageRejected || undefined}
            className={inputClass()}
          />
          {imageRejected && (
            <p className="mt-1 text-xs text-warn">
              Дозволені лише http(s):// або кореневі «/шлях» — інші схеми відхиляються з міркувань безпеки.
            </p>
          )}
        </div>
      </div>

      {safeImage && (
        <div>
          <span className={labelClass()}>Попередній перегляд зображення</span>
          {/* Preview ONLY a safeImageUrl-approved src; eslint-disable: an arbitrary admin-provided
              image host is intentional here and out of scope for next/image optimisation. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={safeImage}
            alt="Попередній перегляд зображення питання"
            className="max-h-56 rounded-lg border border-line bg-field object-contain"
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass()} htmlFor="contentVersionId">
            Версія контенту
          </label>
          <select
            id="contentVersionId"
            name="contentVersionId"
            defaultValue={data.contentVersionId ?? ""}
            className={inputClass()}
          >
            <option value="">— без версії —</option>
            {contentVersions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end pb-2.5">
          {/* isDemo is locked to sourceType (DEMO ⇔ demo) to keep demo/official labels consistent.
              The hidden input carries the derived value; the disabled checkbox just reflects it. */}
          <input type="hidden" name="isDemo" value={isDemo ? "true" : "false"} />
          <span className="inline-flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={isDemo}
              disabled
              aria-label="Демо-контент"
              className="h-4 w-4"
            />
            Демо-контент
          </span>
          <span className="mt-1 text-xs text-muted">
            Визначається джерелом: «Демо» = демо-контент, інше джерело = не демо.
          </span>
        </div>
      </div>

      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink">
          Варіанти відповіді ({MIN_OPTIONS}–{MAX_OPTIONS})
        </legend>
        <p className="mb-3 text-xs text-muted">
          Позначте РІВНО одну правильну відповідь. Заповнено варіантів: {filledOptions.length}.
        </p>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div
              key={i}
              className={
                correctIndex === i
                  ? "flex items-center gap-2 rounded-lg bg-green-deep/5 p-1.5"
                  : "flex items-center gap-2 p-1.5"
              }
            >
              <input
                type="radio"
                name="correctIndex"
                value={i}
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                className="h-4 w-4 shrink-0 accent-green-deep"
                aria-label={`Правильна відповідь ${i + 1}`}
              />
              <input
                type="text"
                name={`option_text_${i}`}
                value={opt.text}
                onChange={(e) => updateOptionText(i, e.target.value)}
                placeholder={`Варіант ${i + 1}`}
                className={inputClass()}
              />
              {options.length > MIN_OPTIONS && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="shrink-0 rounded-lg border border-line bg-white px-2.5 py-2 text-xs font-semibold text-warn hover:bg-field"
                  aria-label={`Видалити варіант ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={addOption}
            className="mt-3 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-green-deep hover:bg-field"
          >
            Додати варіант
          </button>
        )}
      </fieldset>

      <fieldset className="rounded-xl border border-line p-4 space-y-4">
        <legend className="px-1 text-sm font-semibold text-ink">Пояснення</legend>
        <div>
          <label className={labelClass()} htmlFor="explanationShort">
            Коротке пояснення
          </label>
          <input
            id="explanationShort"
            name="explanationShort"
            defaultValue={data.explanation?.shortText ?? ""}
            className={inputClass()}
          />
        </div>
        <div>
          <label className={labelClass()} htmlFor="explanationDetailed">
            Докладне пояснення
          </label>
          <textarea
            id="explanationDetailed"
            name="explanationDetailed"
            rows={3}
            defaultValue={data.explanation?.detailedText ?? ""}
            className={inputClass()}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass()} htmlFor="explanationLegal">
              Посилання на ПДР
            </label>
            <input
              id="explanationLegal"
              name="explanationLegal"
              defaultValue={data.explanation?.legalReference ?? ""}
              className={inputClass()}
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="explanationReviewed">
              Статус перевірки
            </label>
            <select
              id="explanationReviewed"
              name="explanationReviewed"
              defaultValue={data.explanation?.reviewedStatus ?? "UNREVIEWED"}
              className={inputClass()}
            >
              {REVIEW_STATUS.map((s) => (
                <option key={s} value={s}>
                  {REVIEW_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {!canSubmit && (
        <div className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          <p className="font-semibold">Перед збереженням виправте:</p>
          <ul className="mt-1 list-disc pl-5">
            {validationIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? "Зберігаємо…" : mode === "create" ? "Створити питання" : "Зберегти"}
        </Button>
      </div>
    </form>
  );
}
