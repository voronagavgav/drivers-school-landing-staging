import { describe, it, expect } from "vitest";
import { topWrongTopics, type ResultTopicItem } from "@/lib/result-topics";

// FROZEN expectations from the Wave-12b spec §C (corrective topic summary).
// Do NOT derive these by calling the implementation — they are the spec.

const mk = (
  topicTitle: string,
  answered: boolean,
  correct: boolean,
): ResultTopicItem => ({ topicId: `id-${topicTitle}`, topicTitle, answered, correct });

describe("topWrongTopics", () => {
  it("counts only answered-and-wrong items, sorted by wrong desc", () => {
    const items = [
      mk("Альфа", true, false),
      mk("Альфа", true, false),
      mk("Браво", true, false),
      mk("Браво", true, false),
      mk("Браво", true, false),
      mk("Гамма", true, false),
      mk("Дельта", false, false), // unanswered — not a «помилка»
      mk("Дельта", false, false),
      mk("Есхіл", true, true), // correct — excluded
    ];
    expect(topWrongTopics(items)).toEqual([
      { topicId: "id-Браво", topicTitle: "Браво", wrong: 3 },
      { topicId: "id-Альфа", topicTitle: "Альфа", wrong: 2 },
      { topicId: "id-Гамма", topicTitle: "Гамма", wrong: 1 },
    ]);
  });

  it("excludes topics whose only items are unanswered or correct", () => {
    expect(
      topWrongTopics([mk("Тиша", false, false), mk("Успіх", true, true)]),
    ).toEqual([]);
  });

  it("breaks wrong-count ties by topicTitle asc", () => {
    const tie = topWrongTopics([mk("Вечір", true, false), mk("Анти", true, false)]);
    expect(tie.map((t) => t.topicTitle)).toEqual(["Анти", "Вечір"]);
  });

  it("tie-break uses the uk locale, not code-point order", () => {
    // In the Ukrainian alphabet Ґ precedes Д, but Ґ's code point is HIGHER —
    // a plain code-point sort would invert this pair.
    const tie = topWrongTopics([mk("Дорога", true, false), mk("Ґудзик", true, false)]);
    expect(tie.map((t) => t.topicTitle)).toEqual(["Ґудзик", "Дорога"]);
  });

  it("returns at most max topics (default 3)", () => {
    const items = [
      mk("Один", true, false),
      mk("Два", true, false),
      mk("Три", true, false),
      mk("Чотири", true, false),
    ];
    expect(topWrongTopics(items)).toHaveLength(3);
    expect(topWrongTopics(items, 2)).toHaveLength(2);
    expect(topWrongTopics(items, 10)).toHaveLength(4);
  });

  it("returns [] for empty input", () => {
    expect(topWrongTopics([])).toEqual([]);
  });
});
