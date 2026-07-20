import type { TestMode } from "@/lib/constants";

// Minimal shapes the PURE engine logic operates on (decoupled from Prisma rows so the
// selection/scoring functions stay unit-testable without a database).

export interface EngineOption {
  id: string;
  isCorrect: boolean;
}

export interface EngineQuestion {
  id: string;
  topicId: string | null;
  difficulty: number;
  options: EngineOption[];
}

export interface EngineMistake {
  questionId: string;
  topicId: string | null;
  mistakeCount: number;
  correctRepeatCount: number;
  /** epoch ms of the last mistake — used to order recent repeats earlier */
  lastMistakeAt: number;
}

export interface SelectionOptions {
  mode: TestMode;
  count: number;
  /** topic to restrict to (TOPIC_PRACTICE) */
  topicId?: string | null;
  /** topics flagged weak — prioritised in MIXED_PRACTICE */
  weakTopicIds?: string[];
  /** deterministic shuffle hook (defaults to Math.random); injected in tests */
  rng?: () => number;
}
