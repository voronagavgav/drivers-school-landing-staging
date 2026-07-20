/**
 * Pure recommended-action decision matrix — Wave-12b §A (dashboard hero CTA).
 *
 * The dashboard's primary CTA must branch on real learner state (UX-FINDINGS:
 * post-fail tone bug, brand-new-user-gets-exam bug). The DECISION lives here as
 * a PURE function so it is deterministic and probe-able: all state is INJECTED
 * by the dashboard (task 06), and copy strings live in the component, not here —
 * this module only names the KIND of action to recommend.
 */

export type RecommendInput = {
  /** Enough answer history to judge readiness — thin data never gets the timed exam. */
  sufficientData: boolean;
  /** Outcome of the most recent completed exam simulation; null = none taken yet. */
  lastExamPassed: boolean | null;
  /** Whether weak-topic detection currently flags any topic. */
  hasWeakTopics: boolean;
};

export type RecommendKind = "mixed-practice" | "weak-topics" | "keep-pace-exam";

/**
 * Resolve the recommended action, per the frozen §A matrix:
 *   1. insufficient data → "mixed-practice" (brand-new/thin data NEVER gets the exam)
 *   2. last exam failed → "weak-topics" (corrective, regardless of weak-topic flags)
 *   3. last exam passed → "keep-pace-exam"
 *   4. no exam yet, weak topics flagged → "weak-topics"
 *   5. no exam yet, none flagged → "mixed-practice"
 */
export function recommendAction(input: RecommendInput): { kind: RecommendKind } {
  if (!input.sufficientData) return { kind: "mixed-practice" };
  if (input.lastExamPassed === false) return { kind: "weak-topics" };
  if (input.lastExamPassed === true) return { kind: "keep-pace-exam" };
  return { kind: input.hasWeakTopics ? "weak-topics" : "mixed-practice" };
}
