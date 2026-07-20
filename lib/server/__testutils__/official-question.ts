// Shared integration-test fixture: build a throwaway pool of OFFICIAL (isDemo=false) questions
// isolated from the shared seeded content. Many `lib/server/*.integration.test.ts` suites hand-roll
// the same category+topic+questions(+user) setup; this extracts it once. NOT a test suite (the
// filename does not match the integration `*.integration.test.ts` glob, so vitest won't collect it).
//
// The `prisma` client is a PARAMETER — this module never imports the app's server-side db singleton
// nor the server-runtime guard, so it stays runtime-agnostic and the calling suite owns the
// connection (and its `$disconnect`).
//
// `cleanup` is FK-safe: it deletes the USER first so its session/mistake/saved/snapshot children
// cascade and free the questions (TestSessionQuestion/TestAnswer → Question are NOT cascades), THEN
// the questions (cascading their options/explanation), THEN the topic, THEN the category — and only
// the rows THIS fixture created (a supplied category/topic is left intact).
import type { PrismaClient } from "@/lib/generated/prisma/client";

/** Distinct, ever-increasing suffix so concurrent fixtures never collide on a unique code/email. */
let fixtureSeq = 0;
function uniqueSuffix(): string {
  fixtureSeq += 1;
  return `${Date.now()}_${fixtureSeq}`;
}

export interface OfficialOption {
  text: string;
  isCorrect: boolean;
  displayOrder?: number;
}

export interface CreateOfficialQuestionOptions {
  /** Short label woven into generated codes/titles/text for readability. Default "official". */
  label?: string;
  /** Number of OFFICIAL questions to create (default 1). */
  count?: number;
  /** Attach to this EXISTING category instead of creating a throwaway one (left intact on cleanup). */
  categoryId?: string;
  /** Attach to an EXISTING topic, or `null` for no topic. Omit to create a throwaway topic. */
  topicId?: string | null;
  /** Create a throwaway USER owning the fixture (default true). */
  withUser?: boolean;
  /** Role for the throwaway user (default "USER"). */
  userRole?: string;
  /** Question publish state (default true). */
  isPublished?: boolean;
  /** Question active state (default true). */
  isActive?: boolean;
  /** Question archive timestamp (default null = not archived). */
  archivedAt?: Date | null;
  /** Question difficulty (default 1). */
  difficulty?: number;
  /** Override the option set. Default: one correct ("right"), one wrong ("wrong"). */
  options?: OfficialOption[];
}

export interface OfficialQuestionFixture {
  /** The throwaway user id, or null when `withUser:false`. */
  userId: string | null;
  /** The category the questions are attached to (created here, or the supplied one). */
  categoryId: string;
  /** The topic the questions belong to, or null when `topicId:null`. */
  topicId: string | null;
  /** Ids of the created questions, in creation order. */
  questionIds: string[];
  /** Convenience: the first created question id (handy for single-question fixtures). */
  questionId: string;
  /**
   * FK-safe teardown — deletes ONLY what this fixture created, in order
   * user → questions → topic → category. Call once in `afterAll` (before `$disconnect`).
   */
  cleanup: () => Promise<void>;
}

/**
 * Create one or more OFFICIAL questions (plus, by default, a throwaway category, topic and owning
 * user) for integration tests, and return the ids alongside an FK-safe `cleanup`.
 */
export async function createOfficialQuestion(
  prisma: PrismaClient,
  opts: CreateOfficialQuestionOptions = {},
): Promise<OfficialQuestionFixture> {
  const {
    label = "official",
    count = 1,
    withUser = true,
    userRole = "USER",
    isPublished = true,
    isActive = true,
    archivedAt = null,
    difficulty = 1,
    options = [
      { text: "right", isCorrect: true, displayOrder: 0 },
      { text: "wrong", isCorrect: false, displayOrder: 1 },
    ],
  } = opts;

  const suffix = uniqueSuffix();

  // Category: reuse a supplied one (left intact on cleanup), else create a throwaway.
  const ownsCategory = opts.categoryId == null;
  const categoryId = ownsCategory
    ? (
        await prisma.category.create({
          data: { code: `${label.toUpperCase()}_${suffix}`, title: `${label} category`, isActive: true },
        })
      ).id
    : opts.categoryId!;

  // Topic: omit (undefined) → create a throwaway; `null` → no topic; string → reuse existing.
  const ownsTopic = opts.topicId === undefined;
  const topicId: string | null = ownsTopic
    ? (await prisma.topic.create({ data: { title: `${label}-${suffix}`, isActive: true } })).id
    : opts.topicId ?? null;

  const questionIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const q = await prisma.question.create({
      data: {
        text: `${label} Q${i}-${suffix}`,
        topicId: topicId ?? undefined,
        difficulty,
        sourceType: "OFFICIAL",
        isDemo: false,
        isActive,
        isPublished,
        archivedAt,
        categories: { connect: { id: categoryId } },
        options: {
          create: options.map((o, idx) => ({
            text: o.text,
            isCorrect: o.isCorrect,
            displayOrder: o.displayOrder ?? idx,
          })),
        },
      },
    });
    questionIds.push(q.id);
  }

  let userId: string | null = null;
  if (withUser) {
    const u = await prisma.user.create({
      data: {
        name: `${label} user`,
        email: `${label}-${suffix}@test.local`,
        passwordHash: "x",
        role: userRole,
        selectedCategoryId: categoryId,
      },
    });
    userId = u.id;
  }

  const cleanup = async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    for (const id of questionIds) {
      await prisma.question.delete({ where: { id } }).catch(() => undefined);
    }
    if (ownsTopic && topicId) {
      await prisma.topic.delete({ where: { id: topicId } }).catch(() => undefined);
    }
    if (ownsCategory) {
      await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
    }
  };

  return { userId, categoryId, topicId, questionIds, questionId: questionIds[0], cleanup };
}
