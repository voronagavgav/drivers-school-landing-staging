import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { getTopicMap } from "@/lib/server/topic-map";
import type { TopicBandEntry, TopicMapGroups } from "@/lib/topic-map";
import { getCalibrationForUser, type CalibrationResult } from "@/lib/server/calibration";
import { checkIntelligenceAccess } from "@/lib/server/entitlements";
import type { CalibrationVerdict } from "@/lib/calibration";
import { startTestAction } from "@/app/actions/test";
import { Card, SectionTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { EntitlementTeaser } from "@/components/entitlement-teaser";
import { TopicPackDownload } from "@/components/topic-pack-download";

// «Карта тем» (spec §F): the anti-leaderboard. Every servable topic appears
// exactly once, grouped by mastery band only — no percents, scores or ranks;
// the honest signal is which group a topic sits in, weakest surfaced first.
// Display wording per spec §F (differs from MASTERY_LABEL's badge words):
// weak/unseen→«Вивчаю», learning→«Майже», strong→«Впевнено».
const GROUPS: Array<{
  key: keyof TopicMapGroups;
  heading: string;
  hint: string;
}> = [
  { key: "weak", heading: "Вивчаю", hint: "Слабкі та ще не бачені теми. Починайте звідси." },
  { key: "learning", heading: "Майже", hint: "Уже непогано — ще трохи практики." },
  { key: "strong", heading: "Впевнено", hint: "Тримається міцно. Повертайтеся, щоб не забути." },
];

// The practice tap owns the row (frontend-design: one job per element; wave12b-review consensus fix
// for the 390px cramping — long all-caps ПДР titles wrapped 3-4 lines against a wide fixed button
// column): the whole-width form submits TOPIC_PRACTICE, the chevron is its affordance, the title gets
// the remaining width (`min-w-0` so it wraps cleanly), and the action name lives in the aria-label.
// The trailing offline-download icon-button (spec §E) is a second, deliberately quiet target at icon
// scale — it never competes with the practice action.
function TopicRow({ topic }: { topic: TopicBandEntry }) {
  return (
    <li className="flex items-center gap-1">
      <form action={startTestAction} className="min-w-0 flex-1">
        <input type="hidden" name="mode" value="TOPIC_PRACTICE" />
        <input type="hidden" name="topicId" value={topic.topicId} />
        <button
          type="submit"
          aria-label={`практикувати тему ${topic.title}`}
          className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-green-soft/20"
        >
          <span className="min-w-0 flex-1 text-sm leading-snug text-ink">{topic.title}</span>
          <span aria-hidden="true" className="shrink-0 text-green-deep">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </form>
      <TopicPackDownload topicId={topic.topicId} title={topic.title} />
    </li>
  );
}

// «Калібрування впевненості» (spec §B): the honest mirror between how sure you FELT (the confidence
// chip) and whether you were RIGHT. Never promises improvement — states the observed data calmly.
// One non-judgmental sentence per verdict; the insufficient state INVITES the confidence habit.
const OFFLINE_NOTE = "Відповіді офлайн не мають оцінки впевненості й сюди не входять.";

// Pinned invite copy (insufficient state) — exact wording per spec §B.
const CALIBRATION_INVITE =
  "Відповідайте на питання про впевненість — і побачите, наскільки ваше відчуття збігається з результатом.";

const CONFIDENCE_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "Зовсім не впевнений",
  2: "Радше сумніваюся",
  3: "Радше впевнений",
  4: "Цілком упевнений",
};

const VERDICT_SENTENCE: Record<CalibrationVerdict, string> = {
  calibrated: "Ваше відчуття впевненості добре збігається з результатом. Так тримати.",
  overconfident:
    "Іноді впевненість трохи випереджає знання — нічого страшного, просто перевіряйте себе там, де почуваєтеся певно.",
  underconfident:
    "Ви знаєте більше, ніж вам здається — можна довіряти собі трохи сміливіше.",
};

function CalibrationSection({ calibration }: { calibration: CalibrationResult }) {
  return (
    <div>
      <SectionTitle hint="Наскільки ваше відчуття впевненості збігається з результатом.">
        Калібрування впевненості
      </SectionTitle>
      <Card>
        {calibration.sufficient ? (
          <div className="space-y-4">
            {calibration.highConfidenceAccuracy !== null && (
              <p className="text-base font-medium text-ink">
                Коли ви впевнені — ви маєте рацію в{" "}
                {Math.round(calibration.highConfidenceAccuracy * 100)}%.
              </p>
            )}
            <ul className="space-y-1">
              {calibration.buckets.map((b) => (
                <li key={b.confidence} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-muted">{CONFIDENCE_LABEL[b.confidence]}</span>
                  <span className="tabular-nums text-ink">
                    {Math.round(b.accuracy * 100)}% правильних
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-ink">{VERDICT_SENTENCE[calibration.verdict]}</p>
            <p className="text-xs text-muted">{OFFLINE_NOTE}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink">{CALIBRATION_INVITE}</p>
            <p className="text-xs text-muted">{OFFLINE_NOTE}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default async function ProgressPage() {
  const user = await requireUser();
  if (!user.selectedCategoryId) redirect("/onboarding");

  const groups = await getTopicMap(user.id, user.selectedCategoryId);
  // Intelligence gate (wave16-08): only the calibration section is gated — the topic map and the
  // rest of the page stay free. Access is checked BEFORE the gated loader; when locked the loader
  // is never called (it also throws on its own; defense in depth).
  const { hasAccess: intelligenceUnlocked } = await checkIntelligenceAccess(user.id);
  const calibration = intelligenceUnlocked ? await getCalibrationForUser(user.id) : null;
  const total = groups.weak.length + groups.learning.length + groups.strong.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Карта тем</h1>
        <p className="text-sm text-muted">
          Усі теми вашої категорії за рівнем засвоєння. Без відсотків і рейтингів —
          лише чесні групи, найслабші вгорі.
        </p>
      </div>

      {total === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            У цій категорії поки немає доступних тем. Спробуйте пізніше.
          </p>
        </Card>
      ) : (
        GROUPS.map(({ key, heading, hint }) => (
          <div key={key}>
            <SectionTitle hint={hint}>{heading}</SectionTitle>
            <Card>
              {groups[key].length === 0 ? (
                <p className="text-sm text-muted">Поки що тут порожньо.</p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {groups[key].map((topic) => (
                    <TopicRow key={topic.topicId} topic={topic} />
                  ))}
                </ul>
              )}
            </Card>
          </div>
        ))
      )}

      {calibration ? (
        <CalibrationSection calibration={calibration} />
      ) : (
        <EntitlementTeaser
          title="Калібрування впевненості"
          valueLine="Дізнайтеся, наскільки ваше відчуття впевненості збігається з реальними результатами."
        />
      )}
    </div>
  );
}
