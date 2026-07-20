import { requireUser } from "@/lib/rbac";
import { listSavedQuestions } from "@/lib/server/saved";
import { startTestAction, removeSavedAction } from "@/app/actions/test";
import { Card, Button, DemoBadge, ExplanationNotice } from "@/components/ui";
import { Svitlyk } from "@/components/svitlyk";
import { OfflineAutoCache } from "@/components/offline-auto-cache";

export default async function SavedPage() {
  const user = await requireUser();
  const saved = await listSavedQuestions(user.id);

  return (
    <div className="space-y-5">
      {saved.length > 0 && <OfflineAutoCache scope="saved" />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Збережені питання</h1>
          <p className="text-sm text-muted">
            {saved.length > 0 ? `Збережено: ${saved.length}.` : "Ви ще нічого не зберегли."}
          </p>
        </div>
        {saved.length > 0 && (
          <form action={startTestAction}>
            <input type="hidden" name="mode" value="SAVED_QUESTIONS" />
            <Button type="submit">Практика збережених</Button>
          </form>
        )}
      </div>

      {saved.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <Svitlyk size={112} />
          <p className="text-sm text-muted">
            Під час тесту натискайте «☆ Зберегти питання», щоб повернутися до нього пізніше.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {saved.map((s) => (
            <Card key={s.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm text-muted">{s.question.topic?.title ?? "Без теми"}</span>
                {s.question.isDemo && <DemoBadge />}
              </div>
              <p className="font-medium text-ink">{s.question.text}</p>
              {s.question.explanation?.shortText && (
                <>
                  <p className="mt-2 text-sm text-muted">{s.question.explanation.shortText}</p>
                  <ExplanationNotice reviewedStatus={s.question.explanation.reviewedStatus} />
                </>
              )}
              <form action={removeSavedAction} className="mt-3">
                <input type="hidden" name="questionId" value={s.question.id} />
                <button className="text-sm font-medium text-warn hover:underline">Прибрати зі збережених</button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
