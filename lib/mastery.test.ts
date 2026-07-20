import { describe, it, expect } from "vitest";
import { topicMastery } from "./mastery";

describe("mastery.topicMastery bands", () => {
  it("classifies a low-accuracy, sufficiently-answered topic as weak", () => {
    const m = topicMastery({ answered: 10, correct: 3, total: 20 }); // 0.30
    expect(m.band).toBe("weak");
  });

  it("classifies a mid-accuracy topic as learning", () => {
    const m = topicMastery({ answered: 10, correct: 7, total: 20 }); // 0.70
    expect(m.band).toBe("learning");
  });

  it("classifies a high-accuracy, sufficiently-answered topic as strong", () => {
    const m = topicMastery({ answered: 10, correct: 9, total: 20 }); // 0.90
    expect(m.band).toBe("strong");
  });
});

describe("mastery.topicMastery low-sample edge", () => {
  it("never marks a topic strong below WEAK_TOPIC_MIN_ANSWERS, even at 100% accuracy", () => {
    const m = topicMastery({ answered: 3, correct: 3, total: 20 }); // 1.0 but only 3 answered
    expect(m.accuracy).toBe(1);
    expect(m.band).toBe("learning");
  });
});

describe("mastery.topicMastery threshold boundaries", () => {
  it("just below the weak threshold is weak", () => {
    const m = topicMastery({ answered: 10, correct: 5, total: 20 }); // 0.50 < 0.60
    expect(m.band).toBe("weak");
  });

  it("exactly at the weak threshold is not weak (learning)", () => {
    const m = topicMastery({ answered: 10, correct: 6, total: 20 }); // 0.60
    expect(m.band).toBe("learning");
  });

  it("exactly at the strong threshold is strong", () => {
    const m = topicMastery({ answered: 20, correct: 17, total: 20 }); // 0.85
    expect(m.band).toBe("strong");
  });

  it("just below the strong threshold is learning", () => {
    const m = topicMastery({ answered: 20, correct: 16, total: 20 }); // 0.80
    expect(m.band).toBe("learning");
  });
});

describe("mastery.topicMastery coverage", () => {
  it("computes the answered/total ratio", () => {
    expect(topicMastery({ answered: 5, correct: 5, total: 10 }).coverage).toBe(
      0.5,
    );
  });

  it("returns 0 coverage when total is 0", () => {
    expect(topicMastery({ answered: 5, correct: 3, total: 0 }).coverage).toBe(0);
  });

  it("clamps coverage to 1 when answered exceeds total", () => {
    expect(topicMastery({ answered: 10, correct: 5, total: 4 }).coverage).toBe(
      1,
    );
  });
});
