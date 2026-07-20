import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  selectCategorySchema,
  startTestSchema,
  submitAnswerSchema,
  setAnswerConfidenceSchema,
  finishTestSchema,
  toggleSaveSchema,
  removeSavedSchema,
  adminQuestionSchema,
  firstIssueMessage,
} from "@/lib/validation";

describe("validation.registerSchema", () => {
  it("accepts a valid registration", () => {
    expect(
      registerSchema.safeParse({ name: "Ivan", email: "ivan@example.com", password: "password1" })
        .success,
    ).toBe(true);
  });
  it("accepts a 2-char name (boundary)", () => {
    expect(
      registerSchema.safeParse({ name: "Io", email: "io@example.com", password: "12345678" })
        .success,
    ).toBe(true);
  });
  it("rejects a 1-char name (boundary)", () => {
    expect(
      registerSchema.safeParse({ name: "I", email: "io@example.com", password: "12345678" })
        .success,
    ).toBe(false);
  });
  it("rejects a malformed email", () => {
    expect(
      registerSchema.safeParse({ name: "Ivan", email: "not-an-email", password: "password1" })
        .success,
    ).toBe(false);
  });
  it("rejects a 7-char password (boundary)", () => {
    expect(
      registerSchema.safeParse({ name: "Ivan", email: "ivan@example.com", password: "1234567" })
        .success,
    ).toBe(false);
  });
});

describe("validation.loginSchema", () => {
  it("accepts a valid login", () => {
    expect(loginSchema.safeParse({ email: "ivan@example.com", password: "x" }).success).toBe(true);
  });
  it("rejects an empty email", () => {
    expect(loginSchema.safeParse({ email: "", password: "x" }).success).toBe(false);
  });
  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "ivan@example.com", password: "" }).success).toBe(false);
  });
});

describe("validation.selectCategorySchema", () => {
  it("accepts a non-empty categoryId", () => {
    expect(selectCategorySchema.safeParse({ categoryId: "cat1" }).success).toBe(true);
  });
  it("rejects an empty categoryId", () => {
    expect(selectCategorySchema.safeParse({ categoryId: "" }).success).toBe(false);
  });
});

describe("validation.startTestSchema", () => {
  it("accepts a valid mode with a null topicId", () => {
    expect(
      startTestSchema.safeParse({ mode: "EXAM_SIMULATION", topicId: null }).success,
    ).toBe(true);
  });
  it("accepts a valid mode with topicId omitted", () => {
    expect(startTestSchema.safeParse({ mode: "TOPIC_PRACTICE" }).success).toBe(true);
  });
  it("rejects a mode not in TEST_MODES", () => {
    expect(startTestSchema.safeParse({ mode: "NONSENSE" }).success).toBe(false);
  });
  // Wave 11: the adaptive/SRS queue landed, so both ADAPTIVE_REVIEW and
  // SPACED_REVIEW are now startable (accepted by startTestSchema).
  it("accepts ADAPTIVE_REVIEW (startable since Wave 11)", () => {
    expect(startTestSchema.safeParse({ mode: "ADAPTIVE_REVIEW", topicId: null }).success).toBe(true);
  });
  it("accepts SPACED_REVIEW (startable since Wave 11)", () => {
    expect(startTestSchema.safeParse({ mode: "SPACED_REVIEW", topicId: null }).success).toBe(true);
  });
  it("accepts EXAM_SIMULATION (a normal startable mode)", () => {
    expect(startTestSchema.safeParse({ mode: "EXAM_SIMULATION" }).success).toBe(true);
  });
});

