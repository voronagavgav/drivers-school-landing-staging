import { describe, it, expect } from "vitest";
import { weakestTopicFromAnswers } from "./diagnostic";

// PLANNER-FROZEN oracle for wave15-14 (spec §D). Pins the pure fn `weakestTopicFromAnswers`, which
// names the ONE topic to start with from the DIAGNOSTIC's own answers. The vectors below are written
// as LITERALS hand-computed at PLAN time — never derived by calling the implementation. The wave15-05
// oracle file (diagnostic.test.ts) is FROZEN and untouched; this is a SEPARATE new file.
//
// Rules (normative): per-topic accuracy = correct/total; weakest = LOWEST accuracy; ties → MORE wrong
// answers wins; still tied → lexicographically smallest topicId; null when empty OR every topic is 1.0.

describe("weakestTopicFromAnswers", () => {
  it("V1: lowest accuracy wins (0% < 50%)", () => {
    expect(
      weakestTopicFromAnswers([
        { topicId: "t1", isCorrect: true },
        { topicId: "t1", isCorrect: false },
        { topicId: "t2", isCorrect: false },
      ]),
    ).toBe("t2");
  });

  it("V2: tie at 0% ⇒ more wrong answers wins (t2 has 2 wrong > 1)", () => {
    expect(
      weakestTopicFromAnswers([
        { topicId: "t1", isCorrect: false },
        { topicId: "t2", isCorrect: false },
        { topicId: "t2", isCorrect: false },
      ]),
    ).toBe("t2");
  });

  it("V3: full tie ⇒ lexicographically smallest topicId", () => {
    expect(
      weakestTopicFromAnswers([
        { topicId: "t1", isCorrect: false },
        { topicId: "t2", isCorrect: false },
      ]),
    ).toBe("t1");
  });

  it("V4: all perfect ⇒ null (no dishonest weakness)", () => {
    expect(
      weakestTopicFromAnswers([
        { topicId: "t1", isCorrect: true },
        { topicId: "t2", isCorrect: true },
      ]),
    ).toBeNull();
  });

  it("V5: empty ⇒ null", () => {
    expect(weakestTopicFromAnswers([])).toBeNull();
  });
});
