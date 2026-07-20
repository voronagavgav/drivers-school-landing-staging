import { requireContentManager } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import {
  brierScore,
  logLoss,
  ece,
  reliabilityDiagram,
  fitPlatt,
} from "@/lib/calibration-metrics";
import { measureTopicCorrelation } from "@/lib/readiness-correlation";
import { CALIBRATION_MIN_OUTCOMES, READINESS_TOPIC_CORRELATION } from "@/lib/constants";
import { Card, SectionTitle, Stat } from "@/components/ui";
import { LegalDisclaimer } from "@/components/brand";

// ---------------------------------------------------------------------------
// Admin calibration view (wave19a-08, Part 2 §K). Read-only, RBAC-gated. Renders
// the calibration snapshot over PassOutcome (predicted P(pass) ↔ observed pass):
// outcome count N, Brier, LogLoss, ECE, the reliability-diagram bins, and the
// fitted Platt {A,B} — the fit is shown ONLY once N ≥ CALIBRATION_MIN_OUTCOMES.
//
// The math is the PURE lib/calibration-metrics.ts (wave19a-05); this page only
// loads rows and hands them in. AGGREGATE-ONLY — no per-user PII. Renders cleanly
// with 0 rows (the expected state today): an honest, inviting empty state, no
// division-by-zero / NaN. The page also calls requireContentManager() itself
// (belt-and-suspenders with the layout gate).
// ---------------------------------------------------------------------------

const MAX_OUTCOMES = 50_000; // bound the read; the table is tiny today (0 rows).
const MAX_REVIEW_LOGS = 50_000; // bound the within-topic correlation scan.

/**
 * Empirical within-topic correlation ρ̂ over ReviewLog rows, grouped into
 * (user, topic) outcome testlets (`correct = grade >= 2`, the house convention).
 * AGGREGATE-ONLY: returns just the pooled ρ̂ + group/row counts, never per-user
 * data. `rho` is null when there is not enough usable data (every group a
 * singleton, or all outcomes identical → variance 0) — the pure estimator returns
 * null there, so no NaN / division-by-zero reaches the view.
 */
async function measureEmpiricalTopicRho() {
  const logs = await prisma.reviewLog.findMany({
    where: { topicId: { not: null } },
    select: { userId: true, topicId: true, grade: true },
    orderBy: { createdAt: "desc" },
    take: MAX_REVIEW_LOGS,
  });

  const byGroup = new Map<string, (0 | 1)[]>();
  for (const l of logs) {
    const key = `${l.userId}:${l.topicId}`;
    const arr = byGroup.get(key) ?? [];
    arr.push(l.grade >= 2 ? 1 : 0);
    byGroup.set(key, arr);
  }

  const groups = [...byGroup.values()].map((outcomes) => ({ outcomes }));
  const groupsWithPairs = groups.filter((g) => g.outcomes.length >= 2).length;
  return { rho: measureTopicCorrelation(groups), groupsWithPairs, rowCount: logs.length };
}

