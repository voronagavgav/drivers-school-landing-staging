import { notFound } from "next/navigation";
import {
  getEditorOptions,
  getQuestionForEdit,
  listContentVersions,
} from "@/lib/server/admin";
import {
  archiveQuestion,
  publishQuestion,
  unarchiveQuestion,
  unpublishQuestion,
} from "@/app/admin/actions";
import { QuestionEditor, type QuestionEditorData } from "@/app/admin/questions/question-editor";
import { ConfirmSubmit } from "@/app/admin/questions/confirm-submit";
import { Badge, Button, Card, DemoBadge } from "@/components/ui";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [question, { topics, categories }, versions] = await Promise.all([
    getQuestionForEdit(id),
    getEditorOptions(),
    listContentVersions(),
  ]);

  if (!question) notFound();

  const isArchived = question.archivedAt !== null;

  const data: QuestionEditorData = {
    id: question.id,
    text: question.text,
    topicId: question.topicId,
    difficulty: question.difficulty,
    imageUrl: question.imageUrl,
    sourceType: question.sourceType,
    isDemo: question.isDemo,
    contentVersionId: question.contentVersionId,
    categoryIds: question.categories.map((c) => c.id),
    options: question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
    explanation: question.explanation
      ? {
          shortText: question.explanation.shortText,
          detailedText: question.explanation.detailedText,
          legalReference: question.explanation.legalReference,
          reviewedStatus: question.explanation.reviewedStatus,
        }
      : null,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
          Редагування питання
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {question.isPublished && !isArchived ? (
            <Badge tone="go">Опубліковано</Badge>
          ) : (
            <Badge tone="neutral">Чернетка</Badge>
          )}
          {isArchived && <Badge tone="danger">Архів</Badge>}
          {question.isDemo && <DemoBadge />}
        </div>
      </div>

      <Card>
        {isArchived && (
          <p className="mb-3 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
            Це питання архівоване (м'яко). Контент збережено і його можна відновити — нічого не видалено.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {!isArchived &&
            (!question.isPublished ? (
              <form action={publishQuestion}>
                <input type="hidden" name="id" value={question.id} />
                <Button type="submit" variant="primary">
                  Опублікувати
                </Button>
              </form>
            ) : (
              <form action={unpublishQuestion}>
                <input type="hidden" name="id" value={question.id} />
                <Button type="submit" variant="secondary">
                  Зняти з публікації
                </Button>
              </form>
            ))}
          {!isArchived ? (
            <form action={archiveQuestion}>
              <input type="hidden" name="id" value={question.id} />
              <ConfirmSubmit message="Архівувати це питання? Це м'яке архівування — контент не видаляється і його можна відновити.">
                Архівувати
              </ConfirmSubmit>
            </form>
          ) : (
            <form action={unarchiveQuestion}>
              <input type="hidden" name="id" value={question.id} />
              <Button type="submit" variant="primary">
                Відновити з архіву
              </Button>
            </form>
          )}
        </div>
      </Card>

      <QuestionEditor
        mode="edit"
        data={data}
        topics={topics.map((t) => ({ id: t.id, label: t.title }))}
        categories={categories.map((c) => ({ id: c.id, label: `${c.code} — ${c.title}` }))}
        contentVersions={versions.map((v) => ({ id: v.id, label: v.name }))}
      />
    </div>
  );
}
