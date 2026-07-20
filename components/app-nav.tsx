"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { logoutAction } from "@/app/actions/auth";

// Wave-12a §C — the glass TAB CAPSULE. Five flat primary targets (Головна · Навчання · Іспит ·
// Прогрес · Профіль), all mapping to EXISTING routes. Помилки/Збережені/Історія are NOT top-level;
// they nest under their parent pages. The capsule is bottom-fixed on phone (thumb zone) and a top
// capsule on ≥sm. `Іспит` targets the existing exam launcher on /dashboard (#exam anchor) — no new
// route this wave. Surface = `.glass-e1` emulated glass (no raw backdrop-filter here).
type Tab = {
  href: string;
  label: string;
  /** active-state predicate on the current pathname (Іспит is a launcher → never "active"). */
  active?: (path: string) => boolean;
};

const TABS: Tab[] = [
  { href: "/dashboard", label: "Головна", active: (p) => p === "/dashboard" },
  { href: "/practice", label: "Навчання", active: (p) => p.startsWith("/practice") },
  { href: "/dashboard#exam", label: "Іспит" },
  { href: "/progress", label: "Прогрес", active: (p) => p.startsWith("/progress") },
  { href: "/account", label: "Профіль", active: (p) => p.startsWith("/account") },
];

export function AppNav({ canManage, userName }: { canManage: boolean; userName: string }) {
  const pathname = usePathname();

  // Hidden during a running test (the runner owns the screen; task 10 restyles it).
  if (pathname.startsWith("/test/")) return null;

  return (
    <>
      {/* Top bar: brand + admin/logout stay reachable here (Профіль area holds the rest). */}
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <Wordmark href="/dashboard" />
          <div className="flex items-center gap-3">
            {canManage && (
              <Link
                href="/admin"
                className="text-sm font-semibold text-green-deep"
                data-track-label="nav_admin"
              >
                Адмінка
              </Link>
            )}
            <span className="hidden text-sm text-muted sm:inline">{userName}</span>
            <form action={logoutAction}>
              <button className="text-sm font-medium text-muted hover:text-ink">Вийти</button>
            </form>
          </div>
        </div>
      </header>

      {/* Tab capsule: bottom-fixed on phone, top capsule (static flow) on ≥sm. */}
      <nav
        aria-label="Основна навігація"
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[env(safe-area-inset-bottom)] pt-2 sm:static sm:inset-auto sm:mx-auto sm:w-fit sm:max-w-5xl sm:px-0 sm:pb-0 sm:pt-3"
      >
        {/* gap-0.5 + min-w-0 li + tighter phone link padding: 5 Cyrillic labels must fit 390px —
            .glass-e1 is overflow:hidden, so an unshrinkable row CLIPS the last tab (wave12a-review). */}
        <ul className="glass-e1 mx-auto flex w-full items-stretch gap-0.5 rounded-glass p-1 sm:w-fit sm:gap-1">
          {TABS.map((t) => {
            const isActive = t.active?.(pathname) ?? false;
            return (
              <li key={t.href} className="min-w-0 flex-1 sm:flex-none">
                <Link
                  href={t.href}
                  aria-current={isActive ? "page" : undefined}
                  data-track-label={`nav_${t.href.replace(/^\//, "").replace(/#.*$/, "")}`}
                  className={`flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-chip px-1.5 py-2 text-[11px] font-semibold transition-colors sm:min-w-[44px] sm:px-3 sm:text-sm ${
                    isActive
                      ? "bg-green-soft text-green-ink"
                      : "text-muted hover:text-green-deep"
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
