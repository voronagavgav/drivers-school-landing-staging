import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { computeProgress } from "@/lib/server/progress";
import { getLatestReadiness } from "@/lib/server/mastery-readiness";
import { getResumableSession } from "@/lib/server/test-engine";
import { getStudyPlan, hasCompletedDiagnostic } from "@/lib/server/study";
import { dayKeyInTimezone, getOrCreateProfile } from "@/lib/server/study-profile";
import { recordEvent } from "@/lib/analytics";
import { recommendAction } from "@/lib/recommend-action";
import {
  DEFAULT_EXAM_QUESTION_COUNT,
  DEFAULT_EXAM_TIME_LIMIT_MINUTES,
  DEFAULT_EXAM_MAX_ERRORS,
  PLAN_SECONDS_PER_QUESTION,
  MODE_LABEL,
  READINESS_MIN_SEEN,
  type TestMode,
} from "@/lib/constants";
import { startTestAction } from "@/app/actions/test";
import { checkIntelligenceAccess } from "@/lib/server/entitlements";
import { countDueMistakes } from "@/lib/server/mistakes";
import { computeDueNudges, dismissNudge } from "@/lib/server/nudges";
import {
  Card,
  SectionTitle,
  Stat,
  RoadProgress,
  LinkButton,
  Badge,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { EntitlementTeaser } from "@/components/entitlement-teaser";
import { ReadinessDial } from "@/components/readiness-dial";
import { NudgeCard } from "@/components/nudge-card";
import { CalmRitual } from "@/components/calm-ritual";
import { A2hsPrompt } from "@/components/a2hs-prompt";

function StartButton({ mode, label, variant = "secondary" }: { mode: TestMode; label: string; variant?: "primary" | "secondary" }) {
  return (
    <form action={startTestAction}>
      <input type="hidden" name="mode" value={mode} />
      <SubmitButton variant={variant} className="w-full" pendingLabel="Починаємо…" data-track-label={`start_${mode}`}>{label}</SubmitButton>
    </form>
  );
}

// Ukrainian plural for "питання": 1/21 → питання, 2-4 → питання, else → питань.
function questionsPlural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 1 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "питання";
  return "питань";
}

// Copy for the recommend CTA, keyed by the pure decision kind (lib/recommend-action). The
// congratulatory «Тримайте темп» lives ONLY in the keep-pace mapping — never on the corrective
// weak-topics branch (detoxified tone, Wave-12b §A).
type RecommendCopy = { text: string; cta: string } & ({ mode: TestMode } | { href: string });

const RECOMMEND_COPY: Record<ReturnType<typeof recommendAction>["kind"], RecommendCopy> = {
  "mixed-practice": {
    text: "Змішана практика підбере питання з усіх тем — з пріоритетом слабших.",
    mode: "MIXED_PRACTICE",
    cta: "Змішана практика",
  },
  "weak-topics": {
    text: "Останні результати вказують на прогалини — попрацюйте над питаннями з найслабших тем.",
    mode: "MIXED_PRACTICE",
    cta: "Практикувати слабкі теми",
  },
  "keep-pace-exam": {
    text: "Тримайте темп: ще кілька симуляцій закріплять результат.",
    href: "#exam",
    cta: "До симуляції іспиту",
  },
};

