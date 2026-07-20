import { MISTAKE_RESOLVE_THRESHOLD } from "@/lib/constants";
import type { MistakeStatus } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Pure mistake-bank state machine. No DB. The DB layer (lib/server/mistakes) calls
// these to compute the next row state, then persists it.
// ---------------------------------------------------------------------------

export interface MistakeState {
  mistakeCount: number;
  correctRepeatCount: number;
  status: MistakeStatus;
  /** epoch ms or null */
  resolvedAt: number | null;
}

/** Initial state when a question is answered WRONG for the first time. */
export function newMistake(now: number): MistakeState {
  return { mistakeCount: 1, correctRepeatCount: 0, status: "ACTIVE", resolvedAt: null };
}

/**
 * Transition an existing mistake given the latest answer.
 *
 * Wrong  → mistakeCount++, correctRepeatCount reset to 0, becomes/stays ACTIVE.
 * Correct→ correctRepeatCount++; once it reaches the threshold the mistake is RESOLVED.
 *
 * Answering a RESOLVED mistake wrong re-opens it (back to ACTIVE).
 */
export function applyAnswer(
  prev: MistakeState,
  isCorrect: boolean,
  now: number,
  threshold: number = MISTAKE_RESOLVE_THRESHOLD,
): MistakeState {
  if (!isCorrect) {
    return {
      mistakeCount: prev.mistakeCount + 1,
      correctRepeatCount: 0,
      status: "ACTIVE",
      resolvedAt: null,
    };
  }
  const correctRepeatCount = prev.correctRepeatCount + 1;
  const resolved = correctRepeatCount >= threshold;
  return {
    mistakeCount: prev.mistakeCount,
    correctRepeatCount,
    status: resolved ? "RESOLVED" : "ACTIVE",
    resolvedAt: resolved ? now : null,
  };
}
