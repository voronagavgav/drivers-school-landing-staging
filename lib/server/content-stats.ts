import "server-only";
import { prisma } from "@/lib/db";
import { chunk } from "@/lib/analytics-dashboard";
import {
  summarizeQuestion,
  type OptionStat,
  type QuestionSummary,
} from "@/lib/content-stats";
import { flagQuestion, type ContentFlag } from "@/lib/content-flags";

// ---------------------------------------------------------------------------
// Server aggregation for the admin content-health view (wave-9 §C). COMPUTE-ON-READ:
// turns recorded TestAnswer rows into per-question rich stats + quality flags + a
// per-topic rollup. No schema change, no new recorded signals — the math reuses the
// PURE helpers (`summarizeQuestion`, `flagQuestion`); this layer only fetches/joins/orders.
//
// Privacy: selects ONLY content/answer columns — option `optionKey`/`isCorrect`,
// answer `isCorrect`/`timeSpentSeconds`, and the question's `questionKey`/`text`/topic.
// No user ids, sessions, emails or raw answer text beyond the question stem leave here.
//
// The calling page (task 06) enforces `requireContentManager()`; this is a read-only
// query mirroring the other read helpers in `lib/server/admin.ts`.
// ---------------------------------------------------------------------------

/** Max ids per IN() batch — keeps Prisma's bound-param count under the libsql limit (P2029). */
const IN_BATCH_SIZE = 200;

/** Default min answers before a content fault is trusted (forwarded to `flagQuestion`). */
export const DEFAULT_MIN_SAMPLE = 30;

/** Label shown for questions with no topic (matches the admin convention). */
const NO_TOPIC_LABEL = "Без теми";

/** A question summary enriched with its identity, topic label, and quality flags. */
export interface ContentHealthQuestion extends QuestionSummary {
  questionId: string;
  questionKey: string | null;
  text: string;
  topicId: string | null;
  topicTitle: string;
  flags: ContentFlag[];
  eloBeta: number | null; // Elo/Rasch item difficulty β (null until enough answers; wave22)
  eloAnswerCount: number; // answers folded into eloBeta so far (wave22)
}

/** Per-topic rollup: how many answers and the topic's mean accuracy. */
export interface ContentHealthTopic {
  topicId: string | null;
  topicTitle: string;
  questionCount: number;
  answered: number;
  meanAccuracy: number; // 0..1 — total correct / total answered across the topic
}

export interface ContentHealth {
  questions: ContentHealthQuestion[];
  topics: ContentHealthTopic[];
}

/** A flag an editor should act on (INSUFFICIENT_DATA is informational, not actionable). */
function isActionable(flags: ContentFlag[]): boolean {
  return flags.some(
    (f) => f.kind === "WRONG_KEY_SUSPECTED" || f.kind === "LOW_DISCRIMINATION",
  );
}

/**
 * Aggregate recorded answers into per-question content health + a topic rollup.
 *
 * Pipeline:
 * 1. Fetch every TestAnswer joined to its picked option's `optionKey` (one bounded query),
 *    plus `isCorrect`/`timeSpentSeconds`. Group the rows per question.
 * 2. Fetch the answered questions (chunked IN() lookups) with their `questionKey`/`text`/topic
 *    and the FULL option set, so never-picked options merge in as `picks: 0` — this keeps
 *    `optionCount` and the WRONG_KEY comparison honest even when the keyed-correct option was
 *    never chosen.
 * 3. Per question: `summarizeQuestion(rows)` → merge the full option set → `flagQuestion`.
 * 4. Roll answers up per topic (answered count + mean accuracy).
 * 5. Order questions FLAGGED-first (an actionable WRONG_KEY_SUSPECTED/LOW_DISCRIMINATION flag),
 *    then hardest-first (accuracy ascending, ties broken by most-answered).
 *
 * Only answered questions are reported. `minSample` is forwarded to `flagQuestion`
 * (defaults to {@link DEFAULT_MIN_SAMPLE}); the page calls with no args.
 */