// Category-wide pool modes (exam/mixed/adaptive) share the fallback copy — keeping those mode
// literals out of this map keeps the dashboard down to a single exam start form.
const EMPTY_NOTICE_FALLBACK = "Для цієї категорії ще немає опублікованих питань.";
const EMPTY_NOTICE: Record<string, string> = {
  MISTAKE_PRACTICE: "Поки немає помилок для опрацювання — спочатку пройдіть кілька тестів.",
  SAVED_QUESTIONS: "Ви ще не зберегли жодного питання. Зберігайте їх під час тестів.",
  TOPIC_PRACTICE: "У цій темі ще немає опублікованих питань.",
  SPACED_REVIEW: "На сьогодні нічого не заплановано на повторення — можна відпочити або пройти практику.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const user = await requireUser();
  if (!user.selectedCategoryId) redirect("/onboarding");

  const { empty } = await searchParams;
  void recordEvent("dashboard_viewed", user.id, {});

  const p = await computeProgress(user.id, user.selectedCategoryId);

  // Intelligence gate (wave16-08): checked BEFORE any gated loader — when locked we never call
  // getStudyPlan and render teasers instead (the loader itself also throws; defense in depth).
  const { hasAccess: intelligenceUnlocked } = await checkIntelligenceAccess(user.id);

  // The ONE readiness number (Wave-12b §A): the latest W11 snapshot — never recomputed on page load.
  // The top-line percent stays FREE; the detail props (bottleneck line, seen-progress counts) are
  // nulled out when locked so the client dial can never receive gated data.
  const dial = await getLatestReadiness(user.id, user.selectedCategoryId);
  const sufficientData = dial?.sufficientData ?? false;

  // readiness_aha (wave17-11): the dial renders a REAL number only once the snapshot has enough seen
  // data. Fire the funnel stage at the actual render point, fire-and-forget, non-PII payload.
  if (sufficientData) void recordEvent("readiness_aha", user.id, { categoryId: user.selectedCategoryId });

  // A2HS value moment (spec P1.7): the install invite may appear ONLY after real value —
  // at least one completed session, or enough data for the readiness dial to mean something.
  // Never on arrival. Passed as a plain boolean to the client prompt, which itself still gates
  // on the browser `beforeinstallprompt` event and the neutral session dismiss.
  const a2hsValueReached = p.completedSessions >= 1 || sufficientData;

  // «Сьогоднішній план» (Wave-12b §A): finite quota + today's StudyDay progress +
  // profile streak/freeze fields — the legacy activity-dates streak retired with it.
  const plan = intelligenceUnlocked ? await getStudyPlan(user.id) : null;
  const profile = await getOrCreateProfile(user.id);
  const todayKey = dayKeyInTimezone(new Date(), profile.timezone);
  const today = await prisma.studyDay.findUnique({
    where: { userId_day: { userId: user.id, day: todayKey } },
    select: { reviewCount: true, goalMet: true },
  });
  const answeredToday = today?.reviewCount ?? 0;
  const goalReached = today?.goalMet ?? false;
  const planMinutes = plan ? Math.ceil((plan.dailyQuota * PLAN_SECONDS_PER_QUESTION) / 60) : 0;

  const resumable = await getResumableSession(user.id, user.selectedCategoryId);

  // Spaced-repetition: how many mistakes are due for review right now (wave5-03).
  const dueReviewCount = await countDueMistakes(user.id);

  // Recommended next action — the pure §A decision matrix fed with real learner state.
  const lastExam = await prisma.testSession.findFirst({
    where: {
      userId: user.id,
      categoryId: user.selectedCategoryId,
      mode: "EXAM_SIMULATION",
      status: "COMPLETED",
    },
    orderBy: { finishedAt: "desc" },
    select: { result: true },
  });
  const { kind: recommendKind } = recommendAction({
    sufficientData,
    lastExamPassed: lastExam ? lastExam.result === "PASSED" : null,
    hasWeakTopics: p.weakTopics.length > 0,
  });
  const recommend = RECOMMEND_COPY[recommendKind];

  // The day's single quiet nudge (spec §A) — decided + persisted server-side; null
  // when nothing is due, capped, dismissed, or the user's notif toggles opt out.
  const nudge = await computeDueNudges(user.id);

  // A single gentle DIAGNOSTIC invite (spec §D/§E) — shown only until the user has ever
  // completed one (derived from the session table, no new schema). Quiet Card, not a NudgeCard:
  // a static "you've never done a diagnostic" prompt needs no policy/NotificationLog plumbing.
  const showDiagnosticCard = !(await hasCompletedDiagnostic(user.id));

  // Real dismiss path (wave12b-14 inline "use server" wrapper): scoped to this user's
  // id; after the flip the card is gone on re-render (revalidatePath).
  async function dismissNudgeAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (id) await dismissNudge(user.id, id);
    revalidatePath("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Вітаємо, {user.name}</h1>
          <p className="text-sm text-muted">
            Категорія: {user.selectedCategory?.title ?? "—"} ·{" "}
            <a href="/onboarding" className="text-green-deep">змінити</a>
          </p>
        </div>
      </div>

      {empty && (
        <div className="rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-ink">
          {EMPTY_NOTICE[empty] ?? EMPTY_NOTICE_FALLBACK}
        </div>
      )}

      {/* Resume in-progress session */}
      {resumable && (
        <Card className="border-green-deep/40 bg-green-deep/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-ink">Продовжити тест</h2>
              <p className="mt-1 text-sm text-muted">
                У вас є незавершений тест: {MODE_LABEL[resumable.mode as TestMode] ?? resumable.mode}.
              </p>
            </div>
            <LinkButton href={`/test/${resumable.id}`} className="shrink-0">Продовжити</LinkButton>
          </div>
        </Card>
      )}

      {/* Due for review today (spaced repetition over the mistake bank) */}
      {dueReviewCount > 0 && (
        <Card className="border-amber/40 bg-amber/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-ink">
                {dueReviewCount} {questionsPlural(dueReviewCount)} на повторення сьогодні
              </h2>
              <p className="mt-1 text-sm text-muted">
                Інтервальне повторення повертає складні питання саме тоді, коли їх варто закріпити.
              </p>
            </div>
            <div className="shrink-0 sm:w-48">
              <StartButton mode="MISTAKE_PRACTICE" label="Повторити зараз" variant="primary" />
            </div>
          </div>
        </Card>
      )}

      {/* Readiness dial hero — the ONE readiness metric (Wave-12b §A). Locked (wave16-08): the
          top-line percent stays free, the detail is replaced by the teaser; with insufficient data
          the whole detail state (seen-progress counts) is the detail, so only the teaser shows. */}
      <div>
        {(intelligenceUnlocked || sufficientData) && (
          <>
            <ReadinessDial
              sufficientData={sufficientData}
              seenCount={intelligenceUnlocked ? (dial?.seenCount ?? 0) : 0}
              minSeen={READINESS_MIN_SEEN}
              dialPercent={dial?.dialPercent ?? 0}
              bottleneckTitle={intelligenceUnlocked ? (dial?.snapshot.bottleneckTitle ?? null) : null}
              bottleneckTopicId={intelligenceUnlocked ? (dial?.bottleneckTopicId ?? null) : null}
            />
            <p className="mt-2 text-xs text-muted">
              Показник готовності — внутрішня оцінка для підготовки. Він не гарантує складання офіційного іспиту.
            </p>
          </>
        )}
        {!intelligenceUnlocked && (
          <div className={sufficientData ? "mt-3" : undefined}>
            <EntitlementTeaser
              title="Деталі готовності"
              valueLine="Побачте, яка тема стримує ваш результат і скільки лишилося до повної оцінки готовності."
            />
          </div>
        )}
      </div>

      {/* «Сьогоднішній план» — finite daily dose + one-tap adaptive start (Wave-12b §A).
          Locked (wave16-08): the whole card is replaced by the teaser. */}
      {!intelligenceUnlocked || plan == null ? (
        <EntitlementTeaser
          title="Сьогоднішній план"
          valueLine="Персональний план на день: скільки і що саме повторити, щоб спокійно встигнути до іспиту."
        />
      ) : (
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Сьогоднішній план</h2>
            <p className="mt-1 text-sm text-ink">
              ≈{plan.dailyQuota} {questionsPlural(plan.dailyQuota)} · {planMinutes} хв
            </p>
            <p className="mt-1 text-sm text-muted">{plan.message}</p>
          </div>
          <div className="shrink-0 sm:w-48">
            <StartButton mode="ADAPTIVE_REVIEW" label="Почати план" variant="primary" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted">Сьогодні: {answeredToday} / {profile.dailyGoal}</span>
            {goalReached && <Badge tone="go">Ціль виконано</Badge>}
          </div>
          <div className="mt-2">
            <RoadProgress value={Math.min(100, (answeredToday / profile.dailyGoal) * 100)} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Дні практики: {profile.streakCurrent} · Вихідні у запасі: {profile.freezeTokens}
        </p>
      </Card>
      )}

      {/* Gentle diagnostic invite (spec §D/§E) — a single quiet card near the dial hero,
          retired once any DIAGNOSTIC session is completed. Never stacks noisily. */}
      {showDiagnosticCard && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-ink">Стартова перевірка</h2>
              <p className="mt-1 text-sm text-muted">
                Ще не проходили стартову перевірку? Дай нам 3 хвилини — покажемо, з чого почати.
              </p>
            </div>
            <div className="shrink-0 sm:w-48">
              <StartButton mode="DIAGNOSTIC" label="Пройти перевірку" />
            </div>
          </div>
        </Card>
      )}

      {/* The day's single quiet nudge — below the dial hero, above the recommended action. */}
      {nudge && <NudgeCard nudge={nudge} dismissAction={dismissNudgeAction} />}

      {/* Recommended action */}
      <Card className="border-green-deep/30 bg-green-deep/5">
        <SectionTitle>Рекомендована дія</SectionTitle>
        <p className="mb-3 text-sm text-ink">{recommend.text}</p>
        {"mode" in recommend ? (
          <form action={startTestAction}>
            <input type="hidden" name="mode" value={recommend.mode} />
            <SubmitButton pendingLabel="Починаємо…" data-track-label={`recommend_${recommend.mode}`}>{recommend.cta}</SubmitButton>
          </form>
        ) : (
          <LinkButton href={recommend.href}>{recommend.cta}</LinkButton>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card><Stat label="Відповідей" value={p.totalAnswered} sub={`${p.uniqueAnswered} унікальних`} /></Card>
        <Card><Stat label="Точність" value={`${Math.round(p.accuracy * 100)}%`} /></Card>
        <Card><Stat label="Тестів пройдено" value={p.completedSessions} /></Card>
        <Card><Stat label="Помилок" value={p.unresolvedMistakes} sub={`${p.repeatedMistakes} повторних`} /></Card>
      </div>

      <Card>
        <SectionTitle>Загальна точність</SectionTitle>
        <RoadProgress value={p.accuracy * 100} />
      </Card>

      {/* Exam simulation — the `Іспит` tab (app-nav) anchors here via /dashboard#exam.
          The ONE simulation entry point on the dashboard (Wave-12b §C: graded exposure —
          the format chip + calm copy frame it as rehearsal, not a verdict). */}
      <div id="exam" className="scroll-mt-4">
        <SectionTitle hint="Той самий формат — без ставок">Симуляція іспиту</SectionTitle>
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge tone="lane">
                {DEFAULT_EXAM_QUESTION_COUNT} питань · {DEFAULT_EXAM_TIME_LIMIT_MINUTES} хв · до {DEFAULT_EXAM_MAX_ERRORS} помилок
              </Badge>
              <p className="mt-3 text-sm text-ink">
                Симуляція — це тренування формату: ті самі правила й таймер, що й на офіційному
                іспиті, але помилятися тут безпечно.
              </p>
              <p className="mt-1 text-sm text-muted">
                Кожна спроба робить формат звичнішим — результат нікуди не записується, крім вашої статистики.
              </p>
            </div>
            <div className="shrink-0 sm:w-48">
              {/* The exam CTA renders through the pre-exam calm ritual (spec §C) — a client-only,
                  always-skippable breathing screen between the CTA and the real session start. */}
              <CalmRitual mode="EXAM_SIMULATION">
                <SubmitButton variant="primary" className="w-full" pendingLabel="Починаємо…" data-track-label="start_EXAM_SIMULATION">
                  Почати симуляцію
                </SubmitButton>
              </CalmRitual>
            </div>
          </div>
        </Card>
      </div>

      {/* Practice quick start */}
      <div>
        <SectionTitle hint="Оберіть режим тренування">Практика</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <h3 className="font-display text-base font-semibold text-ink">Змішана практика</h3>
            <p className="mb-3 mt-1 text-sm text-muted">Питання з усіх тем, з пріоритетом слабких. Пояснення одразу.</p>
            <StartButton mode="MIXED_PRACTICE" label="Почати практику" />
          </Card>
          <Card>
            <h3 className="font-display text-base font-semibold text-ink">Робота над помилками</h3>
            <p className="mb-3 mt-1 text-sm text-muted">Повертаємо складні питання, доки не засвоїте.</p>
            <StartButton mode="MISTAKE_PRACTICE" label="Опрацювати помилки" />
          </Card>
          <Card>
            <h3 className="font-display text-base font-semibold text-ink">Практика за темами</h3>
            <p className="mb-3 mt-1 text-sm text-muted">Оберіть конкретну тему для тренування.</p>
            <LinkButton href="/practice" variant="secondary" className="w-full">Обрати тему</LinkButton>
          </Card>
        </div>
      </div>

      {/* Weak topics */}
      {p.weakTopics.length > 0 && (
        <Card>
          <SectionTitle>Слабкі теми</SectionTitle>
          <ul className="space-y-2">
            {p.weakTopics.map((t) => (
              <li key={t.topicId} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink">{t.title}</span>
                <Badge tone={t.accuracy < 0.4 ? "danger" : "lane"}>{Math.round(t.accuracy * 100)}%</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Add-to-home-screen invite (spec P1.7) — mounted AFTER value (≥1 completed session or a
          meaningful readiness dial), never at the shell top / on arrival. The client component
          fails silent without the browser install event and sticks its neutral dismiss. */}
      <A2hsPrompt show={a2hsValueReached} />
    </div>
  );
}
