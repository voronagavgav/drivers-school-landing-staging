import { requireContentManager } from "@/lib/rbac";
import { getContentHealth } from "@/lib/server/content-stats";
import { Card, SectionTitle, Stat } from "@/components/ui";
import { LegalDisclaimer } from "@/components/brand";
import { formatPercent } from "@/lib/analytics-dashboard";
import { ELO_MIN_ITEM_ANSWERS } from "@/lib/constants";
import type { ContentFlag } from "@/lib/content-flags";
import { OptionDistribution, FlagBadge } from "./parts";

// ---------------------------------------------------------------------------
// Admin content-health view (wave-9 §D). Renders the server aggregation
// (`getContentHealth`) as a KPI strip + a flagged-first per-question table and a
// per-topic rollup. Mirrors `app/admin/analytics/page.tsx`: Ukrainian copy,
// mobile-first, Card/SectionTitle/Stat, LegalDisclaimer at the foot.
//
// Privacy: the aggregation selects ONLY content/answer columns; this page renders
// nothing per-user — no emails, no userIds, no individual answers. The page also
// calls `requireContentManager()` itself (F-5), belt-and-suspenders with the layout.
// ---------------------------------------------------------------------------

/** A flag an editor should act on (INSUFFICIENT_DATA is informational, not actionable).
 *  Mirrors the predicate the server uses to order flagged-first. */
function isActionable(flags: ContentFlag[]): boolean {
  return flags.some(
    (f) => f.kind === "WRONG_KEY_SUSPECTED" || f.kind === "LOW_DISCRIMINATION",
  );
}

function truncate(s: string, n = 80): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t || "—";
}

export default async function AdminContentHealthPage() {
  // F-5: page-level RBAC gate (belt-and-suspenders with the layout gate).
  await requireContentManager();

  const { questions, topics } = await getContentHealth();

  // KPIs derived from the aggregation (no duplicated math): total answers, the
  // share of questions carrying an actionable flag, and answer-weighted accuracy.
  const totalAnswered = questions.reduce((s, q) => s + q.timesAnswered, 0);
  const totalCorrect = questions.reduce((s, q) => s + q.correct, 0);
  const flaggedCount = questions.filter((q) => isActionable(q.flags)).length;
  const flaggedShare = questions.length > 0 ? flaggedCount / questions.length : 0;
  const meanAccuracy = totalAnswered > 0 ? totalCorrect / totalAnswered : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
          Якість контенту
        </h1>
        <p className="text-sm text-muted">
          Агреговані сигнали якості питань із записаних відповідей — без особистих
          даних. Лише агрегати: точність, розподіл вибору варіантів і ймовірні
          проблеми ключа. Орієнтир для редактора, а не остаточна оцінка.
        </p>
      </div>

      {/* KPI strip */}
      <section>
        <SectionTitle hint="Похідні від записаних відповідей; питання з прапорцем потребують уваги редактора.">
          Ключові показники
        </SectionTitle>
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="Усього відповідей"
              value={totalAnswered}
              sub={`${questions.length} питань із даними`}
            />
            <Stat
              label="Питань із прапорцем"
              value={formatPercent(flaggedShare)}
              sub={`${flaggedCount} із ${questions.length}`}
            />
            <Stat
              label="Середня точність"
              value={formatPercent(meanAccuracy)}
              sub="Зважена за відповідями"
            />
          </div>
        </Card>
      </section>

      {/* Per-question table — flagged-first (server ordering), then hardest-first. */}
      <section>
        <SectionTitle hint="Спершу питання з прапорцями, далі — найскладніші. Розподіл показує, як часто обирають кожен варіант.">
          Питання за якістю
        </SectionTitle>
        <Card>
          {questions.length === 0 ? (
            <p className="text-sm text-muted">Поки що немає відповідей для аналізу.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-medium">Ключ</th>
                    <th className="py-2 pr-3 font-medium">Питання</th>
                    <th className="py-2 pr-3 text-right font-medium">Точність</th>
                    <th className="py-2 pr-3 text-right font-medium">Відп.</th>
                    <th className="py-2 pr-3 text-right font-medium">Сер. час</th>
                    <th className="py-2 pr-3 text-right font-medium">Elo β (n)</th>
                    <th className="py-2 pr-3 font-medium">Розподіл вибору</th>
                    <th className="py-2 font-medium">Сигнали</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.questionId} className="border-b border-line/60 align-top">
                      <td className="py-3 pr-3 font-mono text-xs text-muted">
                        {q.questionKey ?? "—"}
                      </td>
                      <td className="py-3 pr-3">
                        <p className="text-ink" title={q.text}>
                          {truncate(q.text)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">{q.topicTitle}</p>
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-ink">
                        {formatPercent(q.accuracy)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-muted">
                        {q.timesAnswered}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-muted">
                        {q.avgTimeSeconds.toFixed(1)} с
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-ink">
                        <span title={`β=${q.eloBeta ?? "—"}, n=${q.eloAnswerCount}`}>
                          {q.eloBeta == null ? "—" : q.eloBeta.toFixed(2)}
                          <span className="text-muted"> ({q.eloAnswerCount})</span>
                        </span>
                        {q.eloAnswerCount < ELO_MIN_ITEM_ANSWERS && (
                          <span className="mt-0.5 block text-xs text-muted">
                            недостатньо даних
                          </span>
                        )}
                      </td>
                      <td className="w-64 py-3 pr-3">
                        <OptionDistribution options={q.options} />
                      </td>
                      <td className="py-3">
                        {q.flags.length === 0 ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {q.flags.map((f) => (
                              <FlagBadge key={f.kind} flag={f} />
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* Per-topic rollup — weakest topics first. */}
      <section>
        <SectionTitle hint="Слабші теми — вище. Середня точність = усі правильні / усі відповіді теми.">
          Зведення за темами
        </SectionTitle>
        <Card>
          {topics.length === 0 ? (
            <p className="text-sm text-muted">Немає даних за темами.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-medium">Тема</th>
                    <th className="py-2 pr-3 text-right font-medium">Питань</th>
                    <th className="py-2 pr-3 text-right font-medium">Відповідей</th>
                    <th className="py-2 text-right font-medium">Сер. точність</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((t) => (
                    <tr key={t.topicId ?? "__none__"} className="border-b border-line/60">
                      <td className="py-2.5 pr-3 text-ink">{t.topicTitle}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-muted">
                        {t.questionCount}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-muted">
                        {t.answered}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-ink">
                        {formatPercent(t.meanAccuracy)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <LegalDisclaimer />
    </div>
  );
}
