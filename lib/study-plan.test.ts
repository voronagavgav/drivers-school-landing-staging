import { describe, it, expect } from "vitest";
import { computeStudyPlan, MAX_DAILY_QUOTA } from "@/lib/study-plan";

// Re-frozen from the wave21-01 python reference oracle
//   tasks/wave21-01-python-oracle/PREVERIFY-OUTPUT.txt
// (census (a) + boundary (e), todayKey 2026-07-02). Expected
// dailyQuota/feasible/daysLeft come from that oracle, NEVER re-derived from the
// TS impl. Every call passes the new `reviewLoad` FLOW field.
const TODAY = "2026-07-02";

describe("computeStudyPlan — wave21 honesty model", () => {
  it("nodate → maintenance at defaultGoal, always feasible", () => {
    const r = computeStudyPlan({
      examDate: null,
      todayKey: TODAY,
      dueCount: 10,
      unseenCount: 100,
      defaultGoal: 15,
      reviewLoad: 3,
    });
    expect(r.daysLeft).toBeNull();
    expect(r.dailyQuota).toBe(15);
    expect(r.feasible).toBe(true);
    expect(r.message.length).toBeGreaterThan(0);
  });

  it("pace → ceil(unseen/daysLeft) + reviewLoad, feasible", () => {
    const r = computeStudyPlan({
      examDate: "2026-07-12",
      todayKey: TODAY,
      dueCount: 20,
      unseenCount: 100,
      defaultGoal: 15,
      reviewLoad: 2,
    });
    expect(r.daysLeft).toBe(10);
    expect(r.dailyQuota).toBe(12);
    expect(r.feasible).toBe(true);
  });

  it("priori → base over the ceiling, clamped + infeasible, prioritize copy", () => {
    const r = computeStudyPlan({
      examDate: "2026-07-04",
      todayKey: TODAY,
      dueCount: 10,
      unseenCount: 190,
      defaultGoal: 15,
      reviewLoad: 5,
    });
    expect(r.daysLeft).toBe(2);
    expect(r.dailyQuota).toBe(40);
    expect(r.feasible).toBe(false);
    expect(r.dailyQuota).toBe(MAX_DAILY_QUOTA);
    expect(r.message).not.toContain("встигнете");
  });

  it("maint → unseen 0 with time left, quota == reviewLoad (not defaultGoal)", () => {
    const r = computeStudyPlan({
      examDate: "2026-07-12",
      todayKey: TODAY,
      dueCount: 50,
      unseenCount: 0,
      defaultGoal: 15,
      reviewLoad: 8,
    });
    expect(r.daysLeft).toBe(10);
    expect(r.dailyQuota).toBe(8);
    expect(r.feasible).toBe(true);
    expect(r.message).toContain("повторюйте");
    expect(r.message).not.toContain("встигнете");
  });

  it("explode → maintenance quota is NOT clamped (reviewLoad above the ceiling)", () => {
    const r = computeStudyPlan({
      examDate: "2026-07-05",
      todayKey: TODAY,
      dueCount: 200,
      unseenCount: 0,
      defaultGoal: 15,
      reviewLoad: 45,
    });
    expect(r.daysLeft).toBe(3);
    expect(r.dailyQuota).toBe(45);
    expect(r.dailyQuota).toBeGreaterThan(MAX_DAILY_QUOTA);
    expect(r.feasible).toBe(true);
  });

  it("today_ok → exam today, within goal, feasible", () => {
    const r = computeStudyPlan({
      examDate: TODAY,
      todayKey: TODAY,
      dueCount: 5,
      unseenCount: 5,
      defaultGoal: 15,
      reviewLoad: 0,
    });
    expect(r.daysLeft).toBe(0);
    expect(r.dailyQuota).toBe(10);
    expect(r.feasible).toBe(true);
  });

  it("today_over → exam today, over goal, infeasible", () => {
    const r = computeStudyPlan({
      examDate: TODAY,
      todayKey: TODAY,
      dueCount: 10,
      unseenCount: 20,
      defaultGoal: 15,
      reviewLoad: 0,
    });
    expect(r.daysLeft).toBe(0);
    expect(r.dailyQuota).toBe(30);
    expect(r.feasible).toBe(false);
  });

  it("today_clamp → exam today, displayed quota capped at the ceiling", () => {
    const r = computeStudyPlan({
      examDate: TODAY,
      todayKey: TODAY,
      dueCount: 100,
      unseenCount: 50,
      defaultGoal: 15,
      reviewLoad: 0,
    });
    expect(r.daysLeft).toBe(0);
    expect(r.dailyQuota).toBe(40);
    expect(r.feasible).toBe(false);
  });

  it("fresh → new quota equals the old one-shot ceil(100/10), feasible", () => {
    const r = computeStudyPlan({
      examDate: "2026-07-12",
      todayKey: TODAY,
      dueCount: 0,
      unseenCount: 100,
      defaultGoal: 15,
      reviewLoad: 0,
    });
    expect(r.daysLeft).toBe(10);
    expect(r.dailyQuota).toBe(10);
    expect(r.feasible).toBe(true);
  });

  it("maint0 → unseen 0, reviewLoad 0 → quota 0, feasible", () => {
    const r = computeStudyPlan({
      examDate: "2026-07-07",
      todayKey: TODAY,
      dueCount: 0,
      unseenCount: 0,
      defaultGoal: 15,
      reviewLoad: 0,
    });
    expect(r.daysLeft).toBe(5);
    expect(r.dailyQuota).toBe(0);
    expect(r.feasible).toBe(true);
  });

  it("(e) daysLeft 0, all zero → EXAM_TODAY_OK quota 0, feasible", () => {
    const r = computeStudyPlan({
      examDate: TODAY,
      todayKey: TODAY,
      dueCount: 0,
      unseenCount: 0,
      defaultGoal: 15,
      reviewLoad: 0,
    });
    expect(r.daysLeft).toBe(0);
    expect(r.dailyQuota).toBe(0);
    expect(r.feasible).toBe(true);
  });

  it("(e) daysLeft 1, unseen 0 → MAINT quota 0, feasible", () => {
    const r = computeStudyPlan({
      examDate: "2026-07-03",
      todayKey: TODAY,
      dueCount: 0,
      unseenCount: 0,
      defaultGoal: 15,
      reviewLoad: 0,
    });
    expect(r.daysLeft).toBe(1);
    expect(r.dailyQuota).toBe(0);
    expect(r.feasible).toBe(true);
  });

  it("(e) NODATE respects defaultGoal (5 / 30)", () => {
    for (const g of [5, 15, 30]) {
      const r = computeStudyPlan({
        examDate: null,
        todayKey: TODAY,
        dueCount: 0,
        unseenCount: 0,
        defaultGoal: g,
        reviewLoad: 0,
      });
      expect(r.dailyQuota).toBe(g);
      expect(r.feasible).toBe(true);
      expect(r.daysLeft).toBeNull();
    }
  });
});
