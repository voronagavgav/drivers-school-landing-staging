import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { selectCategoryAction } from "@/app/actions/user";
import {
  answerOnboardingExamDate,
  getOrCreateProfile,
  setDailyGoalAction,
  setPrepModeAction,
} from "@/lib/server/study-profile";
import { PREP_MODES, type PrepMode } from "@/lib/constants";
import { getStudyPlan, hasCompletedDiagnostic } from "@/lib/server/study";
import { startTestAction } from "@/app/actions/test";
import { Card, LinkButton } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { LegalDisclaimer } from "@/components/brand";

// Onboarding = ≤4 sequential SERVER steps routed by ?step= (no client stepper state):
// 1 category (required, default B), 2 exam date (optional JTBD), 3 prep mode (optional JTBD),
// 4 daily goal (optional), done = the first plan. Steps 2–4 write through the W11 self-only
// actions and stay skippable — «Пропустити» is a plain link that writes nothing (and fires no
// telemetry: absence of the event IS the skip signal), so the dashboard is always ≤4 clicks away.

async function saveExamDateAction(formData: FormData): Promise<void> {
  "use server";
  const result = await answerOnboardingExamDate(formData);
  // Field-level validation copy is a separate task; an invalid value just re-shows the step.
  redirect("error" in result ? "/onboarding?step=2" : "/onboarding?step=3");
}

async function savePrepModeAction(formData: FormData): Promise<void> {
  "use server";
  const result = await setPrepModeAction(formData);
  redirect("error" in result ? "/onboarding?step=3" : "/onboarding?step=4");
}

async function saveDailyGoalAction(formData: FormData): Promise<void> {
  "use server";
  const result = await setDailyGoalAction(formData);
  redirect("error" in result ? "/onboarding?step=4" : "/onboarding?step=done");
}

function StepIndicator({ step }: { step: number }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Крок {step} з 4</p>
  );
}

// JTBD prep-mode labels (spec T4). Enum-only, informal ти-form copy matching the flow.
const PREP_MODE_LABELS: Record<PrepMode, string> = {
  SCHOOL: "Автошкола",
  SELF: "Самостійно",
  BOTH: "І те, і те",
};

const FIELD_INPUT =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-green-deep sm:text-sm";

