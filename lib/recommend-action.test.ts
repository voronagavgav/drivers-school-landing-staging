import { describe, it, expect } from "vitest";
import { recommendAction, type RecommendInput, type RecommendKind } from "@/lib/recommend-action";

// FROZEN decision matrix from Wave-12b spec §A (the plan-time oracle).
// Do NOT edit these expectations to match the implementation — they are the spec.

// sufficientData=false → "mixed-practice" for EVERY combination of the other
// fields: thin data / brand-new users never get the timed exam.
const insufficientCombos: ReadonlyArray<Pick<RecommendInput, "lastExamPassed" | "hasWeakTopics">> = [
  { lastExamPassed: null, hasWeakTopics: false },
  { lastExamPassed: null, hasWeakTopics: true },
  { lastExamPassed: false, hasWeakTopics: true },
  { lastExamPassed: true, hasWeakTopics: false },
];

const sufficientCases: ReadonlyArray<{ name: string; input: RecommendInput; want: RecommendKind }> = [
  {
    name: "last exam failed, weak topics flagged",
    input: { sufficientData: true, lastExamPassed: false, hasWeakTopics: true },
    want: "weak-topics",
  },
  {
    name: "last exam failed, no weak topics (corrective regardless)",
    input: { sufficientData: true, lastExamPassed: false, hasWeakTopics: false },
    want: "weak-topics",
  },
  {
    name: "last exam passed, weak topics flagged",
    input: { sufficientData: true, lastExamPassed: true, hasWeakTopics: true },
    want: "keep-pace-exam",
  },
  {
    name: "last exam passed, no weak topics",
    input: { sufficientData: true, lastExamPassed: true, hasWeakTopics: false },
    want: "keep-pace-exam",
  },
  {
    name: "no exam yet, weak topics flagged",
    input: { sufficientData: true, lastExamPassed: null, hasWeakTopics: true },
    want: "weak-topics",
  },
  {
    name: "no exam yet, none flagged",
    input: { sufficientData: true, lastExamPassed: null, hasWeakTopics: false },
    want: "mixed-practice",
  },
];

describe("recommendAction", () => {
  for (const combo of insufficientCombos) {
    it(`insufficient data (lastExamPassed=${combo.lastExamPassed}, hasWeakTopics=${combo.hasWeakTopics}) → "mixed-practice"`, () => {
      expect(recommendAction({ sufficientData: false, ...combo })).toEqual({ kind: "mixed-practice" });
    });
  }

  for (const { name, input, want } of sufficientCases) {
    it(`sufficient data: ${name} → "${want}"`, () => {
      expect(recommendAction(input)).toEqual({ kind: want });
    });
  }
});
