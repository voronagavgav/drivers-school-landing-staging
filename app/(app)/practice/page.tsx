import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { countDueReviews } from "@/lib/server/study";
import { MODE_LABEL } from "@/lib/constants";
import { startTestAction } from "@/app/actions/test";
import { Card, SectionTitle, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { Svitlyk } from "@/components/svitlyk";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const user = await requireUser();
  if (!user.selectedCategoryId) redirect("/onboarding");
  const categoryId = user.selectedCategoryId;
  const { empty } = await searchParams;

  const topics = await prisma.topic.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  // Count only SERVABLE questions per topic within the selected category — i.e. the exact pool a
  // per-topic practice session would build. Mirrors startSession's baseWhere
  // (lib/server/test-engine.ts), so the count we show never promises questions the engine won't serve.
  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      isPublished: true,
      archivedAt: null,
      categories: { some: { id: categoryId } },
    },
    select: { topicId: true },
  });
  const counts = new Map<string, number>();
  for (const q of questions) if (q.topicId) counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1);

  // Only render topics with ≥1 servable question in this category — off-category and demo-only
  // topics drop out, so every visible card has a startable pool (never a count-0 / disabled card).
  const servableTopics = topics.filter((t) => (counts.get(t.id) ?? 0) > 0);

  // Live «заплановано на сьогодні» count for the spaced-review badge (Wave-12b §B).
  const dueCount = await countDueReviews(user.id, categoryId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Практика</h1>
        <p className="text-sm text-muted">Повторюйте розумно, тренуйте теми або все одразу.</p>
      </div>

      {/* Adaptive family first (Wave-12b §B): smart review leads, spaced follows. */}
      <Card className="border-green-deep/40 bg-green-deep/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              {MODE_LABEL.ADAPTIVE_REVIEW}
            </h2>
            <p className="text-sm text-muted">
              Світлик підбирає картки сам: те, що час повторити, плюс трохи нового.
            </p>
          </div>
          <form action={startTestAction}>
            <input type="hidden" name="mode" value="ADAPTIVE_REVIEW" />
            <SubmitButton pendingLabel="Починаємо…">Почати</SubmitButton>
          </form>
        </div>
      </Card>

      {/* Calm nothing-due state — never an error: the memory is simply holding (Wave-12b §B). */}
      {empty === "SPACED_REVIEW" && (
        <Card className="flex flex-col items-center gap-3 border-green-deep/40 bg-green-deep/5 py-8 text-center">
          <Svitlyk size={96} />
          <p className="text-sm text-ink">
            На сьогодні нічого не заплановано — твоя пам'ять ще тримає все вивчене.
          </p>
          <p className="text-sm text-muted">Повернись завтра — Світлик підготує нові повторення.</p>
        </Card>
      )}

      <Card className="border-green-deep/30 bg-green-deep/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              {MODE_LABEL.SPACED_REVIEW}
            </h2>
            <p className="text-sm text-muted">
              Повторення за розкладом пам'яті — саме тоді, коли картка ось-ось забудеться.
            </p>
            {dueCount > 0 ? (
              <div className="mt-2">
                <Badge tone="sign">До повторення: {dueCount}</Badge>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted">На сьогодні все повторено — можна відпочити.</p>
            )}
          </div>
          <form action={startTestAction}>
            <input type="hidden" name="mode" value="SPACED_REVIEW" />
            <SubmitButton variant="secondary" pendingLabel="Починаємо…">Почати</SubmitButton>
          </form>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              {MODE_LABEL.MIXED_PRACTICE}
            </h2>
            <p className="text-sm text-muted">Питання з усіх тем, з пріоритетом слабких.</p>
          </div>
          <form action={startTestAction}>
            <input type="hidden" name="mode" value="MIXED_PRACTICE" />
            <SubmitButton variant="secondary" pendingLabel="Починаємо…">Почати</SubmitButton>
          </form>
        </div>
      </Card>

      {/* Quiet siblings (spec §E): short warm-up, endless marathon, road-signs drill —
          same form+hidden-mode idiom, secondary CTA so the adaptive card stays the lead. */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              {MODE_LABEL.QUICK}
            </h2>
            <p className="text-sm text-muted">
              Коротка розминка на кілька питань — приблизно 5 хв, без поспіху.
            </p>
          </div>
          <form action={startTestAction}>
            <input type="hidden" name="mode" value="QUICK" />
            <SubmitButton variant="secondary" pendingLabel="Починаємо…">Почати</SubmitButton>
          </form>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              {MODE_LABEL.MARATHON}
            </h2>
            <p className="text-sm text-muted">
              Питання одне за одним, скільки завгодно — зупинишся, коли захочеш.
            </p>
          </div>
          <form action={startTestAction}>
            <input type="hidden" name="mode" value="MARATHON" />
            <SubmitButton variant="secondary" pendingLabel="Починаємо…">Почати</SubmitButton>
          </form>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              {MODE_LABEL.SIGN_TRAINER}
            </h2>
            <p className="text-sm text-muted">Тренування дорожніх знаків та розмітки.</p>
          </div>
          <form action={startTestAction}>
            <input type="hidden" name="mode" value="SIGN_TRAINER" />
            <SubmitButton variant="secondary" pendingLabel="Починаємо…">Почати</SubmitButton>
          </form>
        </div>
      </Card>

      <div>
        <SectionTitle>Теми</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {servableTopics.map((t) => {
            const n = counts.get(t.id) ?? 0;
            return (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-ink">{t.title}</h3>
                  <Badge tone="sign">{n} пит.</Badge>
                </div>
                {t.description && <p className="mt-1 text-sm text-muted">{t.description}</p>}
                <form action={startTestAction} className="mt-3">
                  <input type="hidden" name="mode" value="TOPIC_PRACTICE" />
                  <input type="hidden" name="topicId" value={t.id} />
                  <SubmitButton variant="secondary" className="w-full" pendingLabel="Починаємо…">
                    Тренувати тему
                  </SubmitButton>
                </form>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