export async function getContentHealth({
  minSample = DEFAULT_MIN_SAMPLE,
}: { minSample?: number } = {}): Promise<ContentHealth> {
  // 1. All recorded answers + the picked option key (content columns only — no identity).
  const answers = await prisma.testAnswer.findMany({
    select: {
      questionId: true,
      isCorrect: true,
      timeSpentSeconds: true,
      selectedOption: { select: { optionKey: true } },
    },
  });

  // Group answer rows per question, keyed by the picked option's optionKey. Answers with no
  // resolvable optionKey (skipped / null option) inform neither counts nor the option breakdown.
  const rowsByQuestion = new Map<
    string,
    { optionKey: string; isCorrect: boolean; timeSpentSeconds: number | null }[]
  >();
  for (const a of answers) {
    const optionKey = a.selectedOption?.optionKey;
    if (optionKey == null) continue;
    const list = rowsByQuestion.get(a.questionId) ?? [];
    list.push({ optionKey, isCorrect: a.isCorrect, timeSpentSeconds: a.timeSpentSeconds });
    rowsByQuestion.set(a.questionId, list);
  }

  if (rowsByQuestion.size === 0) return { questions: [], topics: [] };

  // 2. Enrich the answered questions: identity, topic, and the FULL option set (chunked IN()).
  const ids = [...rowsByQuestion.keys()];
  const questionById = new Map<
    string,
    {
      id: string;
      questionKey: string | null;
      text: string;
      topicId: string | null;
      topicTitle: string;
      eloBeta: number | null;
      eloAnswerCount: number;
      options: { optionKey: string | null; isCorrect: boolean }[];
    }
  >();
  for (const batch of chunk(ids, IN_BATCH_SIZE)) {
    const rows = await prisma.question.findMany({
      where: { id: { in: batch } },
      select: {
        id: true,
        questionKey: true,
        text: true,
        topicId: true,
        topic: { select: { title: true } },
        eloBeta: true,
        eloAnswerCount: true,
        options: { select: { optionKey: true, isCorrect: true } },
      },
    });
    for (const q of rows) {
      questionById.set(q.id, {
        id: q.id,
        questionKey: q.questionKey,
        text: q.text,
        topicId: q.topicId,
        topicTitle: q.topic?.title ?? NO_TOPIC_LABEL,
        eloBeta: q.eloBeta,
        eloAnswerCount: q.eloAnswerCount,
        options: q.options,
      });
    }
  }

  // 3. Per question: summarize, merge the full option set, flag.
  const questions: ContentHealthQuestion[] = [];
  for (const [questionId, rows] of rowsByQuestion) {
    const q = questionById.get(questionId);
    if (!q) continue; // question removed since the answer was recorded — skip.

    const summary = summarizeQuestion(rows);

    // Merge never-picked options as `picks: 0` so optionCount + WRONG_KEY stay accurate.
    const options: OptionStat[] = [...summary.options];
    const seen = new Set(summary.options.map((o) => o.optionKey));
    for (const opt of q.options) {
      if (opt.optionKey == null || seen.has(opt.optionKey)) continue;
      options.push({ optionKey: opt.optionKey, picks: 0, isCorrect: opt.isCorrect, pickRate: 0 });
      seen.add(opt.optionKey);
    }
    const enriched: QuestionSummary = { ...summary, options };

    questions.push({
      ...enriched,
      questionId,
      questionKey: q.questionKey,
      text: q.text,
      topicId: q.topicId,
      topicTitle: q.topicTitle,
      eloBeta: q.eloBeta,
      eloAnswerCount: q.eloAnswerCount,
      flags: flagQuestion(enriched, { minSample }),
    });
  }

  // 4. Topic rollup: answered count + mean accuracy (total correct / total answered).
  const topicAgg = new Map<
    string,
    { topicId: string | null; topicTitle: string; questionCount: number; answered: number; correct: number }
  >();
  for (const q of questions) {
    const key = q.topicId ?? "__none__";
    const agg =
      topicAgg.get(key) ??
      { topicId: q.topicId, topicTitle: q.topicTitle, questionCount: 0, answered: 0, correct: 0 };
    agg.questionCount += 1;
    agg.answered += q.timesAnswered;
    agg.correct += q.correct;
    topicAgg.set(key, agg);
  }
  const topics: ContentHealthTopic[] = [...topicAgg.values()]
    .map((t) => ({
      topicId: t.topicId,
      topicTitle: t.topicTitle,
      questionCount: t.questionCount,
      answered: t.answered,
      meanAccuracy: t.answered > 0 ? t.correct / t.answered : 0,
    }))
    .sort((a, b) => a.meanAccuracy - b.meanAccuracy); // weakest topics first

  // 5. Order: flagged-first, then hardest-first (accuracy asc, ties → most-answered).
  questions.sort((a, b) => {
    const af = isActionable(a.flags) ? 0 : 1;
    const bf = isActionable(b.flags) ? 0 : 1;
    if (af !== bf) return af - bf;
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return b.timesAnswered - a.timesAnswered;
  });

  return { questions, topics };
}
