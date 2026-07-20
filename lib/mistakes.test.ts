import { describe, it, expect } from "vitest";
import { newMistake, applyAnswer, type MistakeState } from "./mistakes";

describe("mistakes.newMistake", () => {
  it("starts ACTIVE with count 1", () => {
    expect(newMistake(1000)).toEqual({
      mistakeCount: 1,
      correctRepeatCount: 0,
      status: "ACTIVE",
      resolvedAt: null,
    });
  });
});

describe("mistakes.applyAnswer", () => {
  const base: MistakeState = {
    mistakeCount: 1,
    correctRepeatCount: 0,
    status: "ACTIVE",
    resolvedAt: null,
  };

  it("wrong answer increments mistakeCount and resets streak", () => {
    const after = applyAnswer({ ...base, correctRepeatCount: 1 }, false, 50);
    expect(after.mistakeCount).toBe(2);
    expect(after.correctRepeatCount).toBe(0);
    expect(after.status).toBe("ACTIVE");
  });

  it("resolves after threshold consecutive corrects (default 2)", () => {
    const one = applyAnswer(base, true, 10);
    expect(one.status).toBe("ACTIVE");
    expect(one.correctRepeatCount).toBe(1);
    const two = applyAnswer(one, true, 20);
    expect(two.status).toBe("RESOLVED");
    expect(two.resolvedAt).toBe(20);
  });

  it("honours a custom threshold", () => {
    let s = base;
    s = applyAnswer(s, true, 1, 3);
    s = applyAnswer(s, true, 2, 3);
    expect(s.status).toBe("ACTIVE");
    s = applyAnswer(s, true, 3, 3);
    expect(s.status).toBe("RESOLVED");
  });

  it("re-opens a resolved mistake when answered wrong", () => {
    const resolved: MistakeState = {
      mistakeCount: 2,
      correctRepeatCount: 2,
      status: "RESOLVED",
      resolvedAt: 100,
    };
    const after = applyAnswer(resolved, false, 200);
    expect(after.status).toBe("ACTIVE");
    expect(after.resolvedAt).toBeNull();
    expect(after.mistakeCount).toBe(3);
  });
});
