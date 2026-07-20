import Link from "next/link";

// Global 404 — localized + branded (the Next default was English/unbranded; UX audit 2026-07-02).
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-5xl font-semibold text-ink">404</p>
      <h1 className="font-display text-xl font-semibold text-ink">Сторінку не знайдено</h1>
      <p className="max-w-md text-sm text-muted">
        Такої сторінки немає або її було переміщено. Спокійно — усе важливе на місці.
      </p>
      <div className="mt-2 flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-xl border border-line bg-card px-4 py-2 text-sm font-semibold text-ink hover:border-green-deep"
        >
          До панелі
        </Link>
        <Link
          href="/"
          className="rounded-xl px-4 py-2 text-sm text-muted hover:text-ink"
        >
          На головну
        </Link>
      </div>
    </main>
  );
}