export default async function AdminCalibrationPage() {
  // Page-level RBAC gate (belt-and-suspenders with the layout gate).
  await requireContentManager();

  const topicRho = await measureEmpiricalTopicRho();

  const outcomes = await prisma.passOutcome.findMany({
    select: { predictedPassProbability: true, passed: true },
    orderBy: { createdAt: "desc" },
    take: MAX_OUTCOMES,
  });

  const n = outcomes.length;
  const points = outcomes.map((o) => ({
    p: o.predictedPassProbability,
    y: o.passed ? 1 : 0,
  }));

  // Guard N===0 before touching the metrics: the pure fns already return safe
  // values on empty input, but we render the honest empty state instead of a
  // wall of zeros.
  if (n === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <section>
          <Card>
            <div className="space-y-2 py-2">
              <p className="text-sm font-medium text-ink">
                Поки що недостатньо даних для калібрування.
              </p>
              <p className="text-sm text-muted">
                Дані з&apos;являться, коли учні почнуть звітувати про іспит — кожен
                звіт зберігає передбачену ймовірність складання та фактичний
                результат, і з них рахується калібрування циферблата.
              </p>
            </div>
          </Card>
        </section>
        <TopicCorrelationSection data={topicRho} />
        <LegalDisclaimer />
      </div>
    );
  }

  const brier = brierScore(points);
  const ll = logLoss(points);
  const eceValue = ece(points);
  const bins = reliabilityDiagram(points);
  const canFit = n >= CALIBRATION_MIN_OUTCOMES;
  const platt = canFit ? fitPlatt(points) : null;

  return (
    <div className="space-y-6">
      <Header />

      {/* Headline metrics */}
      <section>
        <SectionTitle hint="Brier і LogLoss — що менше, то краще. ECE — очікувана похибка калібрування (0 = ідеально).">
          Зведення калібрування
        </SectionTitle>
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Stat label="Звітів про іспит" value={n} sub="Усього результатів" />
            <Stat label="Brier" value={brier.toFixed(4)} sub="Середньоквадратична похибка" />
            <Stat label="LogLoss" value={ll.toFixed(4)} sub="Крос-ентропія" />
            <Stat label="ECE" value={eceValue.toFixed(4)} sub="Похибка калібрування" />
          </div>
        </Card>
      </section>

      {/* Reliability diagram */}
      <section>
        <SectionTitle hint="Кожен рядок — інтервал передбаченої ймовірності. «Спостережено» має бути близьким до «Передбачено» у добре відкаліброваної моделі.">
          Діаграма надійності
        </SectionTitle>
        <Card>
          {bins.length === 0 ? (
            <p className="text-sm text-muted">Немає заповнених інтервалів.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 text-right font-medium">Передбачено</th>
                    <th className="py-2 pr-3 text-right font-medium">Спостережено</th>
                    <th className="py-2 pr-3 text-right font-medium">Кількість</th>
                    <th className="py-2 font-medium">Розбіжність</th>
                  </tr>
                </thead>
                <tbody>
                  {bins.map((b, i) => {
                    const gap = b.observedFraction - b.meanPredicted;
                    return (
                      <tr key={i} className="border-b border-line/60 align-middle">
                        <td className="py-3 pr-3 text-right tabular-nums text-ink">
                          {(b.meanPredicted * 100).toFixed(0)}%
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums text-ink">
                          {(b.observedFraction * 100).toFixed(0)}%
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums text-muted">
                          {b.count}
                        </td>
                        <td className="py-3 tabular-nums text-muted">
                          {gap > 0 ? "+" : ""}
                          {(gap * 100).toFixed(0)} п.п.
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* Fitted Platt calibrator */}
      <section>
        <SectionTitle hint="Логістична поправка P' = sigmoid(A·logit(p) + B). Показується лише за достатньої кількості звітів. НЕ застосовується до живого циферблата.">
          Підгонка Платта
        </SectionTitle>
        <Card>
          {platt ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Stat label="A (нахил)" value={platt.A.toFixed(4)} sub="1 = без масштабування" />
              <Stat label="B (зсув)" value={platt.B.toFixed(4)} sub="0 = без зсуву" />
            </div>
          ) : (
            <p className="text-sm text-muted">
              Недостатньо даних для підгонки: потрібно щонайменше{" "}
              {CALIBRATION_MIN_OUTCOMES} звітів, зараз {n}.
            </p>
          )}
        </Card>
      </section>

      <TopicCorrelationSection data={topicRho} />

      <LegalDisclaimer />
    </div>
  );
}

/**
 * Read-only within-topic correlation summary (wave19b). Shows the empirical ρ̂
 * measured over ReviewLog testlets, purely INFORMATIONAL — the live dial uses the
 * CONSTANT ρ (READINESS_TOPIC_CORRELATION); switching to the empirical value is a
 * future data-gated wave. Renders an honest "not enough data" state when ρ̂ is null.
 */
function TopicCorrelationSection({
  data,
}: {
  data: { rho: number | null; groupsWithPairs: number; rowCount: number };
}) {
  return (
    <section>
      <SectionTitle hint="Внутрішньотемова кореляція ρ — наскільки відповіді в межах однієї теми пов'язані. Використовується для чеснішої оцінки готовності (ефект дизайну).">
        Внутрішньотемова кореляція
      </SectionTitle>
      <Card>
        {data.rho === null ? (
          <div className="space-y-2 py-2">
            <p className="text-sm font-medium text-ink">
              Поки що недостатньо даних для оцінки кореляції.
            </p>
            <p className="text-sm text-muted">
              Потрібні щонайменше кілька тем із двома або більше відповідями від
              одного учня. Зараз придатних груп: {data.groupsWithPairs}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="ρ̂ (емпірична)"
              value={data.rho.toFixed(4)}
              sub={`Живий циферблат використовує сталу ρ = ${READINESS_TOPIC_CORRELATION}`}
            />
            <Stat label="Груп (тема×учень)" value={data.groupsWithPairs} sub="З ≥2 відповідями" />
            <Stat label="Записів переглядів" value={data.rowCount} sub="Проаналізовано" />
          </div>
        )}
      </Card>
    </section>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
        Калібрування
      </h1>
      <p className="text-sm text-muted">
        Наскільки передбачена ймовірність складання іспиту відповідає реальним
        результатам. Рахується зі звітів учнів про іспит (PassOutcome): Brier,
        LogLoss, ECE, діаграма надійності та підгонка Платта. Лише зведені числа —
        без особистих даних. Калібратор НЕ застосовується до живого циферблата
        цієї хвилі.
      </p>
    </div>
  );
}
