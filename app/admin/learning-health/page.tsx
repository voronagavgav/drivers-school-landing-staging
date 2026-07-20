import Link from "next/link";
import { requireContentManager } from "@/lib/rbac";
import { getLearningHealth } from "@/lib/server/learning-health";
import { Card, SectionTitle, Stat } from "@/components/ui";
import { LegalDisclaimer } from "@/components/brand";
import { formatPercent } from "@/lib/analytics-dashboard";

// ---------------------------------------------------------------------------
// Admin learning-health view (spec §E). Renders the single server snapshot
// (`getLearningHealth`) as a KPI strip + a difficulty-outlier table — the
// "generation = free data audit" loop surfaced for an editor. Mirrors
// `app/admin/content-health/page.tsx`: Ukrainian copy, quiet operator surface,
// Card/SectionTitle/Stat, LegalDisclaimer at the foot.
//
// Privacy: the aggregation returns aggregate counts + question ids only; this
// page renders nothing per-user. The page also calls `requireContentManager()`
// itself (belt-and-suspenders with the layout gate).
// ---------------------------------------------------------------------------

/** Ukrainian label for an outlier's direction relative to its authored difficulty. */
const DIRECTION_LABEL: Record<"easier" | "harder", string> = {
  easier: "Легше, ніж авторська складність",
  harder: "Складніше, ніж авторська складність",
};

export default async function AdminLearningHealthPage() {
  // Page-level RBAC gate (belt-and-suspenders with the layout gate).
  await requireContentManager();

  const { explanationCoverage, difficultyOutliers, confidenceUptake, nudgeVolume7d } =
    await getLearningHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
          Здоровʼя навчання
        </h1>
        <p className="text-sm text-muted">
          Сигнали якості навчання, зведені з даних, які застосунок уже збирає:
          покриття перевірених пояснень, розбіжності авторської складності та
          поведінки, охоплення самооцінки впевненості й обсяг нагадувань. Орієнтир
          для редактора, а не остаточна оцінка.
        </p>
      </div>

      {/* KPI strip */}
      <section>
        <SectionTitle hint="Похідні від записаних сигналів навчання. Черга неперевірених пояснень веде до списку питань.">
          Ключові показники
        </SectionTitle>
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="Перевірені пояснення"
              value={formatPercent(explanationCoverage.pct)}
              sub={`${explanationCoverage.reviewed} із ${explanationCoverage.total} опублікованих`}
            />
            <Stat
              label="Охоплення впевненості"
              value={formatPercent(confidenceUptake.pct)}
              sub={`${confidenceUptake.sampled} із ${confidenceUptake.total} повторень`}
            />
            <Stat
              label="Нагадувань за 7 днів"
              value={nudgeVolume7d}
              sub="Створено за останній тиждень"
            />
          </div>
          <p className="mt-4 text-sm text-muted">
            Неперевірених пояснень у черзі:{" "}
            <Link
              href="/admin/questions"
              className="font-semibold text-ink underline underline-offset-2 hover:text-green-deep"
            >
              {explanationCoverage.unreviewedCount}
            </Link>
          </p>
        </Card>
      </section>

      {/* Difficulty outliers — biggest mismatch first (server ordering). */}
      <section>
        <SectionTitle hint="Питання, чия спостережувана точність розходиться з авторською складністю. Спершу — найбільша розбіжність.">
          Розбіжності складності
        </SectionTitle>
        <Card>
          {difficultyOutliers.length === 0 ? (
            <p className="text-sm text-muted">
              Розбіжностей не виявлено — авторська складність збігається з поведінкою
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-medium">ID питання</th>
                    <th className="py-2 pr-3 text-right font-medium">Очікувана</th>
                    <th className="py-2 pr-3 text-right font-medium">Спостережувана</th>
                    <th className="py-2 pr-3 text-right font-medium">Розбіжність</th>
                    <th className="py-2 font-medium">Напрям</th>
                  </tr>
                </thead>
                <tbody>
                  {difficultyOutliers.map((o) => (
                    <tr key={o.questionId} className="border-b border-line/60">
                      <td className="py-3 pr-3 font-mono text-xs text-muted">
                        {o.questionId}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-muted">
                        {formatPercent(o.expected)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-ink">
                        {formatPercent(o.observed)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-muted">
                        {o.delta > 0 ? "+" : "−"}
                        {formatPercent(Math.abs(o.delta))}
                      </td>
                      <td className="py-3 text-ink">{DIRECTION_LABEL[o.direction]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <p className="text-sm text-muted">
        <Link
          href="/admin/readiness-shadow"
          className="font-semibold text-ink underline underline-offset-2 hover:text-green-deep"
        >
          Готовність (тінь)
        </Link>{" "}
        — зведення каліброваності готовності.
      </p>

      <LegalDisclaimer />
    </div>
  );
}
