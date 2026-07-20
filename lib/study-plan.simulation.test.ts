import { describe, it, expect } from "vitest";
import { computeStudyPlan, MAX_DAILY_QUOTA } from "@/lib/study-plan";
import type { StudyPlan } from "@/lib/study-plan";
import { schedule, retrievability } from "@/lib/fsrs";
import type { Grade, ReviewMemoryState } from "@/lib/fsrs";

// wave21-06 — SIMULATION DIRECTION GATE (pure, deterministic).
//
// Re-runs a compact version of the PLAN-REVALIDATION-2026-07-14 sim through the REAL
// `computeStudyPlan` + the REAL FSRS `schedule`/`retrievability`, and pins the property the OLD
// one-shot formula fails: once the pool is exhausted (unseen==0) the DISPLAYED daily quota never
// exceeds MAX_DAILY_QUOTA and the message class is MAINTENANCE — including the last 5 days.
//
// Determinism: an LCG (fixed seed) supplies the correct/incorrect draws (p=0.75); day keys derive
// from a fixed epoch day index formatted via UTC arithmetic. No live randomness and no wall-clock
// reads — the injected clock is built with Reflect.construct (the lib/fsrs purity idiom).
//
// Expected values are justified by the MODEL, not read from the impl: the `<= MAX_DAILY_QUOTA`
// bound is the exported constant, MAINTENANCE-when-unseen==0 is structural per the spec, and d0<=25
// / the old-formula contrast were pre-verified with a throwaway `npx tsx` probe and frozen from that
// run (see tasks/wave21-06-sim-direction-gate/PREVERIFY-OUTPUT.txt).

const MS_PER_DAY = 86_400_000;
const BASE_DAY = Math.floor(Date.UTC(2026, 6, 2) / MS_PER_DAY); // epoch day index for 2026-07-02
const HORIZON = 30;
const P_CORRECT = 0.75;
const DEFAULT_GOAL = 15;
const SEED = 12345;

// Deterministic Date from a computed epoch-ms (never a wall-clock read); direct Date construction
// is banned by the purity/determinism gate, so build via Reflect.construct like the FSRS tests.
const mkDate = (ms: number): Date => Reflect.construct(Date, [ms]) as Date;