describe("validation.submitAnswerSchema", () => {
  it("accepts a valid submission with a selected option", () => {
    expect(
      submitAnswerSchema.safeParse({
        sessionId: "s1",
        questionId: "q1",
        selectedOptionId: "o1",
        timeSpentSeconds: 0,
      }).success,
    ).toBe(true);
  });
  it("allows a null selectedOptionId", () => {
    expect(
      submitAnswerSchema.safeParse({
        sessionId: "s1",
        questionId: "q1",
        selectedOptionId: null,
      }).success,
    ).toBe(true);
  });
  it("rejects an empty sessionId", () => {
    expect(
      submitAnswerSchema.safeParse({ sessionId: "", questionId: "q1", selectedOptionId: null })
        .success,
    ).toBe(false);
  });
  it("rejects a negative timeSpentSeconds", () => {
    expect(
      submitAnswerSchema.safeParse({
        sessionId: "s1",
        questionId: "q1",
        selectedOptionId: null,
        timeSpentSeconds: -1,
      }).success,
    ).toBe(false);
  });

  // SRS/adaptive-review fields (spec §E1) — optional, range-bounded, and must
  // survive safeParse (zod strips undeclared keys).
  it("accepts a valid SRS payload (latencyMs/confidence/clientEventId)", () => {
    const result = submitAnswerSchema.safeParse({
      sessionId: "s1",
      questionId: "q1",
      selectedOptionId: "o1",
      latencyMs: 1500,
      confidence: 3,
      clientEventId: "evt-abc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.latencyMs).toBe(1500);
      expect(result.data.confidence).toBe(3);
      expect(result.data.clientEventId).toBe("evt-abc");
    }
  });
  it("rejects a confidence below 1", () => {
    expect(
      submitAnswerSchema.safeParse({
        sessionId: "s1",
        questionId: "q1",
        selectedOptionId: null,
        confidence: 0,
      }).success,
    ).toBe(false);
  });
  it("rejects a confidence above 4", () => {
    expect(
      submitAnswerSchema.safeParse({
        sessionId: "s1",
        questionId: "q1",
        selectedOptionId: null,
        confidence: 5,
      }).success,
    ).toBe(false);
  });
  it("rejects a negative latencyMs", () => {
    expect(
      submitAnswerSchema.safeParse({
        sessionId: "s1",
        questionId: "q1",
        selectedOptionId: null,
        latencyMs: -1,
      }).success,
    ).toBe(false);
  });
  it("rejects a latencyMs above 600000", () => {
    expect(
      submitAnswerSchema.safeParse({
        sessionId: "s1",
        questionId: "q1",
        selectedOptionId: null,
        latencyMs: 600001,
      }).success,
    ).toBe(false);
  });
});

describe("validation.setAnswerConfidenceSchema", () => {
  it("accepts confidence 1 (boundary)", () => {
    expect(
      setAnswerConfidenceSchema.safeParse({ sessionId: "s1", questionId: "q1", confidence: 1 })
        .success,
    ).toBe(true);
  });
  it("accepts confidence 4 (boundary)", () => {
    expect(
      setAnswerConfidenceSchema.safeParse({ sessionId: "s1", questionId: "q1", confidence: 4 })
        .success,
    ).toBe(true);
  });
  it("rejects confidence 0", () => {
    expect(
      setAnswerConfidenceSchema.safeParse({ sessionId: "s1", questionId: "q1", confidence: 0 })
        .success,
    ).toBe(false);
  });
  it("rejects confidence 5", () => {
    expect(
      setAnswerConfidenceSchema.safeParse({ sessionId: "s1", questionId: "q1", confidence: 5 })
        .success,
    ).toBe(false);
  });
  it("rejects a non-integer confidence", () => {
    expect(
      setAnswerConfidenceSchema.safeParse({ sessionId: "s1", questionId: "q1", confidence: 2.5 })
        .success,
    ).toBe(false);
  });
  it("rejects a missing confidence (required here, unlike submitAnswerSchema)", () => {
    expect(
      setAnswerConfidenceSchema.safeParse({ sessionId: "s1", questionId: "q1" }).success,
    ).toBe(false);
  });
  it("rejects an empty sessionId", () => {
    expect(
      setAnswerConfidenceSchema.safeParse({ sessionId: "", questionId: "q1", confidence: 3 })
        .success,
    ).toBe(false);
  });
  it("rejects an empty questionId", () => {
    expect(
      setAnswerConfidenceSchema.safeParse({ sessionId: "s1", questionId: "", confidence: 3 })
        .success,
    ).toBe(false);
  });
});

describe("validation.finishTestSchema", () => {
  it("accepts a non-empty sessionId", () => {
    expect(finishTestSchema.safeParse({ sessionId: "s1" }).success).toBe(true);
  });
  it("rejects an empty sessionId", () => {
    expect(finishTestSchema.safeParse({ sessionId: "" }).success).toBe(false);
  });
});

describe("validation.toggleSaveSchema", () => {
  it("accepts a non-empty questionId with a boolean save", () => {
    expect(toggleSaveSchema.safeParse({ questionId: "q1", save: true }).success).toBe(true);
  });
  it("rejects a non-boolean save", () => {
    expect(toggleSaveSchema.safeParse({ questionId: "q1", save: "yes" }).success).toBe(false);
  });
  it("rejects an empty questionId", () => {
    expect(toggleSaveSchema.safeParse({ questionId: "", save: true }).success).toBe(false);
  });
});

describe("validation.removeSavedSchema", () => {
  it("accepts a non-empty questionId", () => {
    expect(removeSavedSchema.safeParse({ questionId: "q1" }).success).toBe(true);
  });
  it("rejects an empty questionId", () => {
    expect(removeSavedSchema.safeParse({ questionId: "" }).success).toBe(false);
  });
});

describe("validation.adminQuestionSchema", () => {
  const validQuestion = {
    text: "Що означає червоне світло?",
    options: [
      { text: "Стоп", isCorrect: true, displayOrder: 0 },
      { text: "Їдь", isCorrect: false, displayOrder: 1 },
    ],
    difficulty: 1,
    sourceType: "DEMO",
    isDemo: true,
  };
  it("accepts a valid question", () => {
    expect(adminQuestionSchema.safeParse(validQuestion).success).toBe(true);
  });
  it("rejects text shorter than 3 chars", () => {
    expect(adminQuestionSchema.safeParse({ ...validQuestion, text: "Ні" }).success).toBe(false);
  });
  it("rejects fewer than 2 options", () => {
    expect(
      adminQuestionSchema.safeParse({
        ...validQuestion,
        options: [{ text: "Стоп", isCorrect: true, displayOrder: 0 }],
      }).success,
    ).toBe(false);
  });
  it("rejects options with no correct answer", () => {
    expect(
      adminQuestionSchema.safeParse({
        ...validQuestion,
        options: [
          { text: "Стоп", isCorrect: false, displayOrder: 0 },
          { text: "Їдь", isCorrect: false, displayOrder: 1 },
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects an invalid sourceType", () => {
    expect(
      adminQuestionSchema.safeParse({ ...validQuestion, sourceType: "NONSENSE" }).success,
    ).toBe(false);
  });

  // Demo/official label consistency (AUDIT #3): sourceType==="DEMO" ⇔ isDemo===true.
  it("accepts a consistent OFFICIAL + isDemo=false combo", () => {
    expect(
      adminQuestionSchema.safeParse({ ...validQuestion, sourceType: "OFFICIAL", isDemo: false })
        .success,
    ).toBe(true);
  });
  it("accepts a consistent CUSTOM + isDemo=false combo", () => {
    expect(
      adminQuestionSchema.safeParse({ ...validQuestion, sourceType: "CUSTOM", isDemo: false })
        .success,
    ).toBe(true);
  });
  it("rejects OFFICIAL + isDemo=true (demo mislabelled as official)", () => {
    const result = adminQuestionSchema.safeParse({
      ...validQuestion,
      sourceType: "OFFICIAL",
      isDemo: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssueMessage(result.error)).toContain("Невідповідність позначок");
    }
  });
  it("rejects DEMO + isDemo=false (demo source not flagged demo)", () => {
    expect(
      adminQuestionSchema.safeParse({ ...validQuestion, sourceType: "DEMO", isDemo: false })
        .success,
    ).toBe(false);
  });
  it("rejects CUSTOM + isDemo=true (non-demo source flagged demo)", () => {
    expect(
      adminQuestionSchema.safeParse({ ...validQuestion, sourceType: "CUSTOM", isDemo: true })
        .success,
    ).toBe(false);
  });
});

describe("validation.firstIssueMessage", () => {
  it("returns a non-empty string for a failed parse", () => {
    const result = registerSchema.safeParse({ name: "", email: "bad", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = firstIssueMessage(result.error);
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    }
  });
});
