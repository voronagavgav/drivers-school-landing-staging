import { describe, it, expect } from "vitest";
import {
  shuffle,
  orderMistakesByPriority,
  spacedMistakeOrder,
  prioritizeWeakTopics,
  selectQuestions,
} from "./selection";
import type { EngineQuestion, EngineMistake } from "./types";

// deterministic rng: always returns 0 => Fisher–Yates becomes a fixed rotation
const rng0 = () => 0;

function mkQ(id: string, topicId: string | null): EngineQuestion {
  return { id, topicId, difficulty: 1, options: [{ id: id + "a", isCorrect: true }] };
}

function mkM(
  questionId: string,
  mistakeCount: number,
  correctRepeatCount: number,
  lastMistakeAt: number,
): EngineMistake {
  return { questionId, topicId: null, mistakeCount, correctRepeatCount, lastMistakeAt };
}

const DAY = 86_400_000;

describe("selection.shuffle", () => {
  it("is deterministic with an injected rng and preserves the set", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, rng0);
    expect(out).toHaveLength(5);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]); // not mutated
  });
});

describe("selection.orderMistakesByPriority", () => {
  it("orders by mistakeCount desc, then fewer correctRepeats, then recency", () => {
    const m: EngineMistake[] = [
      { questionId: "a", topicId: null, mistakeCount: 1, correctRepeatCount: 0, lastMistakeAt: 10 },
      { questionId: "b", topicId: null, mistakeCount: 3, correctRepeatCount: 0, lastMistakeAt: 5 },
      { questionId: "c", topicId: null, mistakeCount: 3, correctRepeatCount: 1, lastMistakeAt: 99 },
    ];
    expect(orderMistakesByPriority(m).map((x) => x.questionId)).toEqual(["b", "c", "a"]);
  });
});

describe("selection.spacedMistakeOrder", () => {
  const now = 10 * DAY;

  it("orders a higher mistakeCount earlier (others equal)", () => {
    const m = [mkM("a", 1, 0, now), mkM("b", 5, 0, now)];
    expect(spacedMistakeOrder(m, now).map((x) => x.questionId)).toEqual(["b", "a"]);
  });

  it("orders a longer correct streak later (others equal)", () => {
    const m = [mkM("a", 3, 4, now), mkM("b", 3, 0, now)];
    expect(spacedMistakeOrder(m, now).map((x) => x.questionId)).toEqual(["b", "a"]);
  });

  it("orders a more-recent lastMistakeAt earlier (others equal)", () => {
    const m = [mkM("a", 2, 0, now - 10 * DAY), mkM("b", 2, 0, now)];
    expect(spacedMistakeOrder(m, now).map((x) => x.questionId)).toEqual(["b", "a"]);
  });

  it("different weights can change the resulting order", () => {
    // a: more mistakes but stale (10d old); b: fewer mistakes but fresh.
    const m = [mkM("a", 3, 0, 0), mkM("b", 2, 0, now)];
    // Defaults: mistakeCount dominates the small recency decay → a first.
    expect(spacedMistakeOrder(m, now).map((x) => x.questionId)).toEqual(["a", "b"]);
    // Heavy recency weight flips it: the stale mistake sinks below the fresh one.
    const recencyHeavy = { mistakeWeight: 1, correctRepeatPenalty: 2, recencyWeight: 1 };
    expect(spacedMistakeOrder(m, now, recencyHeavy).map((x) => x.questionId)).toEqual(["b", "a"]);
  });

  it("does not mutate the input array", () => {
    const m = [mkM("a", 1, 0, now), mkM("b", 5, 0, now)];
    spacedMistakeOrder(m, now);
    expect(m.map((x) => x.questionId)).toEqual(["a", "b"]);
  });
});

describe("selection.prioritizeWeakTopics", () => {
  it("floats weak-topic questions to the front", () => {
    const pool = [mkQ("q1", "t1"), mkQ("q2", "t2"), mkQ("q3", "t1")];
    const out = prioritizeWeakTopics(pool, ["t2"], rng0);
    expect(out[0].topicId).toBe("t2");
  });
});

describe("selection.selectQuestions", () => {
  const pool = [mkQ("q1", "t1"), mkQ("q2", "t2"), mkQ("q3", "t1"), mkQ("q4", "t3")];

  it("EXAM_SIMULATION returns up to count questions", () => {
    const out = selectQuestions(pool, { mode: "EXAM_SIMULATION", count: 2, rng: rng0 });
    expect(out).toHaveLength(2);
  });

  it("TOPIC_PRACTICE restricts to the topic", () => {
    const out = selectQuestions(pool, { mode: "TOPIC_PRACTICE", count: 10, topicId: "t1", rng: rng0 });
    expect(out.map((q) => q.id).sort()).toEqual(["q1", "q3"]);
  });

  it("MISTAKE_PRACTICE preserves caller order (no shuffle)", () => {
    const out = selectQuestions(pool, { mode: "MISTAKE_PRACTICE", count: 3 });
    expect(out.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
  });

  it("never returns more than the pool", () => {
    const out = selectQuestions(pool, { mode: "EXAM_SIMULATION", count: 99, rng: rng0 });
    expect(out).toHaveLength(4);
  });

  it("count 0 returns nothing", () => {
    expect(selectQuestions(pool, { mode: "EXAM_SIMULATION", count: 0 })).toHaveLength(0);
  });
});
