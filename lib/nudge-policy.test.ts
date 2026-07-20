import { describe, it, expect } from "vitest";
import {
  decideNudge,
  winbackEligible,
  type NudgeInput,
} from "@/lib/nudge-policy";

// Oracle vectors V1–V19 frozen at plan time (2026-07-02), BEFORE the
// implementation existed — do NOT derive expected values from decideNudge;
// this table is the oracle (tasks/wave14-02-nudge-policy-pure/journal.md).
const B: NudgeInput = {
  dayKey: "2026-07-02",
  userId: "u1",
  dueCount: 0,
  examDaysLeft: null,
  streakAlive: false,
  yesterdayGoalMet: false,
  todayReviewCount: 0,
  localHour: 10,
  readinessPrev: null,
  readinessCurr: null,
  sufficientData: false,
  winbackEligible: false,
  sentLast7Days: 0,
  emittedToday: false,
  settings: {
    notifReviewDue: true,
    notifExamCountdown: true,
    notifStudyReminder: true,
  },
};

function v(
  overrides: Partial<Omit<NudgeInput, "settings">> = {},
  settings: Partial<NudgeInput["settings"]> = {},
): NudgeInput {
  return { ...B, ...overrides, settings: { ...B.settings, ...settings } };
}

describe("decideNudge — global suppressors", () => {
  it("V1: nothing qualifies on the base input", () => {
    expect(decideNudge(v())).toBeNull();
  });

  it("V6: rolling weekly cap suppresses everything", () => {
    expect(decideNudge(v({ dueCount: 5, sentLast7Days: 4 }))).toBeNull();
  });

  it("V7: the 4th send is still allowed — the cap is ≤4", () => {
    expect(decideNudge(v({ dueCount: 5, sentLast7Days: 3 }))).toEqual({
      kind: "REVIEW_DUE",
      dedupeKey: "REVIEW_DUE:2026-07-02:u1",
    });
  });

  it("V8: one nudge per day — emittedToday suppresses", () => {
    expect(decideNudge(v({ dueCount: 5, emittedToday: true }))).toBeNull();
  });
});

describe("decideNudge — REVIEW_DUE", () => {
  it("V2: due cards fire REVIEW_DUE with the pinned dedupeKey", () => {
    expect(decideNudge(v({ dueCount: 5 }))).toEqual({
      kind: "REVIEW_DUE",
      dedupeKey: "REVIEW_DUE:2026-07-02:u1",
    });
  });

  it("V9: the notifReviewDue setting gates it off", () => {
    expect(decideNudge(v({ dueCount: 5 }, { notifReviewDue: false }))).toBeNull();
  });
});

describe("decideNudge — EXAM_COUNTDOWN", () => {
  it("V3: takes priority over REVIEW_DUE", () => {
    expect(decideNudge(v({ dueCount: 5, examDaysLeft: 3 }))).toEqual({
      kind: "EXAM_COUNTDOWN",
      dedupeKey: "EXAM_COUNTDOWN:2026-07-02:u1",
    });
  });

  it("V4: only exactly 7/3/1 days left fire — 5, 2, 0 do not", () => {
    expect(decideNudge(v({ examDaysLeft: 5 }))).toBeNull();
    expect(decideNudge(v({ examDaysLeft: 2 }))).toBeNull();
    expect(decideNudge(v({ examDaysLeft: 0 }))).toBeNull();
  });

  it("V5: 7 and 1 days left both fire", () => {
    expect(decideNudge(v({ examDaysLeft: 7 }))?.kind).toBe("EXAM_COUNTDOWN");
    expect(decideNudge(v({ examDaysLeft: 1 }))?.kind).toBe("EXAM_COUNTDOWN");
  });
});

describe("decideNudge — READINESS_MILESTONE", () => {
  it("V10: crossing a milestone upward fires", () => {
    expect(
      decideNudge(
        v({ readinessPrev: 48, readinessCurr: 52, sufficientData: true }),
      ),
    ).toEqual({
      kind: "READINESS_MILESTONE",
      dedupeKey: "READINESS_MILESTONE:2026-07-02:u1",
    });
  });

  it("V11: insufficient data never celebrates", () => {
    expect(
      decideNudge(
        v({ readinessPrev: 48, readinessCurr: 52, sufficientData: false }),
      ),
    ).toBeNull();
  });

  it("V12: a downward crossing never fires", () => {
    expect(
      decideNudge(
        v({ readinessPrev: 52, readinessCurr: 48, sufficientData: true }),
      ),
    ).toBeNull();
  });

  it("V13: crossing several milestones at once still yields one nudge", () => {
    expect(
      decideNudge(
        v({ readinessPrev: 20, readinessCurr: 80, sufficientData: true }),
      )?.kind,
    ).toBe("READINESS_MILESTONE");
  });

  it("V14: sitting exactly on a milestone is not a crossing (prev < m required)", () => {
    expect(
      decideNudge(
        v({ readinessPrev: 50, readinessCurr: 50, sufficientData: true }),
      ),
    ).toBeNull();
  });
});

