import { Card, SectionTitle, LinkButton } from "@/components/ui";

export default function TestNotFound() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <Card>
        <SectionTitle hint="Можливо, тест уже завершено або посилання застаріле.">
          Тест не знайдено
        </SectionTitle>
        <p className="text-sm text-muted">
          Ми не змогли знайти цей тест. Перевірте посилання або поверніться на головну, щоб
          почати новий.
        </p>
        <div className="mt-5">
          <LinkButton href="/dashboard">На головну</LinkButton>
        </div>
      </Card>
    </div>
  );
}
