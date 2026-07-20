import { requireUser } from "@/lib/rbac";
import { getAnalyticsOptOut } from "@/app/actions/user";
import {
  getOrCreateProfile,
  setExamDateAction,
  setDailyGoalAction,
  reportExamOutcomeAction,
  type StudyProfileActionState,
} from "@/lib/server/study-profile";
import { getGlassTierOverride, setGlassTierAction } from "@/lib/server/user-settings";
import {
  ChangePasswordForm,
  AnalyticsOptOutToggle,
  ExamDateForm,
  ExamOutcomeForm,
  DailyGoalForm,
  GlassTierForm,
} from "@/components/account-forms";
import { Card, SectionTitle, LinkButton } from "@/components/ui";
import { InstallHint } from "@/components/install-hint";
import { OfflinePacksCard } from "@/components/offline-packs-card";

// The settings actions live in `server-only` modules, so the client forms receive
// them as bound "use server" wrappers, adapted to the useActionState signature.
async function submitExamDate(
  _prev: StudyProfileActionState | null,
  formData: FormData,
): Promise<StudyProfileActionState> {
  "use server";
  return setExamDateAction(formData);
}

async function submitExamOutcome(
  _prev: StudyProfileActionState | null,
  formData: FormData,
): Promise<StudyProfileActionState> {
  "use server";
  return reportExamOutcomeAction(formData);
}

async function submitDailyGoal(
  _prev: StudyProfileActionState | null,
  formData: FormData,
): Promise<StudyProfileActionState> {
  "use server";
  return setDailyGoalAction(formData);
}

async function submitGlassTier(
  _prev: StudyProfileActionState | null,
  formData: FormData,
): Promise<StudyProfileActionState> {
  "use server";
  return setGlassTierAction(formData);
}

export default async function AccountPage() {
  const user = await requireUser();
  const [optedOut, profile, glassTier] = await Promise.all([
    getAnalyticsOptOut(),
    getOrCreateProfile(user.id),
    getGlassTierOverride(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Акаунт</h1>
        <p className="text-sm text-muted">Налаштування вашого облікового запису.</p>
      </div>

      <Card className="max-w-md">
        <SectionTitle hint={user.email ?? undefined}>{user.name}</SectionTitle>
      </Card>

      <Card className="max-w-md">
        <SectionTitle hint="Якщо дата відома, план підбере спокійний темп.">
          Дата іспиту
        </SectionTitle>
        <ExamDateForm
          action={submitExamDate}
          initialDate={profile.examDate?.toISOString().slice(0, 10)}
        />
      </Card>

      <Card className="max-w-md">
        <SectionTitle hint="Це допомагає нам зробити підготовку кориснішою для вас.">
          Як пройшов іспит?
        </SectionTitle>
        {profile.examOutcome ? (
          <p className="mb-3 text-sm text-muted">
            Ваша остання позначка:{" "}
            {profile.examOutcome === "PASSED" ? "склав" : "не склав"}
            {profile.examOutcomeDate
              ? ` (${profile.examOutcomeDate.toISOString().slice(0, 10)})`
              : ""}
            .
          </p>
        ) : null}
        <ExamOutcomeForm
          action={submitExamOutcome}
          initialOutcome={profile.examOutcome ?? undefined}
          initialDate={profile.examOutcomeDate?.toISOString().slice(0, 10)}
        />
      </Card>

      <Card className="max-w-md">
        <SectionTitle hint="Невелика щоденна доза тримає темп без перевантаження.">
          Денна ціль
        </SectionTitle>
        <DailyGoalForm action={submitDailyGoal} initialGoal={profile.dailyGoal} />
      </Card>

      <Card className="max-w-md">
        <SectionTitle hint="Серія рахує дні з виконаною денною ціллю.">
          Серія навчання
        </SectionTitle>
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-xs text-muted">Поточна серія</dt>
            <dd className="font-display text-2xl font-semibold text-ink">
              {profile.streakCurrent}
            </dd>
            <dd className="text-xs text-muted">днів поспіль</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Найкраща серія</dt>
            <dd className="font-display text-2xl font-semibold text-ink">
              {profile.streakBest}
            </dd>
            <dd className="text-xs text-muted">днів</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Вихідні в запасі</dt>
            <dd className="font-display text-2xl font-semibold text-ink">
              {profile.freezeTokens}
            </dd>
            <dd className="text-xs text-muted">днів відпочинку</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted">
          Вихідний автоматично прикриває пропущений день — серія не згорає через відпочинок.
        </p>
      </Card>

      <Card className="max-w-md">
        <SectionTitle hint="Оберіть, наскільки прозорим виглядає інтерфейс.">
          Оформлення
        </SectionTitle>
        <GlassTierForm action={submitGlassTier} initialTier={glassTier} />
      </Card>

      <Card className="max-w-md">
        <SectionTitle hint="Введіть поточний пароль, щоб встановити новий.">
          Зміна пароля
        </SectionTitle>
        <ChangePasswordForm />
      </Card>

      <Card className="max-w-md">
        <SectionTitle hint="Першочергова, знеособлена аналітика у власній базі.">
          Конфіденційність
        </SectionTitle>
        <AnalyticsOptOutToggle initialOptedOut={optedOut} />
      </Card>

      <Card className="max-w-md">
        <SectionTitle hint="Завантажте копію своїх даних або видаліть акаунт.">
          Мої дані
        </SectionTitle>
        <LinkButton href="/account/data" variant="secondary">
          Керувати моїми даними
        </LinkButton>
      </Card>

      {/* Renders its own Card — pack list/usage comes from IndexedDB client-side. */}
      <OfflinePacksCard />

      {/* Renders its own Card — or nothing at all (installed/dismissed/no signal). */}
      <InstallHint />
    </div>
  );
}
