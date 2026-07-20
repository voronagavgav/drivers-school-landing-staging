import { requireContentManager } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { getLatestReadiness } from "@/lib/server/mastery-readiness";
import { Card, SectionTitle, Stat } from "@/components/ui";
import { LegalDisclaimer } from "@/components/brand";

// ---------------------------------------------------------------------------
// Admin readiness-shadow view (wave11-15). Calibration instrument for the W12b
// dial-promotion decision: side-by-side LEGACY readiness (ProgressSnapshot.
// readinessScore) vs the FSRS dial (ReadinessSnapshot.dialPercent via
// getLatestReadiness) + the DELTA, so miscalibration is visible. The FSRS dial is
// NEVER promoted to learners this wave — this is an admin-only shadow.
//
// Privacy: renders only `email` (no other PII); the FSRS column reads as
// insufficient-data (not a hard dial number) below wave11-08's threshold.
// The page also calls `requireContentManager()` itself (belt-and-suspenders with
// the layout gate).
// ---------------------------------------------------------------------------

const CHUNK = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type Row = {
  userId: string;
  email: string;
  legacyScore: number | null;
  sufficientData: boolean;
  dialPercent: number | null;
  seenCount: number;
  mock: { m: number; k: number };
  bottleneckTitle: string | null;
  delta: number | null;
};

export default async function AdminReadinessShadowPage() {
  // Page-level RBAC gate (belt-and-suspenders with the layout gate).
  await requireContentManager();

  const users = await prisma.user.findMany({
    select: { id: true, email: true, selectedCategoryId: true },
    orderBy: { email: "asc" },
  });

  // Latest legacy ProgressSnapshot per user — chunked ≤200 to stay under the
  // libsql query-parameter cap; keep only the newest row per user.
  const legacyByUser = new Map<string, number>();
  for (const ids of chunk(users.map((u) => u.id), CHUNK)) {
    const snaps = await prisma.progressSnapshot.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, readinessScore: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    for (const s of snaps) {
      if (!legacyByUser.has(s.userId)) legacyByUser.set(s.userId, s.readinessScore);
    }
  }

  const rows: Row[] = [];
  for (const u of users) {
    const legacyScore = legacyByUser.get(u.id) ?? null;
    const fsrs = await getLatestReadiness(u.id, u.selectedCategoryId ?? null);
    const sufficientData = fsrs?.sufficientData ?? false;
    const dialPercent = sufficientData ? (fsrs?.dialPercent ?? null) : null;
    const delta =
      dialPercent !== null && legacyScore !== null
        ? dialPercent - legacyScore
        : null;
    rows.push({
      userId: u.id,
      email: u.email ?? "",
      legacyScore,
      sufficientData,
      dialPercent,
      seenCount: fsrs?.seenCount ?? 0,
      mock: fsrs?.mock ?? { m: 0, k: 0 },
      bottleneckTitle: fsrs?.snapshot.bottleneckTitle ?? null,
      delta,
    });
  }

  // Aggregates: mean |delta| over comparable users, and the insufficient-data share.
  const deltas = rows.map((r) => r.delta).filter((d): d is number => d !== null);
  const meanAbsDelta =
    deltas.length > 0
      ? deltas.reduce((a, d) => a + Math.abs(d), 0) / deltas.length
      : 0;
  const insufficientCount = rows.filter((r) => !r.sufficientData).length;
  const insufficientShare = rows.length > 0 ? insufficientCount / rows.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
          Готовність (тінь)
        </h1>
        <p className="text-sm text-muted">
          Калібрувальний інструмент: порівняння застарілої оцінки готовності з
          новим FSRS-циферблатом. Обидва числа + дельта (FSRS − застаріла), щоб
          побачити розбіжність. FSRS-циферблат НЕ показується учням цієї хвилі —
          це лише тіньовий адмінський перегляд. Без особистих даних, окрім email.
        </p>
      </div>

      {/* Aggregates */}
      <section>
        <SectionTitle hint="Середнє |дельта| рахується лише для користувачів, де обидва числа доступні.">
          Зведення калібрування
        </SectionTitle>
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="Усього користувачів"
              value={rows.length}
              sub={`${deltas.length} із дельтою`}
            />
            <Stat
              label="Середнє |дельта|"
              value={`${meanAbsDelta.toFixed(1)}`}
              sub="Модуль різниці FSRS − застаріла"
            />
            <Stat
              label="Недостатньо даних"
              value={`${Math.round(insufficientShare * 100)}%`}
              sub={`${insufficientCount} із ${rows.length}`}
            />
          </div>
        </Card>
      </section>

      {/* Per-user shadow table */}
      <section>
        <SectionTitle hint="Застаріла оцінка проти FSRS-циферблата. Нижче порога FSRS читається як «недостатньо даних».">
          Порівняння за користувачами
        </SectionTitle>
        <Card>
          {rows.length === 0 ? (
            <p className="text-sm text-muted">Поки що немає користувачів.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 text-right font-medium">Застаріла</th>
                    <th className="py-2 pr-3 text-right font-medium">FSRS</th>
                    <th className="py-2 pr-3 text-right font-medium">Дельта</th>
                    <th className="py-2 pr-3 text-right font-medium">Бачив</th>
                    <th className="py-2 pr-3 text-right font-medium">Пробний m/k</th>
                    <th className="py-2 font-medium">Вузьке місце</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.userId} className="border-b border-line/60 align-top">
                      <td className="py-3 pr-3 text-ink">{r.email}</td>
                      <td className="py-3 pr-3 text-right tabular-nums text-muted">
                        {r.legacyScore !== null ? r.legacyScore.toFixed(0) : "—"}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-ink">
                        {r.sufficientData && r.dialPercent !== null
                          ? r.dialPercent.toFixed(0)
                          : "н/д"}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-ink">
                        {r.delta !== null
                          ? `${r.delta > 0 ? "+" : ""}${r.delta.toFixed(0)}`
                          : "—"}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-muted">
                        {r.seenCount}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-muted">
                        {r.mock.m}/{r.mock.k}
                      </td>
                      <td className="py-3 text-muted">
                        {r.bottleneckTitle ?? "—"}
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
