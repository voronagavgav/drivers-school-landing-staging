"use client";

import { Button } from "@/components/ui";

/**
 * A submit button that requires an explicit window.confirm before the form posts.
 * Used for the soft-archive control on the question editor so official content is never
 * archived by a stray click. Cancelling preventDefaults the submit (no server call).
 */
export function ConfirmSubmit({
  message,
  children,
  variant = "danger",
}: {
  message: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <Button
      type="submit"
      variant={variant}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
