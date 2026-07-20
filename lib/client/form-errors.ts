// ---------------------------------------------------------------------------
// Client DOM glue for the pure validity→Ukrainian mapper (./form-validation).
// The auth/account forms are `noValidate`, so on submit this layer walks the
// form's controls, maps each invalid ValidityState to its Ukrainian message,
// and blocks the submit (which also stops the React form action) while the
// component renders the messages as role="alert" elements. A valid submit
// clears the errors and proceeds to the server action untouched — the zod
// schemas in lib/validation.ts remain the source of truth.
// ---------------------------------------------------------------------------

import { useState, type FormEvent } from "react";
import { validationMessage, type FieldKind } from "./form-validation";

type FormErrors = Record<string, string>;

function fieldKind(el: Element): FieldKind {
  const type = el instanceof HTMLInputElement ? el.type : "text";
  if (type === "email") return "email";
  if (type === "password") return "password";
  return "text";
}

/** Every named, enabled control's ValidityState → `{ name: ukrainian message }`. */
export function collectFormErrors(form: HTMLFormElement): FormErrors {
  const errors: FormErrors = {};
  for (const el of Array.from(form.elements)) {
    if (
      !(el instanceof HTMLInputElement) &&
      !(el instanceof HTMLSelectElement) &&
      !(el instanceof HTMLTextAreaElement)
    ) {
      continue;
    }
    if (!el.name || el.disabled || errors[el.name]) continue;
    const minLength = "minLength" in el && el.minLength > 0 ? el.minLength : undefined;
    const message = validationMessage(el.validity, fieldKind(el), minLength);
    if (message) errors[el.name] = message;
  }
  return errors;
}

/**
 * Submit-time Ukrainian validation for a `noValidate` form. Spread the returned
 * `onSubmit` onto the form and feed `errors[name]` to each field's alert slot;
 * the first invalid control receives focus so the alert is heard in context.
 */
export function useUkValidation() {
  const [errors, setErrors] = useState<FormErrors>({});
  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    const form = event.currentTarget;
    const next = collectFormErrors(form);
    setErrors(next);
    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) {
      event.preventDefault();
      const el = form.elements.namedItem(firstInvalid);
      if (el instanceof HTMLElement) el.focus();
    }
  }
  return { errors, onSubmit };
}