describe("decideNudge — DAY_OFF_OFFER", () => {
  const V15 = {
    streakAlive: true,
    yesterdayGoalMet: true,
    localHour: 19,
  } as const;

  it("V15: an earned evening off fires DAY_OFF_OFFER", () => {
    expect(decideNudge(v(V15))).toEqual({
      kind: "DAY_OFF_OFFER",
      dedupeKey: "DAY_OFF_OFFER:2026-07-02:u1",
    });
  });

  it("V16: not before the evening (localHour ≥ 18)", () => {
    expect(decideNudge(v({ ...V15, localHour: 14 }))).toBeNull();
  });

  it("V17: today must be empty of reviews", () => {
    expect(decideNudge(v({ ...V15, todayReviewCount: 3 }))).toBeNull();
  });

  it("V18: the notifStudyReminder setting gates it off", () => {
    expect(decideNudge(v(V15, { notifStudyReminder: false }))).toBeNull();
  });

  it("V19: REVIEW_DUE outranks DAY_OFF_OFFER", () => {
    expect(decideNudge(v({ ...V15, dueCount: 2 }))?.kind).toBe("REVIEW_DUE");
  });
});

// Frozen win-back window vectors W1–W8 (tasks/wave16-11-winback-nudge/journal.md,
// pinned at plan time BEFORE the implementation). timezone "Europe/Kyiv" = UTC+3 on
// these dates; the exam is fixed and the calendar-day diff is taken IN Kyiv, so a
// 21:30Z "now" already rolls to the next Kyiv day (W5/W6 kill a UTC-naive diff).
describe("winbackEligible — frozen window vectors", () => {
  const TZ = "Europe/Kyiv";
  const exam = new Date("2026-07-01T06:00:00.000Z");

  it("W1: FAILED, day 8 → true", () => {
    expect(winbackEligible("FAILED", exam, new Date("2026-07-09T07:00:00.000Z"), TZ)).toBe(true);
  });
  it("W2: FAILED, day 9 → true", () => {
    expect(winbackEligible("FAILED", exam, new Date("2026-07-10T10:00:00.000Z"), TZ)).toBe(true);
  });
  it("W3: FAILED, day 7 → false (too early)", () => {
    expect(winbackEligible("FAILED", exam, new Date("2026-07-08T12:00:00.000Z"), TZ)).toBe(false);
  });
  it("W4: FAILED, day 10 → false (window closed)", () => {
    expect(winbackEligible("FAILED", exam, new Date("2026-07-11T12:00:00.000Z"), TZ)).toBe(false);
  });
  it("W5: 21:30Z rolls to next Kyiv day → day 10 → false (kills UTC-naive)", () => {
    expect(winbackEligible("FAILED", exam, new Date("2026-07-10T21:30:00.000Z"), TZ)).toBe(false);
  });
  it("W6: 21:30Z rolls to next Kyiv day → day 8 → true (kills UTC-naive)", () => {
    expect(winbackEligible("FAILED", exam, new Date("2026-07-08T21:30:00.000Z"), TZ)).toBe(true);
  });
  it("W7: PASSED in the window → false", () => {
    expect(winbackEligible("PASSED", exam, new Date("2026-07-09T07:00:00.000Z"), TZ)).toBe(false);
  });
  it("W8: FAILED but no exam date → false", () => {
    expect(winbackEligible("FAILED", null, new Date("2026-07-09T07:00:00.000Z"), TZ)).toBe(false);
  });
});

describe("decideNudge — RETAKE_WINBACK", () => {
  it("W-priority: win-back leads over a simultaneous REVIEW_DUE candidate", () => {
    expect(decideNudge(v({ winbackEligible: true, dueCount: 5 }))).toEqual({
      kind: "RETAKE_WINBACK",
      dedupeKey: "RETAKE_WINBACK:2026-07-02:u1",
    });
  });

  it("W-cap: the weekly cap wins over an open win-back window", () => {
    expect(decideNudge(v({ winbackEligible: true, sentLast7Days: 4 }))).toBeNull();
  });
});
