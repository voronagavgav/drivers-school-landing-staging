import type { SessionResult } from "@/lib/constants";
import type { EngineQuestion } from "./types";

// ---------------------------------------------------------------------------
// Pure scoring / answer-validation logic. No DB, no side effects.
// ---------------------------------------------------------------------------

/** Returns the id of the correct option for a question, or null if none is marked. */
export function correctOptionId(question: EngineQuestion): string | null {
  return question.options.find((o) => o.isCorrect)?.id ?? null;
}

/** Validate a selected option against a question. A null/unknown selection is incorrect. */
export function isAnswerCorrect(
  question: EngineQuestion,
  selectedOptionId: string | null | undefined,
): boolean {
  if (!selectedOptionId) return false;
  const opt = question.options.find((o) => o.id === selectedOptionId);
  return Boolean(opt?.isCorrect);
}

export interface SessionSummary {
  total: number;
  correct: number;
  wrong: number;
  /** 0..1 */
  accuracy: number;
}

/** Summarise a set of answered booleans into totals + accuracy. */
export function summarizeAnswers(results: boolean[]): SessionSummary {
  const total = results.length;
  const correct = results.filter(Boolean).length;
  const wrong = total - correct;
  const accuracy = total === 0 ? 0 : correct / total;
  return { total, correct, wrong, accuracy };
}

/**
 * Exam pass/fail. An exam is PASSED when the number of wrong answers does not exceed
 * maxErrors. Unanswered questions count as wrong (caller should pass the full set).
 */
export function evaluateExam(
  correct: number,
  total: number,
  maxErrors: number,
): { result: SessionResult; errors: number } {
  const errors = Math.max(0, total - correct);
  return { result: errors <= maxErrors ? "PASSED" : "FAILED", errors };
}
