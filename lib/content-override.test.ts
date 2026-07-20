import { describe, it, expect } from "vitest";
import { applyOverride, OVERRIDABLE_FIELDS } from "@/lib/content-override";

// A representative plan entry carrying every overridable field, plus a couple of
// passthrough fields (label/qnum) that an override may NOT touch.
function makePlan() {
  return {
    label: "11",
    qnum: 7,
    text: "Питання з плану імпорту?",
    options: [
      { n: 1, text: "Варіант А" },
      { n: 2, text: "Варіант Б" },
      { n: 3, text: "Варіант В" },
    ],
    answer: 1,
    topic: "ЗАГАЛЬНІ ПОЛОЖЕННЯ",
    categories: ["A", "B", "C"],
    explanation: { short: "план short", detailed: null as string | null },
    imageKey: "16_2_1_0",
  };
}

describe("applyOverride — no override", () => {
  it("returns the plan content unchanged when the override is null", () => {
    const plan = makePlan();
    expect(applyOverride(plan, null)).toEqual(plan);
  });

  it("treats undefined identically to null", () => {
    const plan = makePlan();
    expect(applyOverride(plan, undefined)).toEqual(plan);
  });

  it("returns a fresh object, not the same reference", () => {
    const plan = makePlan();
    expect(applyOverride(plan, null)).not.toBe(plan);
  });
});

describe("applyOverride — override wins (full per-field replace)", () => {
  it("replaces every overridable field wholesale, keeps passthrough fields", () => {
    const plan = makePlan();
    const override = {
      text: "Перевизначений текст?",
      options: [{ n: 1, text: "Лише один варіант" }],
      answer: 1,
      topic: "НОВИЙ РОЗДІЛ",
      categories: ["B"],
      explanation: { short: "override short", detailed: "override detailed" },
      imageKey: "new_key",
    };
    const result = applyOverride(plan, override);
    for (const field of OVERRIDABLE_FIELDS) {
      expect(result[field]).toEqual(override[field]);
    }
    // passthrough fields untouched
    expect(result.label).toBe(plan.label);
    expect(result.qnum).toBe(plan.qnum);
  });

  it("replaces the options array wholesale (no deep-merge)", () => {
    const plan = makePlan();
    const override = { options: [{ n: 1, text: "Тільки цей" }], answer: 1 };
    const result = applyOverride(plan, override);
    expect(result.options).toEqual([{ n: 1, text: "Тільки цей" }]);
    expect(result.options).toHaveLength(1);
  });
});

describe("applyOverride — partial override merges per field", () => {
  it("changes only `text`, keeps the rest from the plan", () => {
    const plan = makePlan();
    const result = applyOverride(plan, { text: "Лише текст змінено" });
    expect(result.text).toBe("Лише текст змінено");
    expect(result.options).toEqual(plan.options);
    expect(result.answer).toBe(plan.answer);
    expect(result.topic).toBe(plan.topic);
    expect(result.categories).toEqual(plan.categories);
    expect(result.explanation).toEqual(plan.explanation);
    expect(result.imageKey).toBe(plan.imageKey);
  });

  it("changes only `answer`, keeps the rest from the plan", () => {
    const plan = makePlan();
    const result = applyOverride(plan, { answer: 3 });
    expect(result.answer).toBe(3);
    expect(result.text).toBe(plan.text);
    expect(result.options).toEqual(plan.options);
  });
});

describe("applyOverride — key-present-null vs key-absent", () => {
  it("an explicit null value is a deliberate clear (override wins)", () => {
    const plan = makePlan();
    const result = applyOverride(plan, { imageKey: null });
    expect(result.imageKey).toBeNull();
  });

  it("an absent key keeps the plan's value (an empty override is a no-op)", () => {
    const plan = makePlan();
    const result = applyOverride(plan, {});
    expect(result.imageKey).toBe(plan.imageKey);
    expect(result).toEqual(plan);
  });
});

describe("applyOverride — non-mutating", () => {
  it("does not modify the input plan entry", () => {
    const plan = makePlan();
    const snapshot = structuredClone(plan);
    applyOverride(plan, {
      text: "змінено",
      options: [],
      answer: 2,
      imageKey: null,
    });
    expect(plan).toEqual(snapshot);
  });

  it("does not modify the override entry", () => {
    const plan = makePlan();
    const override = { text: "змінено", imageKey: null };
    const snapshot = structuredClone(override);
    applyOverride(plan, override);
    expect(override).toEqual(snapshot);
  });
});
