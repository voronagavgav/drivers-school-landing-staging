"use client";

import { Card, SectionTitle, Button } from "@/components/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-10">
      <Card>
        <SectionTitle hint="Спробуйте ще раз — якщо проблема не зникне, оновіть сторінку.">
          Сталася помилка
        </SectionTitle>
        <p className="text-sm text-muted">
          Не вдалося виконати дію в адмінпанелі. Спробуйте ще раз.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted tabular-nums">Код: {error.digest}</p>
        )}
        <div className="mt-5">
          <Button type="button" onClick={() => reset()}>
            Спробувати ще раз
          </Button>
        </div>
      </Card>
    </div>
  );
}
