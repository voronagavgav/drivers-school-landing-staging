import { getEditorOptions, listContentVersions } from "@/lib/server/admin";
import { QuestionEditor, type QuestionEditorData } from "@/app/admin/questions/question-editor";

const EMPTY: QuestionEditorData = {
  text: "",
  topicId: null,
  difficulty: 1,
  imageUrl: null,
  sourceType: "DEMO",
  isDemo: true,
  contentVersionId: null,
  categoryIds: [],
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ],
  explanation: null,
};

export default async function NewQuestionPage() {
  const [{ topics, categories }, versions] = await Promise.all([
    getEditorOptions(),
    listContentVersions(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
          Нове питання
        </h1>
        <p className="text-sm text-muted">Заповніть форму та збережіть.</p>
      </div>
      <QuestionEditor
        mode="create"
        data={EMPTY}
        topics={topics.map((t) => ({ id: t.id, label: t.title }))}
        categories={categories.map((c) => ({ id: c.id, label: `${c.code} — ${c.title}` }))}
        contentVersions={versions.map((v) => ({ id: v.id, label: v.name }))}
      />
    </div>
  );
}
