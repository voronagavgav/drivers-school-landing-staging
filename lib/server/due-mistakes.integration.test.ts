import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { countDueMistakes } from "@/lib/server/mistakes";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Spec A (integration): prove countDueMistakes returns the right number against real UserMistake
// rows with KNOWN last-practiced times, driving the spaced-review ladder via a FIXED clock.
// Fixtures are self-provisioned (NOT the seed): a dedicated throwaway Category/Topic/User and a
// handful of OFFICIAL questions whose UserMistake rows span due / not-yet-due / resolved.
//
// The interval ladder is REVIEW_INTERVALS_HOURS = [0, 24, 72, 168, 336, 720] (hours), indexed by the
// mistake's correctRepeatCount (clamped to the last entry). A mistake is DUE when
//   FIXED_NOW - lastMistakeAt >= intervalHours[min(streak, 5)]   (boundary === interval is DUE).
// countDueMistakes query-filters status:"ACTIVE", so a RESOLVED row never counts regardless of timing.
//
// HARD-CODED layout (FIXED_NOW is a literal, NOT Date.now(), so the expected count is exact):
//   due-immediate : streak 0 → 0h  interval; 5h  ago             → 5  >= 0   → DUE
//   due-past      : streak 1 → 24h interval; 48h ago             → 48 >= 24  → DUE
//   due-boundary  : streak 2 → 72h interval; 72h ago (exactly)   → 72 >= 72  → DUE (inclusive)
//   not-yet-due   : streak 3 → 168h interval; 100h ago           → 100 < 168 → EXCLUDED
//   resolved      : status RESOLVED; 1000h ago (would be due)    → filtered  → EXCLUDED
// Expected DUE count = 3.

const HOUR = 60 * 60 * 1000;
const FIXED_NOW = Date.UTC(2026, 0, 1, 12, 0, 0); // fixed clock — never reads Date.now()

let fixture: OfficialQuestionFixture;
let userId: string;
let topicId: string;

// Write one UserMistake row with a CONTROLLED lastMistakeAt (relative to FIXED_NOW) and streak.
async function createMistake(opts: {
  questionId: string;
  correctRepeatCount: number;
  hoursAgo: number;
  status?: "ACTIVE" | "RESOLVED";
}) {
  const lastMistakeAt = new Date(FIXED_NOW - opts.hoursAgo * HOUR);
  await prisma.userMistake.create({
    data: {
      userId,
      questionId: opts.questionId,
      topicId,
      mistakeCount: 1,
      correctRepeatCount: opts.correctRepeatCount,
      status: opts.status ?? "ACTIVE",
      lastMistakeAt,
      resolvedAt: opts.status === "RESOLVED" ? lastMistakeAt : null,
    },
  });
}

beforeAll(async () => {
  // Self-provisioned OFFICIAL fixture (shared createOfficialQuestion helper): a throwaway
  // category/topic/user plus five OFFICIAL questions — one distinct question per mistake
  // (@@unique([userId, questionId])) — to serve as the UserMistake.questionId FK targets.
  fixture = await createOfficialQuestion(prisma, { label: "due", count: 5 });
  userId = fixture.userId!;
  topicId = fixture.topicId!;
  const [qImmediate, qPast, qBoundary, qNotYet, qResolved] = fixture.questionIds;

  await createMistake({ questionId: qImmediate, correctRepeatCount: 0, hoursAgo: 5 }); // 0h interval → DUE
  await createMistake({ questionId: qPast, correctRepeatCount: 1, hoursAgo: 48 }); // 48 >= 24 → DUE
  await createMistake({ questionId: qBoundary, correctRepeatCount: 2, hoursAgo: 72 }); // 72 >= 72 → DUE
  await createMistake({ questionId: qNotYet, correctRepeatCount: 3, hoursAgo: 100 }); // 100 < 168 → not due
  await createMistake({ questionId: qResolved, correctRepeatCount: 0, hoursAgo: 1000, status: "RESOLVED" });
});

afterAll(async () => {
  // FK-safe teardown: deletes the user first (cascades its UserMistake rows), then the questions,
  // topic and category — see the shared helper's cleanup.
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("countDueMistakes against real UserMistake rows", () => {
  it("counts only ACTIVE mistakes whose elapsed time has reached their spaced-review interval", async () => {
    const count = await countDueMistakes(userId, FIXED_NOW);
    // due-immediate + due-past + due-boundary = 3; not-yet-due and the RESOLVED row are excluded.
    expect(count).toBe(3);
  });

  it("is a stable, deterministic read — calling it twice with the same clock yields the same count", async () => {
    const first = await countDueMistakes(userId, FIXED_NOW);
    const second = await countDueMistakes(userId, FIXED_NOW);
    expect(second).toBe(first);
  });
});
