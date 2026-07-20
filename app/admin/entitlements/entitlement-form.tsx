"use client";

import { useActionState } from "react";
import {
  grantEntitlement,
  revokeEntitlement,
  type FormState,
} from "@/app/admin/actions";
import { Button } from "@/components/ui";
import { ENTITLEMENT_SOURCES, ENTITLEMENT_TIERS } from "@/lib/constants";

// Minimal internal admin surface (task wave16-06). No client-side RBAC logic —
// the server actions are the only guard. Ukrainian copy, no design flourish.

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

export function GrantEntitlementForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(grantEntitlement, {});

  return (
    <form action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />
      <label className="block">
        <span className={labelClass}>Email користувача</span>
        <input
          name="email"
          type="email"
          placeholder="user@example.com"
          className={inputClass}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Рівень доступу</span>
          <select name="tier" defaultValue="EXAM_ACCESS" className={inputClass}>
            {ENTITLEMENT_TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Джерело</span>
          <select name="source" defaultValue="MANUAL" className={inputClass}>
            {ENTITLEMENT_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Дата іспиту, ISO (необовʼязково)</span>
          <input
            name="examDate"
            type="text"
            placeholder="2026-07-04T00:00:00Z"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Доступ до, ISO (необовʼязково)</span>
          <input
            name="validUntil"
            type="text"
            placeholder="2026-08-01T00:00:00Z"
            className={inputClass}
          />
        </label>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Зберігаємо…" : "Надати доступ"}
        </Button>
      </div>
    </form>
  );
}

export function RevokeEntitlementForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(revokeEntitlement, {});

  return (
    <form action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />
      <label className="block">
        <span className={labelClass}>Email користувача</span>
        <input
          name="email"
          type="email"
          placeholder="user@example.com"
          className={inputClass}
        />
      </label>
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Відкликаємо…" : "Відкликати доступ"}
        </Button>
      </div>
    </form>
  );
}
