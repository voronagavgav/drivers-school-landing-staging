"use client";

import { useActionState } from "react";
import { createTopic, updateTopic, type FormState } from "@/app/admin/actions";
import { Button } from "@/components/ui";

export interface TopicFormData {
  id?: string;
  title: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  parentTopicId: string | null;
}

export interface ParentOption {
  id: string;
  title: string;
}

function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
      {message}
    </p>
  );
}

const labelClass = "mb-1 block text-sm font-medium text-ink";
const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-green-deep";

export function TopicForm({
  mode,
  data,
  parents,
}: {
  mode: "create" | "edit";
  data?: TopicFormData;
  parents: ParentOption[];
}) {
  const action = mode === "create" ? createTopic : updateTopic;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  // A topic can't be its own parent.
  const parentChoices = parents.filter((p) => p.id !== data?.id);

  return (
    <form action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />
      {data?.id && <input type="hidden" name="id" value={data.id} />}
      <label className="block">
        <span className={labelClass}>Назва</span>
        <input name="title" required defaultValue={data?.title ?? ""} className={inputClass} />
      </label>
      <label className="block">
        <span className={labelClass}>Опис</span>
        <textarea
          name="description"
          rows={2}
          defaultValue={data?.description ?? ""}
          className={inputClass}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Порядок</span>
          <input
            name="displayOrder"
            type="number"
            defaultValue={data?.displayOrder ?? 0}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Батьківська тема</span>
          <select
            name="parentTopicId"
            defaultValue={data?.parentTopicId ?? ""}
            className={inputClass}
          >
            <option value="">— немає —</option>
            {parentChoices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={data?.isActive ?? true}
          className="h-4 w-4"
        />
        Активна
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Зберігаємо…" : mode === "create" ? "Створити" : "Зберегти"}
        </Button>
      </div>
    </form>
  );
}
