import { describe, it, expect } from "vitest";
import {
  validationMessage,
  minLengthMessage,
  symbolsWord,
  type ValidityLike,
} from "@/lib/client/form-validation";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import { registerSchema } from "@/lib/validation";

const invalid = (flags: ValidityLike = {}): ValidityLike => ({ valid: false, ...flags });

describe("validationMessage — valid field", () => {
  it("returns null when the field is valid (nothing to render)", () => {
    expect(validationMessage({ valid: true }, "email")).toBeNull();
    expect(validationMessage({ valid: true }, "password")).toBeNull();
  });
});

describe("validationMessage — required", () => {
  it("maps valueMissing to the Ukrainian required message", () => {
    expect(validationMessage(invalid({ valueMissing: true }), "text")).toBe(
      "Заповніть це поле.",
    );
  });

  it("valueMissing wins over other flags (fix the empty field first)", () => {
    expect(
      validationMessage(invalid({ valueMissing: true, typeMismatch: true }), "email"),
    ).toBe("Заповніть це поле.");
  });
});

describe("validationMessage — email shape", () => {
  it("maps typeMismatch on an email field to the Ukrainian email message", () => {
    expect(validationMessage(invalid({ typeMismatch: true }), "email")).toBe(
      "Введіть коректну електронну адресу.",
    );
  });

  it("maps patternMismatch on an email field to the same email message", () => {
    expect(validationMessage(invalid({ patternMismatch: true }), "email")).toBe(
      "Введіть коректну електронну адресу.",
    );
  });

  it("a shape mismatch on a NON-email field falls back to the generic Ukrainian message", () => {
    expect(validationMessage(invalid({ typeMismatch: true }), "text")).toBe(
      "Невірне значення поля.",
    );
  });
});

describe("validationMessage — minlength", () => {
  it("quotes the shared password minimum when no minLength is passed", () => {
    expect(validationMessage(invalid({ tooShort: true }), "password")).toBe(
      "Пароль має містити щонайменше 8 символів.",
    );
  });

  it("matches the register schema's own too-short message EXACTLY (no drift)", () => {
    const res = registerSchema.safeParse({
      name: "Ім'я",
      email: "user@example.com",
      password: "x".repeat(PASSWORD_MIN_LENGTH - 1),
    });
    expect(res.success).toBe(false);
    const serverMessage = res.success ? "" : res.error.issues[0]?.message;
    expect(validationMessage(invalid({ tooShort: true }), "password")).toBe(serverMessage);
  });

  it("uses the passed minLength for non-password fields (name min 2)", () => {
    expect(validationMessage(invalid({ tooShort: true }), "text", 2)).toBe(
      "Введіть щонайменше 2 символи.",
    );
  });
});

describe("validationMessage — unknown constraint fallback", () => {
  it("never surfaces the browser default: an unmapped invalid state is generic Ukrainian", () => {
    expect(validationMessage(invalid(), "text")).toBe("Невірне значення поля.");
  });
});

describe("minLengthMessage", () => {
  it("defaults the password minimum to PASSWORD_MIN_LENGTH", () => {
    expect(minLengthMessage("password")).toContain(String(PASSWORD_MIN_LENGTH));
  });

  it("honours an explicit minimum over the default", () => {
    expect(minLengthMessage("password", 12)).toBe("Пароль має містити щонайменше 12 символів.");
  });
});

describe("symbolsWord — Ukrainian pluralization of «символ»", () => {
  it("1 / 21 → символ", () => {
    expect(symbolsWord(1)).toBe("символ");
    expect(symbolsWord(21)).toBe("символ");
  });

  it("2–4 / 22 → символи", () => {
    expect(symbolsWord(2)).toBe("символи");
    expect(symbolsWord(3)).toBe("символи");
    expect(symbolsWord(4)).toBe("символи");
    expect(symbolsWord(22)).toBe("символи");
  });

  it("5+ and the 11–14 exception → символів", () => {
    expect(symbolsWord(5)).toBe("символів");
    expect(symbolsWord(8)).toBe("символів");
    expect(symbolsWord(11)).toBe("символів");
    expect(symbolsWord(12)).toBe("символів");
    expect(symbolsWord(14)).toBe("символів");
  });
});
