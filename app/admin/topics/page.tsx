import { listTopics, getTopic } from "@/lib/server/admin";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { TopicForm, type TopicFormData } from "@/app/admin/topics/topic-form";

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [topics, editing] = await Promise.all([
    listTopics(),
    edit ? getTopic(edit) : Promise.resolve(null),
  ]);

  const parents = topics.map((t) => ({ id: t.id, title: t.title }));

  const editData: TopicFormData | undefined = editing
    ? {
        id: editing.id,
        title: editing.title,
        description: editing.description,
        displayOrder: editing.displayOrder,
        isActive: editing.isActive,
        parentTopicId: editing.parentTopicId,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
        Теми
      </h1>

      <section>
        <SectionTitle>{editing ? `Редагувати «${editing.title}»` : "Нова тема"}</SectionTitle>
        <Card>
          <TopicForm
            key={editing?.id ?? "new"}
            mode={editing ? "edit" : "create"}
            data={editData}
            parents={parents}
          />
          {editing && (
            <a href="/admin/topics" className="mt-3 inline-block text-sm font-semibold text-green-deep">
              Скасувати редагування
            </a>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Усі теми</SectionTitle>
        {topics.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Тем поки немає.</p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {topics.map((t) => (
              <li key={t.id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted tabular-nums">#{t.displayOrder}</span>
                        <span className="font-semibold text-ink">{t.title}</span>
                        {t.isActive ? (
                          <Badge tone="go">Активна</Badge>
                        ) : (
                          <Badge tone="neutral">Неактивна</Badge>
                        )}
                        {t.parent && <Badge tone="sign">↳ {t.parent.title}</Badge>}
                      </div>
                      {t.description && <p className="mt-1 text-sm text-muted">{t.description}</p>}
                      <p className="mt-1 text-xs text-muted">{t._count.questions} питань</p>
                    </div>
                    <a
                      href={`/admin/topics?edit=${t.id}`}
                      className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-field"
                    >
                      Редагувати
                    </a>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
