"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

/**
 * Pending-aware submit button for plain `<form action={…}>` server-action forms.
 * Must be rendered INSIDE the `<form>` — `useFormStatus` only reports the nearest
 * ancestor form's status. Mirrors the `pending` affordance auth/admin forms get
 * from `useActionState`. Pass the idle label as children and the busy label as
 * `pendingLabel`; any explicit `disabled` is OR-ed with the pending state.
 */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: { pendingLabel?: ReactNode } & Omit<ComponentProps<typeof Button>, "type">) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
