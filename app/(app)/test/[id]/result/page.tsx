import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/auth";
import { getAnonUser } from "@/lib/server/anon-session";
import { prisma } from "@/lib/db";
import { getSessionState } from "@/lib/server/test-engine";
import { startTestAction } from "@/app/actions/test";
import { topWrongTopics } from "@/lib/result-topics";
import { weakestTopicFromAnswers } from "@/lib/test-engine/diagnostic";
import { getLatestReadiness } from "@/lib/server/mastery-readiness";
import { recordEvent } from "@/lib/analytics";
import { isValueFirstFunnelEnabled } from "@/lib/funnel";
import { isEntitlementsEnabled } from "@/lib/entitlements";
import { DEFAULT_EXAM_MAX_ERRORS, MODE_LABEL, READINESS_MIN_SEEN, type TestMode } from "@/lib/constants";
import { Card, Badge, Button, LinkButton, Stat, DemoBadge, ExplanationNotice, cx } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { Svitlyk } from "@/components/svitlyk";
import { CalmRitual } from "@/components/calm-ritual";
import { ReadinessDial } from "@/components/readiness-dial";
import { ExamAccessOffer } from "@/components/exam-access-offer";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // READ-ONLY, flag-aware identity (spec wave18 T1): a real logged-in user wins; else — WHEN the
  // value-first funnel is on — the read-only anon-play user (never minted here, no cookie set on a
  // GET render); else the old requireUser()/login redirect (byte-identical flag-off). An anon can
  // view their OWN free payoff (score / honest stats / «Розбір питань»), but the readiness dial and
  // offer card stay gated below. A null anon (no valid cookie) falls through to requireUser() →
  // /login — the page never renders with a null user. Own-session-only below keys on user.id (no IDOR).
  const user =
    (await getCurrentUser()) ??
    (isValueFirstFunnelEnabled() ? await getAnonUser() : null) ??
    (await requireUser());

  const [session, state] = await Promise.all([
    prisma.testSession.findFirst({ where: { id, userId: user.id } }),
    getSessionState(id, user.id),
  ]);
  if (!session || !state) notFound();
  if (session.status !== "COMPLETED") redirect(`/test/${id}`);

  const total = session.totalQuestions;
  const correct = session.correctAnswers;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const isExam = session.mode === "EXAM_SIMULATION";
  const isDiagnostic = session.mode === "DIAGNOSTIC";
  const passed = session.result === "PASSED";

  // DIAGNOSTIC finish (spec §D): the FIRST honest readiness reveal + the ONE topic to start with,
  // named from the diagnostic's OWN answers (never a fabricated weakness) + a plan CTA. The dial is
  // fed from the REAL snapshot — `sufficientData` passes through untouched, so at N=15 < minSeen the
  // honest insufficient-data state shows (the number is the lucky case, per wave15-01 finding (f)).
  const dial = isDiagnostic ? await getLatestReadiness(user.id, session.categoryId) : null;

  // Value-trigger (spec §3/§7): the offer is anchored to the REAL dial and surfaces only AFTER the dial
  // has rendered a real (sufficient-data) number — never on a timer. `readiness_aha` fires the moment
  // that real number is shown; the paid-ask gate is decided SERVER-side (a client component can't read
  // the non-public flag env). Both flags OFF ⇒ no offer, no visual change (wave-16 inertness property).
  const dialReal = dial?.sufficientData === true;
  if (dialReal) void recordEvent("readiness_aha", user.id);
  const showOffer = dialReal && (isValueFirstFunnelEnabled() || isEntitlementsEnabled());
  const weakestTopicId = isDiagnostic
    ? weakestTopicFromAnswers(
        state.questions.flatMap((q) =>
          q.answered && q.topicId ? [{ topicId: q.topicId, isCorrect: q.isCorrect === true }] : [],
        ),
      )
    : null;
  const weakestTitle = weakestTopicId
    ? (state.questions.find((q) => q.topicId === weakestTopicId)?.topicTitle ?? null)
    : null;

  // Honest labelling (spec §C): «Помилок» = answered-and-wrong only; an unanswered question is
  // «без відповіді», never a «помилка» in the UI. Exam SCORING is untouched — evaluateExam still
  // counts unanswered toward the pass/fail error budget (the disclaimer below reflects that).
  const answeredWrong = state.questions.filter((q) => q.answered && q.isCorrect === false).length;
  const unanswered = state.questions.filter((q) => !q.answered).length;
  const wrongTopics = topWrongTopics(
    state.questions.flatMap((q) =>
      q.topicId && q.topicTitle
        ? [{ topicId: q.topicId, topicTitle: q.topicTitle, answered: q.answered, correct: q.isCorrect === true }]
        : [],
    ),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-sm text-muted">{MODE_LABEL[session.mode as TestMode] ?? "Тест"}</p>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {isExam
            ? passed
              ? "Складено. Тримайте форму."
              : "Не цього разу — і це нормально. Почнімо з найслабших тем."
            : "Результат"}
        </h1>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-6">
            <Stat label="Правильно" value={`${correct}/${total}`} />
            <Stat label="Точність" value={`${accuracy}%`} />
            <Stat label="Помилок" value={answeredWrong} />
            {unanswered > 0 && <Stat label="Без відповіді" value={unanswered} />}
          </div>
          {isExam && (
            <Badge tone={passed ? "go" : "danger"}>
              {passed ? "Складено (симуляція)" : "Не складено (симуляція)"}
            </Badge>
          )}
        </div>
        {isExam && (
          <p className="mt-3 text-xs text-muted">
            Умова симуляції: не більше {DEFAULT_EXAM_MAX_ERRORS} помилок. Це навчальна симуляція, а не
            офіційний іспит.
          </p>
        )}
      </Card>

      {isDiagnostic && (
        <div className="space-y-4">
          <ReadinessDial
            sufficientData={dial?.sufficientData ?? false}
            seenCount={dial?.seenCount ?? 0}
            minSeen={READINESS_MIN_SEEN}
            dialPercent={dial?.dialPercent ?? 0}
            bottleneckTitle={dial?.snapshot.bottleneckTitle ?? null}
            bottleneckTopicId={dial?.bottleneckTopicId ?? null}
          />
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-ink">Ось з чого почати</h2>
            {weakestTopicId && weakestTitle ? (
              <>
                <p className="text-sm text-ink">
                  Найслабша тема зараз — <span className="font-semibold">{weakestTitle}</span>. Один
                  короткий підхід — і вона стане простішою.
                </p>
                <form action={startTestAction}>
                  <input type="hidden" name="mode" value="TOPIC_PRACTICE" />
                  <input type="hidden" name="topicId" value={weakestTopicId} />
                  <SubmitButton
                    pendingLabel="Починаємо…"
                    aria-label={`практикувати тему ${weakestTitle}`}
                  >
                    Почати з цієї теми
                  </SubmitButton>
                </form>
              </>
            ) : (
              <p className="text-sm text-ink">
                Рівний, впевнений старт — жодної теми, що просідає. Далі просто тримайте ритм.
              </p>
            )}
            <LinkButton href="/dashboard" variant="secondary">
              Мій план навчання
            </LinkButton>
          </Card>
          {showOffer && dial && (
            <ExamAccessOffer dialPercent={dial.dialPercent} sufficientData={dial.sufficientData} />
          )}
        </div>
      )}

      {/* Honest stats (wave12b-review major): branch on answeredWrong — session.wrongAnswers counts
          UNANSWERED as wrong, so a timer-expiry finish showed corrective "your mistakes won't repeat"
          copy over «Помилок: 0» (and unanswered questions never enter the mistake bank at all). */}
      <Card className="flex items-center gap-4 py-5">
        <Svitlyk size={88} />
        <div className="space-y-1">
          <p className="font-medium text-ink">
            {answeredWrong > 0
              ? "Кожна помилка — це тема, яку ви щойно закрили."
              : unanswered > 0
                ? "Ви не помилилися — лише не встигли відповісти на кілька питань."
                : "Спокійна, впевнена робота. Так тримати."}
          </p>
          <p className="text-sm text-muted">
            {answeredWrong > 0
              ? "Розберіть їх нижче — ці питання вже не повторяться. Ви ростете з кожним тестом."
              : unanswered > 0
                ? "Наступного разу трохи швидший темп — а поки перегляньте пропущені питання нижче."
                : "Продовжуйте у власному темпі — розуміння важливіше за швидкість."}
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {/* A repeat EXAM_SIMULATION goes through the pre-exam calm ritual (spec §C); other modes
            re-run straight away (the ritual only ever gates the exam format). */}
        {isExam ? (
          <CalmRitual mode={session.mode}>
            <Button type="submit">Пройти ще раз</Button>
          </CalmRitual>
        ) : (
          <form action={startTestAction}>
            <input type="hidden" name="mode" value={session.mode} />
            <Button type="submit">Пройти ще раз</Button>
          </form>
        )}
        <LinkButton href="/mistakes" variant="secondary">Робота над помилками</LinkButton>
        <LinkButton href="/dashboard" variant="ghost">На дашборд</LinkButton>
      </div>

      {wrongTopics.length > 0 && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Найбільше помилок у темах</h2>
          <ul className="mt-3 space-y-2">
            {wrongTopics.map((t) => (
              <li key={t.topicId} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-ink">
                  {t.topicTitle} <span className="text-muted">· помилок: {t.wrong}</span>
                </span>
                <form action={startTestAction}>
                  <input type="hidden" name="mode" value="TOPIC_PRACTICE" />
                  <input type="hidden" name="topicId" value={t.topicId} />
                  <SubmitButton
                    variant="secondary"
                    pendingLabel="Починаємо…"
                    aria-label={`практикувати тему ${t.topicTitle}`}
                  >
                    Практикувати
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">Розбір питань</h2>
        {state.questions.map((q, i) => {
          const yours = q.selectedOptionId;
          return (
            <Card key={q.questionId}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm text-muted">
                  Питання {i + 1}{q.topicTitle ? ` · ${q.topicTitle}` : ""}
                </span>
                <div className="flex items-center gap-2">
                  {q.isDemo && <DemoBadge />}
                  <Badge tone={q.answered ? (q.isCorrect ? "go" : "danger") : "neutral"}>
                    {q.answered ? (q.isCorrect ? "Правильно" : "Помилка") : "без відповіді"}
                  </Badge>
                </div>
              </div>
              <p className="font-medium text-ink">{q.text}</p>
              <ul className="mt-3 space-y-1.5">
                {q.options.map((o) => {
                  const isCorrect = o.isCorrect === true;
                  const isYours = o.id === yours;
                  return (
                    <li
                      key={o.id}
                      className={cx(
                        "rounded-lg border px-3 py-2 text-sm",
                        isCorrect && "border-green-deep bg-green-deep/10 text-ink",
                        !isCorrect && isYours && "border-warn bg-warn/10 text-ink",
                        !isCorrect && !isYours && "border-line text-muted",
                      )}
                    >
                      {o.text}
                      {isCorrect && <span className="ml-2 text-xs font-semibold text-green-deep">правильна</span>}
                      {isYours && !isCorrect && <span className="ml-2 text-xs font-semibold text-warn">ваша відповідь</span>}
                    </li>
                  );
                })}
              </ul>
              {q.explanation && (
                <div className="mt-3 rounded-lg border border-line bg-field p-3 text-sm">
                  {q.explanation.shortText && <p className="font-medium text-ink">{q.explanation.shortText}</p>}
                  {q.explanation.detailedText && <p className="mt-1 text-muted">{q.explanation.detailedText}</p>}
                  {q.explanation.legalReference && <p className="mt-2 text-xs text-muted">{q.explanation.legalReference}</p>}
                  <ExplanationNotice reviewedStatus={q.explanation.reviewedStatus} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
