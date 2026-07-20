import { describe, it, expect } from "vitest";
import { nextStreakState } from "./streak-policy";

describe("streak-policy.nextStreakState transitions", () => {
  it("first day (lastDay null) starts at 1 and seeds best", () => {
    const r = nextStreakState({ current: 0, best: 0, lastDay: null }, "2026-07-02", 2);
    expect(r).toMatchObject({ current: 1, best: 1, freezeTokens: 2, usedFreeze: false });
    expect(r.lastDay).toBe("2026-07-02");
  });

  it("consecutive day extends the streak, tokens untouched", () => {
    const r = nextStreakState({ current: 5, best: 7, lastDay: "2026-07-01" }, "2026-07-02", 2);
    expect(r).toMatchObject({ current: 6, best: 7, freezeTokens: 2, usedFreeze: false });
  });

  it("consecutive day can set a new best", () => {
    const r = nextStreakState({ current: 7, best: 7, lastDay: "2026-07-01" }, "2026-07-02", 1);
    expect(r).toMatchObject({ current: 8, best: 8, freezeTokens: 1, usedFreeze: false });
  });

  it("same day is idempotent (no change, no freeze)", () => {
    const r = nextStreakState({ current: 5, best: 7, lastDay: "2026-07-01" }, "2026-07-01", 2);
    expect(r).toMatchObject({ current: 5, best: 7, freezeTokens: 2, usedFreeze: false });
  });

  it("one missed day with a token auto-freezes and survives", () => {
    const r = nextStreakState({ current: 5, best: 5, lastDay: "2026-07-01" }, "2026-07-03", 2);
    expect(r).toMatchObject({ current: 6, best: 6, freezeTokens: 1, usedFreeze: true });
  });

  it("one missed day with no token resets, best preserved, tokens kept", () => {
    const r = nextStreakState({ current: 5, best: 9, lastDay: "2026-07-01" }, "2026-07-03", 0);
    expect(r).toMatchObject({ current: 1, best: 9, freezeTokens: 0, usedFreeze: false });
  });

  it("multiple missed days reset regardless of tokens (tokens kept)", () => {
    const r = nextStreakState({ current: 5, best: 5, lastDay: "2026-07-01" }, "2026-07-05", 2);
    expect(r).toMatchObject({ current: 1, best: 5, freezeTokens: 2, usedFreeze: false });
  });
});
