// ---------------------------------------------------------------------------
// PURE validity→Ukrainian-message mapper for client-side form validation
// (Wave 12b §E). The auth/account forms are `noValidate`, so the browser's
// ENGLISH native bubbles never show; on submit the client glue reads each
// field's ValidityState and renders these messages as role="alert" elements.
//
// No DOM, no zod — flags in, string out — so it unit-tests in the `node`
// vitest env with no jsdom (mirrors ./track-buffer.ts). The SERVER zod schemas
// in lib/validation.ts stay the source of truth; this layer is convenience
// only. The password minimum comes from the SAME constant the register schema
// enforces (PASSWORD_MIN_LENGTH), so the quoted number can never drift.
// ---------------------------------------------------------------------------

import { PASSWORD_MIN_LENGTH } from "@/lib/constants";

/** Which field the message is for — drives the email/password-specific copy. */
export type FieldKind = "text" | "email" | "password";

/** The subset of ValidityState the mapper reads — a plain object in tests. */
export type ValidityLike = Partial<
  Pick<ValidityState, "valid" | "valueMissing" | "typeMismatch" | "tooShort" | "patternMismatch">
>;

export const MSG_REQUIRED = "Заповніть це поле.";
export const MSG_EMAIL = "Введіть коректну електронну адресу.";
/** Generic fallback: an unmapped constraint must NEVER surface the browser's English default. */
export const MSG_INVALID = "Невірне значення поля.";

/** Ukrainian plural of «символ»: 1 символ / 2–4 символи / 5+ символів (11–14 → символів). */
export function symbolsWord(n: number): string {
  const mod100 = Math.abs(n) % 100;
  if (mod100 >= 11 && mod100 <= 14) return "символів";
  const mod10 = mod100 % 10;
  if (mod10 === 1) return "символ";
  if (mod10 >= 2 && mod10 <= 4) return "символи";
  return "символів";
}

/** Too-short message; a password's minimum defaults to the shared schema constant. */
export function minLengthMessage(kind: FieldKind, minLength?: number): string {
  const min =
    minLength && minLength > 0 ? minLength : kind === "password" ? PASSWORD_MIN_LENGTH : 1;
  const verb = kind === "password" ? "Пароль має містити" : "Введіть";
  return `${verb} щонайменше ${min} ${symbolsWord(min)}.`;
}

/**
 * Ukrainian message for an invalid field, or null when the field is valid.
 * Precedence mirrors how a user fixes a field: missing → wrong shape → too short.
 */
export function validationMessage(
  validity: ValidityLike,
  kind: FieldKind,
  minLength?: number,
): string | null {
  if (validity.valid) return null;
  if (validity.valueMissing) return MSG_REQUIRED;
  if (validity.typeMismatch || validity.patternMismatch) {
    return kind === "email" ? MSG_EMAIL : MSG_INVALID;
  }
  if (validity.tooShort) return minLengthMessage(kind, minLength);
  return MSG_INVALID;
}