function dayKey(dayIdx: number): string {
  const d = mkDate(dayIdx * MS_PER_DAY);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const freshState = (): ReviewMemoryState => ({
  stability: 0,
  difficulty: 0,
  state: "new",
  dueAt: null,
  lastReviewedAt: null,
  reps: 0,
  lapses: 0,
});

type DayRecord = {
  day: number;
  daysLeft: number;
  unseenCount: number;
  dueCount: number;
  reviewLoad: number;
  plan: StudyPlan;
  // The OLD one-shot demand the pre-wave21 formula would have DISPLAYED on this trajectory.
  oldOneShot: number;
};

const isMaintenance = (plan: StudyPlan): boolean =>
  plan.message.includes("повторюйте") && !plan.message.includes("встигнете");

// One deterministic run of `pool` synthetic cards over the 30-day horizon. Each day: (a) compute the
// plan via the REAL computeStudyPlan with the current unseen/due counts + the wave21-01 reviewLoad
// estimator `min(seen, round(Σ 1/max(1,stability)))`; (b) answer up to `dailyQuota` due-first cards
// at p=0.75, aging each answered card's memory state through the REAL FSRS `schedule`.
function runSimulation(pool: number, seed: number): DayRecord[] {
  let lcg = seed >>> 0;
  const rand = (): number => {
    lcg = (1664525 * lcg + 1013904223) >>> 0;
    return lcg / 0x1_0000_0000;
  };

  const cards = Array.from({ length: pool }, () => ({ st: freshState(), seen: false }));
  const examDate = dayKey(BASE_DAY + HORIZON);
  const records: DayRecord[] = [];

  for (let day = 1; day <= HORIZON; day++) {
    const dayIdx = BASE_DAY + (day - 1);
    const now = mkDate(dayIdx * MS_PER_DAY);
    const todayKey = dayKey(dayIdx);

    let unseenCount = 0;
    let dueCount = 0;
    let sumInvStability = 0;
    let seenCount = 0;
    for (const c of cards) {
      if (!c.seen) {
        unseenCount++;
        continue;
      }
      seenCount++;
      sumInvStability += 1 / Math.max(1, c.st.stability);
      if (c.st.dueAt != null && c.st.dueAt.getTime() <= now.getTime()) dueCount++;
    }
    const reviewLoad = Math.min(seenCount, Math.round(sumInvStability));

    const plan = computeStudyPlan({
      examDate,
      todayKey,
      dueCount,
      unseenCount,
      defaultGoal: DEFAULT_GOAL,
      reviewLoad,
    });

    const daysLeft = Math.max(1, HORIZON - (day - 1));
    const oldOneShot = Math.ceil((unseenCount + dueCount) / daysLeft);
    records.push({ day, daysLeft, unseenCount, dueCount, reviewLoad, plan, oldOneShot });

    // Answer the plan's prescribed load, due cards first then unseen.
    const budget = plan.dailyQuota;
    const due = cards.filter(
      (c) => c.seen && c.st.dueAt != null && c.st.dueAt.getTime() <= now.getTime(),
    );
    const unseen = cards.filter((c) => !c.seen);
    for (const c of [...due, ...unseen].slice(0, budget)) {
      const grade: Grade = rand() < P_CORRECT ? 3 : 1; // correct → Good(3), wrong → Again(1)
      c.st = schedule(c.st, grade, now);
      c.seen = true;
    }
  }

  return records;
}

describe("computeStudyPlan — wave21 simulation direction gate", () => {
  // Calm caught-up learner: a ~120-card pool the user CAN exhaust before the exam.
  const calm = runSimulation(120, SEED);

  it("(1) drives the REAL FSRS engine — R at a card's dueAt equals the target retention", () => {
    // schedule/retrievability are the real primitives: intervalDays(S,0.9)==S ⇒ R==0.9 at
    // elapsed==stability BY CONSTRUCTION, so a freshly-scheduled card's R at its own dueAt is ~0.9.
    const seeded = schedule(freshState(), 3, mkDate(BASE_DAY * MS_PER_DAY));
    expect(seeded.dueAt).not.toBeNull();
    expect(retrievability(seeded, seeded.dueAt as Date)).toBeCloseTo(0.9, 3);
  });

  it("(2) runs the full deterministic 30-day horizon", () => {
    expect(calm).toHaveLength(HORIZON);
    // Determinism guard: two runs at the same seed are identical.
    const again = runSimulation(120, SEED);
    expect(again.map((r) => r.plan.dailyQuota)).toEqual(calm.map((r) => r.plan.dailyQuota));
  });

  const d0 = calm.find((r) => r.unseenCount === 0)?.day ?? null;

  it("(3) the pool is exhausted before the last 5 days (d0 <= 25)", () => {
    expect(d0).not.toBeNull();
    expect(d0 as number).toBeLessThanOrEqual(25);
  });

  it("(4) once unseen==0, the DISPLAYED quota never exceeds MAX and the class is MAINTENANCE", () => {
    const maintenanceDays = calm.filter((r) => r.unseenCount === 0);
    expect(maintenanceDays.length).toBeGreaterThan(0);
    for (const r of maintenanceDays) {
      expect(r.plan.dailyQuota).toBeLessThanOrEqual(MAX_DAILY_QUOTA);
      expect(isMaintenance(r.plan)).toBe(true);
    }
  });

  it("(5) the last 5 days (d=26..30) are MAINTENANCE with quota <= MAX", () => {
    const last5 = calm.filter((r) => r.day >= 26 && r.day <= 30);
    expect(last5).toHaveLength(5);
    for (const r of last5) {
      expect(r.unseenCount).toBe(0);
      expect(r.plan.dailyQuota).toBeLessThanOrEqual(MAX_DAILY_QUOTA);
      expect(isMaintenance(r.plan)).toBe(true);
    }
  });

  it("(6) contrast — the OLD one-shot formula explodes on the realistic pool the new model keeps calm", () => {
    // The defect (PLAN-REVALIDATION-2026-07-14, verdict 2) is the OLD `ceil((unseen+due)/daysLeft)`
    // treating regenerating due reviews as one-shot work: as the exam nears (daysLeft→1) it displays
    // a punitive 2-3 digit daily demand. That explosion is STRUCTURAL to the REALISTIC pool a user
    // can NEVER fully exhaust (the real cat-B pool is ~1739 cards; the doc measured 204..603/day in
    // the last 5 days). On the CALM 120-pool above the user keeps up, so due stays low and the OLD
    // formula never exceeds MAX either — the small caught-up pool is calm under BOTH formulas, which
    // is exactly why the contrast must be drawn on the non-exhausting regime, not the 120-trajectory.
    const calmMaxOldOneShot = Math.max(...calm.map((r) => r.oldOneShot));
    expect(calmMaxOldOneShot).toBeLessThanOrEqual(MAX_DAILY_QUOTA); // defect invisible on a caught-up pool

    // Same deterministic sim, a realistic pool (320) the learner cannot exhaust in 30 days.
    const heavy = runSimulation(320, SEED);
    const lastDay = heavy[heavy.length - 1];
    expect(lastDay.day).toBe(HORIZON);
    expect(lastDay.unseenCount).toBeGreaterThan(0); // never caught up — where the defect lives

    // OLD one-shot demand on the last day is a punitive 2-3 digit number...
    expect(lastDay.oldOneShot).toBeGreaterThan(MAX_DAILY_QUOTA);
    expect(lastDay.oldOneShot).toBeGreaterThanOrEqual(100);
    // ...while the NEW model shows a calm, bounded quota (never the «встигнете» threat).
    expect(lastDay.plan.dailyQuota).toBeLessThanOrEqual(MAX_DAILY_QUOTA);
    expect(lastDay.plan.message).not.toContain("не встигнете");
  });
});
