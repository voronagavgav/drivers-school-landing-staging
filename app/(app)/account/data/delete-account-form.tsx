"use client";

import { useActionState } from "react";
import { deleteAccountAction, type DeleteAccountState } from "@/app/actions/user";
import { Button, Field } from "@/components/ui";

// Type-to-confirm account deletion (wave14-10). Importing the action from the "use server"
// module is safe in a client file — it resolves to an action reference, not server code. The
// REAL confirmation check is server-side; `required` here is UX only. The page owns the visible
// copy (button label + consequence line) so the destructive wording lives in one place.

export function DeleteAccountForm({ buttonLabel }: { buttonLabel: string }) {
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(
    deleteAccountAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn"
        >
          {state.error}
        </p>
      ) : null}
      <Field label="Введіть ВИДАЛИТИ" name="confirm" required autoComplete="off" />
      <Button type="submit" variant="danger" disabled={pending} className="w-full">
        {pending ? "Видаляємо…" : buttonLabel}
      </Button>
    </form>
  );
}