// DIAGNOSTIC entry (spec §D): offered right after the category is chosen (step 1 already
// persisted `selectedCategoryId`, so the mode discriminator is all the start form needs).
// Skippable — the setup steps continue below it; retired once any diagnostic is completed.
function DiagnosticCta() {
  return (
    <Card className="mt-5 border-green-deep/30 bg-green-deep/5">
      <h2 className="font-display text-base font-semibold text-ink">Стартова перевірка</h2>
      <p className="mt-1 text-sm text-ink">
        Дай нам 3 хвилини — покажемо, з чого почати. Це необовʼязково, і це не іспит — без оцінок.
      </p>
      <form action={startTestAction} className="mt-3">
        <input type="hidden" name="mode" value="DIAGNOSTIC" />
        <SubmitButton
          variant="secondary"
          pendingLabel="Починаємо…"
          data-track-label="onboarding_diagnostic"
        >
          Пройти перевірку
        </SubmitButton>
      </form>
    </Card>
  );
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const user = await requireUser();
  const raw = (await searchParams).step;
  const step =
    raw === "2" || raw === "3" || raw === "4" || raw === "done" ? raw : "1";

  if (step === "done") {
    // The ONE free plan surface (wave16-01 Findings 1a-ii): the first-run finish screen shows the
    // first plan to everyone — a brand-new user cannot have heard of pricing yet.
    const plan = await getStudyPlan(user.id, new Date(), { skipEntitlementGate: true });
    // The pure plan copy never says this literally — the finish screen composes the calm
    // framing when a set exam date yields a feasible plan, else falls back to plan.message.
    const firstPlan =
      plan.daysLeft != null && plan.feasible
        ? `~${plan.daysLeft} днів × ${plan.dailyQuota} питань на день — встигаєш спокійно.`
        : plan.message;
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl font-semibold text-ink">Ваш перший план</h1>
        <Card className="mt-5">
          <p className="text-base text-ink">{firstPlan}</p>
          <p className="mt-2 text-sm text-muted">
            План перераховується щодня — дату іспиту й денну ціль можна змінити пізніше.
          </p>
        </Card>
        <div className="mt-5">
          <LinkButton href="/dashboard">До навчання</LinkButton>
        </div>
      </div>
    );
  }

  if (step === "2") {
    // Guard (no new schema): hide the invite once the user has ever completed a diagnostic.
    const diagnosticDone = await hasCompletedDiagnostic(user.id);
    return (
      <div className="mx-auto max-w-2xl">
        <StepIndicator step={2} />
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Коли іспит?</h1>
        <p className="mt-1 text-sm text-muted">
          Якщо дата вже відома, підберемо спокійний темп підготовки. Це необовʼязково.
        </p>
        {!diagnosticDone && <DiagnosticCta />}
        <form action={saveExamDateAction} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Дата іспиту</span>
            <input type="date" name="examDate" className={FIELD_INPUT} />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton pendingLabel="Зберігаємо…" data-track-label="onboarding_exam_date">
              Продовжити
            </SubmitButton>
            {/* Explicit "not yet scheduled" answer: writes nothing to examDate, still advances,
                and records the JTBD signal (examDateKnown:false) — a real answer, not a skip. */}
            <SubmitButton
              variant="secondary"
              name="scheduled"
              value="no"
              pendingLabel="Зберігаємо…"
              data-track-label="onboarding_exam_date_unscheduled"
            >
              Ще не записався / записалася
            </SubmitButton>
            <Link href="/onboarding?step=3" className="text-sm font-medium text-muted underline">
              Пропустити
            </Link>
          </div>
        </form>
      </div>
    );
  }

  if (step === "3") {
    // OPTIONAL JTBD prep-mode question (spec T4): a single-select enum, one job per screen.
    // «Пропустити» writes nothing and fires no telemetry; picking an option persists prepMode
    // and records the `onboarding_jtbd_answered` event.
    return (
      <div className="mx-auto max-w-2xl">
        <StepIndicator step={3} />
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Як готуєшся?</h1>
        <p className="mt-1 text-sm text-muted">
          Це допоможе нам краще підібрати матеріали. Це необовʼязково.
        </p>
        <form action={savePrepModeAction} className="mt-5 space-y-4">
          <fieldset className="space-y-3">
            {PREP_MODES.map((mode, i) => (
              <label
                key={mode}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-card p-4 has-[:checked]:border-green-deep has-[:checked]:ring-1 has-[:checked]:ring-green-deep"
              >
                <input
                  type="radio"
                  name="prepMode"
                  value={mode}
                  defaultChecked={i === 0}
                  className="accent-green-deep"
                />
                <span className="font-display text-base font-semibold text-ink">
                  {PREP_MODE_LABELS[mode]}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="flex items-center gap-4">
            <SubmitButton pendingLabel="Зберігаємо…" data-track-label="onboarding_prep_mode">
              Продовжити
            </SubmitButton>
            <Link href="/onboarding?step=4" className="text-sm font-medium text-muted underline">
              Пропустити
            </Link>
          </div>
        </form>
      </div>
    );
  }

  if (step === "4") {
    const profile = await getOrCreateProfile(user.id);
    return (
      <div className="mx-auto max-w-2xl">
        <StepIndicator step={4} />
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
          Скільки питань на день?
        </h1>
        <p className="mt-1 text-sm text-muted">
          Невелика щоденна ціль тримає темп без перевантаження. Це необовʼязково.
        </p>
        <form action={saveDailyGoalAction} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              Питань на день (5–100)
            </span>
            <input
              type="number"
              name="dailyGoal"
              min={5}
              max={100}
              defaultValue={profile.dailyGoal}
              className={FIELD_INPUT}
            />
          </label>
          <div className="flex items-center gap-4">
            <SubmitButton pendingLabel="Готуємо план…" data-track-label="onboarding_daily_goal">
              Показати план
            </SubmitButton>
            <Link href="/onboarding?step=done" className="text-sm font-medium text-muted underline">
              Пропустити
            </Link>
          </div>
        </form>
      </div>
    );
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
  // Default to category B (легкові) — the overwhelmingly common learner — not the alphabetically-first
  // A (мотоцикли), which silently mis-onboarded anyone who tapped through (UX audit 2026-07-02).
  const defaultCategoryId =
    user.selectedCategoryId ??
    categories.find((c) => c.code === "B")?.id ??
    categories[0]?.id;

  return (
    <div className="mx-auto max-w-2xl">
      <StepIndicator step={1} />
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
        Оберіть категорію прав
      </h1>
      <p className="mt-1 text-sm text-muted">
        Питання та практика будуть підібрані під обрану категорію. Це можна змінити пізніше.
      </p>

      <form action={selectCategoryAction} className="mt-5 space-y-3">
        <fieldset className="space-y-3">
          {categories.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-card p-4 has-[:checked]:border-green-deep has-[:checked]:ring-1 has-[:checked]:ring-green-deep"
            >
              <input
                type="radio"
                name="categoryId"
                value={c.id}
                defaultChecked={c.id === defaultCategoryId}
                className="mt-1 accent-green-deep"
              />
              <span>
                <span className="font-display text-base font-semibold text-ink">{c.title}</span>
                {c.description && <span className="block text-sm text-muted">{c.description}</span>}
              </span>
            </label>
          ))}
        </fieldset>
        <SubmitButton pendingLabel="Зберігаємо…" data-track-label="onboarding_continue">Продовжити</SubmitButton>
      </form>

      <Card className="mt-6">
        <LegalDisclaimer />
      </Card>
    </div>
  );
}
