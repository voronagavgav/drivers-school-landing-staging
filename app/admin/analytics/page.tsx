import Link from "next/link";
import { getAnalyticsDashboard } from "@/lib/server/admin";
import { Card, SectionTitle, Stat } from "@/components/ui";
import { LegalDisclaimer } from "@/components/brand";
import {
  ANALYTICS_RANGES,
  parseRange,
  RANGE_LABEL,
  formatPercent,
} from "@/lib/analytics-dashboard";
import { BarList, TimeSeriesBars, FunnelBars } from "./charts";

const DEVICE_LABELS: Record<string, string> = {
  mobile: "Мобільні",
  tablet: "Планшети",
  desktop: "Десктоп",
};

// Friendly Ukrainian labels for the typed analytics event names (top-event-types axis).
const EVENT_LABELS: Record<string, string> = {
  client_event: "Клієнтська подія",
  user_registered: "Реєстрація",
  user_logged_in: "Вхід",
  user_logged_out: "Вихід",
  onboarding_completed: "Онбординг завершено",
  category_selected: "Вибір категорії",
  dashboard_viewed: "Перегляд кабінету",
  test_started: "Старт тесту",
  question_answered: "Відповідь на питання",
  test_completed: "Завершення тесту",
  exam_simulation_passed: "Іспит складено",
  exam_simulation_failed: "Іспит не складено",
  topic_practice_started: "Практика за темою",
  mistake_practice_started: "Робота над помилками",
  question_saved: "Збереження питання",
  question_unsaved: "Зняття збереження",
  admin_question_created: "Адмін: створено питання",
  admin_question_updated: "Адмін: оновлено питання",
  admin_question_published: "Адмін: опубліковано",
  admin_question_archived: "Адмін: архівовано",
};

function eventLabel(name: string): string {
  return EVENT_LABELS[name] ?? name;
}

function truncate(s: string, n = 90): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t || "—";
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range = parseRange(rawRange);
  const d = await getAnalyticsDashboard(range);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
          Аналітика
        </h1>
        <p className="text-sm text-muted">
          Перші-сторонні агреговані метрики з власної бази. Без сторонніх трекерів; IP-адреси
          ніколи не зберігаються у відкритому вигляді — лише агрегати, без особистих профілів.
        </p>
      </div>

      {/* Date-range filter (server-rendered links — no client JS) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Період:</span>
        {ANALYTICS_RANGES.map((r) => {
          const active = r === range;
          return (
            <Link
              key={r}
              href={`/admin/analytics?range=${r}`}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-lg border border-green-deep bg-green-deep/10 px-3 py-1.5 text-sm font-semibold text-green-deep"
                  : "rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-field"
              }
            >
              {RANGE_LABEL[r]}
            </Link>
          );
        })}
      </div>

      {/* KPI cards */}
      <section>
        <SectionTitle hint="Активні = унікальні відвідувачі (за userId або анонімним id).">
          Ключові показники
        </SectionTitle>
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Усього користувачів" value={d.totalUsers} />
            <Stat label="Нові за період" value={d.newUsers} sub="Реєстрації" />
            <Stat label="Активні (24г)" value={d.activeDau} sub="DAU" />
            <Stat label="Активні (7д)" value={d.activeWau} sub="WAU" />
          </div>
        </Card>
      </section>

      <section>
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Подій за період" value={d.totalEvents} />
            <Stat label="Старти тестів" value={d.testStarts} />
            <Stat label="Завершення" value={d.testCompletions} sub="Завершені сесії" />
            <Stat
              label="Складання іспиту"
              value={formatPercent(d.examPassRate)}
              sub="Серед завершених іспитів"
            />
          </div>
        </Card>
      </section>

      {/* Funnel */}
      <section>
        <SectionTitle hint="Шлях користувача: реєстрація → онбординг → перший тест → завершення.">
          Воронка конверсії
        </SectionTitle>
        <Card>
          <FunnelBars steps={d.funnel} />
        </Card>
      </section>

      {/* Events over time */}
      <section>
        <SectionTitle hint="Динаміка подій за обраний період.">Події в часі</SectionTitle>
        <Card>
          <TimeSeriesBars
            points={d.eventsOverTime.map((b) => ({ label: b.label, count: b.count }))}
            unitLabel={d.timeUnit === "hour" ? "годину" : "день"}
          />
        </Card>
      </section>

      {/* Top event types + top paths */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionTitle hint="Найчастіші типи подій за період.">Типи подій</SectionTitle>
          <Card>
            <BarList
              rows={d.topEventTypes}
              labelFor={(name) => eventLabel(name)}
              empty="Поки що немає подій."
            />
          </Card>
        </div>
        <div>
          <SectionTitle hint="Найвідвідуваніші сторінки (шляхи).">Топ сторінок</SectionTitle>
          <Card>
            <BarList rows={d.topPaths} empty="Немає даних про сторінки." />
          </Card>
        </div>
      </section>

      {/* Device + referrer (SEO-relevant) */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionTitle hint="Похідний клас пристрою (без точного відбитка).">Пристрої</SectionTitle>
          <Card>
            <BarList
              rows={d.byDevice}
              labelFor={(name) => DEVICE_LABELS[name] ?? name}
              empty="Немає даних про пристрої."
            />
          </Card>
        </div>
        <div>
          <SectionTitle hint="Джерела переходів (для SEO) — лише домен, перші-сторонні.">
            Джерела переходів
          </SectionTitle>
          <Card>
            <BarList rows={d.byReferrer} empty="Немає даних про джерела." />
          </Card>
        </div>
      </section>

      {/* Categories + modes */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionTitle hint="Категорії за активністю (старти сесій).">Топ категорій</SectionTitle>
          <Card>
            <BarList rows={d.topCategories} empty="Немає сесій за період." />
          </Card>
        </div>
        <div>
          <SectionTitle hint="Режими тестів за активністю.">Режими навчання</SectionTitle>
          <Card>
            <BarList rows={d.topTopics} empty="Немає сесій за період." />
          </Card>
        </div>
      </section>

      {/* Most answered + most mistaken questions */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionTitle hint="Питання з найбільшою кількістю відповідей.">
            Найчастіше відповідають
          </SectionTitle>
          <Card>
            {d.mostAnswered.length === 0 ? (
              <p className="text-sm text-muted">Немає відповідей за період.</p>
            ) : (
              <ul className="divide-y divide-line">
                {d.mostAnswered.map((q) => (
                  <li key={q.questionId} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 text-ink" title={q.text}>
                      {truncate(q.text)}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-muted">
                      {q.timesAnswered}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div>
          <SectionTitle hint="Питання з найбільшою кількістю помилок.">
            Найбільше помилок
          </SectionTitle>
          <Card>
            {d.mostMistaken.length === 0 ? (
              <p className="text-sm text-muted">Немає помилок за період.</p>
            ) : (
              <ul className="divide-y divide-line">
                {d.mostMistaken.map((q) => (
                  <li key={q.questionId} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 text-ink" title={q.text}>
                      {truncate(q.text)}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      <span className="font-semibold text-warn">{q.wrong}</span>
                      <span className="text-xs"> / {q.timesAnswered}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      <LegalDisclaimer />
    </div>
  );
}
