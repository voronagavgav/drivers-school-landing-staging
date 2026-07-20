"use client";

import { Card, SectionTitle, Button } from "@/components/ui";

export default function AppError({
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
          Щось пішло не так
        </SectionTitle>
        <p className="text-sm text-muted">
          Сталася неочікувана помилка. Ваші дані в безпеці.
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
