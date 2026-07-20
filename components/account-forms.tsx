"use client";

import { useActionState, useState, useTransition } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/app/actions/auth";
import { setAnalyticsOptOutAction } from "@/app/actions/user";
import { setOptOut } from "@/lib/client/track";
import { useUkValidation } from "@/lib/client/form-errors";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import { Button, Field } from "@/components/ui";
import type { StudyProfileActionState } from "@/lib/server/study-profile";

/**
 * The study-profile / settings actions live in `server-only` modules, so this client
 * file never imports them directly — the account page passes bound `"use server"`
 * wrappers down as props, already adapted to the `useActionState` signature.
 */
type SettingsFormAction = (
  state: StudyProfileActionState | null,
  formData: FormData,
) => Promise<StudyProfileActionState>;

const SELECT_INPUT =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-green-deep sm:text-sm";

function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
      {message}
    </p>
  );
}

function SuccessNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-green-deep/30 bg-green-deep/10 px-3 py-2 text-sm text-green-deep">
      {message}
    </p>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    {},
  );
  const { errors, onSubmit } = useUkValidation();
  return (
    <form action={action} onSubmit={onSubmit} noValidate className="space-y-4">
      <ErrorNote message={state.error} />
      <SuccessNote message={state.success} />
      <Field
        label="Поточний пароль"
        name="currentPassword"
        type="password"
        required
        autoComplete="current-password"
        error={errors.currentPassword}
      />
      <Field
        label="Новий пароль"
        name="newPassword"
        type="password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        autoComplete="new-password"
        placeholder={`Щонайменше ${PASSWORD_MIN_LENGTH} символів`}
        error={errors.newPassword}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Зберігаємо…" : "Змінити пароль"}
      </Button>
    </form>
  );
}

/**
 * Analytics opt-out toggle. First-party analytics is ON by default, but the user can turn it off
 * here: the server action persists the preference (cookie the /api/track ingest respects) and we
 * mirror it client-side so the running tracker stops immediately. Honours the same `ds_no_analytics`
 * cookie the browser DNT / GPC signals also map to.
 */
export function AnalyticsOptOutToggle({ initialOptedOut }: { initialOptedOut: boolean }) {
  const [optedOut, setOptedOut] = useState(initialOptedOut);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !optedOut;
    setOptedOut(next); // optimistic
    setOptOut(next); // mirror into the client cookie + stop/allow the tracker now
    startTransition(async () => {
      try {
        await setAnalyticsOptOutAction(next);
      } catch {
        // revert on failure so the toggle never lies about the stored preference
        setOptedOut(!next);
        setOptOut(!next);
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-sm">
        <p className="font-medium text-ink">Збір аналітики використання</p>
        <p className="mt-1 text-muted">
          Ми збираємо лише знеособлену статистику взаємодії (перегляди сторінок, натискання) у власній
          базі — без сторонніх трекерів і без збереження введених вами відповідей чи персональних даних.
          Ви можете вимкнути збір у будь-який момент. Сигнали Do&nbsp;Not&nbsp;Track / GPC вашого браузера
          також враховуються автоматично.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!optedOut}
        aria-label="Збір аналітики використання"
        onClick={toggle}
        disabled={pending}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          optedOut ? "bg-line" : "bg-green-deep"
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            optedOut ? "translate-x-0.5" : "translate-x-[1.375rem]"
          }`}
        />
      </button>
    </div>
  );
}

function ActionNotes({ state }: { state: StudyProfileActionState | null }) {
  return (
    <>
      <ErrorNote message={state && "error" in state ? state.error : undefined} />
      <SuccessNote message={state && "ok" in state ? "Збережено." : undefined} />
    </>
  );
}

/** Exam-date form — an empty date clears the deadline (back to maintenance pace). */
export function ExamDateForm({
  action,
  initialDate,
}: {
  action: SettingsFormAction;
  initialDate?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const { errors, onSubmit } = useUkValidation();
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
      <ActionNotes state={state} />
      <Field
        label="Дата іспиту"
        name="examDate"
        type="date"
        defaultValue={initialDate}
        error={errors.examDate}
      />
      <p className="text-sm text-muted">
        Порожнє поле прибирає дату — план повернеться до спокійного темпу без відліку.
      </p>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Зберігаємо…" : "Зберегти дату"}
      </Button>
    </form>
  );
}

export function DailyGoalForm({
  action,
  initialGoal,
}: {
  action: SettingsFormAction;
  initialGoal: number;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const { errors, onSubmit } = useUkValidation();
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
      <ActionNotes state={state} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">Денна ціль (5–100 питань)</span>
        <input
          type="number"
          name="dailyGoal"
          min={5}
          max={100}
          defaultValue={initialGoal}
          aria-invalid={errors.dailyGoal ? true : undefined}
          aria-describedby={errors.dailyGoal ? "dailyGoal-error" : undefined}
          className={SELECT_INPUT}
        />
        {errors.dailyGoal ? (
          <p role="alert" id="dailyGoal-error" className="mt-1 text-sm text-warn">
            {errors.dailyGoal}
          </p>
        ) : null}
      </label>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Зберігаємо…" : "Зберегти ціль"}
      </Button>
    </form>
  );
}

const EXAM_OUTCOME_OPTIONS = [
  { value: "PASSED", label: "Склав" },
  { value: "FAILED", label: "Не склав" },
] as const;

/**
 * Self-reported real-exam outcome (spec T3). Neutral, factual copy — no congratulation or
 * guilt asymmetry between the two options. Result + date are submitted together; the saved
 * choice pre-selects on load. Progressive-enhancement plain `<form>` (like GlassTierForm) —
 * the outcome fields have no live client validation, so the server messages carry it.
 */
export function ExamOutcomeForm({
  action,
  initialOutcome,
  initialDate,
}: {
  action: SettingsFormAction;
  initialOutcome?: string;
  initialDate?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} noValidate className="space-y-4">
      <ActionNotes state={state} />
      <fieldset className="space-y-2">
        <legend className="mb-1 block text-sm font-medium text-ink">Результат</legend>
        {EXAM_OUTCOME_OPTIONS.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="outcome"
              value={o.value}
              defaultChecked={initialOutcome === o.value}
              className="h-4 w-4 accent-green-deep"
            />
            {o.label}
          </label>
        ))}
      </fieldset>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">Дата іспиту</span>
        <input type="date" name="examDate" defaultValue={initialDate} className={SELECT_INPUT} />
      </label>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Зберігаємо…" : "Зберегти результат"}
      </Button>
    </form>
  );
}

const GLASS_TIER_OPTIONS = [
  { value: "auto", label: "Авто — за можливостями пристрою" },
  { value: "real", label: "Справжнє скло — з розмиттям тла" },
  { value: "emulated", label: "Імітація скла — без розмиття" },
  { value: "solid", label: "Суцільні поверхні — без ефектів" },
] as const;

/**
 * Glass-tier select — progressive enhancement only: a plain `<form>` + submit; the
 * stored override is mapped to the body class on the next SERVER render by the
 * `(app)` layout, so there is deliberately no client-side tier switching here.
 */
export function GlassTierForm({
  action,
  initialTier,
}: {
  action: SettingsFormAction;
  initialTier: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} noValidate className="space-y-4">
      <ActionNotes state={state} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">Скляні ефекти</span>
        <select name="glassTier" defaultValue={initialTier} className={SELECT_INPUT}>
          {GLASS_TIER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-muted">Застосовується одразу після збереження.</p>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Зберігаємо…" : "Зберегти вигляд"}
      </Button>
    </form>
  );
}
