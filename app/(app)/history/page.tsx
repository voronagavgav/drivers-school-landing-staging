import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { MODE_LABEL, type TestMode } from "@/lib/constants";
import { Card, Badge } from "@/components/ui";
import { Svitlyk } from "@/components/svitlyk";

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default async function HistoryPage() {
  const user = await requireUser();
  const sessions = await prisma.testSession.findMany({
    where: { userId: user.id, status: "COMPLETED" },
    orderBy: { finishedAt: "desc" },
    take: 50,
    include: { category: true },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Історія тестів</h1>
        <p className="text-sm text-muted">Останні пройдені тести ({sessions.length}).</p>
      </div>

      {sessions.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <Svitlyk size={112} />
          <p className="text-sm text-muted">
            Ви ще не завершили жодного тесту. Пройдіть перший — і він зʼявиться тут.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const accuracy = s.totalQuestions ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0;
            return (
              <Link key={s.id} href={`/test/${s.id}/result`} className="block">
                <Card className="transition-colors hover:border-green-deep/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-display text-base font-semibold text-ink">
                        {MODE_LABEL[s.mode as TestMode] ?? s.mode}
                      </div>
                      <div className="text-xs text-muted">
                        {s.finishedAt ? fmtDate(s.finishedAt) : "—"}
                        {s.category ? ` · ${s.category.title}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted tabular-nums">
                        {s.correctAnswers}/{s.totalQuestions} · {accuracy}%
                      </span>
                      {s.mode === "EXAM_SIMULATION" && s.result && (
                        <Badge tone={s.result === "PASSED" ? "go" : "danger"}>
                          {s.result === "PASSED" ? "Складено" : "Не складено"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
