import { requireUser } from "@/lib/rbac";
import { countActiveMistakes, listMistakes } from "@/lib/server/mistakes";
import { checkIntelligenceAccess } from "@/lib/server/entitlements";
import { startTestAction } from "@/app/actions/test";
import { Card, Button, Badge, DemoBadge, ExplanationNotice } from "@/components/ui";
import { Svitlyk } from "@/components/svitlyk";
import { EntitlementTeaser } from "@/components/entitlement-teaser";
import { OfflineAutoCache } from "@/components/offline-auto-cache";
import { MISTAKE_RESOLVE_THRESHOLD } from "@/lib/constants";

export default async function MistakesPage() {
  const user = await requireUser();

  // Intelligence gate (wave16-08): the analytics LIST is gated, but the MISTAKE_PRACTICE start
  // CTA is NEVER gated — the locked branch uses the bare (ungated) active count to decide whether
  // the CTA renders, and never calls the gated loader.
  const { hasAccess } = await checkIntelligenceAccess(user.id);
  if (!hasAccess) {
    const activeCount = await countActiveMistakes(user.id);
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">
              Робота над помилками
            </h1>
            <p className="text-sm text-muted">
              {activeCount > 0
                ? `Практика помилок доступна завжди. Відповівши правильно ${MISTAKE_RESOLVE_THRESHOLD} рази поспіль, ви закриєте помилку.`
                : "Помилок немає — гарна робота."}
            </p>
          </div>
          {activeCount > 0 && (
            <form action={startTestAction}>
              <input type="hidden" name="mode" value="MISTAKE_PRACTICE" />
              <Button type="submit">Опрацювати помилки</Button>
            </form>
          )}
        </div>
        <EntitlementTeaser
          title="Аналітика помилок"
          valueLine="Список ваших складних питань із поясненнями — що саме і чому варто повторити."
        />
      </div>
    );
  }

  const mistakes = await listMistakes(user.id, true);

  return (
    <div className="space-y-5">
      {mistakes.length > 0 && <OfflineAutoCache scope="mistakes" />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Робота над помилками</h1>
          <p className="text-sm text-muted">
            {mistakes.length > 0
              ? `Активних помилок: ${mistakes.length}. Відповівши правильно ${MISTAKE_RESOLVE_THRESHOLD} рази поспіль, ви закриєте помилку.`
              : "Помилок немає — гарна робота."}
          </p>
        </div>
        {mistakes.length > 0 && (
          <form action={startTestAction}>
            <input type="hidden" name="mode" value="MISTAKE_PRACTICE" />
            <Button type="submit">Опрацювати помилки</Button>
          </form>
        )}
      </div>

      {mistakes.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <Svitlyk size={112} />
          <p className="text-sm text-muted">
            Коли ви помилитеся в тесті, питання з’явиться тут. Пройдіть кілька тестів, щоб почати.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {mistakes.map((m) => (
            <Card key={m.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm text-muted">{m.question.topic?.title ?? "Без теми"}</span>
                <div className="flex items-center gap-2">
                  {m.question.isDemo && <DemoBadge />}
                  <Badge tone="danger">Помилок: {m.mistakeCount}</Badge>
                </div>
              </div>
              <p className="font-medium text-ink">{m.question.text}</p>
              {m.question.explanation?.shortText && (
                <>
                  <p className="mt-2 text-sm text-muted">{m.question.explanation.shortText}</p>
                  <ExplanationNotice reviewedStatus={m.question.explanation.reviewedStatus} />
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
