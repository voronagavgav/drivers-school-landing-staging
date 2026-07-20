import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { REVIEW_ENGINE_VERSION } from "@/lib/fsrs";
import {
  exportUserRevlog,
  REVLOG_CSV_HEADER,
} from "@/scripts/fsrs-fit/export-logs";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// wave24-05: the EXPORTER turns one user's ReviewLog into the py-fsrs optimizer's
// `card_id,review_time,review_rating` CSV, filtered to ONLY the current engine tag
// (REVIEW_ENGINE_VERSION = "fsrs6-bkt2"). This suite drives the REAL entry the CLI
// calls — `exportUserRevlog` — on a seeded fixture user whose ReviewLog carries a
// MIX of engine tags, and pins:
//   (a) ONLY the fsrs6-bkt2 rows appear (count + card_ids) — null/older-tag rows excluded;
//   (b) rows ordered by (card_id, review_time);
//   (c) each review_rating equals the seeded grade;
//   plus the header line is exactly `card_id,review_time,review_rating`.

const BASE = new Date("2026-07-01T00:00:00Z").getTime();
const MS_PER_DAY = 86_400_000;

let f: OfficialQuestionFixture;
let cardA: string;
let cardB: string;
let cardC: string;

// The seeded fsrs6-bkt2 rows we EXPECT to be exported (card index into questionIds,
// review_time epoch ms, grade). Deliberately seeded out of (time) order to force the
// exporter's sort to do real work.
interface ExpectedRow {
  cardIdx: number;
  time: number;
  grade: number;
}
const EXPECTED: ExpectedRow[] = [
  { cardIdx: 0, time: BASE + 5 * MS_PER_DAY, grade: 3 }, // card A, later
  { cardIdx: 0, time: BASE + 1 * MS_PER_DAY, grade: 1 }, // card A, earlier
  { cardIdx: 1, time: BASE + 2 * MS_PER_DAY, grade: 4 }, // card B
];

beforeAll(async () => {
  // Three published questions; a throwaway owning user carries the ReviewLog.
  f = await createOfficialQuestion(prisma, { label: "fsrsexport", count: 3 });
  [cardA, cardB, cardC] = f.questionIds;
  const userId = f.userId!;

  const mk = (questionId: string, grade: number, time: number, engine: string | null) =>
    prisma.reviewLog.create({
      data: {
        userId,
        questionId,
        grade,
        elapsedDays: 0,
        mode: "MIXED_PRACTICE",
        reviewedAt: new Date(time),
        engine,
      },
    });

  // Current-engine rows — the ONLY ones that should be exported.
  for (const r of EXPECTED) {
    await mk(f.questionIds[r.cardIdx], r.grade, r.time, REVIEW_ENGINE_VERSION);
  }
  // Pre-bkt2 rows that MUST be excluded: engine null and an older tag, on cards A and C.
  await mk(cardA, 2, BASE + 3 * MS_PER_DAY, null); // legacy null on a card that also has bkt2 rows
  await mk(cardC, 4, BASE + 4 * MS_PER_DAY, null); // card C: only excluded rows → never appears
  await mk(cardC, 3, BASE + 6 * MS_PER_DAY, "fsrs6-bkt1"); // older tag → excluded
});

afterAll(async () => {
  // User delete cascades its ReviewLog (onDelete: Cascade), freeing the questions' Restrict FK.
  if (f.userId) await prisma.user.delete({ where: { id: f.userId } }).catch(() => undefined);
  await f.cleanup();
  await prisma.$disconnect();
});

describe("exportUserRevlog (engine-filtered ReviewLog → py-fsrs CSV)", () => {
  it("exports ONLY fsrs6-bkt2 rows, ordered by (card_id, review_time), rating == grade", async () => {
    const csv = await exportUserRevlog(prisma, f.userId!);
    const lines = csv.trimEnd().split("\n");

    // Header exactly right.
    expect(lines[0]).toBe(REVLOG_CSV_HEADER);
    expect(lines[0]).toBe("card_id,review_time,review_rating");

    const body = lines.slice(1).map((l) => {
      const [card_id, review_time, review_rating] = l.split(",");
      return { card_id, review_time: Number(review_time), review_rating: Number(review_rating) };
    });

    // (a) ONLY the three fsrs6-bkt2 rows appear — the null/bkt1 rows and card C are excluded.
    expect(body).toHaveLength(EXPECTED.length);
    const cardsSeen = new Set(body.map((r) => r.card_id));
    expect(cardsSeen.has(cardA)).toBe(true);
    expect(cardsSeen.has(cardB)).toBe(true);
    expect(cardsSeen.has(cardC)).toBe(false);

    // (b) rows sorted by (card_id ASC, review_time ASC).
    const sorted = [...body].sort(
      (x, y) => x.card_id.localeCompare(y.card_id) || x.review_time - y.review_time,
    );
    expect(body).toEqual(sorted);

    // (c) each review_rating equals the seeded grade for its (card, time).
    const byKey = new Map(EXPECTED.map((r) => [`${f.questionIds[r.cardIdx]}:${r.time}`, r.grade]));
    for (const r of body) {
      expect(byKey.get(`${r.card_id}:${r.review_time}`)).toBe(r.review_rating);
    }
    // and the full expected multiset is exactly reproduced.
    expect(byKey.size).toBe(body.length);
  });
});
