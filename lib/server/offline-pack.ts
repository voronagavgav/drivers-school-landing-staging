import "server-only";
import { statSync } from "node:fs";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { resolveImageDiskPath, resolveVariantDiskPath } from "./image-resolve";
import { SERVABLE_QUESTION_WHERE } from "./test-engine";

// ---------------------------------------------------------------------------
// Offline-pack data (spec §E, backend half). `getOfflinePack` resolves a scope
// — a Topic id, or the literals "mistakes"/"saved" for the caller's own sets —
// to the SERVABLE questions in it (the exact `SERVABLE_QUESTION_WHERE`
// predicate startSession uses; a pack can never contain a question a live
// session wouldn't serve) plus an HONEST image-size estimate summed from real
// on-disk bytes: per distinct imageKey, `public/img-cache/<key>-540.avif`,
// else the `-540.webp` variant, else the tier-resolved original, else 0.
// Never a per-image constant. The route (app/api/offline-pack/[scope]) is a
// thin auth wrapper; all DB orchestration lives here (house split).
//
// Including `isCorrect` + explanation text is deliberate: offline practice
// needs immediate feedback, and an authed user already receives exactly this
// data in practice mode — no new exposure beyond the existing auth boundary.
// ---------------------------------------------------------------------------

// Compile-time pin of the reused predicate: a pack must only ever contain
// questions a live session would serve. If the extracted predicate drifts
// from this exact triple, typecheck fails here.
SERVABLE_QUESTION_WHERE satisfies {
  isActive: true;
  isPublished: true;
  archivedAt: null;
};

// Hard cap on pack size — a pack is a topic-sized download, not a full dump.
export const OFFLINE_PACK_MAX_QUESTIONS = 200;

export type OfflinePackScopeType = "topic" | "mistakes" | "saved";

export type OfflinePackQuestion = {
  id: string;
  text: string;
  imageKey: string | null;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanationText: string | null;
};

export type OfflinePack = {
  ok: true;
  scope: { type: OfflinePackScopeType; id: string; title: string };
  questions: OfflinePackQuestion[];
  estimatedImageBytes: number;
  truncated: boolean;
};

type PackQuestionRow = {
  id: string;
  text: string;
  imageKey: string | null;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation: { shortText: string | null; detailedText: string | null } | null;
};

function loadPackQuestions(where: Prisma.QuestionWhereInput): Promise<PackQuestionRow[]> {
  return prisma.question.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      text: true,
      imageKey: true,
      options: {
        select: { id: true, text: true, isCorrect: true },
        orderBy: { displayOrder: "asc" },
      },
      explanation: { select: { shortText: true, detailedText: true } },
    },
  });
}

/**
 * Real on-disk byte size for an image key: prebaked 540-wide AVIF variant, else
 * the WebP one, else the tier-resolved original, else 0 (key resolves nowhere).
 */
function imageBytesForKey(key: string): number {
  const diskPath =
    resolveVariantDiskPath(key, 540, "avif") ??
    resolveVariantDiskPath(key, 540, "webp") ??
    resolveImageDiskPath(key);
  if (!diskPath) return 0;
  try {
    return statSync(diskPath).size;
  } catch {
    // Raced away between the resolver's existence check and the stat.
    return 0;
  }
}

/**
 * Build the offline pack for a scope, or `null` when the scope is neither a
 * known Topic id nor one of the "mistakes"/"saved" literals (route → 404).
 * `userId` must come from the session (it scopes the mistakes/saved sets).
 */
export async function getOfflinePack(userId: string, scope: string): Promise<OfflinePack | null> {
  let scopeMeta: OfflinePack["scope"];
  let rows: PackQuestionRow[];

  if (scope === "mistakes") {
    // Relation filter, not an `id: { in: [...] }` list — immune to the libsql
    // query-parameter cap however many mistakes the caller has accumulated.
    rows = await loadPackQuestions({
      ...SERVABLE_QUESTION_WHERE,
      mistakes: { some: { userId, status: "ACTIVE" } },
    });
    scopeMeta = { type: "mistakes", id: "mistakes", title: "Робота над помилками" };
  } else if (scope === "saved") {
    rows = await loadPackQuestions({
      ...SERVABLE_QUESTION_WHERE,
      savedBy: { some: { userId } },
    });
    scopeMeta = { type: "saved", id: "saved", title: "Збережені питання" };
  } else {
    const topic = await prisma.topic.findUnique({
      where: { id: scope },
      select: { id: true, title: true },
    });
    if (!topic) return null;
    rows = await loadPackQuestions({ ...SERVABLE_QUESTION_WHERE, topicId: topic.id });
    scopeMeta = { type: "topic", id: topic.id, title: topic.title };
  }

  const truncated = rows.length > OFFLINE_PACK_MAX_QUESTIONS;
  const pack = truncated ? rows.slice(0, OFFLINE_PACK_MAX_QUESTIONS) : rows;

  const keys = new Set<string>();
  for (const q of pack) if (q.imageKey) keys.add(q.imageKey);
  let estimatedImageBytes = 0;
  for (const key of keys) estimatedImageBytes += imageBytesForKey(key);

  return {
    ok: true,
    scope: scopeMeta,
    questions: pack.map((q) => ({
      id: q.id,
      text: q.text,
      imageKey: q.imageKey,
      options: q.options,
      explanationText: q.explanation?.shortText ?? q.explanation?.detailedText ?? null,
    })),
    estimatedImageBytes,
    truncated,
  };
}
