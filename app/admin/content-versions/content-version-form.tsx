"use client";

import { useActionState } from "react";
import {
  createContentVersion,
  updateContentVersion,
  type FormState,
} from "@/app/admin/actions";
import { Button } from "@/components/ui";

export interface ContentVersionFormData {
  id?: string;
  name: string;
  source: string | null;
  description: string | null;
  isActive: boolean;
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

export function ContentVersionForm({
  mode,
  data,
}: {
  mode: "create" | "edit";
  data?: ContentVersionFormData;
}) {
  const action = mode === "create" ? createContentVersion : updateContentVersion;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />
      {data?.id && <input type="hidden" name="id" value={data.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Назва</span>
          <input name="name" required defaultValue={data?.name ?? ""} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Джерело</span>
          <input name="source" defaultValue={data?.source ?? ""} className={inputClass} />
        </label>
      </div>
      <label className="block">
        <span className={labelClass}>Опис</span>
        <textarea
          name="description"
          rows={2}
          defaultValue={data?.description ?? ""}
          className={inputClass}
        />
      </label>
      <label className="inline-flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={data?.isActive ?? false}
          className="h-4 w-4"
        />
        Опублікована (активна)
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Зберігаємо…" : mode === "create" ? "Створити" : "Зберегти"}
        </Button>
      </div>
    </form>
  );
}
