"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, registerAction, type AuthState } from "@/app/actions/auth";
import { useUkValidation } from "@/lib/client/form-errors";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import { Button, Field } from "@/components/ui";

function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
      {message}
    </p>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, {});
  const { errors, onSubmit } = useUkValidation();
  return (
    <form action={action} onSubmit={onSubmit} noValidate className="space-y-4">
      <ErrorNote message={state.error} />
      <Field
        label="Електронна пошта"
        name="email"
        type="email"
        required
        autoComplete="email"
        error={errors.email}
      />
      <Field
        label="Пароль"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        error={errors.password}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Входимо…" : "Увійти"}
      </Button>
      <p className="text-center text-sm text-muted">
        Немає акаунта?{" "}
        <Link href="/register" className="font-semibold text-green-deep">
          Зареєструватися
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, {});
  const { errors, onSubmit } = useUkValidation();
  return (
    <form action={action} onSubmit={onSubmit} noValidate className="space-y-4">
      <ErrorNote message={state.error} />
      <Field
        label="Ім'я"
        name="name"
        required
        minLength={2}
        autoComplete="name"
        error={errors.name}
      />
      <Field
        label="Електронна пошта"
        name="email"
        type="email"
        required
        autoComplete="email"
        error={errors.email}
      />
      <Field
        label="Пароль"
        name="password"
        type="password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        autoComplete="new-password"
        placeholder={`Щонайменше ${PASSWORD_MIN_LENGTH} символів`}
        error={errors.password}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Створюємо акаунт…" : "Зареєструватися"}
      </Button>
      <p className="text-center text-sm text-muted">
        Вже маєте акаунт?{" "}
        <Link href="/login" className="font-semibold text-green-deep">
          Увійти
        </Link>
      </p>
    </form>
  );
}
