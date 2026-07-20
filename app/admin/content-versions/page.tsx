import { listContentVersions, getContentVersion } from "@/lib/server/admin";
import { Badge, Card, SectionTitle } from "@/components/ui";
import {
  ContentVersionForm,
  type ContentVersionFormData,
} from "@/app/admin/content-versions/content-version-form";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(d);
}

export default async function ContentVersionsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [versions, editing] = await Promise.all([
    listContentVersions(),
    edit ? getContentVersion(edit) : Promise.resolve(null),
  ]);

  const editData: ContentVersionFormData | undefined = editing
    ? {
        id: editing.id,
        name: editing.name,
        source: editing.source,
        description: editing.description,
        isActive: editing.isActive,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
        Версії контенту
      </h1>

      <section>
        <SectionTitle>
          {editing ? `Редагувати «${editing.name}»` : "Нова версія контенту"}
        </SectionTitle>
        <Card>
          <ContentVersionForm
            key={editing?.id ?? "new"}
            mode={editing ? "edit" : "create"}
            data={editData}
          />
          {editing && (
            <a
              href="/admin/content-versions"
              className="mt-3 inline-block text-sm font-semibold text-green-deep"
            >
              Скасувати редагування
            </a>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Усі версії</SectionTitle>
        {versions.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Версій поки немає.</p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {versions.map((v) => (
              <li key={v.id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{v.name}</span>
                        {v.isActive ? (
                          <Badge tone="go">Активна</Badge>
                        ) : (
                          <Badge tone="neutral">Чернетка</Badge>
                        )}
                      </div>
                      {v.source && <p className="mt-1 text-sm text-muted">Джерело: {v.source}</p>}
                      {v.description && <p className="mt-1 text-sm text-muted">{v.description}</p>}
                      <p className="mt-1 text-xs text-muted">
                        {v._count.questions} питань
                        {v.publishedAt ? ` · опубліковано ${formatDate(v.publishedAt)}` : ""}
                      </p>
                    </div>
                    <a
                      href={`/admin/content-versions?edit=${v.id}`}
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
