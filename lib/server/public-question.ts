import "server-only";
import { prisma } from "@/lib/db";

// Loader for the PUBLIC, logged-out `/q/[key]` page (spec T5, wave16-13). This is the app's first
// public DB-backed route: there is no auth, so the `where` clause below IS the access control. It
// returns a question ONLY when it is part of the servable public set —
// `isPublished && isActive && archivedAt === null` — and the `questionKey` matches exactly; every
// other case (unknown key, unpublished, inactive, archived) resolves to `null` so the page can
// `notFound()` (404). Content is OFFICIAL-only since waves 7–8 (all published questions are
// `sourceType=OFFICIAL`), so the published set alone guarantees official-only exposure — no extra
// predicate needed here.
//
// The key shape is validated (`q_`-prefixed) BEFORE the DB hit: a garbage/traversal key never
// reaches Prisma, and a well-formed-but-unknown key simply misses the unique index → null.

/** A single option as the public page renders it (correctness kept for the revealed state only). */
export interface PublicQuestionOption {
  id: string;
  text: string;
  displayOrder: number;
  isCorrect: boolean;
}

/** The public question shape: enough to render stem, image, options and the study-aid explanation. */
export interface PublicQuestion {
  id: string;
  questionKey: string;
  text: string;
  imageKey: string | null;
  imageUrl: string | null;
  options: PublicQuestionOption[];
  explanation: {
    shortText: string | null;
    detailedText: string | null;
    legalReference: string | null;
  } | null;
}

/** Content keys are `q_<section>_<qnum>` (lib/content-key.ts) — reject anything else before the DB. */
const QUESTION_KEY_RE = /^q_[a-z0-9_]+$/i;

/**
 * Fetch the public question for a `questionKey`, or `null` when it is not part of the servable set.
 * The loader's `where` is the access boundary for the unauthenticated `/q/[key]` route.
 */
export async function getPublicQuestion(questionKey: string): Promise<PublicQuestion | null> {
  if (!QUESTION_KEY_RE.test(questionKey)) return null;

  const question = await prisma.question.findFirst({
    where: {
      questionKey,
      isPublished: true,
      isActive: true,
      archivedAt: null,
    },
    select: {
      id: true,
      questionKey: true,
      text: true,
      imageKey: true,
      imageUrl: true,
      options: {
        orderBy: { displayOrder: "asc" },
        select: { id: true, text: true, displayOrder: true, isCorrect: true },
      },
      explanation: {
        select: { shortText: true, detailedText: true, legalReference: true },
      },
    },
  });

  if (!question || question.questionKey == null) return null;

  return {
    id: question.id,
    questionKey: question.questionKey,
    text: question.text,
    imageKey: question.imageKey,
    imageUrl: question.imageUrl,
    options: question.options,
    explanation: question.explanation,
  };
}
