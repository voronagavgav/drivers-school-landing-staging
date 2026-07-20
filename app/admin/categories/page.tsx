import { listCategories, getCategory } from "@/lib/server/admin";
import { toggleCategoryActive } from "@/app/admin/actions";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { CategoryForm, type CategoryFormData } from "@/app/admin/categories/category-form";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [categories, editing] = await Promise.all([
    listCategories(),
    edit ? getCategory(edit) : Promise.resolve(null),
  ]);

  const editData: CategoryFormData | undefined = editing
    ? {
        id: editing.id,
        code: editing.code,
        title: editing.title,
        description: editing.description,
        isActive: editing.isActive,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
        Категорії
      </h1>

      <section>
        <SectionTitle>{editing ? `Редагувати «${editing.code}»` : "Нова категорія"}</SectionTitle>
        <Card>
          <CategoryForm
            key={editing?.id ?? "new"}
            mode={editing ? "edit" : "create"}
            data={editData}
          />
          {editing && (
            <a href="/admin/categories" className="mt-3 inline-block text-sm font-semibold text-green-deep">
              Скасувати редагування
            </a>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Усі категорії</SectionTitle>
        {categories.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Категорій поки немає.</p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {categories.map((c) => (
              <li key={c.id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-semibold text-ink">
                          {c.code}
                        </span>
                        <span className="text-ink">{c.title}</span>
                        {c.isActive ? (
                          <Badge tone="go">Активна</Badge>
                        ) : (
                          <Badge tone="neutral">Неактивна</Badge>
                        )}
                      </div>
                      {c.description && <p className="mt-1 text-sm text-muted">{c.description}</p>}
                      <p className="mt-1 text-xs text-muted">{c._count.questions} питань</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/admin/categories?edit=${c.id}`}
                        className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-field"
                      >
                        Редагувати
                      </a>
                      <form action={toggleCategoryActive}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-green-deep hover:bg-field"
                        >
                          {c.isActive ? "Деактивувати" : "Активувати"}
                        </button>
                      </form>
                    </div>
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
