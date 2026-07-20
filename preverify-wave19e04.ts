import { prisma } from "@/lib/db";
import { sectionFromQuestionKey } from "@/lib/content-key";
import { CATEGORY_B_BLUEPRINT, groupCandidatesByBlock } from "@/lib/exam-blueprint";
import { selectDiagnostic } from "@/lib/test-engine/diagnostic";
import { DIAGNOSTIC_COUNT } from "@/lib/constants";

// Replicates the production DIAGNOSTIC composition (lib/server/study.ts startDiagnostic):
// loadDiagnosticCandidates(catB) → selectDiagnostic(CATEGORY_B_BLUEPRINT, ...) — same pure composer
// startSession routes to, without dragging in the next/navigation graph that breaks under tsx.
async function main() {
  const catB = await prisma.category.findFirst({ where: { code: "B" } });
  if (!catB) throw new Error("no cat B");

  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      isPublished: true,
      archivedAt: null,
      categories: { some: { id: catB.id } },
    },
    select: { id: true, difficulty: true, questionKey: true },
  });
  const candidates = questions.map((q) => ({
    id: q.id,
    difficulty: q.difficulty,
    section: sectionFromQuestionKey(q.questionKey ?? ""),
  }));

  const availGroups = groupCandidatesByBlock(
    CATEGORY_B_BLUEPRINT,
    candidates.map((c) => ({ id: c.id, section: c.section })),
  );
  const avail = Object.fromEntries(
    Object.entries(availGroups).map(([k, ids]) => [k, ids.length]),
  );
  console.log("candidateLen", candidates.length, "availability", avail);

  const ids = selectDiagnostic(CATEGORY_B_BLUEPRINT, candidates, { count: DIAGNOSTIC_COUNT });
  const idSet = new Set(ids);
  const pooled = candidates.filter((c) => idSet.has(c.id)).map((c) => ({ id: c.id, section: c.section }));
  console.log("pooledLen", pooled.length, "DIAGNOSTIC_COUNT", DIAGNOSTIC_COUNT);

  const grouped = groupCandidatesByBlock(CATEGORY_B_BLUEPRINT, pooled);
  const c: Record<string, number> = {};
  for (const [k, gids] of Object.entries(grouped)) c[k] = gids.length;
  console.log("VECTOR", c);

  await prisma.$disconnect();
}
main();
